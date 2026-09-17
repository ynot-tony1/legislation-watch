import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import "./globals.css";

const sans = Space_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "Legislation Watch",
    template: "%s · Legislation Watch",
  },
  description:
    "Plain-language tracking of UK Parliament bills as they move through each stage, sourced from the official Bills API.",
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfcfb" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a19" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} dark h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[var(--viz-surface,var(--background))]">
        <header className="sticky top-0 z-20 h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
          <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-6">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-md bg-foreground text-[11px] font-bold text-background">
                LW
              </span>
              <span className="text-sm font-semibold tracking-tight">Legislation Watch</span>
            </Link>
            <a
              href="https://bills-api.parliament.uk"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Data source: UK Parliament Bills API
              <ExternalLink className="size-3" aria-hidden />
            </a>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t py-6">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 text-xs text-muted-foreground">
            <span>Synced regularly from the UK Parliament Bills API.</span>
            <span>Stage history is append-only - nothing is ever rewritten once logged.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
