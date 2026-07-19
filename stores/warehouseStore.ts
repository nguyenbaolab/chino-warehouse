import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { deleteProductImage } from '../utils/imageUtils'
import { getErrorMessage } from '../utils/errorMessages'
import { normalizeText } from '../utils/textUtils'
import {
  Location,
  Zone,
  ZoneCell,
  Product,
  ProductCategoryL1,
  ProductCategoryL2,
  InventoryEntry,
  OrderItem,
  OrderList,
  OrderListStatus,
  PickingList,
  PickingListItem,
  AuditLog,
  LocateIntent,
  ProductBarcode,
  InternalNote,
} from '../types'

/** KI-064 — chặn Realtime location-merge ghi đè khi đang fetch full inventory */
let allInventoryFetchInFlight = false
let allInventoryFetchSeq = 0

type WarehouseStore = {
  locations: Location[]
  selectedLocationId: string | null
  /** F36 — Warehouse ↔ Market; filter locations theo type */
  appMode: 'warehouse' | 'market'
  zones: Zone[]
  products: Product[]
  /** KI-040 — trang SP cho ProductsScreen (search server-side, max 200) */
  productsPage: Product[]
  productsTotalCount: number
  productsPageLoading: boolean
  productCategoriesL1: ProductCategoryL1[]
  productCategoriesL2: ProductCategoryL2[]
  inventoryEntries: InventoryEntry[]
  orderLists: OrderList[]
  orderItems: OrderItem[]
  pickingLists: PickingList[]
  pickingListItems: PickingListItem[]
  internalNotes: InternalNote[]
  isLoading: boolean
  locateIntent: LocateIntent | null

  setSelectedLocation: (id: string) => void
  setAppMode: (mode: 'warehouse' | 'market') => void
  /** Label đơn vị số lượng theo mode: thùng | sản phẩm */
  getQtyUnit: () => string
  setLocateIntent: (intent: LocateIntent) => void
  clearLocateIntent: () => void
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
  /** Realtime / background — không bật isLoading (tránh unmount Map grid) */
  fetchZonesSilent: (locationId: string) => Promise<void>
  fetchProducts: () => Promise<void>
  /** KI-040 — ProductsScreen: search server-side + giảm payload (max 200) */
  fetchProductsPage: (params: {
    page: number
    pageSize?: number
    search?: string
    showArchived?: boolean
    showNoImageOnly?: boolean
  }) => Promise<void>
  fetchInventoryByZone: (zoneId: string) => Promise<InventoryEntry[]>
  /** Một query cho mọi zone của kho — set inventoryEntries một lần. */
  fetchInventoryByLocation: (locationId: string) => Promise<void>
  /** Realtime / Products filter — MERGE theo location; zone IDs từ DB (KI-064) */
  fetchInventoryByLocationSilent: (locationId: string) => Promise<void>
  fetchAllInventoryEntries: () => Promise<{ error: string | null }>
  searchProducts: (query: string) => Promise<InventoryEntry[]>
  /** Mọi lô có barcode khớp (toàn kho) — chỉ return, không ghi store. */
  searchInventoryByBarcode: (barcode: string) => Promise<InventoryEntry[]>
  searchByBarcode: (barcode: string) => Promise<InventoryEntry | null>
  /** B1: lookup SP qua bảng product_barcodes + tổng tồn toàn kho. */
  lookupProductByBarcode: (barcode: string) => Promise<{ product: Product; totalStock: number } | null>
  /** B1: barcode đã thuộc SP khác → trả SP owning; không conflict → null. */
  checkBarcodeConflict: (barcode: string, currentProductId: string) => Promise<Product | null>
  /** B1: ghi/ghi lại mã vạch SP (caller phải check conflict trước). `reassign` sau khi user xác nhận ghi đè SP khác. */
  upsertProductBarcode: (productId: string, barcode: string, options?: { reassign?: boolean }) => Promise<void>
  fetchProductBarcodes: (productId: string) => Promise<ProductBarcode[]>
  deleteProductBarcode: (barcodeId: string) => Promise<void>
  updateProductBarcode: (barcodeId: string, newBarcode: string) => Promise<{ error?: string }>
  /** B2: ghi audit CONFLICT qua RPC khi block gán barcode trùng SP khác. */
  logBarcodeConflict: (
    barcode: string,
    attemptedProductId: string,
    conflictingProductId: string,
    attemptedProductName: string,
    conflictingProductName: string,
  ) => Promise<void>
  addProduct: (data: Partial<Product>) => Promise<Product | null>
  deleteProduct: (productId: string) => Promise<void>
  addInventoryEntry: (data: Partial<InventoryEntry>) => Promise<void>
  updateInventoryEntry: (id: string, data: Partial<InventoryEntry>) => Promise<void>
  /** C4 — Reset checklist Kiểm hàng: is_checked=false cho mọi lô is_special */
  resetMarketChecklist: () => Promise<void>
  deleteInventoryEntry: (id: string) => Promise<void>
  updateProductStockThresholds: (
    productId: string,
    data: { low_warning_boxes?: number; low_critical_boxes?: number }
  ) => Promise<Product | null>
  updateProductCategory: (
    productId: string,
    data: { category_level1_id: string | null; category_level2_id: string | null }
  ) => Promise<{ error: string | null; product: Product | null }>
  updateProductName: (productId: string, name: string) => Promise<void>
  updateProductImage: (productId: string, url: string) => Promise<void>
  removeProductImage: (productId: string) => Promise<void>
  fetchCategories: () => Promise<{ error: string | null }>
  addCategoryL1: (name: string) => Promise<{ error: string | null; category?: ProductCategoryL1 }>
  updateCategoryL1: (id: string, data: { name: string }) => Promise<{ error: string | null }>
  deleteCategoryL1: (id: string) => Promise<{ error: string | null }>
  addCategoryL2: (level1Id: string, name: string) => Promise<{ error: string | null; category?: ProductCategoryL2 }>
  updateCategoryL2: (id: string, data: { name: string }) => Promise<{ error: string | null }>
  deleteCategoryL2: (id: string) => Promise<{ error: string | null }>
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
  togglePriceReduced: (entryId: string) => Promise<void>
  setProductDiscontinued: (productId: string, isDiscontinued: boolean, reason?: string) => Promise<void>
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
  fetchPickingLists: () => Promise<void>
  createPickingList: (title: string) => Promise<PickingList | null>
  updatePickingList: (id: string, data: Partial<PickingList>) => Promise<void>
  deletePickingList: (id: string) => Promise<void>
  addPickingItem: (
    pickingListId: string,
    data: {
      inventory_entry_id: string
      product_id: string
      zone_id: string
      tier: number
      quantity_boxes: number
      notes?: string | null
    },
  ) => Promise<void>
  updatePickingItem: (id: string, data: Partial<PickingListItem>) => Promise<void>
  deletePickingItem: (id: string) => Promise<void>
  togglePickedItem: (id: string, is_picked: boolean) => Promise<void>
  startPicking: (id: string) => Promise<void>
  /** in_progress → draft; giữ nguyên is_picked trên items */
  revertPickingToDraft: (id: string) => Promise<void>
  completePicking: (id: string) => Promise<{
    success: boolean
    deducted: number
    failed: string[]
  }>
  fetchLatestAuditEntry: () => Promise<AuditLog | null>
  fetchAuditLogs: (params: {
    cursor?: string
    direction?: 'older' | 'newer'
    filterLocationId?: string
    filterChangedBy?: string
    filterProductId?: string
    limit?: number
  }) => Promise<AuditLog[]>
  fetchAuditLogsForProduct: (productId: string, limit?: number) => Promise<AuditLog[]>
  fetchInternalNotes: () => Promise<{ error: string | null }>
  addInternalNote: (params: {
    productId?: string
    customName?: string
    reason: string
  }) => Promise<{ error: string | null; note?: InternalNote }>
  updateInternalNote: (id: string, reason: string) => Promise<{ error: string | null }>
  deleteInternalNote: (id: string) => Promise<{ error: string | null }>
}

export const useWarehouseStore = create<WarehouseStore>((set, get) => ({
  locations: [],
  selectedLocationId: null,
  appMode: 'warehouse',
  zones: [],
  products: [],
  productsPage: [],
  productsTotalCount: 0,
  productsPageLoading: false,
  productCategoriesL1: [],
  productCategoriesL2: [],
  inventoryEntries: [],
  orderLists: [],
  orderItems: [],
  pickingLists: [],
  pickingListItems: [],
  internalNotes: [],
  isLoading: false,
  locateIntent: null,

  setSelectedLocation: (id) => {
    set({ selectedLocationId: id })
    get().fetchZones(id)
  },

  setAppMode: (mode) => {
    set({
      appMode: mode,
      selectedLocationId: null,
      zones: [],
      inventoryEntries: [],
    })
    void get().fetchLocations()
  },

  getQtyUnit: () => (get().appMode === 'warehouse' ? 'thùng' : 'sản phẩm'),

  setLocateIntent: (intent) => set({ locateIntent: intent }),

  clearLocateIntent: () => set({ locateIntent: null }),

  fetchLocations: async () => {
    const { data } = await supabase
      .from('locations')
      .select('*')
      .eq('type', get().appMode)
      .order('name')
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
      .insert({ name: trimmed, grid_rows: rows, grid_cols: cols, type: get().appMode })
      .select('*')
      .single()
    if (error || !created) {
      if (__DEV__ && error) console.error('[warehouseStore] addLocation:', error)
      return { error: getErrorMessage(error, 'create') }
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
      if (__DEV__) console.error('[warehouseStore] updateLocation:', error)
      return { error: getErrorMessage(error, 'update') }
    }
    await get().fetchLocations()
    return { error: null }
  },

  deleteLocation: async (id) => {
    const { data: zones, error: zErr } = await supabase.from('zones').select('id').eq('location_id', id)
    if (zErr) {
      if (__DEV__) console.error('[warehouseStore] deleteLocation (zones):', zErr)
      return { error: getErrorMessage(zErr, 'delete') }
    }
    const zoneIds = (zones ?? []).map((z) => z.id)
    if (zoneIds.length > 0) {
      const { count, error: cErr } = await supabase
        .from('inventory_entries')
        .select('id', { count: 'exact', head: true })
        .in('zone_id', zoneIds)
      if (cErr) {
        if (__DEV__) console.error('[warehouseStore] deleteLocation (inventory check):', cErr)
        return { error: getErrorMessage(cErr, 'delete') }
      }
      if ((count ?? 0) > 0) {
        const qtyUnit = get().getQtyUnit()
        return {
          error:
            `Không xóa được kho: vẫn còn ít nhất một lô hàng (kể cả 0 ${qtyUnit}) trong các zone của kho. Xóa hoặc chuyển hết lô trước.`,
        }
      }
    }
    const wasSelected = get().selectedLocationId === id
    const { error: delErr } = await supabase.from('locations').delete().eq('id', id)
    if (delErr) {
      if (__DEV__) console.error('[warehouseStore] deleteLocation:', delErr)
      return { error: getErrorMessage(delErr, 'delete') }
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

  fetchZonesSilent: async (locationId) => {
    const { data } = await supabase
      .from('zones')
      .select('*')
      .eq('location_id', locationId)
    if (data) set({ zones: data })
  },

  fetchProducts: async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('is_archived', false)
      .order('name')
    if (data) set({ products: data })
  },

  // KI-040 hybrid: search/archived/image trên DB (max 200); zone/stock/special filter local ở ProductsScreen
  fetchProductsPage: async (params) => {
    set({ productsPageLoading: true })
    try {
      const search = params.search?.trim() ?? ''
      const looksLikeBarcode = /^\d{4,}$/.test(search)
      const archived = params.showArchived === true

      let query = supabase
        .from('products')
        .select('*', { count: 'exact' })
        .eq('is_archived', archived)
        .order('name')
        .limit(200)

      if (params.showNoImageOnly) {
        query = query.is('image_url', null)
      }

      // Tên: server-side ilike; barcode-like → không lọc name ở đây (merge sau)
      if (search && !looksLikeBarcode) {
        query = query.ilike('name', `%${search}%`)
      }

      const { data, count, error } = await query
      if (error) {
        if (__DEV__) console.error('[warehouseStore] fetchProductsPage:', error)
        set({ productsPage: [], productsTotalCount: 0, productsPageLoading: false })
        return
      }

      const byId = new Map<string, Product>()
      for (const p of (data as Product[]) ?? []) {
        byId.set(p.id, p)
      }

      // Barcode search: product_barcodes + inventory_entries.barcode
      if (search && looksLikeBarcode) {
        const [{ data: barcodeRows }, { data: entryRows }] = await Promise.all([
          supabase
            .from('product_barcodes')
            .select('product_id')
            .ilike('barcode', `%${search}%`)
            .limit(50),
          supabase
            .from('inventory_entries')
            .select('product_id')
            .ilike('barcode', `%${search}%`)
            .limit(50),
        ])
        const ids = new Set<string>()
        for (const r of barcodeRows ?? []) {
          if (r.product_id) ids.add(r.product_id as string)
        }
        for (const r of entryRows ?? []) {
          if (r.product_id) ids.add(r.product_id as string)
        }
        const missing = [...ids].filter((id) => !byId.has(id))
        if (missing.length > 0) {
          let bpQuery = supabase.from('products').select('*').in('id', missing).eq('is_archived', archived)
          if (params.showNoImageOnly) bpQuery = bpQuery.is('image_url', null)
          const { data: extra } = await bpQuery
          for (const p of (extra as Product[]) ?? []) {
            byId.set(p.id, p)
          }
        }
        // Barcode-only query: chỉ giữ SP match barcode (không trả full 200)
        const matched = [...ids].map((id) => byId.get(id)).filter(Boolean) as Product[]
        matched.sort((a, b) => a.name.localeCompare(b.name))
        set({
          productsPage: matched,
          productsTotalCount: matched.length,
          productsPageLoading: false,
        })
        return
      }

      const list = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
      set({
        productsPage: list,
        productsTotalCount: count ?? list.length,
        productsPageLoading: false,
      })
    } catch (e) {
      if (__DEV__) console.error('[warehouseStore] fetchProductsPage:', e)
      set({ productsPage: [], productsTotalCount: 0, productsPageLoading: false })
    }
  },

  fetchCategories: async () => {
    const [{ data: l1, error: e1 }, { data: l2, error: e2 }] = await Promise.all([
      supabase.from('product_categories_l1').select('*').order('name'),
      supabase.from('product_categories_l2').select('*').order('name'),
    ])
    const err = e1 ?? e2
    if (err) {
      if (__DEV__) console.error('[warehouseStore] fetchCategories:', err)
      return { error: getErrorMessage(err, 'fetch') }
    }
    set({
      productCategoriesL1: (l1 as ProductCategoryL1[]) ?? [],
      productCategoriesL2: (l2 as ProductCategoryL2[]) ?? [],
    })
    return { error: null }
  },

  addCategoryL1: async (name) => {
    const trimmed = name.trim()
    if (!trimmed) {
      return { error: 'Tên nhóm không được để trống.' }
    }
    const { data: created, error } = await supabase
      .from('product_categories_l1')
      .insert({ name: trimmed })
      .select('*')
      .single()
    if (error || !created) {
      if (__DEV__ && error) console.error('[warehouseStore] addCategoryL1:', error)
      return { error: getErrorMessage(error, 'create') }
    }
    const row = created as ProductCategoryL1
    set((s) => ({
      productCategoriesL1: [...s.productCategoriesL1.filter((c) => c.id !== row.id), row].sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
    }))
    return { error: null, category: row }
  },

  updateCategoryL1: async (id, data) => {
    const trimmed = data.name.trim()
    if (!trimmed) {
      return { error: 'Tên nhóm không được để trống.' }
    }
    const { error } = await supabase.from('product_categories_l1').update({ name: trimmed }).eq('id', id)
    if (error) {
      if (__DEV__) console.error('[warehouseStore] updateCategoryL1:', error)
      return { error: getErrorMessage(error, 'update') }
    }
    set((s) => ({
      productCategoriesL1: s.productCategoriesL1
        .map((c) => (c.id === id ? { ...c, name: trimmed } : c))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    return { error: null }
  },

  deleteCategoryL1: async (id) => {
    const { data: children } = await supabase
      .from('product_categories_l2')
      .select('id')
      .eq('level1_id', id)
      .limit(1)
    if (children && children.length > 0) {
      return { error: 'Không xóa được: còn loại (cấp 2) thuộc nhóm này.' }
    }
    const { count: c1 } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('category_level1_id', id)
    if ((c1 ?? 0) > 0) {
      return { error: 'Không xóa được: còn sản phẩm đang gán nhóm này (cấp 1).' }
    }
    const { error } = await supabase.from('product_categories_l1').delete().eq('id', id)
    if (error) {
      if (__DEV__) console.error('[warehouseStore] deleteCategoryL1:', error)
      return { error: getErrorMessage(error, 'delete') }
    }
    set((s) => ({
      productCategoriesL1: s.productCategoriesL1.filter((c) => c.id !== id),
      productCategoriesL2: s.productCategoriesL2.filter((c) => c.level1_id !== id),
    }))
    await get().fetchProducts()
    return { error: null }
  },

  addCategoryL2: async (level1Id, name) => {
    const trimmed = name.trim()
    if (!trimmed) {
      return { error: 'Tên loại không được để trống.' }
    }
    if (!get().productCategoriesL1.some((c) => c.id === level1Id)) {
      const { data: exists } = await supabase.from('product_categories_l1').select('id').eq('id', level1Id).maybeSingle()
      if (!exists) {
        return { error: 'Không tìm thấy nhóm cấp 1.' }
      }
    }
    const { data: created, error } = await supabase
      .from('product_categories_l2')
      .insert({ level1_id: level1Id, name: trimmed })
      .select('*')
      .single()
    if (error || !created) {
      if (__DEV__ && error) console.error('[warehouseStore] addCategoryL2:', error)
      return { error: getErrorMessage(error, 'create') }
    }
    const row = created as ProductCategoryL2
    set((s) => ({
      productCategoriesL2: [...s.productCategoriesL2.filter((c) => c.id !== row.id), row].sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
    }))
    return { error: null, category: row }
  },

  updateCategoryL2: async (id, data) => {
    const trimmed = data.name.trim()
    if (!trimmed) {
      return { error: 'Tên loại không được để trống.' }
    }
    const { error } = await supabase.from('product_categories_l2').update({ name: trimmed }).eq('id', id)
    if (error) {
      if (__DEV__) console.error('[warehouseStore] updateCategoryL2:', error)
      return { error: getErrorMessage(error, 'update') }
    }
    set((s) => ({
      productCategoriesL2: s.productCategoriesL2
        .map((c) => (c.id === id ? { ...c, name: trimmed } : c))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    return { error: null }
  },

  deleteCategoryL2: async (id) => {
    const { count } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('category_level2_id', id)
    if ((count ?? 0) > 0) {
      return { error: 'Không xóa được: còn sản phẩm đang gán loại này.' }
    }
    const { error } = await supabase.from('product_categories_l2').delete().eq('id', id)
    if (error) {
      if (__DEV__) console.error('[warehouseStore] deleteCategoryL2:', error)
      return { error: getErrorMessage(error, 'delete') }
    }
    set((s) => ({
      productCategoriesL2: s.productCategoriesL2.filter((c) => c.id !== id),
    }))
    await get().fetchProducts()
    return { error: null }
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

  fetchInventoryByLocation: async (locationId) => {
    await get().fetchInventoryByLocationSilent(locationId)
  },

  fetchInventoryByLocationSilent: async (locationId) => {
    // Đang fetch full → bỏ qua (tránh merge partial đè / race với set toàn bộ)
    if (allInventoryFetchInFlight) return

    // Zone IDs theo location từ DB — không phụ thuộc store.zones (Map có thể đang ở kho khác)
    const { data: zoneRows } = await supabase
      .from('zones')
      .select('id')
      .eq('location_id', locationId)

    if (allInventoryFetchInFlight) return

    const zoneIds = ((zoneRows as { id: string }[]) ?? []).map((z) => z.id)
    const zoneIdSet = new Set(zoneIds)

    if (zoneIds.length === 0) {
      return
    }

    const { data } = await supabase
      .from('inventory_entries')
      .select('*, product:products(*), zone:zones(*)')
      .in('zone_id', zoneIds)

    if (allInventoryFetchInFlight) return

    const entries = data || []
    // MERGE: giữ entries kho/location khác, chỉ thay entries thuộc zone set này
    set((s) => ({
      inventoryEntries: [
        ...s.inventoryEntries.filter((entry) => !zoneIdSet.has(entry.zone_id)),
        ...entries,
      ],
    }))
  },

  fetchAllInventoryEntries: async () => {
    const seq = ++allInventoryFetchSeq
    allInventoryFetchInFlight = true
    try {
      const { data, error } = await supabase
        .from('inventory_entries')
        .select('*, product:products(*), zone:zones(*)')
      if (error) {
        if (__DEV__) console.error('[warehouseStore] fetchAllInventoryEntries:', error)
        return { error: getErrorMessage(error, 'fetch') }
      }
      // Chỉ apply nếu vẫn là lần fetchAll mới nhất
      if (seq === allInventoryFetchSeq) {
        set({ inventoryEntries: data ?? [] })
      }
      return { error: null }
    } finally {
      if (seq === allInventoryFetchSeq) {
        allInventoryFetchInFlight = false
      }
    }
  },

  /** Tìm theo tên SP trên mọi kho — filter `store.products` local (normalizeText), rồi query lô theo product IDs. */
  searchProducts: async (query) => {
    const trimmed = query.trim()
    if (trimmed.length < 2) return []

    const q = normalizeText(trimmed)
    const matchedProducts = get().products.filter(
      (p) => !p.is_archived && normalizeText(p.name).includes(q),
    )
    if (matchedProducts.length === 0) return []

    const productIds = matchedProducts.map((p) => p.id)
    const { data } = await supabase
      .from('inventory_entries')
      .select('*, product:products(*), zone:zones(*)')
      .in('product_id', productIds)

    return (data || []) as InventoryEntry[]
  },

  searchInventoryByBarcode: async (barcode) => {
    const normalized = barcode.trim().toLowerCase()
    if (!normalized) return []

    const { data } = await supabase
      .from('inventory_entries')
      .select('*, product:products(*), zone:zones(*)')
      .ilike('barcode', `%${normalized}%`)

    return (data || []) as InventoryEntry[]
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

    return (data as InventoryEntry) ?? null
  },

  lookupProductByBarcode: async (barcode) => {
    const normalized = barcode.trim().toLowerCase()
    if (!normalized) return null

    const { data: row } = await supabase
      .from('product_barcodes')
      .select('*, product:products(*)')
      .eq('barcode', normalized)
      .maybeSingle()

    const product = row?.product as Product | undefined
    if (!product) return null

    const { data: entries } = await supabase
      .from('inventory_entries')
      .select('quantity_boxes')
      .eq('product_id', product.id)

    const totalStock = (entries ?? []).reduce(
      (sum, entry) => sum + (entry.quantity_boxes ?? 0),
      0,
    )

    return { product, totalStock }
  },

  checkBarcodeConflict: async (barcode, currentProductId) => {
    const normalized = barcode.trim().toLowerCase()
    if (!normalized) return null

    const { data: row } = await supabase
      .from('product_barcodes')
      .select('product_id')
      .eq('barcode', normalized)
      .maybeSingle()

    if (!row || row.product_id === currentProductId) return null

    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('id', row.product_id)
      .maybeSingle()

    return (product as Product) ?? null
  },

  upsertProductBarcode: async (productId, barcode, options) => {
    const normalized = barcode.trim().toLowerCase()
    if (!normalized) return

    const { data: existing } = await supabase
      .from('product_barcodes')
      .select('id, product_id')
      .eq('barcode', normalized)
      .maybeSingle()

    const now = new Date().toISOString()

    if (existing) {
      if (existing.product_id !== productId) {
        if (options?.reassign) {
          const { error } = await supabase
            .from('product_barcodes')
            .update({ product_id: productId, last_scanned_at: now })
            .eq('id', existing.id)
          if (error) {
            if (__DEV__) console.error('[warehouseStore] upsertProductBarcode (reassign):', error)
            throw new Error(getErrorMessage(error, 'update'))
          }
          return
        }
        throw new Error('Barcode đã thuộc sản phẩm khác')
      }
      const { error } = await supabase
        .from('product_barcodes')
        .update({ last_scanned_at: now })
        .eq('id', existing.id)
      if (error) {
        if (__DEV__) console.error('[warehouseStore] upsertProductBarcode (update):', error)
        throw new Error(getErrorMessage(error, 'update'))
      }
      return
    }

    const { error } = await supabase
      .from('product_barcodes')
      .insert({
        product_id: productId,
        barcode: normalized,
        first_scanned_at: now,
        last_scanned_at: now,
      })
    if (error) {
      if (__DEV__) console.error('[warehouseStore] upsertProductBarcode (insert):', error)
      throw new Error(getErrorMessage(error, 'update'))
    }
  },

  fetchProductBarcodes: async (productId) => {
    const { data, error } = await supabase
      .from('product_barcodes')
      .select('*')
      .eq('product_id', productId)
      .order('last_scanned_at', { ascending: false })
    if (error) {
      if (__DEV__) console.error('[warehouseStore] fetchProductBarcodes:', error)
      throw new Error(getErrorMessage(error, 'fetch'))
    }
    return (data as ProductBarcode[]) ?? []
  },

  deleteProductBarcode: async (barcodeId) => {
    const { error } = await supabase.from('product_barcodes').delete().eq('id', barcodeId)
    if (error) {
      if (__DEV__) console.error('[warehouseStore] deleteProductBarcode:', error)
      throw new Error(getErrorMessage(error, 'delete'))
    }
  },

  updateProductBarcode: async (barcodeId, newBarcode) => {
    const normalized = newBarcode.trim().toLowerCase()
    if (!normalized) return { error: 'Mã vạch không được để trống.' }

    const { data: row, error: fetchError } = await supabase
      .from('product_barcodes')
      .select('id, product_id, barcode')
      .eq('id', barcodeId)
      .maybeSingle()

    if (fetchError) {
      if (__DEV__) console.error('[warehouseStore] updateProductBarcode (fetch):', fetchError)
      return { error: getErrorMessage(fetchError, 'fetch') }
    }
    if (!row) return { error: 'Không tìm thấy mã vạch.' }
    if (row.barcode === normalized) return {}

    const { data: duplicate } = await supabase
      .from('product_barcodes')
      .select('id')
      .eq('barcode', normalized)
      .maybeSingle()

    if (duplicate && duplicate.id !== barcodeId) {
      return { error: 'Mã vạch đã tồn tại trong hệ thống.' }
    }

    const now = new Date().toISOString()
    const { error } = await supabase
      .from('product_barcodes')
      .update({ barcode: normalized, last_scanned_at: now })
      .eq('id', barcodeId)

    if (error) {
      if (__DEV__) console.error('[warehouseStore] updateProductBarcode (update):', error)
      return { error: getErrorMessage(error, 'update') }
    }
    return {}
  },

  logBarcodeConflict: async (
    barcode,
    attemptedProductId,
    conflictingProductId,
    attemptedProductName,
    conflictingProductName,
  ) => {
    const normalized = barcode.trim().toLowerCase()
    if (!normalized) return

    await supabase.rpc('log_barcode_conflict', {
      p_barcode: normalized,
      p_attempted_product_id: attemptedProductId,
      p_conflicting_product_id: conflictingProductId,
      p_attempted_product_name: attemptedProductName,
      p_conflicting_product_name: conflictingProductName,
    })
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

  deleteProduct: async (productId) => {
    try {
      await deleteProductImage(productId)
    } catch (_) {
      /* bo qua neu khong co anh */
    }

    const { data: linked } = await supabase
      .from('inventory_entries')
      .select('id')
      .eq('product_id', productId)
      .limit(1)

    if (linked && linked.length > 0) {
      throw new Error(
        'Sản phẩm vẫn còn tồn kho. Vui lòng điều chỉnh tất cả lô hàng về 0 trước khi xóa.',
      )
    }

    const { error } = await supabase.from('products').delete().eq('id', productId)
    if (error) {
      if (__DEV__) console.error('[warehouseStore] deleteProduct:', error)
      throw new Error(getErrorMessage(error, 'delete'))
    }

    set((s) => ({
      products: s.products.filter((p) => p.id !== productId),
      inventoryEntries: s.inventoryEntries.filter((e) => e.product_id !== productId),
    }))
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

  resetMarketChecklist: async () => {
    await supabase
      .from('inventory_entries')
      .update({ is_checked: false })
      .eq('is_special', true)
      .eq('is_checked', true)
    set((s) => ({
      inventoryEntries: s.inventoryEntries.map((e) =>
        e.is_special && e.is_checked ? { ...e, is_checked: false } : e
      ),
    }))
  },

  deleteInventoryEntry: async (id) => {
    // KI-058: block xóa lô còn số lượng (nếu tìm thấy trong store)
    const existing = get().inventoryEntries.find((e) => e.id === id)
    if (existing && existing.quantity_boxes > 0) {
      const qtyUnit = get().getQtyUnit()
      throw new Error(`Không thể xóa lô còn ${qtyUnit}. Chỉ xóa khi số ${qtyUnit} = 0.`)
    }
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

  updateProductCategory: async (productId, data) => {
    let l1 = data.category_level1_id
    let l2 = data.category_level2_id
    if (!l1) {
      l2 = null
    } else if (l2) {
      const row = get().productCategoriesL2.find((c) => c.id === l2)
      if (!row || row.level1_id !== l1) {
        return { error: 'Loại không thuộc nhóm đã chọn.', product: null }
      }
    }

    const { data: updated, error } = await supabase
      .from('products')
      .update({ category_level1_id: l1, category_level2_id: l2 })
      .eq('id', productId)
      .select('*')
      .single()

    if (error) {
      if (__DEV__) console.error('[warehouseStore] updateProductCategory:', error)
      return { error: getErrorMessage(error, 'update'), product: null }
    }
    if (updated) {
      set((s) => ({
        products: s.products.map((p) => (p.id === updated.id ? updated : p)),
        inventoryEntries: s.inventoryEntries.map((entry) => (
          entry.product_id === updated.id ? { ...entry, product: updated } : entry
        )),
      }))
      return { error: null, product: updated }
    }
    return { error: 'Không cập nhật được.', product: null }
  },

  updateProductName: async (productId, name) => {
    const trimmed = name.trim()
    if (!trimmed) return

    const { data: updated, error } = await supabase
      .from('products')
      .update({ name: trimmed })
      .eq('id', productId)
      .select('*')
      .single()

    if (error || !updated) return

    set((s) => ({
      products: s.products.map((p) => (p.id === productId ? updated : p)),
      inventoryEntries: s.inventoryEntries.map((entry) =>
        entry.product_id === productId ? { ...entry, product: updated } : entry
      ),
    }))
  },

  updateProductImage: async (productId, url) => {
    const { error } = await supabase
      .from('products')
      .update({ image_url: url })
      .eq('id', productId)

    if (error) {
      if (__DEV__) console.error('[warehouseStore] updateProductImage:', error)
      throw new Error(getErrorMessage(error, 'upload'))
    }

    set((s) => ({
      products: s.products.map((p) =>
        p.id === productId ? { ...p, image_url: url } : p
      ),
      productsPage: s.productsPage.map((p) =>
        p.id === productId ? { ...p, image_url: url } : p
      ),
      inventoryEntries: s.inventoryEntries.map((entry) =>
        entry.product_id === productId && entry.product
          ? { ...entry, product: { ...entry.product, image_url: url } }
          : entry
      ),
    }))
  },

  removeProductImage: async (productId) => {
    const { error } = await supabase
      .from('products')
      .update({ image_url: null })
      .eq('id', productId)

    if (error) {
      if (__DEV__) console.error('[warehouseStore] removeProductImage:', error)
      throw new Error(getErrorMessage(error, 'delete'))
    }

    set((s) => ({
      products: s.products.map((p) =>
        p.id === productId ? { ...p, image_url: undefined } : p
      ),
      productsPage: s.productsPage.map((p) =>
        p.id === productId ? { ...p, image_url: undefined } : p
      ),
      inventoryEntries: s.inventoryEntries.map((entry) =>
        entry.product_id === productId && entry.product
          ? { ...entry, product: { ...entry.product, image_url: undefined } }
          : entry
      ),
    }))
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
        if (__DEV__) console.error('[warehouseStore] batchUpdateZoneCells:', error)
        return { error: getErrorMessage(error, 'update') }
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

  setProductDiscontinued: async (productId, isDiscontinued, reason) => {
    const updatePayload: Record<string, unknown> = { is_discontinued: isDiscontinued }
    if (isDiscontinued && reason !== undefined) {
      updatePayload.discontinued_reason = reason.trim() || null
    }
    if (!isDiscontinued) {
      updatePayload.discontinued_reason = null
    }
    const { data: updated } = await supabase
      .from('products')
      .update(updatePayload)
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
    const { data: updated, error } = await supabase
      .from('order_lists')
      .update({ status: 'placed' })
      .eq('id', id)
      .select('*')
      .single()
    if (error) {
      if (__DEV__) console.error('[warehouseStore] markOrderPlaced:', error)
      return
    }
    if (!updated) return
    set((s) => ({
      orderLists: s.orderLists.map((list) => (list.id === id ? (updated as OrderList) : list)),
    }))
  },

  fetchPickingLists: async () => {
    const [{ data: lists, error: listsErr }, { data: items, error: itemsErr }] = await Promise.all([
      supabase.from('picking_lists').select('*').order('created_at', { ascending: false }),
      supabase
        .from('picking_list_items')
        .select('*, product:products(*), zone:zones(*)')
        .order('created_at', { ascending: true }),
    ])
    if (listsErr) {
      if (__DEV__) console.error('[warehouseStore] fetchPickingLists (lists):', listsErr)
    }
    if (itemsErr) {
      if (__DEV__) console.error('[warehouseStore] fetchPickingLists (items):', itemsErr)
    }
    set({
      pickingLists: (lists as PickingList[]) ?? [],
      pickingListItems: (items as PickingListItem[]) ?? [],
    })
  },

  createPickingList: async (title) => {
    const payload = {
      title: title.trim() || `Đơn lấy hàng ${new Date().toLocaleDateString('vi-VN')}`,
      status: 'draft' as const,
    }
    const { data, error } = await supabase.from('picking_lists').insert(payload).select('*').single()
    if (error) {
      if (__DEV__) console.error('[warehouseStore] createPickingList:', error)
      return null
    }
    const created = data as PickingList | null
    if (created) {
      set((s) => ({ pickingLists: [created, ...s.pickingLists] }))
    }
    return created
  },

  updatePickingList: async (id, data) => {
    const { data: updated, error } = await supabase
      .from('picking_lists')
      .update(data)
      .eq('id', id)
      .select('*')
      .single()
    if (error) {
      if (__DEV__) console.error('[warehouseStore] updatePickingList:', error)
      return
    }
    if (!updated) return
    set((s) => ({
      pickingLists: s.pickingLists.map((list) =>
        list.id === id ? (updated as PickingList) : list,
      ),
    }))
  },

  deletePickingList: async (id) => {
    const { error: itemsErr } = await supabase
      .from('picking_list_items')
      .delete()
      .eq('picking_list_id', id)
    if (itemsErr) {
      if (__DEV__) console.error('[warehouseStore] deletePickingList (items):', itemsErr)
      return
    }
    const { error } = await supabase.from('picking_lists').delete().eq('id', id)
    if (error) {
      if (__DEV__) console.error('[warehouseStore] deletePickingList:', error)
      return
    }
    set((s) => ({
      pickingLists: s.pickingLists.filter((list) => list.id !== id),
      pickingListItems: s.pickingListItems.filter((item) => item.picking_list_id !== id),
    }))
  },

  addPickingItem: async (pickingListId, data) => {
    const payload = {
      picking_list_id: pickingListId,
      inventory_entry_id: data.inventory_entry_id,
      product_id: data.product_id,
      zone_id: data.zone_id,
      tier: data.tier,
      quantity_boxes: data.quantity_boxes,
      notes: data.notes ?? null,
      is_picked: false,
    }
    const { data: created, error } = await supabase
      .from('picking_list_items')
      .insert(payload)
      .select('*, product:products(*), zone:zones(*)')
      .single()
    if (error) {
      if (__DEV__) console.error('[warehouseStore] addPickingItem:', error)
      return
    }
    if (created) {
      set((s) => ({
        pickingListItems: [...s.pickingListItems, created as PickingListItem],
      }))
    }
  },

  updatePickingItem: async (id, data) => {
    const { data: updated, error } = await supabase
      .from('picking_list_items')
      .update(data)
      .eq('id', id)
      .select('*, product:products(*), zone:zones(*)')
      .single()
    if (error) {
      if (__DEV__) console.error('[warehouseStore] updatePickingItem:', error)
      return
    }
    if (!updated) return
    set((s) => ({
      pickingListItems: s.pickingListItems.map((item) =>
        item.id === id ? (updated as PickingListItem) : item,
      ),
    }))
  },

  deletePickingItem: async (id) => {
    const { error } = await supabase.from('picking_list_items').delete().eq('id', id)
    if (error) {
      if (__DEV__) console.error('[warehouseStore] deletePickingItem:', error)
      return
    }
    set((s) => ({
      pickingListItems: s.pickingListItems.filter((item) => item.id !== id),
    }))
  },

  togglePickedItem: async (id, is_picked) => {
    await get().updatePickingItem(id, { is_picked })
  },

  startPicking: async (id) => {
    await get().updatePickingList(id, { status: 'in_progress' })
  },

  // Chỉ đổi status; không đụng is_picked (user có thể đã tick một phần)
  revertPickingToDraft: async (id) => {
    await get().updatePickingList(id, { status: 'draft' })
  },

  completePicking: async (id) => {
    const picked = get().pickingListItems.filter(
      (i) => i.picking_list_id === id && i.is_picked,
    )
    if (picked.length === 0) {
      return { success: false, deducted: 0, failed: [] }
    }

    const pickedEntryIds = [...new Set(picked.map((i) => i.inventory_entry_id))]
    const { data: rows, error: fetchErr } = await supabase
      .from('inventory_entries')
      .select('id, quantity_boxes')
      .in('id', pickedEntryIds)

    if (fetchErr) {
      if (__DEV__) console.error('[warehouseStore] completePicking (fetch entries):', fetchErr)
      return {
        success: false,
        deducted: 0,
        failed: ['Không tải được tồn kho hiện tại. Thử lại.'],
      }
    }

    const qtyById = new Map<string, number>()
    for (const row of rows ?? []) {
      qtyById.set(row.id as string, row.quantity_boxes as number)
    }

    let deducted = 0
    const failed: string[] = []

    for (const item of picked) {
      const label =
        item.product?.name ??
        get().products.find((p) => p.id === item.product_id)?.name ??
        `Lô ${item.inventory_entry_id.slice(0, 8)}`

      if (!qtyById.has(item.inventory_entry_id)) {
        failed.push(`${label}: lô đã bị xóa`)
        continue
      }

      const currentQty = qtyById.get(item.inventory_entry_id)!
      if (currentQty < item.quantity_boxes) {
        failed.push(
          `${label}: tồn không đủ (còn ${currentQty}, cần ${item.quantity_boxes})`,
        )
        continue
      }

      const newQty = currentQty - item.quantity_boxes
      const { error: updErr } = await supabase
        .from('inventory_entries')
        .update({ quantity_boxes: newQty })
        .eq('id', item.inventory_entry_id)

      if (updErr) {
        if (__DEV__) console.error('[warehouseStore] completePicking (update):', updErr)
        failed.push(`${label}: lỗi cập nhật tồn`)
        continue
      }

      // Cập nhật map để item sau cùng lô (nếu có) thấy qty mới
      qtyById.set(item.inventory_entry_id, newQty)
      deducted++
    }

    if (deducted > 0) {
      await get().fetchAllInventoryEntries()
    }

    if (failed.length === 0 && deducted > 0) {
      await get().updatePickingList(id, { status: 'completed' })
      return { success: true, deducted, failed: [] }
    }

    return { success: false, deducted, failed }
  },

  fetchLatestAuditEntry: async () => {
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .order('changed_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    return (data as AuditLog) ?? null
  },

  fetchAuditLogs: async ({ cursor, direction = 'older', filterLocationId, filterChangedBy, filterProductId, limit = 10 }) => {
    let query = supabase.from('audit_logs').select('*')

    if (cursor) {
      if (direction === 'older') {
        query = query.lt('changed_at', cursor)
      } else {
        query = query.gt('changed_at', cursor)
      }
    }

    if (filterLocationId) {
      query = query
        .eq('table_name', 'inventory_entries')
        .eq('location_id', filterLocationId)
    }

    if (filterChangedBy) {
      query = query.eq('changed_by_name', filterChangedBy)
    }

    if (filterProductId) {
      query = query.or(
        `and(table_name.eq.inventory_entries,new_data->>product_id.eq.${filterProductId}),` +
        `and(table_name.eq.inventory_entries,old_data->>product_id.eq.${filterProductId}),` +
        `and(table_name.eq.products,record_id.eq.${filterProductId})`
      )
    }

    if (direction === 'newer') {
      query = query.order('changed_at', { ascending: true })
    } else {
      query = query.order('changed_at', { ascending: false })
    }

    query = query.limit(limit)

    const { data } = await query
    const rows = (data as AuditLog[]) ?? []
    return direction === 'newer' ? rows.reverse() : rows
  },

  fetchAuditLogsForProduct: async (productId, limit = 10) => {
    return get().fetchAuditLogs({ filterProductId: productId, limit })
  },

  // F31 — ghi chú nội bộ
  fetchInternalNotes: async () => {
    const { data, error } = await supabase
      .from('internal_notes')
      .select('*, product:products(id, name, image_url)')
      .order('created_at', { ascending: false })
    if (error) {
      if (__DEV__) console.error('[warehouseStore] fetchInternalNotes:', error)
      return { error: getErrorMessage(error, 'fetch') }
    }
    set({ internalNotes: (data as InternalNote[]) ?? [] })
    return { error: null }
  },

  addInternalNote: async (params) => {
    const trimmedReason = params.reason.trim()
    if (!trimmedReason) {
      return { error: 'Nội dung ghi chú không được để trống.' }
    }
    const productId = params.productId?.trim() || null
    const customName = productId ? null : (params.customName?.trim() || null)
    if (!productId && !customName) {
      return { error: 'Chọn sản phẩm hoặc nhập tên sản phẩm.' }
    }

    const { data: userData } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('internal_notes')
      .insert({
        product_id: productId,
        custom_product_name: customName,
        reason: trimmedReason,
        created_by: userData.user?.id ?? null,
      })
      .select('*, product:products(id, name, image_url)')
      .single()
    if (error || !data) {
      if (__DEV__ && error) console.error('[warehouseStore] addInternalNote:', error)
      return { error: getErrorMessage(error, 'create') }
    }
    const note = data as InternalNote
    set((s) => ({ internalNotes: [note, ...s.internalNotes] }))
    return { error: null, note }
  },

  updateInternalNote: async (id, reason) => {
    const trimmed = reason.trim()
    if (!trimmed) {
      return { error: 'Nội dung ghi chú không được để trống.' }
    }
    const { data, error } = await supabase
      .from('internal_notes')
      .update({ reason: trimmed })
      .eq('id', id)
      .select('*, product:products(id, name, image_url)')
      .single()
    if (error || !data) {
      if (__DEV__ && error) console.error('[warehouseStore] updateInternalNote:', error)
      return { error: getErrorMessage(error, 'update') }
    }
    const note = data as InternalNote
    set((s) => ({
      internalNotes: s.internalNotes.map((n) => (n.id === note.id ? note : n)),
    }))
    return { error: null }
  },

  deleteInternalNote: async (id) => {
    const { error } = await supabase.from('internal_notes').delete().eq('id', id)
    if (error) {
      if (__DEV__) console.error('[warehouseStore] deleteInternalNote:', error)
      return { error: getErrorMessage(error, 'delete') }
    }
    set((s) => ({
      internalNotes: s.internalNotes.filter((n) => n.id !== id),
    }))
    return { error: null }
  },
}))