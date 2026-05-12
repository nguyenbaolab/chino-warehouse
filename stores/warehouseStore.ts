import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { Location, Zone, ZoneCell, Product, InventoryEntry, OrderItem, OrderList, OrderListStatus } from '../types'

type WarehouseStore = {
  locations: Location[]
  selectedLocationId: string | null
  zones: Zone[]
  products: Product[]
  inventoryEntries: InventoryEntry[]
  orderLists: OrderList[]
  orderItems: OrderItem[]
  isLoading: boolean

  setSelectedLocation: (id: string) => void
  fetchLocations: () => Promise<void>
  addLocation: (
    name: string,
    grid_rows: number,
    grid_cols: number
  ) => Promise<{ error: string | null; location?: Location }>
  updateLocation: (
    id: string,
    data: { name?: string; grid_rows?: number; grid_cols?: number }
  ) => Promise<{ error: string | null }>
  deleteLocation: (id: string) => Promise<{ error: string | null }>
  fetchZones: (locationId: string) => Promise<void>
  fetchProducts: () => Promise<void>
  fetchInventoryByZone: (zoneId: string) => Promise<InventoryEntry[]>
  fetchAllInventoryEntries: () => Promise<{ error: string | null }>
  searchProducts: (query: string) => Promise<InventoryEntry[]>
  searchByBarcode: (barcode: string) => Promise<InventoryEntry | null>
  addProduct: (data: Partial<Product>) => Promise<Product | null>
  addInventoryEntry: (data: Partial<InventoryEntry>) => Promise<void>
  updateInventoryEntry: (id: string, data: Partial<InventoryEntry>) => Promise<void>
  deleteInventoryEntry: (id: string) => Promise<void>
  updateProductStockThresholds: (
    productId: string,
    data: { low_warning_boxes?: number; low_critical_boxes?: number }
  ) => Promise<Product | null>
  addZone: (data: {
    name: string
    cells: ZoneCell[]
    tier_count: number
    color: string
    location_id: string
  }) => Promise<void>
  updateZone: (id: string, data: Partial<Zone>) => Promise<void>
  /** Cập nhật cells nhiều zone; sau cùng gọi fetchZones(locationId). */
  batchUpdateZoneCells: (
    locationId: string,
    updates: { id: string; cells: ZoneCell[] }[]
  ) => Promise<{ error: string | null }>
  deleteZone: (id: string) => Promise<boolean>
  toggleDeferred: (productId: string) => Promise<void>
  togglePriceReduced: (entryId: string) => Promise<void>
  setProductDiscontinued: (productId: string, isDiscontinued: boolean) => Promise<void>
  toggleDiscontinued: (productId: string) => Promise<void>
  fetchDiscontinuedProducts: () => Promise<void>
  refreshDiscontinuedContext: () => Promise<void>
  fetchOrderLists: () => Promise<void>
  createOrderList: (title: string) => Promise<OrderList | null>
  updateOrderList: (id: string, data: Partial<OrderList>) => Promise<void>
  deleteOrderList: (id: string) => Promise<void>
  addOrderItem: (data: Partial<OrderItem>) => Promise<OrderItem | null>
  updateOrderItem: (id: string, data: Partial<OrderItem>) => Promise<void>
  deleteOrderItem: (id: string) => Promise<void>
  confirmOrderList: (id: string) => Promise<void>
  markOrderPlaced: (id: string) => Promise<void>
}

export const useWarehouseStore = create<WarehouseStore>((set, get) => ({
  locations: [],
  selectedLocationId: null,
  zones: [],
  products: [],
  inventoryEntries: [],
  orderLists: [],
  orderItems: [],
  isLoading: false,

  setSelectedLocation: (id) => {
    set({ selectedLocationId: id })
    get().fetchZones(id)
  },

  fetchLocations: async () => {
    const { data } = await supabase.from('locations').select('*').order('name')
    if (data) {
      set({ locations: data })
      if (data.length > 0 && !get().selectedLocationId) {
        get().setSelectedLocation(data[0].id)
      }
    }
  },

  addLocation: async (name, grid_rows, grid_cols) => {
    const trimmed = name.trim()
    if (!trimmed) {
      return { error: 'Tên kho không được để trống.' }
    }
    const rows = Math.floor(Number(grid_rows))
    const cols = Math.floor(Number(grid_cols))
    if (!Number.isFinite(rows) || !Number.isFinite(cols) || rows < 1 || cols < 1) {
      return { error: 'Kích thước lưới phải là số nguyên ≥ 1 (số hàng × số cột).' }
    }
    const { data: created, error } = await supabase
      .from('locations')
      .insert({ name: trimmed, grid_rows: rows, grid_cols: cols })
      .select('*')
      .single()
    if (error || !created) {
      return { error: error?.message ?? 'Không tạo được kho.' }
    }
    const location = created as Location
    await get().fetchLocations()
    return { error: null, location }
  },

  updateLocation: async (id, data) => {
    const { locations } = get()
    const loc = locations.find((l) => l.id === id)
    if (!loc) {
      return { error: 'Không tìm thấy kho.' }
    }
    const nextRows = data.grid_rows !== undefined ? Math.floor(Number(data.grid_rows)) : loc.grid_rows
    const nextCols = data.grid_cols !== undefined ? Math.floor(Number(data.grid_cols)) : loc.grid_cols
    if (data.grid_rows !== undefined && (!Number.isFinite(nextRows) || nextRows < 1)) {
      return { error: 'Số hàng lưới phải là số nguyên ≥ 1.' }
    }
    if (data.grid_cols !== undefined && (!Number.isFinite(nextCols) || nextCols < 1)) {
      return { error: 'Số cột lưới phải là số nguyên ≥ 1.' }
    }
    const shrinkingRows = nextRows < loc.grid_rows
    const shrinkingCols = nextCols < loc.grid_cols
    if (shrinkingRows || shrinkingCols) {
      const { data: zones } = await supabase.from('zones').select('id, cells').eq('location_id', id)
      for (const z of zones ?? []) {
        const cells = (z.cells as ZoneCell[]) ?? []
        for (const c of cells) {
          if (c.row > nextRows || c.col > nextCols) {
            return {
              error:
                `Không thu nhỏ lưới được: có zone chứa ô (hàng ${c.row}, cột ${c.col}) vượt quá lưới mới (${nextRows}×${nextCols}). Hãy di chuyển hoặc xóa zone trước.`,
            }
          }
        }
      }
    }
    const payload: { name?: string; grid_rows?: number; grid_cols?: number } = {}
    if (data.name !== undefined) {
      const n = data.name.trim()
      if (!n) return { error: 'Tên kho không được để trống.' }
      payload.name = n
    }
    if (data.grid_rows !== undefined) payload.grid_rows = nextRows
    if (data.grid_cols !== undefined) payload.grid_cols = nextCols
    if (Object.keys(payload).length === 0) {
      return { error: null }
    }
    const { error } = await supabase.from('locations').update(payload).eq('id', id)
    if (error) {
      return { error: error.message ?? 'Cập nhật kho thất bại.' }
    }
    await get().fetchLocations()
    return { error: null }
  },

  deleteLocation: async (id) => {
    const { data: zones, error: zErr } = await supabase.from('zones').select('id').eq('location_id', id)
    if (zErr) {
      return { error: zErr.message ?? 'Không đọc được danh sách zone.' }
    }
    const zoneIds = (zones ?? []).map((z) => z.id)
    if (zoneIds.length > 0) {
      const { count, error: cErr } = await supabase
        .from('inventory_entries')
        .select('id', { count: 'exact', head: true })
        .in('zone_id', zoneIds)
      if (cErr) {
        return { error: cErr.message ?? 'Không kiểm tra được tồn kho.' }
      }
      if ((count ?? 0) > 0) {
        return {
          error:
            'Không xóa được kho: vẫn còn ít nhất một lô hàng (kể cả 0 thùng) trong các zone của kho. Xóa hoặc chuyển hết lô trước.',
        }
      }
    }
    const wasSelected = get().selectedLocationId === id
    const { error: delErr } = await supabase.from('locations').delete().eq('id', id)
    if (delErr) {
      return { error: delErr.message ?? 'Xóa kho thất bại.' }
    }
    await get().fetchLocations()
    if (wasSelected) {
      const locs = get().locations
      if (locs.length > 0) {
        get().setSelectedLocation(locs[0].id)
      } else {
        set({ selectedLocationId: null, zones: [] })
      }
    }
    return { error: null }
  },

  fetchZones: async (locationId) => {
    set({ isLoading: true })
    const { data } = await supabase
      .from('zones')
      .select('*')
      .eq('location_id', locationId)
    if (data) set({ zones: data })
    set({ isLoading: false })
  },

  fetchProducts: async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('is_archived', false)
      .order('name')
    if (data) set({ products: data })
  },

  fetchInventoryByZone: async (zoneId) => {
    const { data } = await supabase
      .from('inventory_entries')
      .select('*, product:products(*), zone:zones(*)')
      .eq('zone_id', zoneId)
    const entries = data || []
    set((s) => {
      const next = s.inventoryEntries.filter((entry) => entry.zone_id !== zoneId)
      return { inventoryEntries: [...next, ...entries] }
    })
    return entries
  },

  fetchAllInventoryEntries: async () => {
    const { data, error } = await supabase
      .from('inventory_entries')
      .select('*, product:products(*), zone:zones(*)')
    if (error) {
      return { error: error.message ?? 'Không tải được tồn kho.' }
    }
    set({ inventoryEntries: data ?? [] })
    return { error: null }
  },

  searchProducts: async (query) => {
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .ilike('name', `%${query}%`)
      .eq('is_archived', false)
    if (!products || products.length === 0) return []
    const productIds = products.map(p => p.id)
    const { data } = await supabase
      .from('inventory_entries')
      .select('*, product:products(*), zone:zones(*)')
      .in('product_id', productIds)
    return data || []
  },

  searchByBarcode: async (barcode) => {
    const normalized = barcode.trim().toLowerCase()
    if (!normalized) return null

    const inStore = get().inventoryEntries.find((entry) => entry.barcode?.trim().toLowerCase() === normalized)
    if (inStore) return inStore

    const { data } = await supabase
      .from('inventory_entries')
      .select('*, product:products(*), zone:zones(*)')
      .eq('barcode', normalized)
      .limit(1)
      .maybeSingle()

    if (data) {
      const entry = data as InventoryEntry
      set((s) => {
        const nextEntries = s.inventoryEntries.filter((item) => item.id !== entry.id)
        return {
          inventoryEntries: [...nextEntries, entry],
          products: entry.product
            ? s.products.some((p) => p.id === entry.product!.id)
              ? s.products.map((p) => (p.id === entry.product!.id ? entry.product! : p))
              : [...s.products, entry.product!].sort((a, b) => a.name.localeCompare(b.name))
            : s.products,
        }
      })
      return entry
    }
    return null
  },

  addProduct: async (data) => {
    const { data: created } = await supabase
      .from('products')
      .insert(data)
      .select()
      .single()
    if (created) {
      set((s) => ({
        products: [...s.products.filter((p) => p.id !== created.id), created].sort((a, b) => a.name.localeCompare(b.name)),
      }))
    }
    return created
  },

  addInventoryEntry: async (data) => {
    const { data: created } = await supabase
      .from('inventory_entries')
      .insert(data)
      .select('*, product:products(*), zone:zones(*)')
      .single()
    if (created) {
      set((s) => ({
        inventoryEntries: [...s.inventoryEntries.filter((entry) => entry.id !== created.id), created],
      }))
    }
  },

  updateInventoryEntry: async (id, data) => {
    await supabase.from('inventory_entries').update(data).eq('id', id)
    set((s) => ({
      inventoryEntries: s.inventoryEntries.map((entry) => (
        entry.id === id ? { ...entry, ...data } : entry
      )),
    }))
  },

  deleteInventoryEntry: async (id) => {
    await supabase.from('inventory_entries').delete().eq('id', id)
    set((s) => ({
      inventoryEntries: s.inventoryEntries.filter((entry) => entry.id !== id),
    }))
  },

  updateProductStockThresholds: async (productId, data) => {
    const payload: { low_warning_boxes?: number; low_critical_boxes?: number } = {}
    if (typeof data.low_warning_boxes === 'number') payload.low_warning_boxes = data.low_warning_boxes
    if (typeof data.low_critical_boxes === 'number') payload.low_critical_boxes = data.low_critical_boxes

    const { data: updated } = await supabase
      .from('products')
      .update(payload)
      .eq('id', productId)
      .select('*')
      .single()

    if (updated) {
      set((s) => ({
        products: s.products.map((p) => (p.id === updated.id ? updated : p)),
        inventoryEntries: s.inventoryEntries.map((entry) => (
          entry.product_id === updated.id ? { ...entry, product: updated } : entry
        )),
      }))
      return updated
    }
    return null
  },

  addZone: async (data) => {
    const payload = {
      name: data.name,
      cells: data.cells,
      tier_count: data.tier_count,
      has_tiers: data.tier_count > 1,
      color: data.color,
      location_id: data.location_id,
    }
    const { data: created } = await supabase
      .from('zones')
      .insert(payload)
      .select()
      .single()
    if (created) set((s) => ({ zones: [...s.zones, created] }))
  },

  updateZone: async (id, data) => {
    await supabase.from('zones').update(data).eq('id', id)
    set((s) => ({
      zones: s.zones.map((z) => (z.id === id ? { ...z, ...data } : z)),
    }))
  },

  batchUpdateZoneCells: async (locationId, updates) => {
    for (const u of updates) {
      const { error } = await supabase.from('zones').update({ cells: u.cells }).eq('id', u.id)
      if (error) {
        return { error: error.message ?? 'Cập nhật zone thất bại.' }
      }
    }
    await get().fetchZones(locationId)
    return { error: null }
  },

  deleteZone: async (id) => {
    const { data: entries } = await supabase
      .from('inventory_entries')
      .select('id')
      .eq('zone_id', id)
      .gt('quantity_boxes', 0)
      .limit(1)
    if (entries && entries.length > 0) return false
    await supabase.from('zones').delete().eq('id', id)
    set((s) => ({ zones: s.zones.filter((z) => z.id !== id) }))
    return true
  },

  toggleDeferred: async (productId) => {
    const { products, inventoryEntries } = get()
    const fromProduct = products.find((p) => p.id === productId)
    const fromEntry = inventoryEntries.find((e) => e.product_id === productId)?.product
    const current = fromProduct?.is_deferred ?? fromEntry?.is_deferred ?? false
    const next = !current

    const { data: updated } = await supabase
      .from('products')
      .update({ is_deferred: next })
      .eq('id', productId)
      .select('*')
      .single()

    if (!updated) return

    set((s) => ({
      products: s.products.some((p) => p.id === productId)
        ? s.products.map((p) => (p.id === productId ? updated : p))
        : [...s.products, updated].sort((a, b) => a.name.localeCompare(b.name)),
      inventoryEntries: s.inventoryEntries.map((entry) => (
        entry.product_id === productId
          ? { ...entry, product: entry.product ? { ...entry.product, ...updated } : updated }
          : entry
      )),
    }))
  },

  togglePriceReduced: async (entryId) => {
    const { inventoryEntries } = get()
    const entry = inventoryEntries.find((e) => e.id === entryId)
    if (!entry) return
    const current = entry.is_price_reduced ?? false
    const next = !current

    const { data: updated } = await supabase
      .from('inventory_entries')
      .update({ is_price_reduced: next })
      .eq('id', entryId)
      .select('*, product:products(*), zone:zones(*)')
      .single()

    if (!updated) return

    set((s) => ({
      inventoryEntries: s.inventoryEntries.map((entry) => (
        entry.id === entryId
          ? { ...entry, ...updated }
          : entry
      )),
    }))
  },

  setProductDiscontinued: async (productId, isDiscontinued) => {
    const { data: updated } = await supabase
      .from('products')
      .update({ is_discontinued: isDiscontinued })
      .eq('id', productId)
      .select('*')
      .single()

    if (!updated) return

    set((s) => ({
      products: s.products.some((p) => p.id === productId)
        ? s.products.map((p) => (p.id === productId ? updated : p))
        : [...s.products, updated].sort((a, b) => a.name.localeCompare(b.name)),
      inventoryEntries: s.inventoryEntries.map((entry) => (
        entry.product_id === productId
          ? { ...entry, product: entry.product ? { ...entry.product, ...updated } : updated }
          : entry
      )),
    }))
  },

  toggleDiscontinued: async (productId) => {
    const { products, inventoryEntries, setProductDiscontinued } = get()
    const fromProduct = products.find((p) => p.id === productId)
    const fromEntry = inventoryEntries.find((e) => e.product_id === productId)?.product
    const current = fromProduct?.is_discontinued ?? fromEntry?.is_discontinued ?? false
    await setProductDiscontinued(productId, !current)
  },

  fetchDiscontinuedProducts: async () => {
    const { data: discontinuedList } = await supabase
      .from('products')
      .select('*')
      .eq('is_discontinued', true)
      .eq('is_archived', false)
      .order('name')

    const rows = discontinuedList ?? []
    const serverDiscontinuedIds = new Set(rows.map((p) => p.id))

    set((s) => {
      let products = s.products.map((p) => {
        const fresh = rows.find((r) => r.id === p.id)
        if (fresh) return fresh
        if (p.is_discontinued === true && !serverDiscontinuedIds.has(p.id)) {
          return { ...p, is_discontinued: false }
        }
        return p
      })
      for (const p of rows) {
        if (!products.some((x) => x.id === p.id)) {
          products = [...products, p]
        }
      }
      products = products.sort((a, b) => a.name.localeCompare(b.name))
      const productById = new Map(products.map((p) => [p.id, p]))
      const inventoryEntries = s.inventoryEntries.map((e) => {
        const pr = productById.get(e.product_id)
        if (!pr || !e.product) return e
        return { ...e, product: { ...e.product, ...pr } }
      })
      return { products, inventoryEntries }
    })
  },

  refreshDiscontinuedContext: async () => {
    const { fetchDiscontinuedProducts, fetchInventoryByZone, zones } = get()
    await fetchDiscontinuedProducts()
    await Promise.all(zones.map((z) => fetchInventoryByZone(z.id)))
  },

  fetchOrderLists: async () => {
    const [{ data: lists }, { data: items }] = await Promise.all([
      supabase.from('order_lists').select('*').order('created_at', { ascending: false }),
      supabase.from('order_items').select('*').order('created_at', { ascending: true }),
    ])
    set({
      orderLists: (lists as OrderList[]) ?? [],
      orderItems: (items as OrderItem[]) ?? [],
    })
  },

  createOrderList: async (title) => {
    const payload = {
      title: title.trim() || `List ${new Date().toLocaleDateString('vi-VN')}`,
      status: 'draft' as OrderListStatus,
    }
    const { data } = await supabase.from('order_lists').insert(payload).select('*').single()
    const created = data as OrderList | null
    if (created) {
      set((s) => ({ orderLists: [created, ...s.orderLists] }))
    }
    return created
  },

  updateOrderList: async (id, data) => {
    const { data: updated } = await supabase.from('order_lists').update(data).eq('id', id).select('*').single()
    if (!updated) return
    set((s) => ({
      orderLists: s.orderLists.map((list) => (list.id === id ? (updated as OrderList) : list)),
    }))
  },

  deleteOrderList: async (id) => {
    await supabase.from('order_items').delete().eq('order_list_id', id)
    await supabase.from('order_lists').delete().eq('id', id)
    set((s) => ({
      orderLists: s.orderLists.filter((list) => list.id !== id),
      orderItems: s.orderItems.filter((item) => item.order_list_id !== id),
    }))
  },

  addOrderItem: async (data) => {
    const payload = {
      order_list_id: data.order_list_id,
      product_id: data.product_id ?? null,
      product_name: data.product_name?.trim() ?? '',
      quantity_boxes: data.quantity_boxes ?? 1,
      notes: data.notes ?? null,
      is_manual: data.is_manual ?? false,
    }
    const { data: created } = await supabase.from('order_items').insert(payload).select('*').single()
    const item = created as OrderItem | null
    if (item) {
      set((s) => ({ orderItems: [...s.orderItems, item] }))
    }
    return item
  },

  updateOrderItem: async (id, data) => {
    const { data: updated } = await supabase.from('order_items').update(data).eq('id', id).select('*').single()
    if (!updated) return
    set((s) => ({
      orderItems: s.orderItems.map((item) => (item.id === id ? (updated as OrderItem) : item)),
    }))
  },

  deleteOrderItem: async (id) => {
    await supabase.from('order_items').delete().eq('id', id)
    set((s) => ({
      orderItems: s.orderItems.filter((item) => item.id !== id),
    }))
  },

  confirmOrderList: async (id) => {
    const { data: updated } = await supabase
      .from('order_lists')
      .update({ status: 'confirmed' })
      .eq('id', id)
      .select('*')
      .single()
    if (!updated) return
    set((s) => ({
      orderLists: s.orderLists.map((list) => (list.id === id ? (updated as OrderList) : list)),
    }))
  },

  markOrderPlaced: async (id) => {
    const { data: updated } = await supabase
      .from('order_lists')
      .update({ status: 'placed' })
      .eq('id', id)
      .select('*')
      .single()
    if (!updated) return
    set((s) => ({
      orderLists: s.orderLists.map((list) => (list.id === id ? (updated as OrderList) : list)),
    }))
  },
}))