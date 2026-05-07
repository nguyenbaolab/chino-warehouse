import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { Location, Zone, ZoneCell, Product, InventoryEntry } from '../types'

type WarehouseStore = {
  locations: Location[]
  selectedLocationId: string | null
  zones: Zone[]
  products: Product[]
  isLoading: boolean

  setSelectedLocation: (id: string) => void
  fetchLocations: () => Promise<void>
  fetchZones: (locationId: string) => Promise<void>
  fetchProducts: () => Promise<void>
  fetchInventoryByZone: (zoneId: string) => Promise<InventoryEntry[]>
  searchProducts: (query: string) => Promise<InventoryEntry[]>
  searchByBarcode: (barcode: string) => Promise<InventoryEntry[]>
  addProduct: (data: Partial<Product>) => Promise<Product | null>
  addInventoryEntry: (data: Partial<InventoryEntry>) => Promise<void>
  updateInventoryEntry: (id: string, data: Partial<InventoryEntry>) => Promise<void>
  deleteInventoryEntry: (id: string) => Promise<void>
  addZone: (data: { name: string; cells: ZoneCell[]; tier_count: number; location_id: string }) => Promise<void>
  updateZone: (id: string, data: Partial<Zone>) => Promise<void>
  deleteZone: (id: string) => Promise<boolean>
}

export const useWarehouseStore = create<WarehouseStore>((set, get) => ({
  locations: [],
  selectedLocationId: null,
  zones: [],
  products: [],
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
      .select('*, product:products(*)')
      .eq('zone_id', zoneId)
      .gt('quantity_boxes', 0)
    return data || []
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
      .gt('quantity_boxes', 0)
    return data || []
  },

  searchByBarcode: async (barcode) => {
    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('barcode', barcode)
      .single()
    if (!product) return []
    const { data } = await supabase
      .from('inventory_entries')
      .select('*, product:products(*), zone:zones(*)')
      .eq('product_id', product.id)
      .gt('quantity_boxes', 0)
    return data || []
  },

  addProduct: async (data) => {
    const { data: created } = await supabase
      .from('products')
      .insert(data)
      .select()
      .single()
    return created
  },

  addInventoryEntry: async (data) => {
    await supabase.from('inventory_entries').insert(data)
  },

  updateInventoryEntry: async (id, data) => {
    await supabase.from('inventory_entries').update(data).eq('id', id)
  },

  deleteInventoryEntry: async (id) => {
    await supabase.from('inventory_entries').delete().eq('id', id)
  },

  addZone: async (data) => {
    const payload = {
      name: data.name,
      cells: data.cells,
      tier_count: data.tier_count,
      has_tiers: data.tier_count > 1,
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
}))