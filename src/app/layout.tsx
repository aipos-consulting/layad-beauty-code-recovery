import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import UiAdjustments from "./ui-adjustments";
import AnonymousDataCapture from "./anonymous-data-capture";
import AnalysisProcessingFeedback from "./analysis-processing-feedback";
import { LanguageProvider } from "./i18n";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LAYAD BEAUTY CODE",
  description: "Create your Beauty Code and review product fit information.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <LanguageProvider>
          {children}
          <UiAdjustments />
          <AnonymousDataCapture />
          <AnalysisProcessingFeedback />
        </LanguageProvider>
      </body>
    </html>
  );
}
