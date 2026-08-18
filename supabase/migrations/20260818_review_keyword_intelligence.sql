-- LAYAD Core Intelligence P4: keyword dictionary and discovery candidates

create table if not exists public.review_keyword_master (
  id bigint generated always as identity primary key,
  canonical_keyword text not null,
  language_code text not null default 'ko',
  synonyms jsonb not null default '[]'::jsonb,
  axis public.feature_axis not null,
  code public.feature_code not null,
  default_weight numeric(4,3) not null default 0.700,
  description text,
  verification_status text not null default 'approved',
  active boolean not null default true,
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint review_keyword_weight_range check (default_weight between 0 and 1),
  constraint review_keyword_status check (verification_status in ('draft','approved','rejected')),
  constraint review_keyword_axis_code check (
    (axis = 'OD' and code in ('O','D'))
    or (axis = 'GM' and code in ('G','M'))
    or (axis = 'PC' and code in ('P','C'))
    or (axis = 'VE' and code in ('V','E'))
  ),
  constraint review_keyword_unique unique (canonical_keyword, language_code, axis, code)
);

create table if not exists public.review_keyword_candidates (
  id bigint generated always as identity primary key,
  candidate_keyword text not null,
  language_code text not null default 'ko',
  suggested_axis public.feature_axis not null,
  suggested_code public.feature_code not null,
  suggested_weight numeric(4,3) not null default 0.500,
  ai_confidence numeric(4,3) not null default 0.500,
  occurrence_count integer not null default 1,
  first_product_id uuid references public.products(id) on delete set null,
  last_product_id uuid references public.products(id) on delete set null,
  sample_context text,
  status text not null default 'pending',
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint review_keyword_candidate_weight_range check (suggested_weight between 0 and 1),
  constraint review_keyword_candidate_confidence_range check (ai_confidence between 0 and 1),
  constraint review_keyword_candidate_count check (occurrence_count > 0),
  constraint review_keyword_candidate_status check (status in ('pending','approved','rejected','merged')),
  constraint review_keyword_candidate_axis_code check (
    (suggested_axis = 'OD' and suggested_code in ('O','D'))
    or (suggested_axis = 'GM' and suggested_code in ('G','M'))
    or (suggested_axis = 'PC' and suggested_code in ('P','C'))
    or (suggested_axis = 'VE' and suggested_code in ('V','E'))
  )
);

create unique index if not exists idx_review_keyword_candidates_identity
  on public.review_keyword_candidates(candidate_keyword, language_code, suggested_axis, suggested_code)
  where status = 'pending';

create index if not exists idx_review_keyword_master_lookup
  on public.review_keyword_master(language_code, active, axis, code);

create index if not exists idx_review_keyword_candidates_status
  on public.review_keyword_candidates(status, occurrence_count desc);

alter table public.review_keyword_master enable row level security;
alter table public.review_keyword_candidates enable row level security;
revoke all on public.review_keyword_master from anon, authenticated;
revoke all on public.review_keyword_candidates from anon, authenticated;

create trigger trg_review_keyword_master_updated_at
before update on public.review_keyword_master
for each row execute function public.set_updated_at();

create trigger trg_review_keyword_candidates_updated_at
before update on public.review_keyword_candidates
for each row execute function public.set_updated_at();

comment on table public.review_keyword_master is 'LAYAD-owned approved review language dictionary mapped to Beauty Code axes. This is a core data asset and must not be replaced by free-form model judgment.';
comment on table public.review_keyword_candidates is 'New review expressions discovered during analysis. Candidates require approval before promotion to the master dictionary.';
