-- LAYAD 운영 데이터 관리용 안전 필드와 감사 이력
alter table if exists public.product_analysis_requests
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_reason text;

alter table if exists public.products
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_reason text;

alter table if exists public.test_sessions
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_reason text,
  add column if not exists excluded_from_statistics boolean not null default false;

create table if not exists public.admin_data_audit_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text not null,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  reason text not null,
  actor_label text not null default 'admin',
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_data_audit_logs_created_at
  on public.admin_data_audit_logs(created_at desc);
create index if not exists idx_product_analysis_requests_deleted_at
  on public.product_analysis_requests(deleted_at);
create index if not exists idx_products_deleted_at
  on public.products(deleted_at);
create index if not exists idx_test_sessions_deleted_at
  on public.test_sessions(deleted_at);
