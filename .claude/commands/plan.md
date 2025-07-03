# /plan - Generate Pseudocode and Implementation Plan

## Purpose
Generate detailed pseudocode and implementation plans for new features or functionality.

## Usage
```
/plan <feature_description>
```

## Instructions for Claude
When the `/plan` command is used, you should:

1. **Analyze the Feature Request**
   - Break down the feature into core components
   - Identify affected systems (frontend, backend, database)
   - Consider dependencies and integration points

2. **Generate Pseudocode**
   - Create high-level algorithmic flow
   - Use clear, language-agnostic pseudocode
   - Include error handling considerations
   - Show data flow and transformations

3. **Create Implementation Plan**
   - List specific files that need to be created/modified
   - Define the order of implementation steps
   - Identify required database schema changes
   - Specify API endpoints needed
   - Note testing requirements
   - Consider edge cases and validation

4. **Output Format**
   Structure your response as:
   ```markdown
   # Feature: [Feature Name]
   
   ## Overview
   [Brief description of what the feature does]
   
   ## Architecture Impact
   - Frontend: [changes needed]
   - Backend: [changes needed]  
   - Database: [schema changes]
   
   ## Pseudocode
   ```
   [High-level algorithmic flow]
   ```
   
   ## Implementation Plan
   ### Phase 1: [Phase name]
   - [ ] Task 1
   - [ ] Task 2
   
   ### Phase 2: [Phase name]
   - [ ] Task 1
   - [ ] Task 2
   
   ## Files to Create/Modify
   - `path/to/file.ts` - [purpose]
   - `path/to/component.tsx` - [purpose]
   
   ## Testing Strategy
   - Unit tests: [what to test]
   - Integration tests: [what to test]
   - E2E tests: [what to test]
   
   ## Considerations
   - Security: [security implications]
   - Performance: [performance considerations]
   - Scalability: [scalability factors]
   ```

5. **Context Awareness**
   - Reference existing codebase structure
   - Follow established patterns and conventions
   - Consider current tech stack (React, TypeScript, Supabase, MUI)
   - Align with existing authentication and routing patterns

## Example Usage
```
/plan user role management system
```

This would generate a comprehensive plan for implementing user role management, including pseudocode for role assignment algorithms and detailed implementation steps.