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
