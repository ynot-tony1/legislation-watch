"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { topicLabel } from "@/lib/topics";
import { formatDate } from "@/lib/format";
import type { BillRow } from "@/db/queries";
import { cn } from "cn";

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
      <nav aria-label="Filter by topic" className="sticky top-14 z-10 -mx-6 overflow-x-auto border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <ul className="flex min-w-max gap-1 py-2">
          <li>
            <button
              type="button"
              onClick={() => selectTopic(ALL)}
              className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors",
                active === ALL ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              All
              <span className={cn("font-mono text-xs tabular-nums", active === ALL ? "text-background/70" : "text-muted-foreground/70")}>
                {bills.length}
              </span>
            </button>
          </li>
          {topics.map(({ topic, count }) => (
            <li key={topic}>
              <button
                type="button"
                onClick={() => selectTopic(topic)}
                className={cn(
                  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors",
                  active === topic ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {topicLabel(topic)}
                <span className={cn("font-mono text-xs tabular-nums", active === topic ? "text-background/70" : "text-muted-foreground/70")}>
                  {count}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="grid grid-cols-1 gap-4 py-8 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((bill) => (
          <Link key={bill.billId} href={`/bills/${bill.billId}`}>
            <Card className="h-full transition-colors hover:border-foreground/30">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="text-xs">
                    {topicLabel(bill.topic)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{bill.currentHouse}</span>
                </div>
                <CardTitle className="text-base leading-snug">{bill.shortTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{bill.currentStageDescription ?? "—"}</p>
                <p className="mt-2 text-xs text-muted-foreground">Updated {formatDate(bill.lastUpdate)}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
        {shown.length === 0 && (
          <p className="col-span-full py-16 text-center text-sm text-muted-foreground">No bills in this topic yet.</p>
        )}
      </div>
    </>
  );
}
