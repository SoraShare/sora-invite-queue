# Sora Invite Queue - MVP Implementation

> **Rapid deployment community platform for fair distribution of OpenAI Sora invitation codes**

[![Deploy Status](https://img.shields.io/badge/deployment-ready-green)]() [![Architecture](https://img.shields.io/badge/architecture-serverless-blue)]() [![Stack](https://img.shields.io/badge/stack-Next.js%20%2B%20Supabase-orange)]()

## 🎯 Project Overview

### Business Context
**Problem:** OpenAI Sora invitations are artificially scarce with profit-driven resellers charging $200-500 per invite, creating unfair access barriers for AI creators and developers.

**Solution:** Community-driven platform ensuring fair distribution through transparent FIFO queue system with mandatory code recycling, targeting rapid market validation and user acquisition.

**Value Proposition:**
- **Fair Access:** FIFO queue ensuring first-come-first-served vs. highest bidder
- **Sustainable Ecosystem:** Mandatory return mechanism creates perpetual access pool  
- **Trust & Transparency:** LinkedIn verification + scheduled GitHub updates
- **Community Focus:** Recognition system encouraging generous participation
- **Rapid Deployment:** 1-day MVP using managed services for immediate market validation

### Technical Overview
**Architecture Pattern:** Serverless JAMstack with managed backend services
**Development Approach:** Template-based rapid deployment using Supabase + Vercel
**Timeline:** 1-day MVP deployment for immediate user validation
**Budget:** $500 infrastructure allocation using free/low-cost managed services

**Technology Stack:**
- **Frontend:** Vite + React 18 (TypeScript, Tailwind CSS, React Router)
- **Backend:** Supabase (PostgreSQL, Auth, Real-time, Edge Functions)
- **Local Development:** Supabase CLI with local PostgreSQL instance
- **Authentication:** LinkedIn OAuth, GitHub OAuth (+ Email for local dev only)
- **Deployment:** Vercel/Netlify (frontend), Supabase Cloud (backend)
- **Monitoring:** Supabase Dashboard + deployment platform analytics

### Target Audience & Market
- **Primary Users:** AI creators, developers, researchers (500K+ globally)
- **Business Users:** Content creation agencies, marketing teams
- **Community:** Technology enthusiasts, early AI adopters
- **Geographic:** Initially US-based, English-only for rapid validation
- **Scale Target:** 500 concurrent users for MVP validation phase

---

## � Features & Functionality

### Must-Have Features (MVP - Day 1 Deployment)

#### 1. **Core Queue Management System**
- **Description:** Simple FIFO queue using database table with ordered processing
- **Business Value:** Solves primary pain point of unfair invitation allocation
- **Technical Implementation:** Supabase database table with timestamp ordering
- **User Experience:** Real-time position updates, estimated wait time display
- **Success Criteria:** 100% queue processing accuracy, <12 hour average wait time

#### 2. **Social Authentication & Verification**  
- **Description:** OAuth-based user authentication with LinkedIn and GitHub
- **Business Value:** Reduces fraud risk and builds trust infrastructure
- **Technical Implementation:** Supabase Auth with LinkedIn and GitHub OAuth providers
- **User Experience:** Seamless social login, verified user badges
- **Local Development:** Includes email/password for testing convenience
- **Production:** LinkedIn and GitHub OAuth only (email login disabled)
- **Success Criteria:** 95% authentication success rate, <60 seconds login time

#### 3. **Invitation Code Management**
- **Description:** Secure submission, validation, and return tracking system
- **Business Value:** Enables sustainable ecosystem through code recycling
- **Technical Implementation:** Encrypted storage, basic format validation
- **User Experience:** Simple submission forms, return deadline tracking
- **Success Criteria:** 95% code tracking accuracy, 50% return rate for MVP

#### 4. **GitHub Transparency Integration**
- **Description:** Scheduled public updates of community statistics and transactions
- **Business Value:** Builds trust through radical transparency
- **Technical Implementation:** GitHub API with hourly batch updates
- **User Experience:** Public repository with anonymized transaction data
- **Success Criteria:** 100% data accuracy, hourly update consistency

#### 5. **Premium Tier & Payments**
- **Description:** Single premium tier ($19/month) offering priority queue access
- **Business Value:** Immediate revenue validation and monetization testing
- **Technical Implementation:** Stripe Elements with Supabase subscription management
- **User Experience:** Simple upgrade flow, priority queue indicators
- **Success Criteria:** Payment processing, subscription management, priority queue functionality

### Should-Have Features (Post-MVP Validation)

#### 6. **User Profiles & Recognition System**
- **Description:** Basic user profiles with contribution tracking and recognition
- **Business Value:** Gamification drives engagement and retention
- **Implementation:** Deferred to post-MVP based on user validation feedback

#### 7. **Analytics Dashboard**
- **Description:** Basic analytics for users and administrators
- **Business Value:** Data-driven optimization and user insights
- **Implementation:** Supabase built-in analytics initially, custom dashboard later

#### 8. **Mobile App & Advanced Features**
- **Description:** Native mobile applications and advanced community features
- **Business Value:** Enhanced user experience and engagement
- **Implementation:** Future phase based on web platform success validation

---

## 🏗️ Technical Architecture

### System Architecture Pattern
**Selected Pattern:** Serverless JAMstack Architecture
**Justification:** Optimal for rapid deployment, minimal infrastructure management, auto-scaling, and cost efficiency for startup constraints.

### System Components

#### **Frontend (Next.js 14 + Vercel)**
- **Technology:** Next.js 14 with App Router, React 18, TypeScript, Tailwind CSS
- **Responsibilities:** User interface, client-side logic, real-time updates, payment flows
- **Deployment:** Vercel automatic deployment with global CDN and edge optimization
- **Performance:** Static generation + ISR for optimal loading, client-side queue updates

#### **Backend (Supabase Managed Services)**
- **Database:** PostgreSQL with real-time subscriptions, row-level security
- **Authentication:** Supabase Auth with OAuth providers (LinkedIn, GitHub)
- **API:** Auto-generated REST API + GraphQL, custom Edge Functions for business logic
- **Real-time:** WebSocket connections for live queue position updates
- **Local Development:** Supabase CLI with `backend/supabase/config.toml` configuration
- **Environment Management:** `backend/.env.local` for local development variables

#### **Integration Services**
- **Payments:** Stripe Elements with Supabase Stripe integration
- **Notifications:** Supabase email auth + browser push notifications
- **Transparency:** GitHub API integration for automated community data updates
- **Analytics:** Supabase Analytics + Vercel Analytics for user behavior tracking

### Database Schema Design

```sql
-- Core Tables for MVP
users (
  id: uuid PRIMARY KEY,
  linkedin_id: text UNIQUE,
  email: text,
  name: text,
  avatar_url: text,
  subscription_status: text DEFAULT 'free',
  created_at: timestamp,
  updated_at: timestamp
);

queue_entries (
  id: uuid PRIMARY KEY,
  user_id: uuid REFERENCES users(id),
  position: integer,
  status: text DEFAULT 'waiting', -- waiting, allocated, expired
  created_at: timestamp,
  allocated_at: timestamp,
  expires_at: timestamp
);

invitation_codes (
  id: uuid PRIMARY KEY,
  code: text ENCRYPTED,
  submitted_by: uuid REFERENCES users(id),
  allocated_to: uuid REFERENCES users(id),
  status: text DEFAULT 'available', -- available, allocated, returned
  created_at: timestamp,
  allocated_at: timestamp
);

code_returns (
  id: uuid PRIMARY KEY,
  user_id: uuid REFERENCES users(id),
  original_code_id: uuid REFERENCES invitation_codes(id),
  returned_codes: text[] ENCRYPTED,
  return_count: integer,
  created_at: timestamp
);
```

### Authentication Architecture

#### **Local Development Authentication**
- **Email/Password:** Enabled for development and testing purposes
- **LinkedIn OAuth:** Configured via `backend/supabase/config.toml` and `backend/.env.local`
- **GitHub OAuth:** Configured via `backend/supabase/config.toml` and `backend/.env.local`
- **Configuration:** `backend/supabase/config.toml` uses `env(VARIABLE_NAME)` syntax to load from `.env.local`

#### **Production Authentication**
- **Email/Password:** **DISABLED** for security and user experience
- **LinkedIn OAuth:** Configured directly in Supabase Cloud Dashboard
- **GitHub OAuth:** Configured directly in Supabase Cloud Dashboard
- **Configuration:** Environment variables set manually in Supabase Dashboard (not from files)

#### **Supabase Configuration Management**
- **Local:** `backend/supabase/config.toml` + `backend/.env.local` (used by `supabase start`)
- **Production:** Supabase Cloud Dashboard settings (config.toml not used in cloud)
- **OAuth Providers:** Must be configured separately in both local config and cloud dashboard

### Security & Compliance Architecture

#### **Data Protection**
- **Encryption:** Supabase managed encryption for sensitive data (invitation codes)
- **Authentication:** OAuth 2.0 with LinkedIn and GitHub, secure session management
- **Authorization:** Row-level security policies, role-based access control
- **Privacy:** GDPR compliance via Supabase features, minimal data collection

#### **Fraud Prevention**
- **Identity Verification:** LinkedIn profile validation (age, connections, completeness)
- **Duplicate Detection:** Email and LinkedIn ID uniqueness constraints
- **Rate Limiting:** Supabase built-in rate limiting and abuse prevention
- **Audit Logging:** Comprehensive transaction logging via Supabase audit tables

### Performance & Scalability

#### **Performance Targets**
- **Response Time:** <1 second for all user interactions
- **Concurrent Users:** Support 500+ concurrent users on free/hobby tiers
- **Queue Processing:** Real-time position updates via database subscriptions
- **Uptime:** 99%+ via managed services with automatic failover

#### **Scaling Strategy**
- **Database:** Supabase automatic scaling, read replicas for high traffic
- **Frontend:** Vercel edge deployment with global CDN caching
- **Real-time:** Supabase handles WebSocket scaling automatically
- **Payments:** Stripe handles all payment processing and compliance scaling

---

## 🚀 Development Setup & Implementation Guide

### Prerequisites & Environment Setup
```bash
# Required Tools
- Node.js 18+ and npm/yarn
- Git for version control
- Supabase CLI for local development
- Vite for frontend development server

# Backend Environment Variables (backend/.env.local)
SUPABASE_PROJECT_REF=your_project_ref
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_AUTH_EXTERNAL_LINKEDIN_CLIENT_ID=your_linkedin_client_id
SUPABASE_AUTH_EXTERNAL_LINKEDIN_SECRET=your_linkedin_secret
SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID=your_github_client_id
SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET=your_github_secret

# Frontend Environment Variables (ui/.env.local)
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_USE_LOCAL_SUPABASE=true
VITE_ENABLE_QUEUE_AUTO_REFRESH=false
VITE_SHOW_AUTH_DEBUG=true
```

### Project File Structure
```
sora-invite-queue/
├── README.md                          # This comprehensive project guide
├── IMPLEMENTATION.md                  # Implementation details and setup
├── business-validation-report.md      # Business analysis and validation
├── architecture-config.md             # Technical architecture details
├── feature-specifications.md          # Feature requirements and specs
├── github-issues-breakdown.md         # GitHub issues and project management
├── next-steps-action-plan.md          # Post-MVP roadmap and next steps
│
├── backend/                           # Supabase backend configuration
│   ├── .env.example                   # Environment variables template
│   ├── .env.local                     # Local development environment variables
│   ├── package.json                   # Backend dependencies
│   └── supabase/                      # Supabase project configuration
│       ├── config.toml                # Local Supabase configuration
│       ├── seed.sql                   # Database seeding data
│       ├── migrations/                # Database schema migrations
│       │   ├── 20241001000000_initial_queue_schema.sql
│       │   └── 20241006000000_add_user_profile_trigger.sql
│       └── functions/                 # Supabase Edge Functions
│           ├── code-manager/          # Invitation code management
│           ├── code-submission/       # Code submission handling
│           ├── queue-management/      # Queue operations
│           └── queue-processor/       # Queue processing logic
│
├── ui/                               # Vite + React frontend application
│   ├── .env.example                  # Frontend environment template
│   ├── .env.local                    # Local frontend environment variables
│   ├── .env.production               # Production environment variables
│   ├── package.json                  # Frontend dependencies and scripts
│   ├── vite.config.ts                # Vite build configuration
│   ├── tailwind.config.js            # Tailwind CSS configuration
│   ├── tsconfig.json                 # TypeScript configuration
│   ├── index.html                    # Main HTML template
│   │
│   ├── src/                          # Source code
│   │   ├── App.tsx                   # Main application component
│   │   ├── main.tsx                  # Application entry point
│   │   ├── index.css                 # Global styles
│   │   │
│   │   ├── components/               # React components
│   │   │   ├── AuthForm.tsx          # LinkedIn/GitHub/Email authentication
│   │   │   ├── DonateCode.tsx        # Code donation interface
│   │   │   ├── RequestCode.tsx       # Code request and queue interface
│   │   │   ├── QueueCard.tsx         # Queue status and user profile display
│   │   │   ├── Homepage.tsx          # Landing page component
│   │   │   ├── Layout.tsx            # Application layout wrapper
│   │   │   ├── ProtectedRoute.tsx    # Route protection component
│   │   │   └── ui/                   # Reusable UI components
│   │   │
│   │   ├── hooks/                    # Custom React hooks
│   │   │   ├── useAuth.ts            # Authentication state management
│   │   │   └── useQueue.ts           # Queue position and updates
│   │   │
│   │   ├── lib/                      # Utility functions and configurations
│   │   │   └── supabase.ts           # Supabase client configuration
│   │   │
│   │   ├── services/                 # API service functions
│   │   │   └── queueService.ts       # Queue-related API calls
│   │   │
│   │   └── types/                    # TypeScript type definitions
│   │       └── queue.ts              # Queue and user types
│   │
│   └── public/                       # Static assets
│       └── _redirects                # Netlify/Vercel redirect rules
```
```
sora-invite-queue/
├── README.md                          # This comprehensive project guide
├── package.json                       # Dependencies and scripts
├── next.config.js                     # Next.js configuration
├── tailwind.config.js                 # Tailwind CSS configuration
├── tsconfig.json                      # TypeScript configuration
│
├── app/                               # Next.js 14 App Router
│   ├── layout.tsx                     # Root layout with providers
│   ├── page.tsx                       # Home page with queue display
│   ├── login/                         # Authentication pages
│   ├── dashboard/                     # User dashboard and queue management
│   ├── admin/                         # Admin panel for queue management
│   └── api/                           # API routes for integrations
│
├── components/                        # Reusable React components
│   ├── ui/                           # Base UI components (buttons, forms)
│   ├── auth/                         # Authentication components
│   ├── queue/                        # Queue-related components
│   ├── payments/                     # Stripe payment components
│   └── analytics/                    # Analytics and dashboard components
│
├── lib/                              # Utility functions and configurations
│   ├── supabase/                     # Supabase client and helpers
│   ├── stripe/                       # Stripe configuration and helpers
│   ├── github/                       # GitHub API integration
│   └── utils/                        # General utility functions
│
├── types/                            # TypeScript type definitions
│   ├── database.types.ts             # Supabase generated types
│   ├── user.types.ts                 # User and authentication types
│   └── queue.types.ts                # Queue and invitation code types
│
├── hooks/                            # Custom React hooks
│   ├── useAuth.ts                    # Authentication state management
│   ├── useQueue.ts                   # Queue position and updates
│   └── useSubscription.ts            # Subscription status management
│
├── supabase/                         # Supabase configuration
│   ├── migrations/                   # Database migration files
│   ├── seed.sql                      # Initial data seeding
│   └── config.toml                   # Supabase project configuration
│
└── docs/                            # Additional documentation
    ├── business-validation-report.md # Comprehensive business analysis
    ├── feature-specifications.md    # Detailed feature requirements
    ├── architecture-config.md       # Architecture configuration parameters
    └── deployment-guide.md          # Production deployment instructions
```

## 🚀 Development Setup & Local Environment

### Environment Configuration

This project uses **separate environment configurations** for local development and production:

#### **Local Development Environment**
- **Backend**: Uses `backend/.env.local` for Supabase configuration
- **Frontend**: Uses `ui/.env.local` for frontend environment variables
- **Supabase**: Uses `backend/supabase/config.toml` for local Supabase instance configuration
- **Authentication**: Supports email/password, LinkedIn OAuth, and GitHub OAuth

#### **Production Environment**
- **Backend**: Environment variables configured directly in Supabase Cloud Dashboard
- **Frontend**: Uses `ui/.env.production` or deployment platform environment variables
- **Authentication**: **LinkedIn and GitHub OAuth only** (email/password disabled for security)

### Local Development Setup

#### **1. Backend Setup (Supabase)**
```bash
# Navigate to backend directory
cd backend

# Install Supabase CLI
npm install -g supabase

# Start local Supabase (uses backend/supabase/config.toml)
supabase start

# The config.toml automatically loads environment variables from backend/.env.local
# Variables are referenced using env(VARIABLE_NAME) syntax in config.toml
```

#### **2. Frontend Setup (Vite + React)**
```bash
# Navigate to UI directory
cd ui

# Install dependencies
npm install

# Start development server
npm run dev
```

#### **3. Environment Variables Setup**
```bash
# Backend environment (backend/.env.local)
SUPABASE_AUTH_EXTERNAL_LINKEDIN_CLIENT_ID=your_linkedin_client_id
SUPABASE_AUTH_EXTERNAL_LINKEDIN_SECRET=your_linkedin_secret
SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID=your_github_client_id
SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET=your_github_secret

# Frontend environment (ui/.env.local)
VITE_USE_LOCAL_SUPABASE=true              # Use local Supabase instance
VITE_SUPABASE_URL=http://localhost:54321  # Local Supabase URL
VITE_SUPABASE_ANON_KEY=your_anon_key     # Supabase anonymous key
VITE_SHOW_AUTH_DEBUG=true                 # Show auth debug information
```

### Key Configuration Files

#### **backend/supabase/config.toml**
- **Purpose:** Local Supabase instance configuration
- **Usage:** Only for local development with `supabase start`
- **Environment Variables:** References `backend/.env.local` using `env(VARIABLE_NAME)` syntax
- **OAuth Configuration:** Defines LinkedIn and GitHub OAuth providers for local development
- **Production:** This file is **NOT used** in Supabase Cloud

#### **backend/.env.local**
- **Purpose:** Environment variables for local Supabase development
- **Usage:** Automatically loaded by Supabase CLI when using `config.toml`
- **Contains:** OAuth client IDs, secrets, and other sensitive configuration
- **Production:** Variables must be set separately in Supabase Cloud Dashboard

#### **ui/.env.local vs ui/.env.production**
- **Local:** Uses `http://localhost:54321` for local Supabase instance
- **Production:** Uses `https://your-project.supabase.co` for cloud instance
- **Feature Flags:** Different debug and development settings per environment

#### **Hour 3-4: Authentication & Database Setup**
```sql
-- Execute in Supabase SQL Editor
-- Core database schema setup
CREATE TABLE users (
  id uuid REFERENCES auth.users(id) PRIMARY KEY,
  linkedin_id text UNIQUE,
  email text,
  full_name text,
  avatar_url text,
  subscription_status text DEFAULT 'free' CHECK (subscription_status IN ('free', 'premium')),
  subscription_expires_at timestamp,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE queue_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  position integer,
  status text DEFAULT 'waiting' CHECK (status IN ('waiting', 'allocated', 'expired', 'completed')),
  priority boolean DEFAULT false,
  created_at timestamp DEFAULT now(),
  allocated_at timestamp,
  expires_at timestamp
);

CREATE TABLE invitation_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code_hash text, -- Store hash for verification, not plain text
  submitted_by uuid REFERENCES users(id),
  allocated_to uuid REFERENCES users(id),
  status text DEFAULT 'available' CHECK (status IN ('available', 'allocated', 'used')),
  created_at timestamp DEFAULT now(),
  allocated_at timestamp
);

-- Row Level Security policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_codes ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Queue entries viewable by owner
CREATE POLICY "Users can view own queue entries" ON queue_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own queue entries" ON queue_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
```

#### **Hour 5-6: Core Queue Implementation**
```typescript
// lib/supabase/queue.ts - Core queue management functions
export async function joinQueue(userId: string, isPremium: boolean = false) {
  const { data, error } = await supabase
    .from('queue_entries')
    .insert({
      user_id: userId,
      priority: isPremium,
      position: isPremium ? await getNextPriorityPosition() : await getNextPosition()
    })
    .select()
    .single();

  if (!error) {
    await updateQueuePositions();
  }
  return { data, error };
}

export async function allocateNextCode() {
  // Get next person in queue (priority first, then FIFO)
  const { data: nextInQueue } = await supabase
    .from('queue_entries')
    .select('*')
    .eq('status', 'waiting')
    .order('priority', { ascending: false })
    .order('position', { ascending: true })
    .limit(1)
    .single();

  if (!nextInQueue) return null;

  // Get available code
  const { data: availableCode } = await supabase
    .from('invitation_codes')
    .select('*')
    .eq('status', 'available')
    .limit(1)
    .single();

  if (availableCode && nextInQueue) {
    // Allocate code to user
    await supabase
      .from('invitation_codes')
      .update({
        allocated_to: nextInQueue.user_id,
        status: 'allocated',
        allocated_at: new Date().toISOString()
      })
      .eq('id', availableCode.id);

    // Update queue entry
    await supabase
      .from('queue_entries')
      .update({
        status: 'allocated',
        allocated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() // 48 hour expiry
      })
      .eq('id', nextInQueue.id);

    return { code: availableCode, recipient: nextInQueue };
  }
}
```

#### **Hour 7-8: Frontend Implementation & Deployment**
```typescript
// app/page.tsx - Main queue display page
export default function QueuePage() {
  const { user } = useAuth();
  const { queuePosition, estimatedWaitTime } = useQueue();
  const { isLoading, error } = useQueuePosition();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Sora Invite Queue
            </h1>
            {!user ? (
              <LoginButton />
            ) : (
              <UserProfile user={user} />
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!user ? (
          <WelcomeSection />
        ) : (
          <QueueDashboard 
            position={queuePosition}
            estimatedWait={estimatedWaitTime}
          />
        )}
      </main>
    </div>
  );
}

// Deploy to Vercel
# Final deployment step
vercel --prod
```

---

## 📋 Implementation Workflow & Standards

### Code Quality Standards
- **TypeScript:** Strict mode enabled, comprehensive type definitions
- **ESLint + Prettier:** Automated code formatting and linting
- **Component Structure:** Functional components with TypeScript interfaces
- **Error Handling:** Comprehensive error boundaries and user feedback
- **Performance:** Lazy loading, memoization, and optimization patterns

### Testing Strategy (Post-MVP)
- **Unit Tests:** Jest + React Testing Library for component testing
- **Integration Tests:** Playwright for end-to-end user workflows
- **Database Tests:** Supabase local development with test data
- **Payment Tests:** Stripe test mode with comprehensive scenarios

### Git Workflow & Deployment
```bash
# Development workflow
git checkout -b feature/queue-management
# Implement feature
git add .
git commit -m "feat: implement basic FIFO queue system"
git push origin feature/queue-management
# Create PR, review, merge to main
# Vercel automatically deploys main branch to production
```

### Monitoring & Analytics
- **User Analytics:** Vercel Analytics for page views and performance
- **Database Monitoring:** Supabase dashboard for query performance
- **Error Tracking:** Built-in Next.js error reporting
- **Business Metrics:** Custom dashboard for queue metrics and user engagement

---

## � Integration with Implementation Prompts

This README.md serves as the comprehensive context source for all implementation prompts and development workflows:

### For Feature Development Prompts
```markdown
**Context Reference Pattern:**
"Using the Sora Invite Queue project context from README.md:
- **Business Context:** [Reference Project Overview section]
- **Technical Stack:** [Reference Technical Architecture section]
- **Feature Requirements:** [Reference specific feature from Features & Functionality]
- **Implementation Standards:** [Reference Development Setup & Standards]

Implement [specific feature] following the established architecture and standards."
```

### For Code Review Prompts
```markdown
**Review Context Pattern:**
"Review this code for the Sora Invite Queue project against:
- **Architecture Standards:** [Reference Technical Architecture decisions]
- **Code Quality:** [Reference Code Quality Standards from Implementation section]
- **Security Requirements:** [Reference Security & Compliance Architecture]
- **Performance Targets:** [Reference specific performance requirements]

Code to review: [paste code here]"
```

### For Testing Implementation Prompts
```markdown
**Testing Context Pattern:**
"Create comprehensive tests for Sora Invite Queue feature:
- **Feature Specification:** [Reference specific feature requirements]
- **User Stories:** [Reference user acceptance criteria]
- **Technical Implementation:** [Reference database schema and API structure]
- **Testing Standards:** [Reference Testing Strategy section]

Generate unit and integration tests for: [specific component/feature]"
```

### For Deployment & DevOps Prompts
```markdown
**Deployment Context Pattern:**
"Set up deployment pipeline for Sora Invite Queue:
- **Architecture:** [Reference Serverless JAMstack architecture]
- **Technology Stack:** [Reference Supabase + Vercel deployment approach]
- **Environment Configuration:** [Reference environment variables and setup]
- **Monitoring Requirements:** [Reference performance targets and monitoring needs]

Configure: [specific deployment aspect]"
```

### For UI/UX Implementation Prompts
```markdown
**Design Context Pattern:**
"Design user interface for Sora Invite Queue:
- **User Experience Requirements:** [Reference specific user stories and acceptance criteria]
- **Technical Constraints:** [Reference Next.js + Tailwind CSS implementation]
- **Brand Guidelines:** [Reference community-first, transparency values]
- **Performance Requirements:** [Reference <1 second response time targets]

Create: [specific UI component or page]"
```

---

## 📋 Success Metrics & Validation Framework

### MVP Success Criteria (Day 1 Launch)
- [ ] **Functional Queue System:** FIFO processing with real-time position updates
- [ ] **Authentication Working:** LinkedIn OAuth integration with user profile creation
- [ ] **Code Management:** Basic submission and allocation functionality
- [ ] **Payment Integration:** Stripe premium subscription flow operational
- [ ] **GitHub Transparency:** Automated hourly statistics updates
- [ ] **Mobile Responsive:** Full functionality across all device sizes
- [ ] **Performance Targets:** <1 second response times, 99% uptime via managed services

### Week 1 Validation Targets
- [ ] **User Registration:** 50+ LinkedIn-verified users signed up
- [ ] **Queue Engagement:** 20+ users actively joined queue
- [ ] **Code Submissions:** 10+ invitation codes submitted to system
- [ ] **Premium Conversions:** 2+ users upgraded to premium tier
- [ ] **Return Rate:** 50%+ of allocated codes result in successful returns
- [ ] **User Feedback:** Positive sentiment on core value proposition
- [ ] **Technical Stability:** Zero critical system failures or data loss

### Month 1 Growth Indicators
- [ ] **User Base:** 500+ active users with sustained engagement
- [ ] **Queue Velocity:** <12 hour average wait time maintained
- [ ] **Community Health:** 60%+ return rate achieved consistently  
- [ ] **Revenue Validation:** $500+ monthly recurring revenue from premium tiers
- [ ] **Geographic Expansion:** Users from 5+ countries actively participating
- [ ] **Platform Recognition:** 100+ GitHub stars, social media mentions

---

## 🚀 Next Steps & Implementation Priorities

### Immediate Action Items (Next 24 Hours)
1. **Environment Setup:** Create Supabase project and Vercel account
2. **Repository Initialization:** Set up project structure with initial commits
3. **MVP Development:** Follow 8-hour implementation roadmap
4. **Production Deployment:** Deploy MVP to production Vercel environment
5. **Community Outreach:** Share with 10+ AI creator communities for initial feedback

### Week 1 Iteration Priorities
1. **User Feedback Integration:** Implement top 3 user-requested improvements
2. **Performance Optimization:** Address any performance bottlenecks discovered
3. **Security Hardening:** Complete security review and implement improvements
4. **Analytics Implementation:** Set up comprehensive user behavior tracking
5. **Community Building:** Engage with early users, collect testimonials

### Month 1 Feature Expansion
1. **Enhanced User Profiles:** Implement basic recognition and contribution tracking
2. **Advanced Analytics:** Custom dashboard for queue and community metrics
3. **Mobile App Planning:** Research native mobile app requirements and feasibility
4. **Partnership Outreach:** Connect with AI influencers and community leaders
5. **International Expansion:** Plan WeChat integration for Asian market entry

---

## � Additional Resources & Documentation

### Business Foundation Documents
- [`business-validation-report.md`](./business-validation-report.md) - Complete market analysis and financial projections
- [`feature-specifications.md`](./feature-specifications.md) - Detailed feature requirements and user stories  
- [`architecture-config.md`](./architecture-config.md) - Technical architecture parameters and constraints
- [`next-steps-action-plan.md`](./next-steps-action-plan.md) - Strategic roadmap and execution timeline

### Technical References
- [Supabase Documentation](https://supabase.com/docs) - Database, Auth, and Real-time features
- [Next.js App Router Guide](https://nextjs.org/docs/app) - Framework documentation and best practices
- [Vercel Deployment Guide](https://vercel.com/docs) - Hosting and deployment configuration
- [Stripe Integration Guide](https://stripe.com/docs/payments) - Payment processing implementation
- [LinkedIn OAuth Documentation](https://docs.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow) - Authentication setup

### Community & Support
- **Project Repository:** [SoraShare/sora-invite-queue](https://github.com/SoraShare/sora-invite-queue)
- **Discussion Forum:** GitHub Discussions for community feedback and support
- **Technical Issues:** GitHub Issues for bug reports and feature requests
- **Business Inquiries:** Contact via LinkedIn or email for partnerships and collaboration

---

*This README.md provides complete project context for rapid MVP development and serves as the foundation for all implementation prompts. The focus is on immediate deployment and user validation while maintaining architectural flexibility for future scaling.*

## ✨ Hall of Generosity & Code Lineage Trace

### Feature Overview
- **Description:** Every invitation code distributed through the Sora Invite Queue is tracked with a full lineage tree, showing all users who donated or enabled access for others. This "Hall of Generosity" builds reputation and transparency, allowing recipients to see and follow the chain of generosity behind their code.
- **Business Value:** Encourages community participation, builds trust, and recognizes contributors. Enables users to connect with donors via LinkedIn and GitHub, fostering a network of responsible AI creators.

### Technical Implementation
- **Database:** Each `invitation_code` record stores references to both the donor (`submitted_by`) and recipient (`allocated_to`). A recursive query or view allows tracing the lineage of each code back to the original donor(s).
- **Frontend:** The user dashboard and code notification emails display the full trace-back tree for each code, including profile links for each donor.
- **Email Notification:** When a user receives a code, the notification email includes:
  - The full lineage of the code (all donors in the chain)
  - LinkedIn and GitHub profile links for each donor
  - Option to follow or thank previous donors

#### Example Email Notification Content
```
Congratulations! You've received a Sora invitation code.

This code was made possible by the generosity of the following community members:
- Alice Zhang (LinkedIn | GitHub)
- Bob Lee (LinkedIn | GitHub)
- Carol Smith (LinkedIn | GitHub)

Explore their profiles and join the Hall of Generosity!
```

### Hall of Generosity Page
- **Display:** Interactive tree or list showing all code lineages, with profile links and contribution counts.
- **Recognition:** Top donors and contributors are highlighted, building reputation and encouraging further sharing.

### API & Query Example
- **Trace-back Query:** For a given code, recursively fetch all previous donors and their profiles.
- **Frontend Integration:** Display the lineage tree in the dashboard and include it in code notification emails.

---

This feature strengthens the community-driven mission of Sora Invite Queue, making every code allocation transparent, traceable, and socially rewarding.
