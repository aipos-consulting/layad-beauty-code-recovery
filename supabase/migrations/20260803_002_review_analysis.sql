create type public.product_verification_status as enum (
  'unverified',
  'link_verified',
  'name_verified',
  'verified'
);

create type public.review_source_type as enum (
  'official',
  'commerce',
  'community',
  'manual',
  'import'
);

create type public.review_analysis_run_status as enum (
  'queued',
  'running',
  'completed',
  'failed'
);

create type public.feature_axis as enum ('OD', 'GM', 'PC', 'VE');
create type public.feature_code as enum ('O', 'D', 'G', 'M', 'P', 'C', 'V', 'E');
create type public.feature_sentiment as enum ('positive', 'negative', 'neutral', 'mixed');

create table public.products (
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
  ),
  constraint product_url_length check (
    product_url is null or char_length(product_url) between 8 and 2000
  )
);

create table public.review_sources (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  source_type public.review_source_type not null,
  source_label text,
  source_url text,
  country_code text,
  collected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint review_source_url_length check (
    source_url is null or char_length(source_url) between 8 and 2000
  ),
  constraint review_source_country_code check (
    country_code is null or char_length(country_code) between 2 and 3
  )
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  source_id uuid references public.review_sources(id) on delete set null,
  external_review_key text,
  review_text text not null,
  language_code text,
  review_date date,
  reviewer_country_code text,
  reviewer_age_band public.age_band,
  created_at timestamptz not null default now(),
  constraint review_text_length check (char_length(review_text) between 3 and 20000),
  constraint reviewer_country_code_length check (
    reviewer_country_code is null or char_length(reviewer_country_code) between 2 and 3
  )
);

create table public.review_analysis_runs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  status public.review_analysis_run_status not null default 'queued',
  provider text,
  model_name text,
  prompt_version text not null,
  analysis_version text not null,
  input_review_count integer not null default 0,
  input_tokens integer,
  output_tokens integer,
  estimated_cost numeric(12, 6),
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  constraint nonnegative_review_count check (input_review_count >= 0),
  constraint nonnegative_input_tokens check (input_tokens is null or input_tokens >= 0),
  constraint nonnegative_output_tokens check (output_tokens is null or output_tokens >= 0),
  constraint nonnegative_estimated_cost check (estimated_cost is null or estimated_cost >= 0)
);

create table public.review_features (
  id bigint generated always as identity primary key,
  review_id uuid not null references public.reviews(id) on delete cascade,
  analysis_run_id uuid not null references public.review_analysis_runs(id) on delete cascade,
  axis public.feature_axis not null,
  code public.feature_code not null,
  feature_label text not null,
  sentiment public.feature_sentiment not null,
  intensity numeric(4, 3) not null,
  confidence numeric(4, 3) not null,
  context_text text,
  evidence_excerpt text,
  condition_tags jsonb not null default '{}'::jsonb,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  constraint intensity_range check (intensity between 0 and 1),
  constraint confidence_range check (confidence between 0 and 1),
  constraint feature_code_matches_axis check (
    (axis = 'OD' and code in ('O', 'D'))
    or (axis = 'GM' and code in ('G', 'M'))
    or (axis = 'PC' and code in ('P', 'C'))
    or (axis = 'VE' and code in ('V', 'E'))
  )
);

create table public.product_axis_profiles (
  product_id uuid not null references public.products(id) on delete cascade,
  axis public.feature_axis not null,
  first_code public.feature_code not null,
  first_score numeric(5, 2) not null,
  second_code public.feature_code not null,
  second_score numeric(5, 2) not null,
  review_count integer not null default 0,
  confidence numeric(4, 3) not null default 0,
  analysis_version text not null,
  updated_at timestamptz not null default now(),
  primary key (product_id, axis),
  constraint axis_profile_scores check (
    first_score between 0 and 100
    and second_score between 0 and 100
    and abs((first_score + second_score) - 100) < 0.01
  ),
  constraint axis_profile_confidence check (confidence between 0 and 1),
  constraint axis_profile_review_count check (review_count >= 0)
);

create table public.product_type_fits (
  product_id uuid not null references public.products(id) on delete cascade,
  beauty_code char(4) not null,
  fit_score numeric(5, 2) not null,
  review_count integer not null default 0,
  confidence numeric(4, 3) not null default 0,
  analysis_version text not null,
  updated_at timestamptz not null default now(),
  primary key (product_id, beauty_code),
  constraint valid_product_fit_beauty_code check (
    beauty_code ~ '^[OD][GM][PC][VE]$'
  ),
  constraint fit_score_range check (fit_score between 0 and 100),
  constraint fit_confidence_range check (confidence between 0 and 1),
  constraint fit_review_count_nonnegative check (review_count >= 0)
);

alter table public.product_analysis_requests
  add column if not exists product_id uuid references public.products(id) on delete set null,
  add column if not exists analysis_run_id uuid references public.review_analysis_runs(id) on delete set null;

create index idx_products_verification_status on public.products(verification_status);
create index idx_review_sources_product_id on public.review_sources(product_id);
create index idx_reviews_product_id on public.reviews(product_id);
create index idx_reviews_source_id on public.reviews(source_id);
create index idx_review_analysis_runs_product_id on public.review_analysis_runs(product_id);
create index idx_review_analysis_runs_status on public.review_analysis_runs(status);
create index idx_review_features_review_id on public.review_features(review_id);
create index idx_review_features_axis_code on public.review_features(axis, code);
create index idx_product_type_fits_beauty_code on public.product_type_fits(beauty_code);

alter table public.products enable row level security;
alter table public.review_sources enable row level security;
alter table public.reviews enable row level security;
alter table public.review_analysis_runs enable row level security;
alter table public.review_features enable row level security;
alter table public.product_axis_profiles enable row level security;
alter table public.product_type_fits enable row level security;

revoke all on public.products from anon, authenticated;
revoke all on public.review_sources from anon, authenticated;
revoke all on public.reviews from anon, authenticated;
revoke all on public.review_analysis_runs from anon, authenticated;
revoke all on public.review_features from anon, authenticated;
revoke all on public.product_axis_profiles from anon, authenticated;
revoke all on public.product_type_fits from anon, authenticated;

create trigger trg_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

comment on table public.reviews is 'Review text for product analysis. Do not store reviewer name, email, account id, phone, raw IP, or other direct identifiers.';
comment on table public.review_features is 'AI-extracted contextual product features mapped to O/D, G/M, P/C, V/E.';
comment on table public.product_type_fits is 'Precomputed product fit scores for all 16 Beauty Codes.';
comment on column public.review_analysis_runs.input_tokens is 'AI input token count for cost monitoring; null when no AI call was made.';
comment on column public.review_analysis_runs.output_tokens is 'AI output token count for cost monitoring; null when no AI call was made.';
