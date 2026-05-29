import { supabase } from '../lib/supabase'

export interface ConflictResult {
  hasConflict: boolean
  changedByName?: string
}

export async function checkConflict(
  table: 'inventory_entries' | 'zones' | 'products',
  id: string,
  snapshotUpdatedAt: string | undefined,
): Promise<ConflictResult> {
  if (!snapshotUpdatedAt) return { hasConflict: false }

  try {
    const { data } = await supabase
      .from(table)
      .select('updated_at')
      .eq('id', id)
      .maybeSingle()

    if (!data?.updated_at) return { hasConflict: false }

    const dbTime = new Date(data.updated_at).getTime()
    const snapTime = new Date(snapshotUpdatedAt).getTime()
    if (!Number.isFinite(dbTime) || !Number.isFinite(snapTime)) return { hasConflict: false }

    if (dbTime <= snapTime) return { hasConflict: false }

    // Có conflict — cố lấy người sửa từ audit_logs (có thể audit_logs không log cho mọi table).
    let changedByName: string | undefined
    try {
      const { data: log } = await supabase
        .from('audit_logs')
        .select('changed_by_name')
        .eq('record_id', id)
        .eq('table_name', table)
        .order('changed_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      changedByName = log?.changed_by_name ?? undefined
    } catch {
      // bỏ qua lỗi audit_logs, vẫn trả hasConflict=true
    }

    return { hasConflict: true, changedByName }
  } catch {
    // fail safe: network/database error -> không block save
    return { hasConflict: false }
  }
}

