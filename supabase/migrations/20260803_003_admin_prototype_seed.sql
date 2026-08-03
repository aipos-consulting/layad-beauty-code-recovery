-- LAYAD 관리자 프로토타입 조회용 테스트 데이터
-- 일괄 삭제 식별자: geo_source = 'layad_admin_demo_20260803'
-- 실제 사용자 데이터와 구분되며, cleanup SQL로 한 번에 삭제할 수 있습니다.

create table if not exists public.product_analysis_requests (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.test_sessions(id) on delete cascade,
  input_type public.product_input_type not null,
  input_value text not null,
  status public.product_analysis_status not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  error_message text,
  constraint valid_input_length check (char_length(input_value) between 1 and 2000)
);

create index if not exists idx_product_analysis_requests_session_id
  on public.product_analysis_requests(session_id);
create index if not exists idx_product_analysis_requests_status
  on public.product_analysis_requests(status);

alter table public.product_analysis_requests enable row level security;
revoke all on public.product_analysis_requests from anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_product_analysis_requests_updated_at'
  ) then
    create trigger trg_product_analysis_requests_updated_at
    before update on public.product_analysis_requests
    for each row execute function public.set_updated_at();
  end if;
end $$;

insert into public.test_sessions (
  id, started_at, completed_at, country_code, region_code, geo_source,
  age_band, beauty_code, beauty_code_source, device_type, completed,
  created_at, updated_at
) values
  ('10000000-0000-4000-8000-000000000001', now() - interval '12 days', now() - interval '12 days' + interval '4 minutes', 'KR', 'SEOUL', 'layad_admin_demo_20260803', '20-29', 'OGPV', 'test', 'mobile', true, now() - interval '12 days', now() - interval '12 days'),
  ('10000000-0000-4000-8000-000000000002', now() - interval '11 days', now() - interval '11 days' + interval '3 minutes', 'KR', 'GYEONGGI', 'layad_admin_demo_20260803', '30-39', 'OGPE', 'test', 'mobile', true, now() - interval '11 days', now() - interval '11 days'),
  ('10000000-0000-4000-8000-000000000003', now() - interval '10 days', now() - interval '10 days' + interval '2 minutes', 'KR', 'SEOUL', 'layad_admin_demo_20260803', '20-29', 'OMPV', 'manual', 'desktop', true, now() - interval '10 days', now() - interval '10 days'),
  ('10000000-0000-4000-8000-000000000004', now() - interval '9 days', now() - interval '9 days' + interval '5 minutes', 'KR', 'BUSAN', 'layad_admin_demo_20260803', '40-49', 'DGPV', 'test', 'mobile', true, now() - interval '9 days', now() - interval '9 days'),
  ('10000000-0000-4000-8000-000000000005', now() - interval '8 days', now() - interval '8 days' + interval '4 minutes', 'JP', 'TOKYO', 'layad_admin_demo_20260803', '30-39', 'DGPE', 'test', 'tablet', true, now() - interval '8 days', now() - interval '8 days'),
  ('10000000-0000-4000-8000-000000000006', now() - interval '7 days', now() - interval '7 days' + interval '2 minutes', 'KR', 'SEOUL', 'layad_admin_demo_20260803', '50-59', 'OMPE', 'manual', 'desktop', true, now() - interval '7 days', now() - interval '7 days'),
  ('10000000-0000-4000-8000-000000000007', now() - interval '6 days', now() - interval '6 days' + interval '4 minutes', 'US', 'CA', 'layad_admin_demo_20260803', '20-29', 'OGPV', 'test', 'mobile', true, now() - interval '6 days', now() - interval '6 days'),
  ('10000000-0000-4000-8000-000000000008', now() - interval '5 days', now() - interval '5 days' + interval '3 minutes', 'KR', 'INCHEON', 'layad_admin_demo_20260803', 'prefer_not_to_say', 'OGCV', 'manual', 'mobile', true, now() - interval '5 days', now() - interval '5 days')
on conflict (id) do nothing;

insert into public.product_analysis_requests (
  id, session_id, input_type, input_value, status, created_at, updated_at
) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'name', '[DEMO] HERA Black Cushion', 'submitted', now() - interval '6 days', now() - interval '6 days'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'name', '[DEMO] HERA Black Cushion', 'submitted', now() - interval '5 days', now() - interval '5 days'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', 'name', '[DEMO] LANEIGE Neo Cushion', 'collecting_reviews', now() - interval '4 days', now() - interval '4 days'),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004', 'name', '[DEMO] VDL Primer', 'analyzing', now() - interval '3 days', now() - interval '3 days'),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000005', 'url', 'https://example.com/demo-laneige-neo-cushion', 'submitted', now() - interval '2 days', now() - interval '2 days'),
  ('20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000006', 'name', '[DEMO] CLIO Kill Cover', 'completed', now() - interval '1 day', now() - interval '1 day'),
  ('20000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000007', 'name', '[DEMO] HERA Black Cushion', 'submitted', now() - interval '12 hours', now() - interval '12 hours'),
  ('20000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000008', 'name', '[DEMO] JUNGSAEMMOOL Essential Skin Nuder', 'insufficient_reviews', now() - interval '3 hours', now() - interval '3 hours')
on conflict (id) do nothing;

comment on table public.product_analysis_requests is 'LAYAD product fit requests. Demo seed rows use sessions whose geo_source is layad_admin_demo_20260803.';
