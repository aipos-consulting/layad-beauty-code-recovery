import type { Metadata } from "next";
import { League_Spartan, Source_Code_Pro } from "next/font/google";
import "./globals.css";
import UiAdjustments from "./ui-adjustments";
import AnonymousDataCapture from "./anonymous-data-capture";
import AnalysisProcessingFeedback from "./analysis-processing-feedback";
import AdminAiWorkflow from "./admin-ai-workflow";
import AdminDataManagementNav from "./admin-data-management-nav";
import AdminVisualTheme from "./admin-visual-theme";
import ProductFitInputBridge from "./product-fit-input-bridge";
import UserBottomTabs from "./user-bottom-tabs";
import { LanguageProvider } from "./i18n";

const leagueSpartan = League_Spartan({
  variable: "--font-league-spartan",
  subsets: ["latin"],
});

const sourceCode = Source_Code_Pro({
  variable: "--font-source-code",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LAYAD BEAUTY CODE",
  description: "Create your Beauty Code and review product fit information.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={`${leagueSpartan.variable} ${sourceCode.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col pb-20 md:pb-0">
        <LanguageProvider>
          {children}
          <UserBottomTabs />
          <UiAdjustments />
          <AnalysisProcessingFeedback />
          <AnonymousDataCapture />
          <AdminAiWorkflow />
          <AdminDataManagementNav />
          <AdminVisualTheme />
          <ProductFitInputBridge />
        </LanguageProvider>
      </body>
    </html>
  );
}
