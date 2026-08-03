-- LAYAD MVP 최종 상품 적합도 기능 준비
-- Supabase SQL Editor에서 전체 실행합니다.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'product_verification_status') then
    create type public.product_verification_status as enum ('unverified','link_verified','name_verified','verified');
  end if;
end $$;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  canonical_name text,
  product_url text,
  brand text,
  category text,
  verification_status public.product_verification_status not null default 'unverified',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_identity_present check (
    nullif(btrim(canonical_name), '') is not null
    or nullif(btrim(product_url), '') is not null
  )
);

create table if not exists public.product_type_fits (
  product_id uuid not null references public.products(id) on delete cascade,
  beauty_code char(4) not null,
  fit_score numeric(5,2) not null,
  review_count integer not null default 0,
  confidence numeric(4,3) not null default 0.7,
  analysis_version text not null default 'manual-mvp-v1',
  updated_at timestamptz not null default now(),
  primary key (product_id, beauty_code),
  constraint valid_product_fit_beauty_code check (beauty_code ~ '^[OD][GM][PC][VE]$'),
  constraint fit_score_range check (fit_score between 0 and 100),
  constraint fit_confidence_range check (confidence between 0 and 1),
  constraint fit_review_count_nonnegative check (review_count >= 0)
);

alter table public.product_analysis_requests
  add column if not exists product_id uuid references public.products(id) on delete set null;

create index if not exists idx_product_type_fits_beauty_code
  on public.product_type_fits(beauty_code);
create index if not exists idx_product_analysis_requests_product_id
  on public.product_analysis_requests(product_id);

alter table public.products enable row level security;
alter table public.product_type_fits enable row level security;
revoke all on public.products from anon, authenticated;
revoke all on public.product_type_fits from anon, authenticated;

notify pgrst, 'reload schema';

select
  to_regclass('public.products') as products_table,
  to_regclass('public.product_type_fits') as product_type_fits_table,
  exists (
    select 1 from information_schema.columns
    where table_schema='public'
      and table_name='product_analysis_requests'
      and column_name='product_id'
  ) as request_product_link_ready;
