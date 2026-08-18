create unique index if not exists uq_products_normalized_name_active
  on public.products(normalized_name)
  where normalized_name is not null and deleted_at is null;

create unique index if not exists uq_products_product_url_active
  on public.products(product_url)
  where product_url is not null and deleted_at is null;
