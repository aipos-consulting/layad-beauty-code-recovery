create or replace function public.calibrate_layad_fit_score(p_score numeric)
returns numeric
language sql
immutable
as $$
  select greatest(35::numeric, least(95::numeric, round(68 + (coalesce(p_score, 50) - 50) * 1.25)));
$$;

create or replace function public.finalize_product_fit_analysis_v3(
  p_request_id uuid,
  p_product_id uuid,
  p_input_type product_input_type,
  p_canonical_name text,
  p_brand text,
  p_category text,
  p_confidence numeric,
  p_evidence_count integer,
  p_analysis_version text,
  p_model_name text,
  p_input_tokens integer,
  p_output_tokens integer,
  p_started_at timestamp with time zone,
  p_fits jsonb,
  p_axes jsonb
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_target_product uuid := p_product_id;
  v_target_name text;
  v_target_normalized text;
  v_input_alias text;
  v_run_id uuid;
begin
  v_target_name := coalesce(nullif(btrim(p_canonical_name),''), '');
  v_target_normalized := case when v_target_name='' then null else lower(regexp_replace(v_target_name,'\\s+',' ','g')) end;

  if v_target_normalized is not null then
    select p.id into v_target_product
    from public.products p
    where p.normalized_name=v_target_normalized and p.deleted_at is null
    order by p.created_at asc limit 1;
  end if;
  v_target_product := coalesce(v_target_product,p_product_id);

  insert into public.product_type_fits(product_id,beauty_code,fit_score,raw_fit_score,review_count,confidence,analysis_version,updated_at)
  select v_target_product,
         (x.beauty_code)::char(4),
         public.calibrate_layad_fit_score(x.fit_score),
         public.calibrate_layad_fit_score(x.fit_score),
         p_evidence_count,p_confidence,
         p_analysis_version || '-single-fit-calibrated',now()
  from jsonb_to_recordset(p_fits) as x(beauty_code text, fit_score numeric, raw_fit_score numeric)
  on conflict(product_id,beauty_code) do update set
    fit_score=excluded.fit_score, raw_fit_score=excluded.raw_fit_score,
    review_count=excluded.review_count, confidence=excluded.confidence,
    analysis_version=excluded.analysis_version, updated_at=now();

  insert into public.product_axis_profiles(product_id,axis,first_code,first_score,second_code,second_score,review_count,confidence,analysis_version,updated_at)
  select v_target_product,(x.axis)::feature_axis,(x.first_code)::feature_code,x.first_score,(x.second_code)::feature_code,x.second_score,p_evidence_count,p_confidence,p_analysis_version,now()
  from jsonb_to_recordset(p_axes) as x(axis text, first_code text, first_score numeric, second_code text, second_score numeric)
  on conflict(product_id,axis) do update set
    first_code=excluded.first_code, first_score=excluded.first_score,
    second_code=excluded.second_code, second_score=excluded.second_score,
    review_count=excluded.review_count, confidence=excluded.confidence,
    analysis_version=excluded.analysis_version, updated_at=now();

  update public.products set
    canonical_name=coalesce(nullif(btrim(p_canonical_name),''),canonical_name),
    normalized_name=coalesce(v_target_normalized,normalized_name),
    brand=nullif(btrim(p_brand),''), category=nullif(btrim(p_category),''),
    verification_status=case when p_input_type='url' then 'link_verified'::product_verification_status else 'name_verified'::product_verification_status end,
    updated_at=now()
  where id=v_target_product;

  select r.input_value into v_input_alias from public.product_analysis_requests r where r.id=p_request_id;
  if v_input_alias is not null and btrim(v_input_alias)<>'' and p_input_type='name' then
    insert into public.product_aliases(product_id,alias_name,normalized_alias)
    values(v_target_product,btrim(v_input_alias),lower(regexp_replace(btrim(v_input_alias),'\\s+',' ','g')))
    on conflict(normalized_alias) do update set product_id=excluded.product_id, alias_name=excluded.alias_name;
  end if;

  insert into public.review_analysis_runs(product_id,status,provider,model_name,prompt_version,analysis_version,input_review_count,input_tokens,output_tokens,started_at,completed_at)
  values(v_target_product,'completed','openai',p_model_name,'layad-owner-v10',p_analysis_version || '-single-fit-calibrated',p_evidence_count,p_input_tokens,p_output_tokens,p_started_at,now())
  returning id into v_run_id;

  update public.product_analysis_requests
  set product_id=v_target_product,status='completed',analysis_run_id=v_run_id,error_message=null,updated_at=now()
  where id=p_request_id;

  if v_target_product<>p_product_id then
    update public.products set deleted_at=coalesce(deleted_at,now()),updated_at=now() where id=p_product_id;
  end if;
end;
$function$;

update public.product_type_fits
set fit_score = public.calibrate_layad_fit_score(fit_score),
    raw_fit_score = public.calibrate_layad_fit_score(fit_score),
    analysis_version = coalesce(analysis_version,'legacy') || '-single-fit-calibrated',
    updated_at = now()
where coalesce(analysis_version,'') not like '%single-fit-calibrated%';
