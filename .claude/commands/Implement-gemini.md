Agentic Workflow: Supabase + React Autonomous Code Generation - Implementation & Testing Phase
Objective: Autonomously implement the features and tests as defined in the approved execution plan ($EXECUTION_PLAN_PATH) and ($GITHUB ISSUE ID). Your goal is to produce a fully coded, tested, and documented feature set, culminating in a Pull Request ready for human review.

Tech Stack Context
Backend: Supabase (Database, Auth, RLS, Edge Functions)

Frontend: React + TypeScript + MUI + Zustand + Zod + Vitest

Tracking: GitHub Issues + Execution Plans Folder

Folder Structure:
/backend/supabase/
├── migrations/
├── functions/
└── integration_tests/

/frontendapp/src/
├── components/
├── pages/
├── hooks/
├── stores/
├── services/
├── types/
├── utils/
├── constants/
└── __tests__/
1. SETUP & PREPARATION
This phase focuses on preparing the development environment based on the approved plan.

1.1. Ingest Plan & Issue
Load Execution Plan: Read and parse the detailed plan from $EXECUTION_PLAN_PATH.

Load Issue Context: Use gh issue view $ISSUE_NUMBER to load the original requirements and acceptance criteria for context.

1.2. Create Feature Branch
Checkout main: Ensure you are starting from the latest version of the main branch (git checkout main && git pull).

Create Branch: Create a new feature branch. The branch name must follow the convention: feature/issue-$ISSUE_NUMBER-a-brief-description.

2. BACKEND IMPLEMENTATION & TESTING (ITERATIVE)
Review all the sub-tasks in github.
For each backend task identified, perform the following iterative loop.

2.1. Code & Test Cycle
Select Task: Process the first incomplete backend task from the plan.

Implement Code: Write the Supabase code.

For Database Functions or Schema Changes, create a new SQL migration file in /backend/supabase/migrations/.

For Edge Functions, implement the logic in a new TypeScript file within /backend/supabase/functions/.

Implement Test: Write the corresponding integration test using Vitest in /backend/supabase/integration_tests/. The test should validate the task's acceptance criteria and initially fail.

Deploy & Test Loop:

Deploy changes to the local Supabase instance (supabase db push and/or supabase functions deploy).

Run the backend integration tests (vitest run).

Debug & Refine: If tests fail, analyze the error, modify the implementation and/or test code, and repeat the deploy-and-test loop until all tests for the task pass.

Mark Task Complete: Once the tests pass, mark the task as complete and move to the next backend task.

3. FRONTEND IMPLEMENTATION & TESTING (ITERATIVE)
For each frontend task identified in github, perform the following iterative loop.

3.1. Code & Test Cycle
Select Task: Process the first incomplete frontend task from the plan.

Implement Code: Write the React code.

Create or modify Components, Hooks, Services, Stores, or Pages in the appropriate /frontendapp/src/ directory.

Define any new data structures in /frontendapp/src/types/.

Implement Test: Write the corresponding unit/integration test for the business logic (e.g., service methods, hook logic) using Vitest in /frontendapp/src/__tests__/.

Test Loop:

Run the frontend Vitest tests (vitest run).

Debug & Refine: If tests fail, analyze the error, modify the code, and repeat until all tests pass.

Mark Task Complete: Once the tests pass, mark the task as complete and move to the next frontend task.

4. E2E TESTING & FINAL VALIDATION
After all backend and frontend tasks are complete, verify the end-to-end functionality.

Write E2E Tests: Based on the overall acceptance criteria, write Playwright tests that simulate the full user journey.

Run E2E Tests: Execute the Playwright test suite against your local development environment.

Full-Stack Debugging: If E2E tests fail, debug the entire stack (frontend components, API services, Edge Functions, database policies) until all E2E tests pass.

5. PULL REQUEST & CLEANUP
Finalize the work and prepare it for human review.

Lint & Format: Run all linting and code formatting scripts to ensure code quality and consistency (npm run lint, npm run format).

Create Pull Request: Use the GitHub CLI (gh pr create) to open a new Pull Request against the main branch.

Title: The PR title must reference the issue number (e.g., "feat: Implement user profile page - Closes #$ISSUE_NUMBER").

Body: The PR body should be auto-generated with a summary of changes, linking back to the $EXECUTION_PLAN_PATH and the original GitHub Issue.

(Human-in-the-Loop Gate): The Pull Request is now ready for human review and merging. The agent's work on this issue is complete.







