# Supabase Deployment Steps

## 1. Link to your Supabase project

```bash
npx supabase link --project-ref <your-project-ref>
```

**Where to find your project ref:**
- Go to https://supabase.com/dashboard
- Click on your project
- Look at the URL: `https://supabase.com/dashboard/project/<project-ref>`
- Or find it in Settings > General > Reference ID

## 2. Push migration to production

```bash
npx supabase db push
```

This will apply the comprehensive schema migration to your remote database.

## 3. Generate TypeScript types

```bash
npx supabase gen types typescript --project-id <your-project-ref> > client/lib/database.types.ts
```

## 4. Verify deployment

```bash
npx supabase db diff
```

Should return "No schema differences detected" if everything is synced.

## Quick Reference Commands

- **Start local dev**: `npx supabase start`
- **Stop local dev**: `npx supabase stop`
- **New migration**: `npx supabase migration new <name>`
- **Pull from remote**: `npx supabase db pull`
- **Reset local**: `npx supabase db reset`

## Migration File

Your comprehensive migration is located at:
`supabase/migrations/20260121000000_comprehensive_schema.sql`

This includes:
- ✅ All 15 tables with proper constraints
- ✅ Indexes for performance
- ✅ Row Level Security (RLS) policies
- ✅ Triggers for auto-updating timestamps
- ✅ Foreign key relationships
- ✅ UUID support
