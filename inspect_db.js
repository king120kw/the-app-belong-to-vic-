import fs from 'fs';

const PROJECT_REF = 'ifxrkbitnpbxqnbxkncp';
const ACCESS_TOKEN = 'sbp_419fccf2f38d47338fafe967e0e2cd01168cdcb8';

async function inspectTable(tableName) {
    console.log(`Inspecting table: ${tableName}...`);
    const sql = `
        -- Columns
        SELECT 'COLUMN' as info_type, column_name as name, data_type as detail, is_nullable as extra
        FROM information_schema.columns 
        WHERE table_name = '${tableName}'
        UNION ALL
        -- Constraints
        SELECT 'CONSTRAINT', constraint_name, constraint_type, ''
        FROM information_schema.table_constraints
        WHERE table_name = '${tableName}'
        UNION ALL
        -- Grants
        SELECT 'GRANT', grantee, privilege_type, ''
        FROM information_schema.table_privileges
        WHERE table_name = '${tableName}'
        ORDER BY info_type, name;
    `;

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
        console.error(`Error inspecting table: ${JSON.stringify(result, null, 2)}`);
        return;
    }

    console.log(`Schema for ${tableName}:`);
    console.log(JSON.stringify(result, null, 2));
}

const run = async () => {
    try {
        await inspectTable('onboarding_responses');
    } catch (err) {
        console.error('Fatal error:', err);
    }
};

run();
