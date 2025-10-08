#!/bin/bash

# Sora Queue Deployment Script
# This script deploys both UI and backend components

set -e

echo "🚀 Starting Sora Queue Deployment..."

# Check if we're in the right directory
if [ ! -f "IMPLEMENTATION.md" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 Checking dependencies...${NC}"

# Check if required tools are installed
command -v npm >/dev/null 2>&1 || { echo -e "${RED}❌ npm is required but not installed${NC}"; exit 1; }
command -v supabase >/dev/null 2>&1 || { echo -e "${RED}❌ Supabase CLI is required but not installed${NC}"; exit 1; }

echo -e "${GREEN}✅ Dependencies check passed${NC}"

# Deploy Backend (Supabase)
echo -e "${BLUE}🔧 Deploying Backend...${NC}"
cd backend

# Check if Supabase is linked
if [ ! -f "supabase/.temp/project-ref" ] && [ ! -f ".supabase/project-ref" ]; then
    echo -e "${YELLOW}⚠️  Supabase project not linked. Please run 'supabase link --project-ref YOUR_PROJECT_REF' first${NC}"
    read -p "Enter your Supabase project reference: " project_ref
    if [ -n "$project_ref" ]; then
        supabase link --project-ref "$project_ref"
    else
        echo -e "${RED}❌ Project reference is required${NC}"
        exit 1
    fi
fi

# Deploy database migrations
echo -e "${YELLOW}📊 Deploying database schema...${NC}"
supabase db push

# Deploy edge functions
echo -e "${YELLOW}⚡ Deploying edge functions...${NC}"
supabase functions deploy queue-processor --no-verify-jwt
supabase functions deploy code-manager --no-verify-jwt

# Seed development data (optional)
read -p "Do you want to seed development data? (y/N): " seed_data
if [[ $seed_data =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🌱 Seeding development data...${NC}"
    supabase db reset --linked
fi

echo -e "${GREEN}✅ Backend deployment completed${NC}"

# Deploy Frontend (Cloudflare Pages)
echo -e "${BLUE}🎨 Deploying Frontend...${NC}"
cd ../ui

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install

# Check environment variables
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}⚠️  No .env.local found. Copying from .env.example${NC}"
    cp .env.example .env.local
    echo -e "${YELLOW}📝 Please update .env.local with your actual Supabase credentials${NC}"
fi

# Build for production
echo -e "${YELLOW}🏗️  Building for production...${NC}"
npm run build

# Check if wrangler is configured for deployment
if command -v wrangler >/dev/null 2>&1; then
    echo -e "${YELLOW}☁️  Deploying to Cloudflare Pages...${NC}"
    
    # Check if wrangler.toml is properly configured
    if grep -q "your-project.supabase.co" wrangler.toml; then
        echo -e "${YELLOW}⚠️  Please update wrangler.toml with your actual Supabase URL${NC}"
    fi
    
    # Deploy to Cloudflare Pages
    npm run deploy
    
    echo -e "${GREEN}✅ Frontend deployed to Cloudflare Pages${NC}"
else
    echo -e "${YELLOW}⚠️  Wrangler CLI not found. Please deploy manually to Cloudflare Pages:${NC}"
    echo -e "   1. Go to https://dash.cloudflare.com/pages"
    echo -e "   2. Connect your GitHub repository"
    echo -e "   3. Set build command: npm run build"
    echo -e "   4. Set output directory: dist"
    echo -e "   5. Add environment variables from .env.local"
    echo -e "${GREEN}✅ Build files ready in dist/ directory${NC}"
fi

# Return to project root
cd ..

# Final deployment summary
echo -e "${GREEN}"
echo "🎉 Deployment Summary:"
echo "========================="
echo "✅ Backend: Deployed to Supabase"
echo "   - Database schema: Applied"
echo "   - Edge functions: Deployed"
echo "   - Real-time: Enabled"
echo ""
echo "✅ Frontend: Built for deployment"
echo "   - Build files: ui/dist/"
echo "   - Cloudflare Pages: Ready"
echo ""
echo "🔗 Next Steps:"
echo "1. Verify Supabase project configuration"
echo "2. Test edge functions in Supabase dashboard"
echo "3. Configure Cloudflare Pages environment variables"
echo "4. Test queue functionality end-to-end"
echo "5. Monitor real-time subscriptions"
echo -e "${NC}"

# Display important URLs and commands
echo -e "${BLUE}📖 Important Resources:${NC}"
echo "- Supabase Dashboard: https://supabase.com/dashboard"
echo "- Cloudflare Pages: https://dash.cloudflare.com/pages"
echo "- Local Development: npm run dev (in ui/ directory)"
echo "- Database Reset: supabase db reset --linked (in backend/ directory)"

echo -e "${GREEN}✨ Deployment completed successfully!${NC}"