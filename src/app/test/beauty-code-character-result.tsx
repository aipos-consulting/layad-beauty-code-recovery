"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/app/i18n";
import { beautyCodeNickname } from "@/lib/beauty-code-labels";

type Character = { beauty_code: string; nickname: string; image_url: string | null };

export default function BeautyCodeCharacterResult() {
  const { locale } = useLanguage();
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [code, setCode] = useState<string>("");
  const [character, setCharacter] = useState<Character | null>(null);

  useEffect(() => {
    const locate = () => {
      const headings = Array.from(document.querySelectorAll("h1"));
      const resultHeading = headings.find((node) => /^[OD][GM][PC][VE]$/.test(node.textContent?.trim() ?? "")) as HTMLElement | undefined;
      if (!resultHeading) {
        document.getElementById("layad-character-result-mount")?.remove();
        setMount(null); setCode(""); setCharacter(null); return;
      }
      const nextCode = resultHeading.textContent?.trim() ?? "";
      let portalMount = document.getElementById("layad-character-result-mount");
      if (!portalMount) { portalMount = document.createElement("div"); portalMount.id = "layad-character-result-mount"; resultHeading.parentElement?.insertBefore(portalMount, resultHeading); }
      setMount(portalMount); setCode((current) => current === nextCode ? current : nextCode);
    };
    locate();
    const observer = new MutationObserver(locate);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!code) return;
    let active = true;
    fetch(`/api/beauty-code-character?code=${encodeURIComponent(code)}`, { cache: "no-store" })
      .then(async (response) => { const result = await response.json(); if (active) setCharacter(response.ok && result.ok ? result.character ?? null : null); })
      .catch(() => { if (active) setCharacter(null); });
    return () => { active = false; };
  }, [code]);

  if (!mount || !character || (!character.nickname && !character.image_url)) return null;
  return createPortal(
    <div className="mx-auto mt-5 flex w-full max-w-[360px] flex-col items-center text-center">
      {character.image_url ? (
        <div className="mb-4 flex w-full justify-center overflow-hidden rounded-[28px] bg-[#fff7f8] shadow-[0_12px_30px_rgba(120,70,80,0.12)]">
          <img
            src={character.image_url}
            alt={`${character.beauty_code} character`}
            className="block h-auto w-full max-w-[340px] object-contain"
          />
        </div>
      ) : null}
      <p className="mb-1 text-base font-semibold text-[#5f5053] sm:text-lg">{beautyCodeNickname(character.beauty_code, locale, character.nickname)}</p>
    </div>, mount
  );
}
