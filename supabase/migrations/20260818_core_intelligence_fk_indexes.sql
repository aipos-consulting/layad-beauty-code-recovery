create index if not exists idx_product_analysis_requests_product_id
  on public.product_analysis_requests(product_id);

create index if not exists idx_product_analysis_requests_analysis_run_id
  on public.product_analysis_requests(analysis_run_id);

create index if not exists idx_review_features_analysis_run_id
  on public.review_features(analysis_run_id);

create index if not exists idx_review_keyword_candidates_first_product_id
  on public.review_keyword_candidates(first_product_id);

create index if not exists idx_review_keyword_candidates_last_product_id
  on public.review_keyword_candidates(last_product_id);
