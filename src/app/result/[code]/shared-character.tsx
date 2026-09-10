"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/app/i18n";

type Character = {
  beauty_code: string;
  nickname: string;
  image_url: string | null;
};

export default function SharedCharacter({ code }: { code: string }) {
  const { locale } = useLanguage();
  const [character, setCharacter] = useState<Character | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/beauty-code-character?code=${encodeURIComponent(code)}&locale=${locale}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((result) => {
        if (active) setCharacter(result.character ?? null);
      })
      .catch(() => {
        if (active) setCharacter(null);
      });
    return () => {
      active = false;
    };
  }, [code, locale]);

  if (!character?.image_url) return null;

  return (
    <div className="mx-auto mt-7 w-full max-w-[340px] text-center">
      <div className="overflow-hidden rounded-[28px] bg-[#fff7f8] shadow-[0_12px_30px_rgba(120,70,80,0.12)]">
        <img
          src={character.image_url}
          alt={`${character.beauty_code} character`}
          className="block h-auto w-full object-contain"
        />
      </div>
      {character.nickname ? <p className="mt-3 text-base font-semibold text-[#5f5053]">{character.nickname}</p> : null}
    </div>
  );
}
