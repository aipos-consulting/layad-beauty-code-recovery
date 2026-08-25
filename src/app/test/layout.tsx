import type { ReactNode } from "react";
import BeautyCodeCharacterResult from "./beauty-code-character-result";

export default function TestLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <BeautyCodeCharacterResult />
    </>
  );
}
