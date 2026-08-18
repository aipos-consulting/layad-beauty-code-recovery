import { expect, test } from "@playwright/test";

const SESSION_ID = "11111111-1111-4111-8111-111111111111";
const REQUEST_ID = "22222222-2222-4222-8222-222222222222";
const BEAUTY_CODES = [
  "OGPV", "OGPE", "OGCV", "OGCE",
  "OMPV", "OMPE", "OMCV", "OMCE",
  "DGPV", "DGPE", "DGCV", "DGCE",
  "DMPV", "DMPE", "DMCV", "DMCE",
];

test.use({ viewport: { width: 390, height: 844 } });

test("mobile 20-question flow reaches product fit and starts AI analysis", async ({ page }) => {
  let requestCalls = 0;
  let runCalls = 0;
  let resultCalls = 0;

  await page.addInitScript((sessionId) => {
    window.sessionStorage.setItem("layad-supabase-session-id", sessionId);
  }, SESSION_ID);

  await page.route("**/api/anonymous-session**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, sessionId: SESSION_ID, beautyCode: "DGPV" }),
    });
  });

  await page.route("**/api/product-analysis-request", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    requestCalls += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        requestId: REQUEST_ID,
        productId: "33333333-3333-4333-8333-333333333333",
        status: "submitted",
        mode: "new_analysis",
        reused: false,
      }),
    });
  });

  await page.route("**/api/product-analysis-run", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    runCalls += 1;
    const body = route.request().postDataJSON() as { requestId?: string };
    expect(body.requestId).toBe(REQUEST_ID);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, requestId: REQUEST_ID, status: "completed" }),
    });
  });

  await page.route("**/api/product-analysis-result**", async (route) => {
    resultCalls += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        requestId: REQUEST_ID,
        status: "completed",
        product: { canonical_name: "Mock Foundation", brand: "LAYAD TEST", category: "foundation" },
        userBeautyCode: "DGPV",
        fits: BEAUTY_CODES.map((beautyCode, index) => ({
          beautyCode,
          fitScore: 95 - index,
          reviewCount: 12,
          confidence: 0.9,
        })),
      }),
    });
  });

  await page.goto("http://127.0.0.1:3000/test");

  for (let index = 0; index < 20; index += 1) {
    await expect(page.getByText(`QUESTION ${String(index + 1).padStart(2, "0")}`)).toBeVisible();
    const answer = page.locator('button[aria-pressed]').first();
    await expect(answer).toBeEnabled();
    await answer.click();
  }

  await expect(page.getByText("PRODUCT FIT ANALYSIS")).toBeVisible();

  const productInput = page.locator("#product-input");
  await productInput.fill("정샘물 에센셜 스킨 누더 쿠션");

  const analyzeButton = page.getByRole("button", { name: /적합도 분석하기|Check product fit|適合度/ });
  await expect(analyzeButton).toBeEnabled();
  await analyzeButton.click();

  await expect.poll(() => requestCalls).toBe(1);
  await expect.poll(() => runCalls).toBe(1);
  await expect.poll(() => resultCalls).toBeGreaterThan(0);
  await expect(page.getByText("회원님의 Beauty Code를 기준으로 확인한 결과입니다")).toBeVisible();
});
