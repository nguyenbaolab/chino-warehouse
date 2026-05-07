import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://otezblwpbjbahsvfjocf.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90ZXpibHdwYmpiYWhzdmZqb2NmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNDkxNzAsImV4cCI6MjA5MzcyNTE3MH0.OKQxizU1_qFL8hFvtaTW0DMYX91PpPlJJnpAhXlEx6g'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)