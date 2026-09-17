-- Legislative Tracker schema (CockroachDB / Postgres-compatible)
-- Source: UK Parliament Bills API (https://bills-api.parliament.uk), no auth required.

CREATE TABLE IF NOT EXISTS bills (
    id                          SERIAL PRIMARY KEY,
    bill_id                     INTEGER UNIQUE NOT NULL,
    short_title                 TEXT NOT NULL,
    long_title                  TEXT,
    current_house                TEXT,
    originating_house            TEXT,
    current_stage_description    TEXT,
    current_stage_house          TEXT,
    current_stage_sort_order     INTEGER,
    is_act                       BOOLEAN NOT NULL DEFAULT false,
    is_defeated                  BOOLEAN NOT NULL DEFAULT false,
    bill_withdrawn               TIMESTAMPTZ,
    topic                        TEXT NOT NULL DEFAULT 'other',
    lead_organisation            TEXT,
    last_update                  TIMESTAMPTZ,
    source_url                   TEXT,
    created_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Append-only event log: one row per stage instance a bill has actually
-- reached. Never updated in place - a new sync run only INSERTs rows for
-- stage instances (by the API's own billStage id) it hasn't seen before.
CREATE TABLE IF NOT EXISTS bill_stage_events (
    id                  SERIAL PRIMARY KEY,
    bill_id             INTEGER NOT NULL REFERENCES bills(bill_id),
    stage_instance_id   INTEGER UNIQUE NOT NULL,
    stage_description   TEXT NOT NULL,
    house               TEXT,
    sort_order          INTEGER,
    stage_date          TIMESTAMPTZ,
    narrative           TEXT NOT NULL,
    detected_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bill_stage_events_bill_id ON bill_stage_events (bill_id);
CREATE INDEX IF NOT EXISTS idx_bills_topic ON bills (topic);
