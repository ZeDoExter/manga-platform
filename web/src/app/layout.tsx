import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource/dela-gothic-one";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/literata";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import { AppProvider } from "@/lib/store";
import { EconomyProvider } from "@/lib/economy-store";
import { Shell } from "@/components/Shell";

export const metadata: Metadata = {
  title: "TSUZUKU つづく — Manga, Manhwa & Novels, to be continued",
  description:
    "A next-generation reading universe for manga, manhwa, manhua, light novels, web novels and original fiction. Spoiler-safe lore, a living reading room and a creator studio.",
};

export const viewport: Viewport = {
  themeColor: "#f2ede2",
  width: "device-width",
  initialScale: 1,
};

const themeScript = `try{var s=JSON.parse(localStorage.getItem('tsuzuku.v1')||'{}');if(s.theme){document.documentElement.dataset.theme=s.theme}}catch(e){}`;

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
