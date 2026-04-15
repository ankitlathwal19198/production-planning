import "./globals.css";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import NavbarServer from "@/components/NavbarServer";
import Footer from "@/components/Footer";
import GlobalDataLoader from "@/components/GlobalDataLoader";
import { Toaster } from "react-hot-toast";
import Providers from "./providers";
import { Suspense } from "react";

export const metadata = {
  title: "HR Exports Accounts App",
  description: "Cash inflow & outflow tracking for Accounts Dept.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <html lang="en" suppressHydrationWarning>
        <body className="bg-gray-50 text-gray-900">
          <Suspense fallback={<div>Loading...</div>}>
            <NavbarServer />
            <main className="mx-auto px-4 py-8 bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950 dark:text-white min-h-screen">
              <Providers>
                <GlobalDataLoader />
                {children}
              </Providers>
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 3000,
                  className:
                    "rounded-xl bg-white/90 text-slate-900 shadow-lg backdrop-blur dark:bg-slate-900/90 dark:text-white",
                }}
              />
            </main>
            <Footer />
          </Suspense>
        </body>
      </html>
    </ThemeProvider>
  );
}
