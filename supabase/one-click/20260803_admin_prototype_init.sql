-- LAYAD 관리자 프로토타입 원클릭 초기화
-- Supabase SQL Editor에서 이 파일 전체를 붙여넣고 Run 하세요.
-- 여러 번 실행해도 동일 테스트 데이터는 중복 생성되지 않습니다.

begin;

create extension if not exists pgcrypto;

-- 1) ENUM 타입 준비
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'age_band') THEN
    CREATE TYPE public.age_band AS ENUM (
      '14-19','20-29','30-39','40-49','50-59','60+','prefer_not_to_say'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'beauty_code_source') THEN
    CREATE TYPE public.beauty_code_source AS ENUM ('test','manual');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'device_type') THEN
    CREATE TYPE public.device_type AS ENUM ('mobile','tablet','desktop','unknown');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_input_type') THEN
    CREATE TYPE public.product_input_type AS ENUM ('name','url');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_analysis_status') THEN
    CREATE TYPE public.product_analysis_status AS ENUM (
      'submitted','collecting_reviews','insufficient_reviews','analyzing','completed','failed'
    );
  END IF;
END $$;

-- 2) 익명 사용자 세션 테이블
create table if not exists public.test_sessions (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  country_code text,
  region_code text,
  geo_source text not null default 'vercel_ip',
  age_band public.age_band,
  beauty_code char(4),
  beauty_code_source public.beauty_code_source not null default 'test',
  device_type public.device_type not null default 'unknown',
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 기존 테이블에 일부 컬럼이 없을 경우 보완
alter table public.test_sessions add column if not exists started_at timestamptz not null default now();
alter table public.test_sessions add column if not exists completed_at timestamptz;
alter table public.test_sessions add column if not exists country_code text;
alter table public.test_sessions add column if not exists region_code text;
alter table public.test_sessions add column if not exists geo_source text not null default 'vercel_ip';
alter table public.test_sessions add column if not exists age_band public.age_band;
alter table public.test_sessions add column if not exists beauty_code char(4);
alter table public.test_sessions add column if not exists beauty_code_source public.beauty_code_source not null default 'test';
alter table public.test_sessions add column if not exists device_type public.device_type not null default 'unknown';
alter table public.test_sessions add column if not exists completed boolean not null default false;
alter table public.test_sessions add column if not exists created_at timestamptz not null default now();
alter table public.test_sessions add column if not exists updated_at timestamptz not null default now();

-- 3) 상품 신청 테이블
create table if not exists public.product_analysis_requests (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.test_sessions(id) on delete cascade,
  input_type public.product_input_type not null,
  input_value text not null,
  status public.product_analysis_status not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  error_message text
);

alter table public.product_analysis_requests add column if not exists session_id uuid;
alter table public.product_analysis_requests add column if not exists input_type public.product_input_type;
alter table public.product_analysis_requests add column if not exists input_value text;
alter table public.product_analysis_requests add column if not exists status public.product_analysis_status not null default 'submitted';
alter table public.product_analysis_requests add column if not exists created_at timestamptz not null default now();
alter table public.product_analysis_requests add column if not exists updated_at timestamptz not null default now();
alter table public.product_analysis_requests add column if not exists error_message text;

create index if not exists idx_test_sessions_beauty_code on public.test_sessions(beauty_code);
create index if not exists idx_test_sessions_geo_source on public.test_sessions(geo_source);
create index if not exists idx_product_analysis_requests_session_id on public.product_analysis_requests(session_id);
create index if not exists idx_product_analysis_requests_status on public.product_analysis_requests(status);

-- 4) 관리자 프로토타입용 16유형 테스트 데이터
-- geo_source 값으로 실제 데이터와 구분합니다.
insert into public.test_sessions (
  id, started_at, completed_at, country_code, region_code, geo_source,
  age_band, beauty_code, beauty_code_source, device_type, completed, created_at, updated_at
)
values
('10000000-0000-4000-8000-000000000001', now()-interval '15 days', now()-interval '15 days'+interval '5 minutes', 'KR','11','layad_admin_demo_20260803','20-29','OGPV','test','mobile',true,now()-interval '15 days',now()-interval '15 days'),
('10000000-0000-4000-8000-000000000002', now()-interval '14 days', now()-interval '14 days'+interval '5 minutes', 'KR','26','layad_admin_demo_20260803','30-39','OGPE','test','desktop',true,now()-interval '14 days',now()-interval '14 days'),
('10000000-0000-4000-8000-000000000003', now()-interval '13 days', now()-interval '13 days'+interval '5 minutes', 'JP','13','layad_admin_demo_20260803','20-29','OGCV','manual','mobile',true,now()-interval '13 days',now()-interval '13 days'),
('10000000-0000-4000-8000-000000000004', now()-interval '12 days', now()-interval '12 days'+interval '5 minutes', 'KR','41','layad_admin_demo_20260803','40-49','OGCE','test','tablet',true,now()-interval '12 days',now()-interval '12 days'),
('10000000-0000-4000-8000-000000000005', now()-interval '11 days', now()-interval '11 days'+interval '5 minutes', 'US','CA','layad_admin_demo_20260803','30-39','OMPV','manual','desktop',true,now()-interval '11 days',now()-interval '11 days'),
('10000000-0000-4000-8000-000000000006', now()-interval '10 days', now()-interval '10 days'+interval '5 minutes', 'KR','11','layad_admin_demo_20260803','20-29','OMPE','test','mobile',true,now()-interval '10 days',now()-interval '10 days'),
('10000000-0000-4000-8000-000000000007', now()-interval '9 days', now()-interval '9 days'+interval '5 minutes', 'KR','28','layad_admin_demo_20260803','50-59','OMCV','manual','mobile',true,now()-interval '9 days',now()-interval '9 days'),
('10000000-0000-4000-8000-000000000008', now()-interval '8 days', now()-interval '8 days'+interval '5 minutes', 'JP','27','layad_admin_demo_20260803','30-39','OMCE','test','desktop',true,now()-interval '8 days',now()-interval '8 days'),
('10000000-0000-4000-8000-000000000009', now()-interval '7 days', now()-interval '7 days'+interval '5 minutes', 'KR','47','layad_admin_demo_20260803','20-29','DGPV','test','mobile',true,now()-interval '7 days',now()-interval '7 days'),
('10000000-0000-4000-8000-000000000010', now()-interval '6 days', now()-interval '6 days'+interval '5 minutes', 'KR','30','layad_admin_demo_20260803','40-49','DGPE','manual','tablet',true,now()-interval '6 days',now()-interval '6 days'),
('10000000-0000-4000-8000-000000000011', now()-interval '5 days', now()-interval '5 days'+interval '5 minutes', 'US','NY','layad_admin_demo_20260803','30-39','DGCV','test','desktop',true,now()-interval '5 days',now()-interval '5 days'),
('10000000-0000-4000-8000-000000000012', now()-interval '4 days', now()-interval '4 days'+interval '5 minutes', 'KR','11','layad_admin_demo_20260803','60+','DGCE','manual','mobile',true,now()-interval '4 days',now()-interval '4 days'),
('10000000-0000-4000-8000-000000000013', now()-interval '3 days', now()-interval '3 days'+interval '5 minutes', 'KR','26','layad_admin_demo_20260803','20-29','DMPV','test','mobile',true,now()-interval '3 days',now()-interval '3 days'),
('10000000-0000-4000-8000-000000000014', now()-interval '2 days', now()-interval '2 days'+interval '5 minutes', 'JP','13','layad_admin_demo_20260803','30-39','DMPE','manual','desktop',true,now()-interval '2 days',now()-interval '2 days'),
('10000000-0000-4000-8000-000000000015', now()-interval '1 day', now()-interval '1 day'+interval '5 minutes', 'KR','41','layad_admin_demo_20260803','50-59','DMCV','test','tablet',true,now()-interval '1 day',now()-interval '1 day'),
('10000000-0000-4000-8000-000000000016', now()-interval '8 hours', now()-interval '7 hours 55 minutes', 'KR','11','layad_admin_demo_20260803','prefer_not_to_say','DMCE','manual','mobile',true,now()-interval '8 hours',now()-interval '8 hours')
on conflict (id) do nothing;

-- 유형별 편차가 보이도록 인기 유형 추가 데이터
insert into public.test_sessions (
  id, started_at, completed_at, country_code, region_code, geo_source,
  age_band, beauty_code, beauty_code_source, device_type, completed, created_at, updated_at
)
values
('10000000-0000-4000-8000-000000000101', now()-interval '6 hours', now()-interval '5 hours 55 minutes','KR','11','layad_admin_demo_20260803','20-29','OGPV','test','mobile',true,now()-interval '6 hours',now()-interval '6 hours'),
('10000000-0000-4000-8000-000000000102', now()-interval '5 hours', now()-interval '4 hours 55 minutes','KR','26','layad_admin_demo_20260803','30-39','OGPV','manual','desktop',true,now()-interval '5 hours',now()-interval '5 hours'),
('10000000-0000-4000-8000-000000000103', now()-interval '4 hours', now()-interval '3 hours 55 minutes','JP','13','layad_admin_demo_20260803','20-29','OGPE','test','mobile',true,now()-interval '4 hours',now()-interval '4 hours'),
('10000000-0000-4000-8000-000000000104', now()-interval '3 hours', now()-interval '2 hours 55 minutes','KR','41','layad_admin_demo_20260803','40-49','OMPV','test','tablet',true,now()-interval '3 hours',now()-interval '3 hours')
on conflict (id) do nothing;

-- 5) 상품 신청 테스트 데이터
insert into public.product_analysis_requests (
  id, session_id, input_type, input_value, status, created_at, updated_at, error_message
)
values
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','name','[DEMO] HERA Black Cushion','submitted',now()-interval '5 hours',now()-interval '5 hours',null),
('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','name','[DEMO] HERA Black Cushion','submitted',now()-interval '4 hours 45 minutes',now()-interval '4 hours 45 minutes',null),
('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003','name','[DEMO] LANEIGE Neo Cushion','collecting_reviews',now()-interval '4 hours',now()-interval '4 hours',null),
('20000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000005','name','[DEMO] VDL Primer','analyzing',now()-interval '3 hours',now()-interval '3 hours',null),
('20000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000009','name','[DEMO] CLIO Kill Cover','completed',now()-interval '2 hours',now()-interval '2 hours',null),
('20000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000010','url','https://example.com/demo-product-a','submitted',now()-interval '90 minutes',now()-interval '90 minutes',null),
('20000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000014','name','[DEMO] JUNGSAEMMOOL Essential Skin Nuder','insufficient_reviews',now()-interval '60 minutes',now()-interval '60 minutes','테스트용 분석 근거 부족 상태'),
('20000000-0000-4000-8000-000000000008','10000000-0000-4000-8000-000000000101','name','[DEMO] HERA Black Cushion','submitted',now()-interval '30 minutes',now()-interval '30 minutes',null)
on conflict (id) do nothing;

-- 관리자 API는 서버 키로 읽으므로 RLS는 유지하고 anon/authenticated 직접 접근은 차단합니다.
alter table public.test_sessions enable row level security;
alter table public.product_analysis_requests enable row level security;
revoke all on public.test_sessions from anon, authenticated;
revoke all on public.product_analysis_requests from anon, authenticated;

commit;

-- 6) 실행 결과 확인
select
  count(*) as demo_sessions,
  count(*) filter (where beauty_code_source = 'test') as test_completed,
  count(*) filter (where beauty_code_source = 'manual') as manual_selected
from public.test_sessions
where geo_source = 'layad_admin_demo_20260803';

select
  status,
  count(*) as request_count
from public.product_analysis_requests r
join public.test_sessions s on s.id = r.session_id
where s.geo_source = 'layad_admin_demo_20260803'
group by status
order by status;
