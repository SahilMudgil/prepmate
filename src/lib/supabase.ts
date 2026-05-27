import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase Storage Environment Variables in .env");
}

// This client runs securely on the backend with admin privileges for storage
export const supabaseStorage = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
  },
});