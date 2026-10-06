import type { ReactNode } from "react";
import BeautyCodeCharacterResult from "./beauty-code-character-result";
import ResultTopProducts from "./result-top-products";
import ResultShareBridge from "./result-share-bridge";

export default function TestLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <BeautyCodeCharacterResult />
      <ResultTopProducts />
      <ResultShareBridge />
    </>
  );
}
