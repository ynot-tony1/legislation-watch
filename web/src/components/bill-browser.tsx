"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { topicLabel } from "@/lib/topics";
import { formatDate } from "@/lib/format";
import type { BillRow } from "@/db/queries";

const ALL = "all";

export function BillBrowser({
  bills,
  topics,
}: {
  bills: BillRow[];
  topics: { topic: string; count: number }[];
}) {
  const [active, setActive] = useState(ALL);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("topic");
    if (requested && (requested === ALL || topics.some((t) => t.topic === requested))) {
      setActive(requested);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectTopic(topic: string) {
    setActive(topic);
    const params = new URLSearchParams(window.location.search);
    if (topic === ALL) {
      params.delete("topic");
    } else {
      params.set("topic", topic);
    }
    const query = params.toString();
    const url = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }

  const shown = active === ALL ? bills : bills.filter((b) => b.topic === active);

  return (
    <>
      <div className="sticky top-16 z-10 -mx-6 flex items-center gap-3 border-b bg-background/95 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <label htmlFor="topic-select" className="text-sm text-muted-foreground">
          Topic
        </label>
        <Select value={active} onValueChange={selectTopic}>
          <SelectTrigger id="topic-select" size="sm" className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All topics ({bills.length})</SelectItem>
            {topics.map(({ topic, count }) => (
              <SelectItem key={topic} value={topic}>
                {topicLabel(topic)} ({count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ol className="divide-y border-t">
        {shown.map((bill) => (
          <li key={bill.billId}>
            <Link
              href={`/bills/${bill.billId}`}
              className="flex flex-col gap-1.5 px-1 py-4 transition-colors hover:bg-secondary/60 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <div className="min-w-0">
                <h3 className="truncate font-heading text-base font-medium">{bill.shortTitle}</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">{bill.currentStageDescription ?? "—"}</p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2 text-xs">
                <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
                  {topicLabel(bill.topic)}
                </Badge>
                <span className="text-muted-foreground">{bill.currentHouse}</span>
                <span className="hidden text-muted-foreground sm:inline">· {formatDate(bill.lastUpdate)}</span>
              </div>
            </Link>
          </li>
        ))}
        {shown.length === 0 && (
          <li className="py-16 text-center text-sm text-muted-foreground">No bills in this topic yet.</li>
        )}
      </ol>
    </>
  );
}
