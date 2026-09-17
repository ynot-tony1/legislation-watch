import type { Metadata } from "next";
import { Newsreader, Inter } from "next/font/google";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import "./globals.css";

const heading = Newsreader({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f9f7f2" }],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${heading.variable} ${sans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background">
        <div className="h-1.5 bg-primary" aria-hidden />
        <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex size-7 items-center justify-center rounded-sm bg-primary font-heading text-sm font-semibold text-primary-foreground">
                LW
              </span>
              <span className="font-heading text-lg font-semibold tracking-tight">Legislation Watch</span>
            </Link>
            <div className="flex items-center gap-5">
              <Link
                href="/sectors"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Business Impact
              </Link>
              <a
                href="https://bills-api.parliament.uk"
                target="_blank"
                rel="noreferrer"
                className="hidden items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
              >
                Data source: UK Parliament Bills API
                <ExternalLink className="size-3" aria-hidden />
              </a>
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t py-6">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-6 text-xs text-muted-foreground">
            <span>Synced regularly from the UK Parliament Bills API.</span>
            <span>Stage history is append-only - nothing is ever rewritten once logged.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
