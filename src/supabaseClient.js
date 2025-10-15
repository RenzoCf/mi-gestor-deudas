import { createClient } from '@supabase/supabase-js';

// Reemplaza esto con la URL y la Anon Key de tu proyecto en Supabase
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
