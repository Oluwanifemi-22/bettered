import type { Metadata } from "next";
import { Geist, Geist_Mono, DM_Serif_Display } from "next/font/google";
import Image from "next/image";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dmSerif = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BetterEd",
  description: "A student collaboration platform for university courses.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BetterEd",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#faf7f5] text-[#1f1f1f]">
        <meta name="theme-color" content="#8C1515" />
        <header className="sticky top-0 z-50 border-b border-[#ead7d7] bg-white/90 backdrop-blur">
          <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <a href="/" className="flex items-center gap-3">
              <Image
                src="/bettered-logo.png"
                alt="BetterEd logo"
                width={100}
                height={100}
                priority
              />

              <span
                className={`${dmSerif.className} text-3xl tracking-tight text-[#8C1515]`}
              >
                BetterEd
              </span>
            </a>

            <div className="flex items-center gap-6 text-sm font-medium text-neutral-700">
              <a className="transition hover:text-[#8C1515]" href="/">
                Discussions
              </a>
              <a className="transition hover:text-[#8C1515]" href="/sessions">
                Sessions
              </a>
              <a className="transition hover:text-[#8C1515]" href="/groups">
                Groups
              </a>
              <a className="transition hover:text-[#8C1515]" href="/profile">
                Profile
              </a>
              <a className="transition hover:text-[#8C1515]" href="/admin">
                Admin
              </a>
            </div>
          </nav>
        </header>

        <main className="mx-auto min-h-screen max-w-7xl px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}