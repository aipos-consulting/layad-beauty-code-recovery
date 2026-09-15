# LAYAD16 Marketing Analytics

## 1. Purpose

Track marketing inflow and the user funnel without adding a paid analytics product or changing the core Beauty Code / product-fit logic.

## 2. Free tool stack

- Google Analytics 4 (GA4): traffic source, campaign and conversion funnel
- Microsoft Clarity: session replay, click heatmap and scroll behavior
- Google Search Console: organic search queries and search exposure
- Looker Studio / Data Studio: owner-facing dashboard after GA4 data starts accumulating

## 3. Required environment variables

Set these values in the deployment environment. If either value is absent, that integration stays disabled and does not interrupt the site.

- `NEXT_PUBLIC_GA4_MEASUREMENT_ID`
- `NEXT_PUBLIC_CLARITY_PROJECT_ID`

## 4. UTM standard

Use lowercase English values and keep the naming rule stable.

Example:

`https://layad16.com/?utm_source=instagram&utm_medium=paid_social&utm_campaign=202609_launch&utm_content=creative_a`

Recommended fields:

- `utm_source`: instagram, naver, google, kakao, line, influencer
- `utm_medium`: paid_social, cpc, organic_social, referral, qr
- `utm_campaign`: campaign identifier such as `202609_launch`
- `utm_content`: creative identifier such as `creative_a`, `video_b`
- `utm_term`: optional keyword or audience identifier

The site stores first-touch and latest-touch UTM values in browser local storage so attribution is retained during internal navigation.

## 5. Events

- `page_view`: page transition
- `test_start`: first entry to `/test` in the browser session
- `test_progress`: 25 / 50 / 75 percent milestone
- `test_complete`: Beauty Code test completion, with `beauty_code`
- `result_view`: result route view
- `share_click`: Kakao / LINE / URL-copy / other share action
- `shared_result_view`: visit to a shared result route
- `product_analysis_click`: navigation to product-fit analysis
- `product_analysis_view`: `/fit` view
- `product_analysis_submit`: product-fit form submission

## 6. Owner KPI proposal

Primary funnel:

`Visitors → Test Start → Test Complete → Share → Product Analysis`

Core KPIs:

- Test completion rate = Test Complete / Test Start
- Product analysis conversion = Product Analysis Submit / Test Complete
- Share rate = Share Click / Test Complete
- Campaign completion rate = Test Complete by UTM campaign / campaign Test Start

## 7. Safety / deployment principle

Analytics is implemented as a separate global tracker. The existing 20-question test, result calculation, Supabase persistence and product-fit APIs are not modified. Analytics failures are designed to fail silently and must never block the customer flow.
