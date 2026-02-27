import fs from 'fs';

const PROJECT_REF = 'ifxrkbitnpbxqnbxkncp';
const ACCESS_TOKEN = 'sbp_419fccf2f38d47338fafe967e0e2cd01168cdcb8';

async function executeSql(filePath) {
    console.log(`Reading SQL from ${filePath}...`);
    const sql = fs.readFileSync(filePath, 'utf8');

    console.log(`Executing SQL on project ${PROJECT_REF}...`);

    // Using the Supabase Management API v1
    // Note: The /query endpoint might be restricted or have specific paths based on version
    // The standard way to run SQL via API is often through specific project endpoints.

    const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: sql })
    });

    const result = await response.json();

    if (!response.ok) {
        console.error(`Error executing SQL: ${JSON.stringify(result, null, 2)}`);
        process.exit(1);
    }

    console.log(`Successfully executed ${filePath}!`);
    console.log('Result:', JSON.stringify(result).substring(0, 500) + '...');
}

async function reloadSchema() {
    console.log('Reloading PostgREST schema cache...');
    const sql = "NOTIFY pgrst, 'reload schema';";

    const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
        console.error('Error reloading schema:', await response.text());
    } else {
        console.log('Schema reload triggered!');
    }
}

const run = async () => {
    try {
        // await executeSql('cleanup_vical_db.sql');
        await executeSql('complete_schema.sql');
        await executeSql('initialize_storage.sql');
        await reloadSchema();
        console.log('\n✅ Database schema, storage buckets applied and cache reloaded!');
    } catch (err) {
        console.error('Fatal error:', err);
        process.exit(1);
    }
};

run();
