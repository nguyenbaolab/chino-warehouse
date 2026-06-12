-- KI-055: RLS role-based writes — guest SELECT only; staff+ mutate (9 bảng kho + storage product-images)

CREATE OR REPLACE FUNCTION public.is_current_user_at_least_staff()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin', 'staff')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_current_user_at_least_staff() TO authenticated;

-- locations
DROP POLICY IF EXISTS "allow_all" ON locations;
DROP POLICY IF EXISTS authenticated_only ON locations;
CREATE POLICY locations_select_authenticated ON locations
  FOR SELECT TO authenticated USING (true);
CREATE POLICY locations_mutate_staff_plus ON locations
  FOR ALL TO authenticated
  USING (public.is_current_user_at_least_staff())
  WITH CHECK (public.is_current_user_at_least_staff());

-- zones
DROP POLICY IF EXISTS "allow_all" ON zones;
DROP POLICY IF EXISTS authenticated_only ON zones;
CREATE POLICY zones_select_authenticated ON zones
  FOR SELECT TO authenticated USING (true);
CREATE POLICY zones_mutate_staff_plus ON zones
  FOR ALL TO authenticated
  USING (public.is_current_user_at_least_staff())
  WITH CHECK (public.is_current_user_at_least_staff());

-- product_categories_l1
DROP POLICY IF EXISTS "allow_all" ON product_categories_l1;
DROP POLICY IF EXISTS authenticated_only ON product_categories_l1;
CREATE POLICY product_categories_l1_select_authenticated ON product_categories_l1
  FOR SELECT TO authenticated USING (true);
CREATE POLICY product_categories_l1_mutate_staff_plus ON product_categories_l1
  FOR ALL TO authenticated
  USING (public.is_current_user_at_least_staff())
  WITH CHECK (public.is_current_user_at_least_staff());

-- product_categories_l2
DROP POLICY IF EXISTS "allow_all" ON product_categories_l2;
DROP POLICY IF EXISTS authenticated_only ON product_categories_l2;
CREATE POLICY product_categories_l2_select_authenticated ON product_categories_l2
  FOR SELECT TO authenticated USING (true);
CREATE POLICY product_categories_l2_mutate_staff_plus ON product_categories_l2
  FOR ALL TO authenticated
  USING (public.is_current_user_at_least_staff())
  WITH CHECK (public.is_current_user_at_least_staff());

-- products
DROP POLICY IF EXISTS "allow_all" ON products;
DROP POLICY IF EXISTS authenticated_only ON products;
CREATE POLICY products_select_authenticated ON products
  FOR SELECT TO authenticated USING (true);
CREATE POLICY products_mutate_staff_plus ON products
  FOR ALL TO authenticated
  USING (public.is_current_user_at_least_staff())
  WITH CHECK (public.is_current_user_at_least_staff());

-- inventory_entries
DROP POLICY IF EXISTS "allow_all" ON inventory_entries;
DROP POLICY IF EXISTS authenticated_only ON inventory_entries;
CREATE POLICY inventory_entries_select_authenticated ON inventory_entries
  FOR SELECT TO authenticated USING (true);
CREATE POLICY inventory_entries_mutate_staff_plus ON inventory_entries
  FOR ALL TO authenticated
  USING (public.is_current_user_at_least_staff())
  WITH CHECK (public.is_current_user_at_least_staff());

-- product_barcodes
DROP POLICY IF EXISTS "allow_all" ON product_barcodes;
DROP POLICY IF EXISTS authenticated_only ON product_barcodes;
CREATE POLICY product_barcodes_select_authenticated ON product_barcodes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY product_barcodes_mutate_staff_plus ON product_barcodes
  FOR ALL TO authenticated
  USING (public.is_current_user_at_least_staff())
  WITH CHECK (public.is_current_user_at_least_staff());

-- order_lists
DROP POLICY IF EXISTS "allow_all" ON order_lists;
DROP POLICY IF EXISTS authenticated_only ON order_lists;
CREATE POLICY order_lists_select_authenticated ON order_lists
  FOR SELECT TO authenticated USING (true);
CREATE POLICY order_lists_mutate_staff_plus ON order_lists
  FOR ALL TO authenticated
  USING (public.is_current_user_at_least_staff())
  WITH CHECK (public.is_current_user_at_least_staff());

-- order_items
DROP POLICY IF EXISTS "allow_all" ON order_items;
DROP POLICY IF EXISTS authenticated_only ON order_items;
CREATE POLICY order_items_select_authenticated ON order_items
  FOR SELECT TO authenticated USING (true);
CREATE POLICY order_items_mutate_staff_plus ON order_items
  FOR ALL TO authenticated
  USING (public.is_current_user_at_least_staff())
  WITH CHECK (public.is_current_user_at_least_staff());

-- storage: product-images (F08 policies → staff+ write)
DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete product images" ON storage.objects;

CREATE POLICY "product_images_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'product-images');

CREATE POLICY "product_images_write_staff_plus" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.is_current_user_at_least_staff());

CREATE POLICY "product_images_update_staff_plus" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND public.is_current_user_at_least_staff())
  WITH CHECK (bucket_id = 'product-images' AND public.is_current_user_at_least_staff());

CREATE POLICY "product_images_delete_staff_plus" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND public.is_current_user_at_least_staff());
