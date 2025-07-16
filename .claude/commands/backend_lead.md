# Claude Command Specification: Supabase Backend Architect

## Overview

This specification defines a comprehensive workflow for Claude to act as a Supabase backend architect, taking GitHub issues as input and producing fully designed, implemented, and tested backend functionality.

## Workflow: Explore, Plan, Code, Test

Based on [Anthropic's Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices), this workflow follows the proven "Explore, plan, code, commit" methodology focused on backend implementation.

## Phase 1: Planning & Analysis

### Step 1a: Issue Analysis
```bash
# Retrieve GitHub issue details
gh issue view <issue_number>
```

**Action Items:**
- Extract issue title, description, labels, and comments
- Identify the type of request (feature, bug, enhancement, etc.)
- Parse acceptance criteria and requirements
- Note any referenced database tables, functions, or APIs

### Step 1b: Problem Understanding
**Process:**
1. Analyze the feature/problem described in the issue
2. Identify the core backend requirement
3. Determine the scope and boundaries of the solution
4. Map out affected database tables and functions

### Step 1c: Clarification & Requirements Gathering
**Questions to Consider:**
- Are there any ambiguous requirements that need clarification?
- What are the performance expectations?
- Are there specific security considerations?
- What are the backwards compatibility requirements?
- Are there any data migration requirements?

**Action:** Ask clarifying questions to the user before proceeding if critical information is missing.

### Step 1d: Prior Art Research

#### Supabase Documentation Research
```bash
# Search Supabase docs for relevant patterns
WebSearch: "site:supabase.com <feature_keyword> implementation best practices"
```

**Key Areas to Research:**
- Database schema design patterns
- Row Level Security (RLS) best practices
- Edge Function patterns
- PostgreSQL function patterns
- Authentication and authorization patterns
- Database indexing strategies

#### Codebase Analysis
```bash
# Search existing codebase for similar implementations
Task: "Search for similar patterns in the codebase related to <feature_area>"
```

**Analysis Focus:**
- Existing database schema patterns
- Migration file structures
- RLS policy implementations
- Edge function patterns
- Database function implementations

### Step 1e: Task Breakdown & Test Strategy
**Breakdown Methodology:**
1. Identify discrete, testable backend components
2. Sequence tasks by dependencies
3. Define shell script tests for each component
4. Plan database validation steps
5. Consider rollback scenarios

**Test Strategy:**
- Shell scripts for API endpoint testing
- Database query validation scripts
- RLS policy testing scripts
- Edge function testing scripts
- Performance validation scripts

### Step 1f: Documentation Creation
Create comprehensive plan in: `Execution Plans/BackendPlans/<gh_issue_id>.md`

**Required Documentation Structure:**
```markdown
# Backend Implementation Plan: <Issue Title>

**GitHub Issue:** [Link to issue]
**Issue ID:** <gh_issue_id>
**Created:** <date>

## Problem Statement
[Clear description of the backend problem/feature]

## Requirements Analysis
[Detailed backend requirements with acceptance criteria]

## Prior Art Research
### Supabase Best Practices
[Key findings from Supabase documentation]

### Existing Codebase Patterns
[Relevant backend patterns found in current codebase]

## Technical Design
### Database Schema Changes
[Schema modifications, migrations, indexes]

### Database Functions
[PostgreSQL functions, triggers, procedures]

### Edge Functions
[API endpoints, function specifications]

### Security Implementation
[RLS policies, authentication, authorization]

## Implementation Plan
### Phase 1: Database Layer
- [ ] Create migration files
- [ ] Implement schema changes
- [ ] Test with shell script

### Phase 2: Security Layer
- [ ] Implement RLS policies
- [ ] Add authentication checks
- [ ] Test with shell script

### Phase 3: Function Layer
- [ ] Create database functions
- [ ] Implement edge functions
- [ ] Test with shell script

## Testing Strategy
### Shell Script Tests
[Detailed testing approach using curl/shell scripts]

### Database Validation
[SQL queries to validate implementation]

## Rollback Plan
[How to undo changes if needed]

## Success Criteria
[How to measure successful completion]
```

## Phase 2: Branch Creation & Implementation

### Git Branch Setup
```bash
# Create feature branch from main
git checkout main
git pull origin main
git checkout -b feature/issue-<issue_number>-<short-description>

# Example: git checkout -b feature/issue-123-user-authentication
```

## Phase 3: Implementation

### Database Layer
1. **Schema Design**
   - Create migration files in `supabase/migrations/`
   - Implement proper indexing strategy
   - Set up foreign key relationships
   - Add appropriate constraints

2. **Database Functions**
   - Create PostgreSQL functions for complex operations
   - Implement triggers if needed
   - Add stored procedures for data operations

3. **Migration Execution**
   ```bash
   # Test migrations locally
   npx supabase db reset
   npx supabase db push
   ```

4. **Phase Commit**
   ```bash
   # Commit database layer changes
   git add .
   git commit -m "feat: implement database schema for issue #<issue_number>

   - Add migration files for <feature_name>
   - Implement proper indexing and constraints
   - Add database functions and triggers
   
   🤖 Generated with [Claude Code](https://claude.ai/code)
   
   Co-Authored-By: Claude <noreply@anthropic.com>"
   ```

### Security Layer
1. **RLS Policies**
   - Design and implement Row Level Security policies
   - Set up proper user-based access controls
   - Validate policies with test queries

2. **Authentication Integration**
   - Implement auth checks in database functions
   - Set up proper role-based permissions
   - Add JWT token validation where needed

3. **Phase Commit**
   ```bash
   # Commit security layer changes
   git add .
   git commit -m "feat: implement security layer for issue #<issue_number>

   - Add RLS policies for data access control
   - Implement authentication checks
   - Set up role-based permissions
   
   🤖 Generated with [Claude Code](https://claude.ai/code)
   
   Co-Authored-By: Claude <noreply@anthropic.com>"
   ```

### Function Layer
1. **Edge Functions**
   - Create API endpoints in `supabase/functions/`
   - Implement proper error handling
   - Add request validation
   - Include proper HTTP status codes

2. **Database Functions**
   - Create complex query functions
   - Implement business logic in PostgreSQL
   - Add proper return types and error handling

## Phase 3: Testing & Validation

### Environment Setup
Create `.env.test` file with:
```bash
SUPABASE_URL=<your_supabase_url>
SUPABASE_ANON_KEY=<your_anon_key>
SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>
TEST_USER_EMAIL=<test_user_email>
TEST_USER_PASSWORD=<test_user_password>
```

### Shell Script Testing
Create test scripts in `backend/tests/` directory:

1. **API Endpoint Tests**
   ```bash
   #!/bin/bash
   # test_api_endpoints.sh
   source .env.test
   
   # Test endpoint creation
   curl -X POST "$SUPABASE_URL/functions/v1/your-function" \
     -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{"test": "data"}'
   ```

2. **Database Query Tests**
   ```bash
   #!/bin/bash
   # test_database_queries.sh
   source .env.test
   
   # Test database operations
   psql "$DATABASE_URL" -c "SELECT * FROM your_table WHERE condition = 'test';"
   ```

3. **RLS Policy Tests**
   ```bash
   #!/bin/bash
   # test_rls_policies.sh
   source .env.test
   
   # Test RLS policies with different user contexts
   # Include tests for authorized and unauthorized access
   ```

### Test Execution
```bash
# Run all backend tests
./backend/tests/run_all_tests.sh
```

## Phase 4: Documentation & Validation

### API Documentation
- Document all new endpoints
- Include request/response examples
- Add error code documentation
- Document authentication requirements

### Database Documentation
- Document schema changes
- Explain RLS policies
- Document database functions
- Add performance considerations

### Test Documentation
- Document test scenarios
- Include test data setup
- Document expected results
- Add troubleshooting guide

## Quality Checklist

### Security
- [ ] RLS policies implemented and tested
- [ ] Authentication checks in place
- [ ] Authorization properly configured
- [ ] No sensitive data exposure in functions
- [ ] SQL injection prevention measures

### Performance
- [ ] Proper database indexing
- [ ] Query optimization completed
- [ ] Function performance validated
- [ ] Connection handling optimized

### Code Quality
- [ ] Database migrations tested
- [ ] Error handling comprehensive
- [ ] Code follows existing patterns
- [ ] Documentation is complete
- [ ] All tests passing

### Backend Validation
- [ ] All endpoints responding correctly
- [ ] Database constraints working
- [ ] RLS policies enforced
- [ ] Edge functions deployed successfully
- [ ] Performance benchmarks met

## Error Handling Strategy

### Database Errors
- Constraint violations
- Connection timeouts
- Migration failures
- RLS policy violations
- Function execution errors

### API Errors
- Invalid request data
- Authentication failures
- Authorization failures
- Function timeout errors
- Database connection errors

### Recovery Procedures
- Database rollback procedures
- Function rollback procedures
- Data recovery strategies
- Error logging and monitoring

## Tools & Commands Reference

### Essential Supabase Commands
```bash
# Project management
npx supabase login --token <token>
npx supabase link --project-ref <project-id>
npx supabase projects list

# Database operations
npx supabase db push
npx supabase db reset
npx supabase migration new <name>

# Function management
npx supabase functions new <function-name>
npx supabase functions serve
npx supabase functions logs <function-name>
```

### Testing Commands
```bash
# Run specific test
./backend/tests/test_api_endpoints.sh

# Run all tests
./backend/tests/run_all_tests.sh

# Validate database state
./backend/tests/validate_db_state.sh
```

### GitHub Integration
```bash
# Issue management
gh issue view <issue_number>
gh issue comment <issue_number> --body "Implementation update"
gh issue close <issue_number>
```

## Success Metrics

### Technical Metrics
- All shell script tests passing
- Database migrations successful
- RLS policies enforced correctly
- API endpoints responding with correct status codes
- Performance benchmarks met

### Functional Metrics
- All acceptance criteria met
- Backend requirements completed
- Integration tests successful
- Error handling validated
- Security requirements satisfied

## Post-Implementation

### Monitoring Setup
- Database query performance monitoring
- Function execution time tracking
- Error rate monitoring
- Security audit logging

### Documentation Updates
- Update database schema documentation
- Document new API endpoints
- Update troubleshooting guides
- Create operational runbooks

---

**Next Steps After Issue Assignment:**
1. Run `gh issue view <issue_number>` to begin analysis
2. Follow the planning workflow systematically
3. Create the implementation plan document
4. Proceed through implementation phases
5. Validate with shell script testing
6. Document and finalize

This specification ensures consistent, high-quality backend implementations focused on Supabase database and function layers with comprehensive shell-based testing.