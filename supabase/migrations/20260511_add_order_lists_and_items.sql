create table if not exists public.order_lists (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'confirmed', 'placed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_list_id uuid not null references public.order_lists(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity_boxes integer not null default 1,
  notes text,
  is_manual boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.order_lists enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "allow_all" on public.order_lists;
create policy "allow_all" on public.order_lists
for all to anon using (true) with check (true);

drop policy if exists "allow_all" on public.order_items;
create policy "allow_all" on public.order_items
for all to anon using (true) with check (true);
