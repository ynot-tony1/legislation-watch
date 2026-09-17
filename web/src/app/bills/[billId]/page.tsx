import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getBillByBillId, getBillStageEvents, getBills, getSectorActivity } from "@/db/queries";
import { isDbConfigured } from "@/db/client";
import { Badge } from "@/components/ui/badge";
import { DbNotConfigured } from "@/components/state-messages";
import { topicLabel } from "@/lib/topics";
import { formatDate, formatDateTime } from "@/lib/format";

export const revalidate = 3600;

export async function generateStaticParams() {
  const bills = await getBills();
  return bills.slice(0, 24).map((b) => ({ billId: String(b.billId) }));
}

export async function generateMetadata({
  params,
}: PageProps<"/bills/[billId]">): Promise<Metadata> {
  const { billId } = await params;
  const bill = await getBillByBillId(Number(billId));
  if (!bill) return {};
  return { title: bill.shortTitle };
}

export default async function BillPage({ params }: PageProps<"/bills/[billId]">) {
  const { billId } = await params;

  if (!isDbConfigured) {
    return <DbNotConfigured />;
  }

  const numericId = Number(billId);
  if (Number.isNaN(numericId)) notFound();

  const bill = await getBillByBillId(numericId);
  if (!bill) notFound();

  const [events, sectors] = await Promise.all([getBillStageEvents(numericId), getSectorActivity()]);
  const sectorRank = sectors.findIndex((s) => s.topic === bill.topic);
  const sector = sectorRank === -1 ? null : sectors[sectorRank];
  const isTopHalfSector = sector !== null && sectorRank < sectors.length / 2;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden /> Back to all bills
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">{topicLabel(bill.topic)}</Badge>
            <span>{bill.currentHouse}</span>
            {bill.leadOrganisation && <span>· {bill.leadOrganisation}</span>}
          </div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{bill.shortTitle}</h1>
          {bill.longTitle && <p className="mt-2 text-sm text-muted-foreground">{bill.longTitle}</p>}
        </div>
        {bill.sourceUrl && (
          <a
            href={bill.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            View on bills.parliament.uk <ExternalLink className="size-3" aria-hidden />
          </a>
        )}
      </div>

      <div className="mt-6 rounded-sm border border-l-4 border-l-primary bg-card p-4">
        <div className="text-xs text-muted-foreground">Current stage</div>
        <div className="mt-1 font-medium">{bill.currentStageDescription ?? "—"}</div>
        {bill.isAct && (
          <Badge className="mt-2 bg-primary text-primary-foreground">Became law</Badge>
        )}
        {bill.isDefeated && (
          <Badge variant="outline" className="mt-2">
            Defeated
          </Badge>
        )}
      </div>

      {sector && (
        <p className="mt-6 text-sm text-muted-foreground">
          Business impact:{" "}
          <Link href="/sectors" className="text-primary underline underline-offset-2">
            {topicLabel(bill.topic)}
          </Link>{" "}
          currently has {sector.activeBills} bill{sector.activeBills === 1 ? "" : "s"} in motion and{" "}
          {sector.recentStageEvents} stage advance{sector.recentStageEvents === 1 ? "" : "s"} across the sector in
          the last 30 days
          {isTopHalfSector ? " - more legislative movement than most sectors we track right now." : "."}
        </p>
      )}

      <div className="mt-10">
        <h2 className="mb-4 font-heading text-lg font-medium">Progress through Parliament</h2>
        <ol className="space-y-6 border-l-2 border-primary/20 pl-6">
          {events.map((event) => (
            <li key={event.id} className="relative">
              <span className="absolute -left-[29px] top-1 size-2.5 rounded-full bg-primary" aria-hidden />
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-sm font-medium">{event.stageDescription}</span>
                {event.house && <span className="text-xs text-muted-foreground">{event.house}</span>}
                <span className="text-xs text-muted-foreground">
                  {event.stageDate ? formatDate(event.stageDate) : `logged ${formatDateTime(event.detectedAt)}`}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{event.narrative}</p>
            </li>
          ))}
          {events.length === 0 && <p className="text-sm text-muted-foreground">No stage history recorded yet.</p>}
        </ol>
      </div>
    </div>
  );
}
