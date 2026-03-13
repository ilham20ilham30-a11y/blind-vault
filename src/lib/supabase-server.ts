import { createClient } from '@supabase/supabase-js'

// Klien ini khusus untuk Server Actions / Route Handlers, menggunakan Service Role Key
// Ini akan mem-bypass RLS (Row Level Security) yang memungkinkan kita melakukan INSERT data dengan aman.
// Pastikan tidak pernah menggunakan klien ini di komponen klien (Client Components).

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
