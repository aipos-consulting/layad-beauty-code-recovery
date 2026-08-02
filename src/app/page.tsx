export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f2ed] px-5 py-6 text-[#241f1b] sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-[0_24px_80px_rgba(70,48,35,0.12)]">
        <header className="flex items-center justify-between px-6 py-5 sm:px-10">
          <div>
            <p className="text-xs font-semibold tracking-[0.32em] text-[#9b6c55]">
              LAYAD
            </p>
            <p className="mt-1 text-sm font-medium">BEAUTY CODE</p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <button className="rounded-full px-4 py-2 text-[#6f625b] transition hover:bg-[#f7f2ed]">
              로그인
            </button>
            <button className="rounded-full border border-[#d8c5b8] px-4 py-2 font-medium transition hover:bg-[#f7f2ed]">
              회원가입
            </button>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-10 px-6 py-12 sm:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-16 lg:py-16">
          <div>
            <div className="inline-flex rounded-full bg-[#f1e3da] px-4 py-2 text-xs font-semibold tracking-[0.12em] text-[#8c5d47]">
              20 QUESTIONS · 4 AXES · 16 TYPES
            </div>

            <h1 className="mt-7 max-w-2xl text-4xl font-semibold leading-[1.15] tracking-[-0.04em] sm:text-6xl">
              나의 메이크업 습관을
              <br />
              하나의 코드로 만나보세요.
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-[#71645d] sm:text-lg sm:leading-8">
              LAYAD BEAUTY CODE는 20개의 질문을 통해 나의 메이크업 방식과
              결과 성향을 네 가지 축으로 분류합니다. 비회원도 바로 테스트할 수
              있으며, 결과 저장과 재조회는 회원가입 후 이용할 수 있습니다.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                className="inline-flex h-14 items-center justify-center rounded-full bg-[#2d2521] px-8 text-base font-semibold text-white shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-black"
              >
                테스트 시작
              </button>
              <p className="text-sm text-[#8a7d75]">
                약 3분 · 가입 없이 바로 시작
              </p>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -left-6 top-10 h-28 w-28 rounded-full bg-[#e9cfc0] blur-3xl" />
            <div className="absolute -right-5 bottom-8 h-36 w-36 rounded-full bg-[#d8c4dc] blur-3xl" />

            <div className="relative rounded-[2rem] border border-white/70 bg-[#fbf8f5]/90 p-6 shadow-[0_30px_80px_rgba(74,53,42,0.16)] backdrop-blur sm:p-8">
              <p className="text-xs font-semibold tracking-[0.25em] text-[#9b6c55]">
                YOUR BEAUTY CODE
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {[
                  ["O / D", "메이크업 접근 방식"],
                  ["G / M", "표현 선호 성향"],
                  ["P / C", "정교함 또는 편의성"],
                  ["V / E", "변화성 또는 안정성"],
                ].map(([code, label]) => (
                  <div
                    key={code}
                    className="rounded-2xl border border-[#eadfd7] bg-white p-4"
                  >
                    <p className="text-xl font-semibold tracking-tight">{code}</p>
                    <p className="mt-2 text-xs leading-5 text-[#81736b]">{label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl bg-[#2d2521] p-5 text-white">
                <p className="text-xs tracking-[0.2em] text-white/60">SAMPLE CODE</p>
                <p className="mt-2 text-3xl font-semibold tracking-[0.18em]">OGPV</p>
                <p className="mt-3 text-sm leading-6 text-white/70">
                  테스트 완료 후 나의 16가지 Beauty Code 중 하나를 확인할 수
                  있습니다.
                </p>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-black/5 px-6 py-5 text-center text-xs text-[#9a8e87] sm:px-10">
          현재 화면은 LAYAD BEAUTY CODE MVP 랜딩 페이지입니다. 특정 제품 추천과
          AI 개인화는 포함하지 않습니다.
        </footer>
      </div>
    </main>
  );
}
