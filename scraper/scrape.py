"""
Legislative Tracker scraper.

Pulls bills for the current UK Parliament session from the public Bills API
(https://bills-api.parliament.uk, no auth required), upserts each bill's
current status, and appends any stage instances not already recorded to the
event log (bill_stage_events) - a new sync run never rewrites history, it
only detects and logs what's new since the last run, with a generated
plain-language narrative for each new stage.

Usage:
    DATABASE_URL=... python scrape.py
"""

from __future__ import annotations

import os
import re
import sys
import time

import psycopg
import requests

API_BASE = "https://bills-api.parliament.uk/api/v1"
CURRENT_SESSION = 40  # 2026 session - see PROGRESS.md if this needs bumping later
REQUEST_DELAY_SECONDS = 0.3

TOPIC_KEYWORDS: list[tuple[str, list[str]]] = [
    ("health", ["health", "nhs", "medicin", "hospital", "care", "mental"]),
    ("education", ["education", "school", "university", "student", "academ"]),
    ("energy", ["energy", "electricity", "gas ", "nuclear", "renewable", "net zero", "carbon"]),
    ("environment", ["environment", "wildlife", "pollution", "waste", "water ", "climate"]),
    ("transport", ["transport", "railway", "rail ", "bus ", "aviation", "highway", "road "]),
    ("housing", ["housing", "tenant", "landlord", "renters", "leasehold", "planning"]),
    ("employment", ["employment", "worker", "trade union", "pension", "wages"]),
    ("finance", ["finance", "tax", "budget", "revenue", "financial services", "banking"]),
    ("justice", ["crime", "justice", "police", "sentencing", "court", "offence", "victims"]),
    ("immigration", ["immigration", "asylum", "nationality", "border"]),
    ("defence", ["defence", "armed forces", "security", "veterans"]),
    ("technology", ["data", "digital", "online safety", "artificial intelligence", "cyber", "telecommunications"]),
    ("agriculture", ["agricultur", "farming", "fisheries", "food "]),
    ("local-government", ["local government", "council", "devolution", "elections"]),
    ("welfare", ["welfare", "benefit", "disability", "social security"]),
]

STAGE_TEMPLATES: dict[str, str] = {
    "1st reading": "was formally introduced in the {house} - a procedural first step with no debate yet.",
    "2nd reading": "had its first substantive debate in the {house}, where members discussed its general purpose and principles.",
    "second reading committee": "had its general principles debated in a smaller committee rather than the full {house} chamber.",
    "committee stage": "moved into line-by-line scrutiny in the {house}, where amendments to specific clauses can be proposed and voted on.",
    "committee of the whole house": "was scrutinised clause-by-clause by the whole {house} rather than a smaller committee - usually reserved for bills of major constitutional or financial significance.",
    "report stage": "returned to the full {house} chamber for further debate and votes on amendments made in committee.",
    "3rd reading": "had its final vote in the {house} before moving on to the next stage of the process.",
    "consideration of lords amendments": "saw the Commons consider changes made by the House of Lords.",
    "consideration of commons amendments": "saw the Lords consider changes made by the House of Commons.",
    "programme motion": "had its Commons timetable formally set, determining how much time is allocated to debate.",
    "money resolution": "had a money resolution agreed in the {house}, authorising the government spending the bill requires.",
    "royal assent": "received Royal Assent and became law.",
}


def classify_topic(short_title: str, long_title: str | None) -> str:
    text = f"{short_title} {long_title or ''}".lower()
    for topic, keywords in TOPIC_KEYWORDS:
        if any(kw in text for kw in keywords):
            return topic
    return "other"


def stage_narrative(bill_short_title: str, description: str, house: str | None, topic: str) -> str:
    key = description.strip().lower()
    house_label = house or "House"
    template = STAGE_TEMPLATES.get(key)
    if template:
        body = template.format(house=house_label)
    else:
        body = f"moved to the '{description}' stage in the {house_label}."

    sentence = f"{bill_short_title} {body}"
    if topic != "other" and key in ("2nd reading", "committee stage", "report stage", "3rd reading", "royal assent"):
        sentence += f" This is likely to be of particular interest to organisations and businesses in the {topic} sector."
    return sentence


def fetch_json(path: str, params: dict | None = None) -> dict:
    resp = requests.get(f"{API_BASE}{path}", params=params, timeout=30)
    resp.raise_for_status()
    time.sleep(REQUEST_DELAY_SECONDS)
    return resp.json()


def fetch_all_bills() -> list[dict]:
    bills = []
    skip = 0
    take = 100
    while True:
        data = fetch_json(
            "/Bills",
            {"Session": CURRENT_SESSION, "IsWithdrawn": "false", "IsDefeated": "false", "Skip": skip, "Take": take},
        )
        items = data.get("items", [])
        bills.extend(items)
        if len(items) < take:
            break
        skip += take
    return bills


def fetch_bill_detail(bill_id: int) -> dict:
    return fetch_json(f"/Bills/{bill_id}")


def fetch_bill_stages(bill_id: int) -> list[dict]:
    stages: list[dict] = []
    skip = 0
    take = 50
    while True:
        data = fetch_json(f"/Bills/{bill_id}/Stages", {"Skip": skip, "Take": take})
        items = data.get("items", [])
        stages.extend(items)
        if len(items) < take:
            break
        skip += take
    return stages


def lead_organisation(detail: dict) -> str | None:
    sponsors = detail.get("sponsors") or []
    if not sponsors:
        return None
    first = sponsors[0]
    org = first.get("organisation")
    if org and org.get("name"):
        return org["name"]
    member = first.get("member")
    return member.get("name") if member else None


def run() -> int:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL is not set", file=sys.stderr)
        return 1

    conn = psycopg.connect(database_url, autocommit=False)

    print(f"Fetching bills for session {CURRENT_SESSION} ...")
    bills = fetch_all_bills()
    print(f"  got {len(bills)} bills")

    new_events = 0
    for i, bill in enumerate(bills, 1):
        bill_id = bill["billId"]
        short_title = bill["shortTitle"]
        detail = fetch_bill_detail(bill_id)
        long_title = detail.get("longTitle")
        topic = classify_topic(short_title, long_title)
        current_stage = bill.get("currentStage") or {}

        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO bills (
                    bill_id, short_title, long_title, current_house, originating_house,
                    current_stage_description, current_stage_house, current_stage_sort_order,
                    is_act, is_defeated, bill_withdrawn, topic, lead_organisation, last_update, source_url
                ) VALUES (
                    %(bill_id)s, %(short_title)s, %(long_title)s, %(current_house)s, %(originating_house)s,
                    %(stage_desc)s, %(stage_house)s, %(stage_sort)s,
                    %(is_act)s, %(is_defeated)s, %(withdrawn)s, %(topic)s, %(lead_org)s, %(last_update)s, %(source_url)s
                )
                ON CONFLICT (bill_id) DO UPDATE SET
                    short_title = EXCLUDED.short_title,
                    long_title = EXCLUDED.long_title,
                    current_house = EXCLUDED.current_house,
                    originating_house = EXCLUDED.originating_house,
                    current_stage_description = EXCLUDED.current_stage_description,
                    current_stage_house = EXCLUDED.current_stage_house,
                    current_stage_sort_order = EXCLUDED.current_stage_sort_order,
                    is_act = EXCLUDED.is_act,
                    is_defeated = EXCLUDED.is_defeated,
                    bill_withdrawn = EXCLUDED.bill_withdrawn,
                    topic = EXCLUDED.topic,
                    lead_organisation = EXCLUDED.lead_organisation,
                    last_update = EXCLUDED.last_update,
                    updated_at = now()
                """,
                {
                    "bill_id": bill_id,
                    "short_title": short_title,
                    "long_title": long_title,
                    "current_house": bill.get("currentHouse"),
                    "originating_house": bill.get("originatingHouse"),
                    "stage_desc": current_stage.get("description"),
                    "stage_house": current_stage.get("house"),
                    "stage_sort": current_stage.get("sortOrder"),
                    "is_act": bill.get("isAct", False),
                    "is_defeated": bill.get("isDefeated", False),
                    "withdrawn": bill.get("billWithdrawn"),
                    "topic": topic,
                    "lead_org": lead_organisation(detail),
                    "last_update": bill.get("lastUpdate"),
                    "source_url": f"https://bills.parliament.uk/bills/{bill_id}",
                },
            )

            cur.execute("SELECT stage_instance_id FROM bill_stage_events WHERE bill_id = %s", (bill_id,))
            known_stage_ids = {row[0] for row in cur.fetchall()}

        stages = fetch_bill_stages(bill_id)
        for stage in stages:
            stage_instance_id = stage["id"]
            if stage_instance_id in known_stage_ids:
                continue
            sittings = stage.get("stageSittings") or []
            stage_date = sittings[0]["date"] if sittings else None
            narrative = stage_narrative(short_title, stage["description"], stage.get("house"), topic)

            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO bill_stage_events (
                        bill_id, stage_instance_id, stage_description, house, sort_order, stage_date, narrative
                    ) VALUES (%(bill_id)s, %(stage_instance_id)s, %(desc)s, %(house)s, %(sort_order)s, %(stage_date)s, %(narrative)s)
                    ON CONFLICT (stage_instance_id) DO NOTHING
                    """,
                    {
                        "bill_id": bill_id,
                        "stage_instance_id": stage_instance_id,
                        "desc": stage["description"],
                        "house": stage.get("house"),
                        "sort_order": stage.get("sortOrder"),
                        "stage_date": stage_date,
                        "narrative": narrative,
                    },
                )
            new_events += 1

        conn.commit()
        if i % 25 == 0:
            print(f"  processed {i}/{len(bills)} bills ({new_events} new stage events so far)")

    print(f"Done. {len(bills)} bills synced, {new_events} new stage events logged.")
    conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(run())
