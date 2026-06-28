import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Nav } from "@/components/nav";
import { Toaster } from "@/components/ui/sonner";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Dossier",
  description: "PhD application tracker",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={geist.className} suppressHydrationWarning>
      <head>
        {/* Runs synchronously before first paint to prevent dark mode flash */}
        <script>{`(function(){var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}})()`}</script>
      </head>
      <body className="min-h-screen bg-background text-foreground">
        <Providers>
          <Nav />
          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
          <Toaster position="bottom-right" />
        </Providers>
      </body>
    </html>
  );
}
