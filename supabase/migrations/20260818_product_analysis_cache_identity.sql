-- LAYAD Core Intelligence P2: stable product identity for one-time analysis reuse

alter table public.products
  add column if not exists normalized_name text;

create or replace function public.normalize_product_name(value text)
returns text
language sql
immutable
as $$
  select case
    when value is null then null
    else lower(regexp_replace(btrim(value), '\s+', ' ', 'g'))
  end;
$$;

update public.products
set normalized_name = public.normalize_product_name(canonical_name)
where canonical_name is not null
  and normalized_name is distinct from public.normalize_product_name(canonical_name);

create or replace function public.set_product_normalized_name()
returns trigger
language plpgsql
as $$
begin
  new.normalized_name := public.normalize_product_name(new.canonical_name);
  return new;
end;
$$;

drop trigger if exists trg_products_normalized_name on public.products;
create trigger trg_products_normalized_name
before insert or update of canonical_name on public.products
for each row execute function public.set_product_normalized_name();

create index if not exists idx_products_normalized_name
  on public.products(normalized_name);

comment on column public.products.normalized_name is
  'Normalized canonical product name used only for conservative cache lookup. A match is reusable only when all 16 product_type_fits rows exist.';
