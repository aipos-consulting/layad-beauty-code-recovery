import Link from "next/link";

const features = [
  {
    icon: "01",
    title: "20가지 질문",
    description: "4가지 축, 20문항으로 나의 메이크업 성향을 살펴봅니다.",
  },
  {
    icon: "02",
    title: "4축 분석",
    description: "O/D, G/M, P/C, V/E 네 가지 축으로 분류합니다.",
  },
  {
    icon: "03",
    title: "16가지 유형",
    description: "응답 결과를 조합해 16가지 Beauty Code 중 하나를 확인합니다.",
  },
  {
    icon: "04",
    title: "제품 특성 안내",
    description: "결과에 어울리는 제품 카테고리와 적합 특성을 안내합니다.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#fffdfc] text-[#272322]">
      <header className="border-b border-[#eadfda] bg-white/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <img
            src="/layad-logo.svg"
            alt="LAYAD Seoul - Layers add delight"
            className="h-auto w-[122px] object-contain sm:w-[154px]"
          />
          <p className="text-xs font-semibold tracking-[0.16em] sm:text-sm">
            LAYAD BEAUTY CODE
          </p>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-[#eadfda]">
        <div className="pointer-events-none absolute -right-16 top-16 h-52 w-52 rounded-full bg-[#f6d8d2]/55 blur-3xl" />
        <div className="pointer-events-none absolute right-8 top-48 h-36 w-14 rotate-[24deg] rounded-full bg-gradient-to-b from-[#d9a28e] to-[#f8e5dd] opacity-70 shadow-xl" />
        <div className="pointer-events-none absolute -right-16 bottom-[-30px] h-44 w-60 rotate-[-18deg] rounded-[2.5rem] border border-[#e5b3a2] bg-gradient-to-br from-[#f8ddd3] to-[#df9b84] opacity-70 shadow-2xl" />

        <div className="relative mx-auto flex min-h-[650px] max-w-6xl items-center px-5 py-16 sm:px-8 sm:py-20">
          <div className="w-full text-center lg:max-w-4xl">
            <p className="text-sm font-semibold tracking-[0.12em] text-[#cf7772] sm:text-base">
              20문항 · 4축 · 16유형
            </p>
            <h1 className="mt-7 text-4xl font-semibold tracking-[0.04em] sm:text-5xl lg:text-6xl">
              LAYAD BEAUTY CODE
            </h1>
            <p className="mt-5 text-lg text-[#5e5753] sm:text-xl">
              당신만의 메이크업 유형을 찾아보세요
            </p>

            <div className="mx-auto mt-9 flex max-w-3xl flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-full bg-[#fbefec] px-5 py-3 text-sm text-[#625a56]">
              <span><b className="text-[#262220]">O/D</b> Oily / Dry</span>
              <span className="hidden text-[#cdbbb4] sm:inline">|</span>
              <span><b className="text-[#262220]">G/M</b> Glow / Matte</span>
              <span className="hidden text-[#cdbbb4] sm:inline">|</span>
              <span><b className="text-[#262220]">P/C</b> Precise / Convenient</span>
              <span className="hidden text-[#cdbbb4] sm:inline">|</span>
              <span><b className="text-[#262220]">V/E</b> Variable / Even</span>
            </div>

            <Link
              href="/test"
              className="mx-auto mt-10 inline-flex h-14 min-w-64 items-center justify-center gap-6 rounded-full bg-gradient-to-r from-[#d7837e] to-[#cb706f] px-10 text-base font-semibold text-white shadow-[0_12px_30px_rgba(198,105,102,0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(198,105,102,0.32)]"
            >
              테스트 시작하기 <span aria-hidden>→</span>
            </Link>
            <p className="mt-5 text-sm text-[#756d68]">약 3분 소요 · 무료 테스트 · 비회원 즉시 시작</p>
          </div>
        </div>
      </section>

      <section className="bg-[#fffafa]">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 sm:grid-cols-2 sm:px-8 lg:grid-cols-4 lg:py-16">
          {features.map((feature) => (
            <article key={feature.title} className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f8e4e1] text-sm font-semibold tracking-[0.12em]">
                {feature.icon}
              </div>
              <h2 className="mt-5 text-lg font-semibold">{feature.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[#6d6561]">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-[#eadfda] bg-white px-5 py-10 sm:px-8">
        <div className="mx-auto max-w-5xl rounded-2xl border border-[#e5d8d2] bg-[#fffdfc] p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#f9e5e2] text-xl" aria-hidden>
              🔒
            </div>
            <div>
              <h2 className="text-lg font-bold">저작권 및 무단 사용 엄중 경고</h2>
              <p className="mt-3 text-sm font-medium">© 2026 LAYAD. All rights reserved.</p>
              <p className="mt-3 text-sm leading-6 text-[#5f5753]">
                본 웹사이트의 텍스트, 이미지, 디자인, 프로그램, 분류체계 및 기타 모든 콘텐츠는
                LAYAD의 저작권과 지식재산권 보호 대상입니다. LAYAD의 사전 서면 허가 없이
                복제, 배포, 전송, 전시, 변형, 2차적 저작물 작성 또는 상업적 이용을 엄격히 금지합니다.
              </p>
              <p className="mt-3 text-sm font-semibold leading-6 text-[#c94f49]">
                무단 이용이 확인되는 경우 관련 법령에 따라 민사·형사상 책임을 물을 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#eadfda] bg-white px-5 py-6 text-center text-xs text-[#756d68]">
        © 2026 LAYAD. All rights reserved.
      </footer>
    </main>
  );
}
