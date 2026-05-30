-- F08: Supabase Storage bucket product-images + RLS policies

-- Tao bucket product-images
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- RLS policy: ai cung doc duoc (public read)
create policy "Public read product images"
on storage.objects for select
using ( bucket_id = 'product-images' );

-- RLS policy: authenticated upload/update
create policy "Authenticated upload product images"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'product-images' );

-- RLS policy: authenticated update (ghi de)
create policy "Authenticated update product images"
on storage.objects for update
to authenticated
using ( bucket_id = 'product-images' );

-- RLS policy: authenticated delete
create policy "Authenticated delete product images"
on storage.objects for delete
to authenticated
using ( bucket_id = 'product-images' );
