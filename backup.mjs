import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync } from 'fs'

const supabase = createClient(
  'https://otezblwpbjbahsvfjocf.supabase.co',
  'sb_publishable_fbAG4VQG680N9oVbG-38dQ_J20GUJJ0'
)

mkdirSync('supabase/backups', { recursive: true })

const tables = ['locations', 'zones', 'products', 'inventory_entries']
const backup = {}

for (const table of tables) {
  const { data } = await supabase.from(table).select('*')
  backup[table] = data
  console.log(`  ✓ ${table}: ${data.length} records`)
}

const filename = `supabase/backups/backup_${new Date().toISOString().slice(0,10)}.json`
writeFileSync(filename, JSON.stringify(backup, null, 2))
console.log(`\n✅ Backup xong: ${filename}`)
