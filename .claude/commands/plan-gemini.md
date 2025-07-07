Agentic Workflow: Supabase + React Autonomous Code Generation - Analysis and Planning Phase
Objective: Autonomously analyze and create an implementation plan for the GitHub issue defined by $ARGUMENTS by executing the following agentic workflow. Your goal is to produce a detailed architecture and implementation plan for further implementation by coding agents.

# Tech Stack Context

Backend: Supabase (Database, Auth, RLS, Edge Functions)
Frontend: React + TypeScript + MUI + Zustand + Zod + Vitest
Tracking: GitHub Issues + Execution Plans Folder

## Folder Structure:

All new feature implementation will follow the featues approach - all feature files in a common folder.
```
/frontendapp/src/
features/
├── channel_mgmt/              # Existing
└── messaging/                 # New messaging feature
    ├── components/            # Message components
    ├── hooks/                 # Messaging hooks
    ├── services/              # Message API services
    ├── stores/                # Message state management
    ├── types/                 # Message type definitions
    └── utils/                 # Message utilities
    └── __tests__/              # Integration tests
├── stores/             # Zustand stores
├── services/           # API services and utilities
├── types/              # TypeScript type definitions
├── utils/              # Helper functions
├── constants/          # Application constants
└── __tests__/          # Test files
```



# 0. REASON & PLAN
This phase is for analysis and planning. Do not write any implementation code until this phase is complete and has been validated.

## 1. Issue Analysis & Reasoning
Ingest Issue: Use gh issue view $ISSUE_NUMBER to get all details.

Summarize Understanding: In plain English, state the core problem and the user's goal.

Formulate Clarifying Questions: If requirements are ambiguous, generate a list of specific questions. (Human-in-the-Loop Gate: Post these questions to the GitHub issue for human feedback before proceeding).

Define Acceptance Criteria: List the conditions that must be met for the task to be considered complete.

## 2. Contextual & Architectural Analysis
Backend Supabase types: Refer to /backend/supabase/supabase.ts
Supabase functions and migrations: /backend/supabase folder

Frontend Features: /frontendapp/TechnicalDocs/frontend_features.md

Codebase Search: Search the codebase for existing patterns, conventions, and reusable components related to the affected features.

Impact Assessment: Identify all systems to be modified:

Frontend: React components, hooks, services, types, routes.

Backend: Supabase tables, functions, RLS policies, Edge Functions.

State Chosen Approach: Explicitly state the architectural approach you will take and why, referencing existing patterns.

Example: "I will create a new hook useFeature using React Query, as this matches the existing pattern in src/hooks/useExistingFeature.ts for server-state management."

## 3. Decision Logic Engine (Rules)
Use these rules to decide on implementation details:

### Backend Logic:

Leverage SupabaseREST capabilities for CRUD

WHEN logic is data-intensive and operates close to the database (e.g., complex joins, data aggregation), THEN implement a Supabase Database Function.

WHEN logic requires external API calls, involves complex orchestration, or needs serverless execution, THEN implement a Supabase Edge Function.

WHEN logic is purely for access control based on user roles or ownership, THEN implement or modify RLS Policies.

### State Management:

WHEN data is fetched from the Supabase API, THEN use React Query.

WHEN state is purely client-side and ephemeral, THEN use useState or useReducer.

WHEN state is client-side and needs to be shared globally, THEN use the established global state manager (e.g., Zustand, Context API).

### Testing Strategy:

Focus on integration tests for both backend and frontend leverage supabase test-entities (test-org, test-channel etc..) for testing purpose.

Backend - Use vitest to test all backend api functionalities exposed

Frontend - Use vitest to test all service methods. Use Playwright for Integration testing

## 4. Implementation & Testing Plan
Task Breakdown: Decompose the work into a sequence of atomic, testable tasks.

Test Case Definition: For each task (or a group of tasks), define the tests you will write, referencing the acceptance criteria.

Schema & Type Design: Design any new TypeScript interfaces or Supabase database schemas.

(Human-in-the-Loop Gate: Present this completed plan as a pre-execution report for optional human review before starting implementation. Store the completed plan in a execution-plans/<feature>.md)

## 5. Git Sub-tasks creation
For each task defined in the plan, create a sub-task in github (link it to the original GH Issue in: $ARGUMENTS) that can be used by coding agents to implement and validate
