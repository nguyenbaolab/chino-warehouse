alter table public.inventory_entries
add column if not exists barcode text;
