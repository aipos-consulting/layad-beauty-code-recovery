"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Character = {
  beauty_code: string;
  nickname: string;
  image_url: string | null;
};

export default function BeautyCodeCharacterResult() {
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [code, setCode] = useState<string>("");
  const [character, setCharacter] = useState<Character | null>(null);

  useEffect(() => {
    const locate = () => {
      const headings = Array.from(document.querySelectorAll("h1"));
      const resultHeading = headings.find((node) => /^[OD][GM][PC][VE]$/.test(node.textContent?.trim() ?? "")) as HTMLElement | undefined;
      if (!resultHeading) {
        const oldMount = document.getElementById("layad-character-result-mount");
        oldMount?.remove();
        setMount(null);
        setCode("");
        setCharacter(null);
        return;
      }

      const nextCode = resultHeading.textContent?.trim() ?? "";
      let portalMount = document.getElementById("layad-character-result-mount");
      if (!portalMount) {
        portalMount = document.createElement("div");
        portalMount.id = "layad-character-result-mount";
        resultHeading.parentElement?.insertBefore(portalMount, resultHeading);
      }
      setMount(portalMount);
      setCode((current) => current === nextCode ? current : nextCode);
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
      .then(async (response) => {
        const result = await response.json();
        if (!active) return;
        setCharacter(response.ok && result.ok ? result.character ?? null : null);
      })
      .catch(() => { if (active) setCharacter(null); });
    return () => { active = false; };
  }, [code]);

  if (!mount || !character || (!character.nickname && !character.image_url)) return null;

  return createPortal(
    <div className="mx-auto mt-5 flex max-w-[280px] flex-col items-center text-center sm:max-w-[320px]">
      {character.image_url ? (
        <div className="mb-4 aspect-square w-[148px] overflow-hidden rounded-[28px] bg-[#fff7f8] shadow-[0_12px_30px_rgba(120,70,80,0.12)] sm:w-[176px]">
          <img src={character.image_url} alt={`${character.beauty_code} 캐릭터`} className="h-full w-full object-cover" />
        </div>
      ) : null}
      {character.nickname ? (
        <p className="mb-1 text-base font-semibold text-[#5f5053] sm:text-lg">{character.nickname}</p>
      ) : null}
    </div>,
    mount
  );
}
