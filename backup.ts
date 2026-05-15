import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync } from 'fs'
import { createInterface } from 'readline'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Thiếu biến môi trường EXPO_PUBLIC_SUPABASE_URL hoặc EXPO_PUBLIC_SUPABASE_ANON_KEY')
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Hỏi email + password trên terminal (password ẩn không được với readline đơn giản,
// nhưng vẫn an toàn vì chỉ chạy local)
function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer)
    })
  })
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

async function main() {
  // Đăng nhập
  const email = await prompt('Email: ')
  const password = await prompt('Password: ')

  const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
  if (authError) throw new Error(`Đăng nhập thất bại: ${authError.message}`)
  console.log('✓ Đăng nhập thành công\n')

  // Backup
  mkdirSync('supabase/backups', { recursive: true })
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

  await supabase.auth.signOut()
}

main().catch((err) => {
  console.error('\n❌ Backup thất bại:', err.message)
  process.exit(1)
})

// Chạy trong terminal:
// node --env-file=.env --experimental-strip-types backup.ts

// Nhập email và password của user (tài khoản để vào được app Chino's Warehouse)