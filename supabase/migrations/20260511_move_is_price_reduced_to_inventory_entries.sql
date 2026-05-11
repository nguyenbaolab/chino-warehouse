alter table public.products
drop column if exists is_price_reduced;

alter table public.inventory_entries
add column if not exists is_price_reduced boolean not null default false;
