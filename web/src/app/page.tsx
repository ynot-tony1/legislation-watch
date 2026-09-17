import { getBills, getTopicsWithCounts } from "@/db/queries";
import { isDbConfigured } from "@/db/client";
import { BillBrowser } from "@/components/bill-browser";
import { DbNotConfigured, EmptyState } from "@/components/state-messages";

export const revalidate = 3600;

export default async function Home() {
  if (!isDbConfigured) {
    return <DbNotConfigured />;
  }

  const [bills, topics] = await Promise.all([getBills(), getTopicsWithCounts()]);

  return (
    <div className="mx-auto max-w-3xl px-6">
      <div className="pt-10 pb-2">
        <h1 className="text-3xl font-semibold tracking-tight">Legislation Watch</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {bills.length} bills currently moving through the UK Parliament, translated from procedural jargon into
          plain language as each one advances.
        </p>
      </div>

      {bills.length === 0 ? <EmptyState /> : <BillBrowser bills={bills} topics={topics} />}
    </div>
  );
}
