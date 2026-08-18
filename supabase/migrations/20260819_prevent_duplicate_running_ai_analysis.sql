-- Cost-safety guard: only one OpenAI analysis may run for the same product at a time.
create unique index if not exists review_analysis_runs_one_running_per_product
  on public.review_analysis_runs (product_id)
  where status = 'running';
