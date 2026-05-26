import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://heguzznqmrzmsoqmhbmx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlZ3V6em5xbXJ6bXNvcW1oYm14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNTI2NDEsImV4cCI6MjA5MzgyODY0MX0.mBXSqjM2qATh6gYbeJT9WZkbCohS92mT535B6mY91os';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const STORAGE_URL = `${SUPABASE_URL}/storage/v1/object/public/game-covers`;
