alter table public.products
add column if not exists is_price_reduced boolean not null default false;
