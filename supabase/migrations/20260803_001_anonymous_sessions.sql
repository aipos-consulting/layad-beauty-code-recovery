create extension if not exists pgcrypto;

create type public.age_band as enum (
  '14-19',
  '20-29',
  '30-39',
  '40-49',
  '50-59',
  '60+',
  'prefer_not_to_say'
);

create type public.beauty_code_source as enum ('test', 'manual');
create type public.device_type as enum ('mobile', 'tablet', 'desktop', 'unknown');
create type public.product_input_type as enum ('name', 'url');
create type public.product_analysis_status as enum (
  'submitted',
  'collecting_reviews',
  'insufficient_reviews',
  'analyzing',
  'completed',
  'failed'
);

create table public.test_sessions (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  country_code text,
  region_code text,
  geo_source text not null default 'vercel_ip',
  age_band public.age_band,
  beauty_code char(4),
  beauty_code_source public.beauty_code_source not null,
  device_type public.device_type not null default 'unknown',
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_country_code check (country_code is null or char_length(country_code) between 2 and 3),
  constraint valid_region_code check (region_code is null or char_length(region_code) <= 64),
  constraint valid_beauty_code check (
    beauty_code is null or beauty_code ~ '^[OD][GM][PC][VE]$'
  )
);

create table public.test_answers (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.test_sessions(id) on delete cascade,
  question_id smallint not null,
  selected_code char(1) not null,
  created_at timestamptz not null default now(),
  constraint valid_question_id check (question_id between 1 and 20),
  constraint valid_selected_code check (selected_code ~ '^[ODGMPCVE]$'),
  unique (session_id, question_id)
);

create table public.product_analysis_requests (
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

create index idx_test_sessions_completed_at on public.test_sessions(completed_at);
create index idx_test_sessions_country_region on public.test_sessions(country_code, region_code);
create index idx_test_sessions_age_band on public.test_sessions(age_band);
create index idx_test_sessions_beauty_code on public.test_sessions(beauty_code);
create index idx_test_answers_session_id on public.test_answers(session_id);
create index idx_product_analysis_requests_session_id on public.product_analysis_requests(session_id);
create index idx_product_analysis_requests_status on public.product_analysis_requests(status);

alter table public.test_sessions enable row level security;
alter table public.test_answers enable row level security;
alter table public.product_analysis_requests enable row level security;

revoke all on public.test_sessions from anon, authenticated;
revoke all on public.test_answers from anon, authenticated;
revoke all on public.product_analysis_requests from anon, authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_test_sessions_updated_at
before update on public.test_sessions
for each row execute function public.set_updated_at();

create trigger trg_product_analysis_requests_updated_at
before update on public.product_analysis_requests
for each row execute function public.set_updated_at();

comment on table public.test_sessions is 'Anonymous LAYAD test sessions. Never store raw IP, name, email, phone, birth date, or precise coordinates.';
comment on column public.test_sessions.country_code is 'Derived from Vercel request headers; raw IP is not persisted.';
comment on column public.test_sessions.region_code is 'Coarse region only; do not store precise location.';
