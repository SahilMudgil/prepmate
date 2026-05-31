import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PrepMate",
  description: "Your personalized study companion",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}>
        <Providers>
          
          {/* --- PERMANENT NAVBAR STARTS HERE --- */}
          <nav className="w-full bg-white/90 backdrop-blur-md border-b border-gray-200 px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm transition-all">
            <Link 
              href="/" 
              className="text-xl sm:text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-2"
            >
              {/* Added shrink-0 so the logo icon never gets squished */}
              <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477-4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              PrepMate
            </Link>
            
            {/* Added hidden sm:block to keep the mobile view uncluttered */}
            <div className="hidden sm:block text-sm text-gray-500 font-medium">
              Your AI Study Companion
            </div>
          </nav>
          {/* --- PERMANENT NAVBAR ENDS HERE --- */}

          {/* This is where all your individual pages render */}
          <main className="min-h-screen">
            {children}
          </main>

        </Providers>
      </body>
    </html>
  );
}