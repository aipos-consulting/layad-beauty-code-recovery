"use client";
import { useEffect } from "react";

const scores = [
 ["DGPE",99],["DGPV",99],["DGCV",92],["DMPV",86],
 ["OGPE",95],["OGPV",94],["OGCE",74],["DMCV",71],
 ["DGCE",91],["OGCV",73],["OMPV",56],["OMPE",55],
 ["DMPE",85],["DMCE",70],["OMCE",49],["OMCV",48],
] as const;
const reasons=[
 ["DGPE, DGPV","메이크업 밀착력과 지속력을 높여 하루 종일 깨끗한 피부 표현을 도와줍니다."],
 ["OGPE, OGPV","자연스러운 윤광을 살려 생기 있는 피부 연출을 돕습니다."],
 ["DGCV, DGCE, OGCV, OGCE","여러 단계의 메이크업을 한 겹으로 정돈해 피부를 매끄럽게 표현하도록 돕습니다."],
 ["DMPV, DMPE","매트한 피부에도 촉촉한 윤기를 더하는 베이스 연출에 활용할 수 있습니다."],
 ["DMCV, DMCE","유분과 수분의 균형을 고려한 메이크업에 활용할 수 있습니다."],
 ["OMCV, OMCE","피부 상태에 따라 추가 베이스가 필요하지 않을 수도 있습니다."],
] as const;

export default function LayadHiddenEventPopup({onClose,beautyCode}:{onClose:()=>void;beautyCode:string}) {
 useEffect(()=>{
  const before=document.body.style.overflow;
  document.body.style.overflow="hidden";
  const handler=(e:KeyboardEvent)=>{if(e.key==="Escape")onClose();};
  window.addEventListener("keydown",handler);
  return ()=>{document.body.style.overflow=before;window.removeEventListener("keydown",handler);};
 },[onClose]);
 return <div className="fixed inset-0 z-[250] flex items-center justify-center bg-[#172942]/70 p-2 backdrop-blur-sm sm:p-6" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
  <section role="dialog" aria-modal="true" aria-label="LAYAD HIDDEN EVENT" className="relative max-h-[95dvh] w-full max-w-[650px] overflow-y-auto rounded-[25px] bg-[#fcfaf7] text-[#075bac] shadow-[0_24px_85px_rgba(0,0,0,.35)]">
   <button type="button" aria-label="이벤트 팝업 닫기" onClick={onClose} className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[30px] leading-none text-[#1b2530] shadow">×</button>
   <header className="grid grid-cols-[55%_45%] overflow-hidden bg-[linear-gradient(110deg,#fbfaf6_0%,#fbfaf6_55%,#d9919f_55%,#dfa5aa_100%)] px-5 py-8 sm:px-10 sm:py-10">
    <div className="z-10"><h2 className="text-[clamp(31px,8vw,62px)] font-black leading-[.9] tracking-[-.07em]">LAYAD<br/><span className="font-light" style={{WebkitTextStroke:"1px #075bac",color:"transparent"}}>HIDDEN</span><br/>EVENT</h2><p className="mt-4 text-[11px] font-semibold leading-snug sm:text-sm">비밀 이벤트, 테스트를 마친 당신에게</p></div>
    <div className="relative flex items-center justify-center" aria-label="LAYAD 제품">
     <div className="absolute h-[150px] w-[150px] rounded-full bg-[#f6c2c7] blur-2xl"/>
     <div className="relative mt-5 rotate-[9deg] drop-shadow-[12px_15px_10px_rgba(30,15,25,.25)]">
      <div className="mx-auto h-9 w-[52px] rounded-t bg-gradient-to-r from-black via-[#343a42] to-black sm:h-12 sm:w-[67px]"/>
      <div className="mx-auto h-10 w-[85px] rounded-t-xl bg-gradient-to-r from-black via-[#343a42] to-black sm:h-12 sm:w-[101px]"/>
      <div className="flex h-[122px] w-[137px] flex-col items-center justify-center rounded-[17px] border border-white/90 bg-gradient-to-r from-[#e8e2d8] via-[#fffefa] to-[#d9d4cb] sm:h-[163px] sm:w-[186px]">
       <span className="border-y border-[#70646a] py-1 text-3xl font-light tracking-[-.13em] text-[#2c2629] sm:text-[39px]">LAYAD</span><span className="mt-1 text-[8px] tracking-[.26em] text-[#3e3637]">SEOUL</span><span className="mt-3 text-[6px] tracking-[.13em] text-[#6c6061]">layers add delight</span>
      </div>
     </div>
    </div>
   </header>
   <div className="grid grid-cols-[37%_63%] gap-2 bg-gradient-to-br from-white to-[#e2f2fd] px-4 py-6 sm:gap-5 sm:px-9 sm:py-9">
    <div><p className="text-[clamp(17px,3.7vw,31px)] font-extrabold leading-[1.1] tracking-tight">GLOW<br/>LAYERING<br/>CREAM<br/>PRIMER</p><p className="mt-3 text-[10px] leading-5 sm:text-xs">한 겹으로 완성하는,<br/>더 투명한 나의 피부결</p></div>
    <div><h3 className="mb-3 text-center text-sm font-bold sm:text-lg">유형별 제품 추천도(%)</h3><div className="grid grid-cols-4 gap-[3px] sm:gap-[5px]">
     {scores.map(([code,n])=><div key={code} className={`flex min-h-[47px] flex-col items-center justify-center py-1 text-white sm:min-h-[59px] ${code===beautyCode?"ring-2 ring-offset-1 ring-[#e5899c]":""}`} style={{backgroundColor:n>=90?"#053460":n>=80?"#07549c":n>=70?"#1171ba":n>=55?"#298bde":"#72b6f3"}}><span className="text-[9px] font-semibold sm:text-xs">{code}</span><span className="text-base font-bold sm:text-xl">{n}</span></div>)}
    </div></div>
   </div>
   <div className="bg-[linear-gradient(150deg,#fff5f3,#f7d9d9)] px-4 pb-8 pt-4 sm:px-8">
    <div className="rounded-2xl bg-white/90 p-4 sm:p-6"><h3 className="mb-3 border-b border-[#9bc6e6] pb-2 text-xl font-bold">추천 근거</h3><div className="space-y-2 text-[11px] leading-[1.6] sm:text-sm">{reasons.map(([code,reason])=><p key={code}><strong>{code}</strong> : {reason}</p>)}</div></div>
    <p className="mt-6 text-center text-base font-bold sm:text-lg">잘 맞는다고 직접 써봐야 알지</p>
    <p className="mt-1 text-center text-xs">(막상 써보니까 안 맞았다? 무료 반품)</p>
    <p className="mt-4 text-center text-lg font-extrabold text-[#ee3f3b]">안 맞는다고? 그건 내가 판단할래!</p>
    <p className="mt-1 text-center text-xs text-[#e44a45]">(실험정신 존중! 그래서 무료 반품)</p>
    <a href="https://layadseoul.com" target="_blank" rel="noopener noreferrer" className="mx-auto mt-6 flex min-h-[56px] max-w-md items-center justify-center rounded-full border-2 border-[#075bac] bg-white text-lg font-extrabold text-[#075bac] hover:bg-[#e8f3ff]">30% 할인 비밀 링크　›</a>
    <p className="mt-2 text-center text-xs">layadseoul.com</p>
    <p className="mt-3 text-center text-[10px] leading-4 text-[#716c74]">제품 추천도는 이벤트 안내용 예시 수치이며 실제 개인 분석 결과와 다를 수 있습니다. 할인 및 반품 조건은 판매처에서 확인해 주세요.</p>
   </div>
  </section>
 </div>;
}
