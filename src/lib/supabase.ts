import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://vcctxjihxpzefqxdeddm.supabase.co'

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjY3R4amloeHB6ZWZxeGRlZGRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3Mjc0NDcsImV4cCI6MjA5NzMwMzQ0N30.HWWYKWtb1C9qTkaGWMV7iYNAxwJCwrGGKSWx0MOmZzY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
