import Link from "next/link";

const kpis = [
  ["전체 사용자", "1,248", "+8.4%"],
  ["테스트 완료", "1,032", "+6.1%"],
  ["직접 선택", "216", "+3.2%"],
  ["상품 신청", "684", "+12.7%"],
  ["신청 상품", "148", "+9"],
  ["분석 완료", "52", "+4"],
];

const typeStats = [
  ["OGPV", 128], ["OGPE", 74], ["OGCV", 31], ["OGCE", 15],
  ["OMPV", 67], ["OMPE", 52], ["OMCV", 20], ["OMCE", 11],
  ["DGPV", 41], ["DGPE", 36], ["DGCV", 28], ["DGCE", 17],
  ["DMPV", 22], ["DMPE", 18], ["DMCV", 12], ["DMCE", 9],
] as const;

const axes = [
  ["O 지성형", 63, "D 건성형", 37],
  ["G 글로우 선호", 72, "M 매트함 추구", 28],
  ["P 정교함 추구", 61, "C 간편함 추구", 39],
  ["V 변동형", 54, "E 일관형", 46],
] as const;

const products = [
  ["HERA Black Cushion", 21, "OGPV", "분석 대기"],
  ["LANEIGE Neo Cushion", 17, "OGPE", "상품 확인"],
  ["VDL Primer", 12, "OMPV", "분석 중"],
  ["CLIO Kill Cover", 11, "DGPV", "검수 대기"],
  ["JUNGSAEMMOOL Essential Skin Nuder", 9, "OGPV", "분석 완료"],
] as const;

const recent = [
  ["HERA Black Cushion", "상품명", "21건", "분석 대기", "오늘 09:32"],
  ["https://brand.example/product/neo", "상품 링크", "17건", "상품 확인", "오늘 09:10"],
  ["VDL Primer", "상품명", "12건", "분석 중", "어제 18:44"],
  ["CLIO Kill Cover", "상품명", "11건", "검수 대기", "어제 16:03"],
] as const;

const nav = [
  ["대시보드", "/admin"],
  ["사용자 통계 상세", "/admin/statistics"],
  ["상품 신청 정보", "/admin/requests"],
  ["분석 작업", "/admin/analysis"],
  ["상품 관리", "/admin/products"],
  ["적합도 결과", "/admin/results"],
  ["운영 설정", "/admin/settings"],
] as const;

const statusClass: Record<string, string> = {
  "분석 대기": "bg-amber-50 text-amber-700 border-amber-200",
  "상품 확인": "bg-sky-50 text-sky-700 border-sky-200",
  "분석 중": "bg-violet-50 text-violet-700 border-violet-200",
  "검수 대기": "bg-yellow-50 text-yellow-700 border-yellow-200",
  "분석 완료": "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function AdminDashboardPage() {
  const maxType = Math.max(...typeStats.map(([, count]) => count));

  return (
    <main className="min-h-screen bg-[#f7f4f4] text-[#382d2d]">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-64 shrink-0 border-r border-[#eadfe1] bg-[#2f2829] px-5 py-7 text-white lg:block">
          <div className="mb-8">
            <p className="text-[11px] font-semibold tracking-[0.28em] text-[#e6b8c2]">LAYAD</p>
            <h1 className="mt-2 text-xl font-semibold">ADMIN</h1>
          </div>
          <nav className="space-y-2">
            {nav.map(([label, href], index) => (
              <Link
                key={label}
                href={href}
                className={`block rounded-xl px-4 py-3 text-sm transition ${
                  index === 0 ? "bg-[#d88c9c] font-semibold text-white" : "text-white/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs leading-6 text-white/70">
            MVP 운영 모드<br />
            ChatGPT Plus 수동 분석<br />
            OpenAI API 미사용
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#eadfe1] bg-white/95 px-5 py-4 backdrop-blur sm:px-8">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.18em] text-[#b97b88]">LAYAD ADMIN</p>
              <h2 className="mt-1 text-xl font-semibold">대시보드</h2>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <button className="rounded-full border border-[#ead7db] px-4 py-2 text-[#6f6063]">알림 3</button>
              <button className="rounded-full bg-[#382d2d] px-4 py-2 font-semibold text-white">관리자</button>
            </div>
          </header>

          <div className="space-y-7 p-5 sm:p-8">
            <section>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold tracking-[0.18em] text-[#b97b88]">OVERVIEW</p>
                  <h3 className="mt-2 text-2xl font-semibold">사용자와 상품 신청 현황</h3>
                  <p className="mt-2 text-sm text-[#7b6d70]">샘플 데이터 기반 관리자 UI 초안입니다.</p>
                </div>
                <div className="flex gap-2 text-sm">
                  <button className="rounded-xl border border-[#ead7db] bg-white px-4 py-2">최근 7일</button>
                  <button className="rounded-xl border border-[#ead7db] bg-white px-4 py-2">전체 국가</button>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                {kpis.map(([label, value, change]) => (
                  <article key={label} className="rounded-2xl border border-[#eadfe1] bg-white p-5 shadow-sm">
                    <p className="text-xs font-medium text-[#7c6e71]">{label}</p>
                    <div className="mt-3 flex items-end justify-between gap-2">
                      <p className="text-2xl font-semibold">{value}</p>
                      <span className="rounded-full bg-[#fff0f2] px-2 py-1 text-[11px] font-semibold text-[#b76778]">{change}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
              <article className="rounded-3xl border border-[#eadfe1] bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.16em] text-[#b97b88]">BEAUTY CODE</p>
                    <h3 className="mt-2 text-lg font-semibold">16유형 신청 현황</h3>
                  </div>
                  <Link href="/admin/statistics" className="text-sm font-semibold text-[#b76778]">상세 통계 →</Link>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {typeStats.map(([code, count], index) => (
                    <button key={code} className="rounded-2xl border border-[#eadfe1] bg-[#fffafa] p-4 text-left transition hover:border-[#d88c9c] hover:bg-[#fff2f4]">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">{code}</span>
                        <span className="text-[11px] text-[#8b7b7e]">{index + 1}위</span>
                      </div>
                      <p className="mt-2 text-xl font-semibold text-[#c86f81]">{count}</p>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#f0e4e6]">
                        <div className="h-full rounded-full bg-[#d88c9c]" style={{ width: `${(count / maxType) * 100}%` }} />
                      </div>
                    </button>
                  ))}
                </div>
              </article>

              <article className="rounded-3xl border border-[#eadfe1] bg-white p-5 shadow-sm sm:p-6">
                <p className="text-xs font-semibold tracking-[0.16em] text-[#b97b88]">AXIS SUMMARY</p>
                <h3 className="mt-2 text-lg font-semibold">4축 분포</h3>
                <div className="mt-5 space-y-5">
                  {axes.map(([left, leftValue, right, rightValue]) => (
                    <div key={left}>
                      <div className="flex items-center justify-between text-xs font-medium text-[#6f6063]">
                        <span>{left} {leftValue}%</span>
                        <span>{right} {rightValue}%</span>
                      </div>
                      <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-[#f0e4e6]">
                        <div className="bg-[#d88c9c]" style={{ width: `${leftValue}%` }} />
                        <div className="bg-[#9f8b8f]" style={{ width: `${rightValue}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3 text-center text-xs">
                  <div className="rounded-xl bg-[#fff5f6] p-3"><b className="block text-lg">68%</b>20문항 테스트</div>
                  <div className="rounded-xl bg-[#f5f2f2] p-3"><b className="block text-lg">32%</b>직접 유형 선택</div>
                </div>
              </article>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
              <article className="rounded-3xl border border-[#eadfe1] bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.16em] text-[#b97b88]">TOP REQUESTS</p>
                    <h3 className="mt-2 text-lg font-semibold">신청 많은 상품</h3>
                  </div>
                  <Link href="/admin/requests" className="text-sm font-semibold text-[#b76778]">전체 보기 →</Link>
                </div>
                <div className="mt-5 space-y-3">
                  {products.map(([name, count, code, status]) => (
                    <div key={name} className="flex items-center gap-3 rounded-2xl border border-[#eee5e7] p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff0f2] text-sm font-semibold text-[#b76778]">{code}</div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{name}</p>
                        <p className="mt-1 text-xs text-[#8a7a7d]">신청 {count}건 · 대표 유형 {code}</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold ${statusClass[status]}`}>{status}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-3xl border border-[#eadfe1] bg-white p-5 shadow-sm sm:p-6">
                <p className="text-xs font-semibold tracking-[0.16em] text-[#b97b88]">WORK QUEUE</p>
                <h3 className="mt-2 text-lg font-semibold">운영 우선순위</h3>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {[
                    ["신규 신청", "24"], ["상품 확인 필요", "18"], ["분석 대기", "12"], ["검수 대기", "4"],
                    ["7일 이상 대기", "8"], ["중복 가능 상품", "6"],
                  ].map(([label, value]) => (
                    <button key={label} className="rounded-2xl border border-[#eee5e7] bg-[#fffafa] p-4 text-left hover:border-[#d88c9c]">
                      <p className="text-xs text-[#7d6f72]">{label}</p>
                      <p className="mt-2 text-2xl font-semibold">{value}</p>
                    </button>
                  ))}
                </div>
                <button className="mt-5 w-full rounded-2xl bg-[#382d2d] px-4 py-3 text-sm font-semibold text-white">오늘의 분석 작업 보기</button>
              </article>
            </section>

            <section className="overflow-hidden rounded-3xl border border-[#eadfe1] bg-white shadow-sm">
              <div className="flex items-center justify-between px-5 py-5 sm:px-6">
                <div>
                  <p className="text-xs font-semibold tracking-[0.16em] text-[#b97b88]">RECENT REQUESTS</p>
                  <h3 className="mt-2 text-lg font-semibold">최근 상품 신청</h3>
                </div>
                <Link href="/admin/requests" className="text-sm font-semibold text-[#b76778]">상품 신청 정보 →</Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-[#faf7f7] text-xs text-[#75676a]">
                    <tr><th className="px-6 py-3">신청 상품</th><th className="px-4 py-3">입력 유형</th><th className="px-4 py-3">신청</th><th className="px-4 py-3">상태</th><th className="px-4 py-3">최근 신청</th><th className="px-6 py-3">작업</th></tr>
                  </thead>
                  <tbody className="divide-y divide-[#eee5e7]">
                    {recent.map(([name, type, count, status, date]) => (
                      <tr key={name} className="hover:bg-[#fffafa]">
                        <td className="max-w-[280px] truncate px-6 py-4 font-semibold">{name}</td>
                        <td className="px-4 py-4 text-[#75676a]">{type}</td>
                        <td className="px-4 py-4">{count}</td>
                        <td className="px-4 py-4"><span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${statusClass[status]}`}>{status}</span></td>
                        <td className="px-4 py-4 text-[#75676a]">{date}</td>
                        <td className="px-6 py-4"><button className="rounded-lg border border-[#dfc9ce] px-3 py-2 text-xs font-semibold text-[#a85f6e]">상세 보기</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
