import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const bills = pgTable("bills", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull().unique(),
  shortTitle: text("short_title").notNull(),
  longTitle: text("long_title"),
  currentHouse: text("current_house"),
  originatingHouse: text("originating_house"),
  currentStageDescription: text("current_stage_description"),
  currentStageHouse: text("current_stage_house"),
  currentStageSortOrder: integer("current_stage_sort_order"),
  isAct: boolean("is_act").notNull().default(false),
  isDefeated: boolean("is_defeated").notNull().default(false),
  billWithdrawn: timestamp("bill_withdrawn", { withTimezone: true }),
  topic: text("topic").notNull().default("other"),
  leadOrganisation: text("lead_organisation"),
  lastUpdate: timestamp("last_update", { withTimezone: true }),
  sourceUrl: text("source_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const billStageEvents = pgTable("bill_stage_events", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull(),
  stageInstanceId: integer("stage_instance_id").notNull().unique(),
  stageDescription: text("stage_description").notNull(),
  house: text("house"),
  sortOrder: integer("sort_order"),
  stageDate: timestamp("stage_date", { withTimezone: true }),
  narrative: text("narrative").notNull(),
  detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
});
