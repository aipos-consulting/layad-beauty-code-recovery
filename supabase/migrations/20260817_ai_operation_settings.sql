create table if not exists public.ai_operation_settings (
  setting_key text primary key default 'default',
  mode text not null default 'pilot' check (mode in ('pilot', 'standard', 'growth', 'custom')),
  monthly_budget_usd numeric(10,2) not null default 20 check (monthly_budget_usd > 0),
  warning_low_percent integer not null default 50 check (warning_low_percent between 1 and 99),
  warning_high_percent integer not null default 80 check (warning_high_percent between 1 and 99),
  hard_stop_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.ai_operation_settings (
  setting_key,
  mode,
  monthly_budget_usd,
  warning_low_percent,
  warning_high_percent,
  hard_stop_enabled
)
values ('default', 'pilot', 20, 50, 80, true)
on conflict (setting_key) do nothing;

alter table public.ai_operation_settings enable row level security;
revoke all on table public.ai_operation_settings from anon, authenticated;

comment on table public.ai_operation_settings is 'Server-only LAYAD AI operation and cost guard settings';
