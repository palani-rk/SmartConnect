#!/bin/bash

# Deployment script for Supabase Edge Functions

set -e

# Available functions
AVAILABLE_FUNCTIONS=("create-user" "add-users-to-channel" "get-channel-users" "get-user-channels")

# Function to display usage
show_usage() {
    echo "🚀 Supabase Edge Functions Deployment Script"
    echo ""
    echo "Usage:"
    echo "  ./deploy.sh [function_names...]     # Deploy specific functions"
    echo "  ./deploy.sh all                     # Deploy all functions"
    echo "  ./deploy.sh --help                  # Show this help"
    echo ""
    echo "Available functions:"
    for func in "${AVAILABLE_FUNCTIONS[@]}"; do
        echo "  - $func"
    done
    echo ""
    echo "Examples:"
    echo "  ./deploy.sh create-user                           # Deploy only create-user"
    echo "  ./deploy.sh add-users-to-channel get-channel-users  # Deploy specific channel functions"
    echo "  ./deploy.sh all                                   # Deploy all functions"
}

# Check for help flag
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    show_usage
    exit 0
fi

echo "🚀 Deploying Supabase Edge Functions..."

# Check if supabase CLI is available (global or local)
if ! command -v supabase &> /dev/null && ! command -v npx &> /dev/null; then
    echo "❌ Supabase CLI is not available. Please install it first:"
    echo "npm install -g supabase  # or ensure npx is available"
    exit 1
fi

# Determine which command to use
if command -v supabase &> /dev/null; then
    SUPABASE_CMD="supabase"
else
    SUPABASE_CMD="npx supabase"
fi

# Check if logged in
if ! $SUPABASE_CMD projects list > /dev/null 2>&1; then
    echo "❌ Not logged in to Supabase. Please run:"
    echo "$SUPABASE_CMD login"
    exit 1
fi

# Determine what to deploy
if [[ $# -eq 0 ]]; then
    # No arguments - show usage and ask
    show_usage
    echo ""
    echo "Enter function names to deploy (space-separated) or 'all':"
    read -r user_input
    if [[ -z "$user_input" ]]; then
        echo "❌ No functions specified"
        exit 1
    fi
    set -- $user_input
fi

# Deploy functions
if [[ "$1" == "all" ]]; then
    echo "📦 Deploying all functions..."
    for func in "${AVAILABLE_FUNCTIONS[@]}"; do
        echo "📦 Deploying $func..."
        $SUPABASE_CMD functions deploy "$func"
    done
else
    # Deploy specified functions
    for func in "$@"; do
        # Check if function exists
        if [[ " ${AVAILABLE_FUNCTIONS[*]} " =~ " $func " ]]; then
            echo "📦 Deploying $func..."
            $SUPABASE_CMD functions deploy "$func"
        else
            echo "⚠️  Function '$func' not found. Available functions: ${AVAILABLE_FUNCTIONS[*]}"
        fi
    done
fi

echo "✅ Deployment completed successfully!"

echo ""
echo "📋 Next steps:"
echo "1. Set environment variables:"
echo "   supabase secrets set SUPABASE_URL=your_supabase_url"
echo "   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key"
echo "   supabase secrets set FRONTEND_URL=https://your-frontend-domain.com"
echo ""
echo "2. Test the functions:"
echo ""
echo "   # Test create-user:"
echo "   curl -X POST 'https://your-project-ref.supabase.co/functions/v1/create-user' \\"
echo "     -H 'Authorization: Bearer YOUR_USER_JWT_TOKEN' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"email\":\"test@example.com\",\"auto_generate_password\":true,\"organization_id\":\"your-org-uuid\",\"role\":\"user\"}'"
echo ""
echo "   # Test add-users-to-channel:"
echo "   curl -X POST 'https://your-project-ref.supabase.co/functions/v1/add-users-to-channel' \\"
echo "     -H 'Authorization: Bearer YOUR_ADMIN_JWT_TOKEN' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"channel_id\":\"channel-uuid\",\"user_ids\":[\"user-uuid-1\",\"user-uuid-2\"],\"role\":\"member\"}'"
echo ""
echo "   # Test get-user-channels:"
echo "   curl 'https://your-project-ref.supabase.co/functions/v1/get-user-channels' \\"
echo "     -H 'Authorization: Bearer YOUR_USER_JWT_TOKEN'"
echo ""
echo "   # Test get-channel-users:"
echo "   curl 'https://your-project-ref.supabase.co/functions/v1/get-channel-users?channel_id=channel-uuid' \\"
echo "     -H 'Authorization: Bearer YOUR_USER_JWT_TOKEN'"
echo ""
echo "🎉 Deployment complete!"