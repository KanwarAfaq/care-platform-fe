import { createClient } from '@supabase/supabase-js'

// You will get these from your Supabase Dashboard later
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://imtbpcqogiqbzlbmyzqk.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltdGJwY3FvZ2lxYnpsYm15enFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNDIwNjUsImV4cCI6MjEwMDYxODA2NX0.J4OR613mdIAfufKjDV6ka1FOtWsxMtIO2v2tOTUK-qA'

export const supabase = createClient(supabaseUrl, supabaseKey)