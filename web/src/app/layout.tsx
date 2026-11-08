import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource/kanit/800.css";
import "@fontsource/kanit/900.css";
import "@fontsource/mitr/600.css";
import "@fontsource/mitr/700.css";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/literata";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import { AppProvider } from "@/lib/store";
import { EconomyProvider } from "@/lib/economy-store";
import { Shell } from "@/components/Shell";

export const metadata: Metadata = {
  title: "DOOTOON ดูตูน — Manga, Manhwa & Novels",
  description:
    "A next-generation reading universe for manga, manhwa, manhua, light novels, web novels and original fiction. Spoiler-safe lore, a living reading room and a creator studio.",
};

export const viewport: Viewport = {
  themeColor: "#f2ede2",
  width: "device-width",
  initialScale: 1,
};

const themeScript = `try{var s=JSON.parse(localStorage.getItem('dootoon.v1')||'{}');if(s.theme){document.documentElement.dataset.theme=s.theme}}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AppProvider>
          <EconomyProvider>
            <Shell>{children}</Shell>
          </EconomyProvider>
        </AppProvider>
      </body>
    </html>
  );
}
