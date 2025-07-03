# Backend - Supabase Edge Functions

This directory contains the Supabase backend configuration and Edge Functions.

## Structure

```
backend/
├── supabase/
│   ├── functions/
│   │   ├── create-user/          # User creation Edge Function
│   │   │   ├── index.ts          # Main function logic
│   │   │   └── deno.json         # Deno configuration
│   │   └── _shared/              # Shared utilities
│   │       ├── cors.ts           # CORS configuration
│   │       ├── password-generator.ts  # Password generation
│   │       ├── validation.ts     # Input validation
│   │       └── email-service.ts  # Email service (placeholder)
│   ├── config.toml               # Supabase configuration
│   └── README.md                 # This file
```

## Edge Functions

### create-user

Creates users with proper role-based permissions:

- **God users**: Can create any user in any organization
- **Admin users**: Can create user/client in their own organization only

**Endpoint**: `POST /functions/v1/create-user`

**Authentication**: Requires Bearer token in Authorization header

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "optional-password",
  "auto_generate_password": true,
  "organization_id": "uuid",
  "role": "admin|user|client",
  "whatsapp_id": "+1234567890",
  "instagram_id": "@username",
  "send_welcome_email": true
}
```

**Response**:
```json
{
  "success": true,
  "user": { /* user object */ },
  "auth_user_id": "uuid",
  "organization": {
    "id": "uuid",
    "name": "Organization Name"
  },
  "temporary_password": "generated-password",
  "message": "admin user created successfully"
}
```

## Environment Variables

The following environment variables are required:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (for admin operations)
- `FRONTEND_URL`: Frontend application URL (for email links)
- `SENDGRID_API_KEY`: SendGrid API key (optional, for email service)

## Deployment

### Prerequisites

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Login to Supabase:
```bash
supabase login
```

3. Link to your project:
```bash
supabase link --project-ref your-project-ref
```

### Deploy Edge Functions

1. Deploy the create-user function:
```bash
supabase functions deploy create-user
```

2. Set environment variables:
```bash
supabase secrets set SUPABASE_URL=your_supabase_url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
supabase secrets set FRONTEND_URL=https://your-frontend-domain.com
```

### Local Development

1. Start local Supabase:
```bash
supabase start
```

2. Serve functions locally:
```bash
supabase functions serve create-user --env-file .env.local
```

3. Test the function:
```bash
curl -X POST 'http://localhost:54321/functions/v1/create-user' \
  -H 'Authorization: Bearer YOUR_USER_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "test@example.com",
    "auto_generate_password": true,
    "organization_id": "your-org-uuid",
    "role": "user",
    "send_welcome_email": true
  }'
```

## Security

- All functions use service role key for admin operations
- Role-based permissions are enforced at the function level
- Input validation prevents malicious data
- Proper error handling prevents information leakage
- CORS is configured for frontend access

## Database Policies

Ensure your database has the proper RLS policies:

```sql
-- Policy for god users to insert any users
CREATE POLICY "God users can insert any users" ON users
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'god'
    )
  );

-- Policy for admin users to insert users in their org
CREATE POLICY "Admin users can insert users in their org" ON users
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
      AND u.organization_id = NEW.organization_id
      AND NEW.role IN ('user', 'client')
    )
  );
```

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure you're using the service role key in environment variables
2. **CORS Errors**: Check that your frontend domain is allowed in CORS configuration
3. **Invalid Token**: Ensure the frontend is sending a valid JWT token
4. **Role Permissions**: Verify the calling user has the correct role (god/admin)

### Logs

View function logs:
```bash
supabase functions logs create-user
```

### Testing

Run the function locally for testing:
```bash
supabase functions serve create-user --no-verify-jwt
```

This disables JWT verification for local testing.