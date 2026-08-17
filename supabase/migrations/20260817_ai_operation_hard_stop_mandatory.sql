update public.ai_operation_settings
set hard_stop_enabled = true,
    updated_at = now()
where hard_stop_enabled is distinct from true;

alter table public.ai_operation_settings
  alter column hard_stop_enabled set default true;

alter table public.ai_operation_settings
  drop constraint if exists ai_operation_settings_hard_stop_required;

alter table public.ai_operation_settings
  add constraint ai_operation_settings_hard_stop_required
  check (hard_stop_enabled = true);
