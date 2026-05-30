import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync } from 'fs'
import { createInterface } from 'readline'

/**
 * Backup dữ liệu bảng public → JSON (local script).
 * Phạm vi: chỉ DB tables qua Supabase Data API — KHÔNG backup Supabase Storage
 * (bucket product-images F08, file ảnh trên Storage không nằm trong script này).
 *
 * Auth: anon key + đăng nhập email/password (tài khoản app) — xem DECISIONS (DRAFT backup).
 *
 * Chạy:
 *   node --env-file=.env --experimental-strip-types backup.ts
 */

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Thiếu biến môi trường EXPO_PUBLIC_SUPABASE_URL hoặc EXPO_PUBLIC_SUPABASE_ANON_KEY')
}

const supabase = createClient(supabaseUrl, supabaseKey)

const PAGE_SIZE = 1000
const ORDER_COLUMN = 'id'

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer)
    })
  })
}

function formatBackupStamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  )
}

type TableName =
  | 'locations'
  | 'zones'
  | 'product_categories_l1'
  | 'product_categories_l2'
  | 'products'
  | 'inventory_entries'
  | 'order_lists'
  | 'order_items'
  | 'audit_logs'

type Backup = Record<TableName, unknown[]>

// Thêm bảng mới vào DB thì phải bổ sung vào đây — nếu không backup sẽ sót bảng
// (kỷ luật tương tự maintain supabase/migrations/schema.sql).
const tables: TableName[] = [
  'locations',
  'zones',
  'product_categories_l1',
  'product_categories_l2',
  'products',
  'inventory_entries',
  'order_lists',
  'order_items',
  'audit_logs',
]

async function fetchAllRows(table: TableName): Promise<unknown[]> {
  const rows: unknown[] = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order(ORDER_COLUMN, { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (error) {
      throw new Error(`Lỗi khi backup bảng ${table} (offset ${from}): ${error.message}`)
    }

    const page = data ?? []
    rows.push(...page)

    if (page.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return rows
}

async function main() {
  const email = await prompt('Email: ')
  const password = await prompt('Password: ')

  const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
  if (authError) throw new Error(`Đăng nhập thất bại: ${authError.message}`)
  console.log('✓ Đăng nhập thành công\n')

  mkdirSync('supabase/backups', { recursive: true })
  const backup = {} as Backup

  for (const table of tables) {
    backup[table] = await fetchAllRows(table)
    console.log(`  ✓ ${table}: ${backup[table].length} records`)
  }

  const filename = `supabase/backups/backup_${formatBackupStamp(new Date())}.json`
  writeFileSync(filename, JSON.stringify(backup, null, 2))
  console.log(`\n✅ Backup xong: ${filename}`)

  await supabase.auth.signOut()
}

main().catch((err) => {
  console.error('\n❌ Backup thất bại:', err.message)
  process.exit(1)
})
