// Quick test script to check if CLAUDE_API_KEY is accessible
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://iqerhtsuibbgbvcvoplo.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZXJodHN1aWJiZ2J2Y3ZvcGxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MDcyMzksImV4cCI6MjA4MDA4MzIzOX0.1ACJq6cYXvhAaDXwDYthQB1Up8WhAz4ZobC5H0YnXBY'
);

async function testSecrets() {
    const { data, error } = await supabase.functions.invoke('test-secrets');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Secret Test Result:', JSON.stringify(data, null, 2));
    }
}

testSecrets();
