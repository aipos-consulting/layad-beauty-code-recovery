import type { ReactNode } from "react";
import BeautyCodeCharacterResult from "./beauty-code-character-result";
import ResultShareBridge from "./result-share-bridge";

export default function TestLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <BeautyCodeCharacterResult />
      <ResultShareBridge />
    </>
  );
}
