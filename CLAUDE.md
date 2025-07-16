# SmartConnect Supabase Project

## Supabase CLI Setup

### Login
```bash
# Login with personal access token
npx supabase login --token sbp_40957065dbcb82f3a04b06b124838bedec240f70

# Or login interactively
npx supabase login
```

### Project Information
- **Project Name**: SmartCollab
- **Project ID**: axmikjtbiddtmdepaqhr
- **Region**: South Asia (Mumbai)
- **URL**: https://axmikjtbiddtmdepaqhr.supabase.co

### Essential Commands
```bash
# List all projects
npx supabase projects list

# Link to remote project
npx supabase link --project-ref axmikjtbiddtmdepaqhr

# Deploy functions to remote
npx supabase functions deploy

# Deploy specific function
npx supabase functions deploy [function-name]

# View function logs
npx supabase functions logs [function-name]

# Run migrations
npx supabase db push

# Generate types
npx supabase gen types typescript --linked > types/supabase.ts
```

### DB Push Details
- `npx supabase db push` command is used to apply local database migrations to the remote Supabase project
- Ensures that schema changes defined in local migration files are synchronized with the remote database
- Helpful for keeping database schema consistent across development environments
- Always review migrations carefully before pushing to avoid unintended data loss or schema changes

## Backend API Guidelines:

  - Use native Supabase REST API for basic CRUD operations
  - Leverage RLS policies for security
  - Use PostgREST features for filtering, sorting, pagination

  Focus Edge Functions On:

  1. Complex Business Logic (multi-step operations)
  2. Advanced Aggregations (statistics, analytics)
  3. Bulk Operations (batch processing)
  4. Custom Validations (beyond database constraints)

  Simplified Architecture:

  - Frontend → Supabase REST API for basic operations
  - Frontend → Edge Functions only for complex operations
  - Real-time → Supabase Realtime for live updates