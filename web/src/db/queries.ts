import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "./client";
import { bills, billStageEvents } from "./schema";

export type BillRow = typeof bills.$inferSelect;
export type BillStageEventRow = typeof billStageEvents.$inferSelect;

export async function getTopicsWithCounts(): Promise<{ topic: string; count: number }[]> {
  if (!db) return [];
  const result = await db.execute(sql`
    SELECT topic, count(*) AS count FROM bills GROUP BY topic ORDER BY count DESC
  `);
  return (result.rows as unknown as { topic: string; count: string }[]).map((r) => ({
    topic: r.topic,
    count: Number(r.count),
  }));
}

export async function getBills(): Promise<BillRow[]> {
  if (!db) return [];
  return db.select().from(bills).orderBy(desc(bills.lastUpdate));
}

export async function getBillByBillId(billId: number): Promise<BillRow | null> {
  if (!db) return null;
  const rows = await db.select().from(bills).where(eq(bills.billId, billId)).limit(1);
  return rows[0] ?? null;
}

export async function getBillStageEvents(billId: number): Promise<BillStageEventRow[]> {
  if (!db) return [];
  return db
    .select()
    .from(billStageEvents)
    .where(eq(billStageEvents.billId, billId))
    .orderBy(asc(billStageEvents.sortOrder), asc(billStageEvents.detectedAt));
}

export type SectorActivity = {
  topic: string;
  activeBills: number;
  recentStageEvents: number;
  mostRecentBillId: number | null;
  mostRecentBillTitle: string | null;
  mostRecentStageDescription: string | null;
};

/**
 * Real, grounded proxy for "which business sectors are seeing legislative
 * momentum right now" - built entirely from data already in the pipeline
 * (topic classification + the append-only stage event log), not invented
 * per-company predictions. "other" (unclassified bills) is excluded since
 * it isn't a real sector.
 */
export async function getSectorActivity(): Promise<SectorActivity[]> {
  if (!db) return [];
  const result = await db.execute(sql`
    WITH topic_counts AS (
      SELECT topic, count(*) AS active_bills
      FROM bills
      WHERE topic != 'other'
      GROUP BY topic
    ),
    recent_events AS (
      SELECT b.topic, count(e.id) AS recent_stage_events
      FROM bills b
      JOIN bill_stage_events e ON e.bill_id = b.bill_id
      WHERE e.detected_at > now() - interval '30 days' AND b.topic != 'other'
      GROUP BY b.topic
    ),
    latest_per_topic AS (
      SELECT DISTINCT ON (b.topic)
        b.topic,
        b.bill_id AS bill_id,
        b.short_title AS short_title,
        e.stage_description AS stage_description
      FROM bills b
      JOIN bill_stage_events e ON e.bill_id = b.bill_id
      WHERE b.topic != 'other'
      ORDER BY b.topic, e.detected_at DESC
    )
    SELECT
      tc.topic AS topic,
      tc.active_bills AS "activeBills",
      COALESCE(re.recent_stage_events, 0) AS "recentStageEvents",
      lpt.bill_id AS "mostRecentBillId",
      lpt.short_title AS "mostRecentBillTitle",
      lpt.stage_description AS "mostRecentStageDescription"
    FROM topic_counts tc
    LEFT JOIN recent_events re ON re.topic = tc.topic
    LEFT JOIN latest_per_topic lpt ON lpt.topic = tc.topic
    ORDER BY "recentStageEvents" DESC, tc.active_bills DESC
  `);
  return result.rows as unknown as SectorActivity[];
}
