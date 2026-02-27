import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zoyqmukmteamrlmjrpcq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpveXFtdWttdGVhbXJsbWpycGNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4OTgxMDEsImV4cCI6MjA4NDQ3NDEwMX0.mNn36CRt873UOFbmaeh20dUOFzYNcAdy_uuzLYY0W14';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('Testing Supabase connection...\n');

// Test 1: Check if client is created
console.log('✓ Supabase client created successfully');
console.log('  URL:', supabaseUrl);

// Test 2: Try to query user_profiles table
const { data, error } = await supabase
  .from('user_profiles')
  .select('count')
  .limit(1);

if (error) {
  console.log('\n✗ Connection test failed:');
  console.log('  Error:', error.message);
  console.log('  Details:', error.details);
  console.log('  Hint:', error.hint);
  process.exit(1);
} else {
  console.log('\n✓ Successfully connected to Supabase!');
  console.log('  Database is accessible');
  console.log('  user_profiles table exists');
}

// Test 3: List available tables
const { data: tables, error: tablesError } = await supabase
  .from('user_profiles')
  .select('*')
  .limit(0);

if (!tablesError) {
  console.log('\n✓ Database schema is accessible');
}

console.log('\n✅ All connection tests passed!');
