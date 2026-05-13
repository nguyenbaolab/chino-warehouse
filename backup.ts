import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync } from 'fs'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Thiếu biến môi trường EXPO_PUBLIC_SUPABASE_URL hoặc EXPO_PUBLIC_SUPABASE_ANON_KEY')
}

const supabase = createClient(supabaseUrl, supabaseKey)

mkdirSync('supabase/backups', { recursive: true })

type TableName = 'locations' | 'zones' | 'products' | 'inventory_entries'
type Backup = Record<TableName, unknown[]>

const tables: TableName[] = ['locations', 'zones', 'products', 'inventory_entries']
const backup = {} as Backup

for (const table of tables) {
  const { data, error } = await supabase.from(table).select('*')
  if (error) throw new Error(`Lỗi khi backup bảng ${table}: ${error.message}`)
  backup[table] = data ?? []
  console.log(`  ✓ ${table}: ${backup[table].length} records`)
}

const filename = `supabase/backups/backup_${new Date().toISOString().slice(0, 10)}.json`
writeFileSync(filename, JSON.stringify(backup, null, 2))
console.log(`\n✅ Backup xong: ${filename}`)

// run in terminal:
// node --env-file=.env --experimental-strip-types .\backup.ts