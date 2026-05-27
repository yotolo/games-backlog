import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

const missing = [
  !SUPABASE_URL      && 'REACT_APP_SUPABASE_URL',
  !SUPABASE_ANON_KEY && 'REACT_APP_SUPABASE_ANON_KEY',
].filter(Boolean);

/** Non-null when required env vars are absent. Checked in App.js before any rendering. */
export const envError = missing.length > 0
  ? `Variabili d'ambiente mancanti: ${missing.join(', ')}`
  : null;

export const supabase = envError
  ? null
  : createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const STORAGE_URL = SUPABASE_URL
  ? `${SUPABASE_URL}/storage/v1/object/public/game-covers`
  : '';
