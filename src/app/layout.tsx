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
    <html lang="en" className="overflow-x-hidden scroll-smooth">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 text-gray-900 min-h-screen overflow-x-hidden flex flex-col`}>
        <Providers>
          
          {/* --- PERMANENT NAVBAR STARTS HERE --- */}
          <nav className="w-full bg-white/90 backdrop-blur-md border-b border-gray-200 px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm transition-all box-border">
            <Link 
              href="/" 
              className="text-xl sm:text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-2 shrink-0 select-none"
            >
              {/* FIXED BOOK SVG: Completely replaced the broken path with a perfectly symmetrical Book Open icon */}
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="w-6 h-6 shrink-0 text-blue-600"
              >
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              <span>PrepMate</span>
            </Link>
            
            {/* Kept hidden on small devices to keep mobile view clean */}
            <div className="hidden sm:block text-sm text-gray-500 font-medium select-none">
              Your AI Study Companion
            </div>
          </nav>
          {/* --- PERMANENT NAVBAR ENDS HERE --- */}

          {/* Core App Viewport container */}
          <main className="flex-1 w-full box-border">
            {children}
          </main>

        </Providers>
      </body>
    </html>
  );
}