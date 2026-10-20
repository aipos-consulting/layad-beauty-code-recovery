"use client";

import { useEffect } from "react";

export default function LayadHiddenEventPopup({onClose,beautyCode}:{onClose:()=>void;beautyCode:string}) {
  useEffect(() => {
    const previous=document.body.style.overflow;
    document.body.style.overflow="hidden";
    const keydown=(event:KeyboardEvent)=>{if(event.key==="Escape")onClose();};
    window.addEventListener("keydown",keydown);
    return ()=>{document.body.style.overflow=previous;window.removeEventListener("keydown",keydown);};
  },[onClose]);

  return <div className="fixed inset-0 z-[250] flex items-start justify-center bg-black/10 px-3 pt-[40dvh] pb-3 sm:pt-[35dvh]"
    onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}>
    <section role="dialog" aria-modal="true" aria-label="LAYAD HIDDEN EVENT" className="relative max-h-[57dvh] w-full max-w-[330px] overflow-y-auto rounded-xl border border-white/80 bg-white shadow-[0_14px_45px_rgba(0,0,0,.27)] sm:max-h-[60dvh] sm:max-w-[350px]">
      <button type="button" onClick={onClose} aria-label="이벤트 팝업 닫기"
        className="sticky top-2 right-2 z-20 float-right -mb-11 mr-2 mt-2 flex h-9 w-9 items-center justify-center rounded-full bg-white text-2xl text-[#17334a] shadow-md">×</button>
      <div className="relative clear-both">
        <img src="/layad-hidden-event-original.svg" alt="LAYAD HIDDEN EVENT, 유형별 제품 추천도와 30% 할인 이벤트" width={357} height={2048}
          className="block h-auto w-full" />
        <a href="https://layadseoul.com/shop_view?idx=9" onClick={() => { void fetch("/api/hidden-event-click",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"discount_click",beautyCode}),keepalive:true}).catch(()=>{}); }} target="_blank" rel="noopener noreferrer"
          aria-label="30% 할인 비밀 링크 - LAYAD 상품 상세 페이지"
          className="absolute left-[25.5%] top-[84.3%] h-[2.5%] w-[52%] cursor-pointer" />
      </div>
    </section>
  </div>;
}
