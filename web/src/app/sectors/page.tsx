import type { Metadata } from "next";
import Link from "next/link";
import { getSectorActivity } from "@/db/queries";
import { isDbConfigured } from "@/db/client";
import { DbNotConfigured } from "@/components/state-messages";
import { topicLabel } from "@/lib/topics";

export const revalidate = 3600;

export const metadata: Metadata = { title: "Business Impact by Sector" };

export default async function SectorsPage() {
  if (!isDbConfigured) {
    return <DbNotConfigured />;
  }

  const sectors = await getSectorActivity();
  const maxEvents = Math.max(1, ...sectors.map((s) => s.recentStageEvents));

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
        ← All bills
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Business Impact by Sector</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        We don&apos;t predict how a bill will affect any specific company - there&apos;s no reliable public data
        linking bills to named businesses, and inventing that would just be guessing. What we can show honestly is
        real: how many bills are currently active per sector, and how much legislative movement each sector has seen
        in the last 30 days. Sustained movement in a sector is a genuine signal of regulatory change businesses in
        that space should be watching.
      </p>

      <ol className="mt-8 divide-y border-t border-b">
        {sectors.map((s) => (
          <li key={s.topic} className="py-4">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-heading text-lg font-medium">{topicLabel(s.topic)}</h2>
              <span className="text-sm text-muted-foreground">
                {s.activeBills} active bill{s.activeBills === 1 ? "" : "s"}
              </span>
            </div>

            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.max(4, (s.recentStageEvents / maxEvents) * 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {s.recentStageEvents} stage advance{s.recentStageEvents === 1 ? "" : "s"} across this sector in the
              last 30 days
            </p>

            {s.mostRecentBillId && s.mostRecentBillTitle && (
              <p className="mt-2 text-sm">
                Most recent movement:{" "}
                <Link href={`/bills/${s.mostRecentBillId}`} className="text-primary underline underline-offset-2">
                  {s.mostRecentBillTitle}
                </Link>{" "}
                <span className="text-muted-foreground">({s.mostRecentStageDescription})</span>
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
