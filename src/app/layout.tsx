import type { Metadata, Viewport } from "next";
import { FlashProvider } from "@/components/Flash";
import { Header } from "@/components/Header";
import { RouteProgress } from "@/components/RouteProgress";
import { Suspense } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "FUNKE", template: "%s · FUNKE" },
  description: "Kleine Gruppen setzen gemeinsam Vorhaben im echten Leben um.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f6efe4" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <a href="#inhalt" className="skip-link">
          Zum Inhalt springen
        </a>
        <Suspense fallback={null}>
          <RouteProgress />
        </Suspense>
        <Header />
        <main id="inhalt" tabIndex={-1}>
          <FlashProvider>{children}</FlashProvider>
        </main>
      </body>
    </html>
  );
}
