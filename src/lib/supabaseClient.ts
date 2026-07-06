/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Supabase URL or Anon Key is missing. Make sure your .env file has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY set, and restart your dev server after adding it."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
