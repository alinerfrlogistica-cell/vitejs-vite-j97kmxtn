import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vsekjhtifpyekaupdquh.supabase.co';
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzZWtqaHRpZnB5ZWthdXBkcXVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5NTA5NDAsImV4cCI6MjA5NTUyNjk0MH0.I5M7SABVEL0rfT4UPKuYaec5nxCGQ4BBwdVNzot4iMQ';

export const supabase = createClient(supabaseUrl, supabaseKey);
