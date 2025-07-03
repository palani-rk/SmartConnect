# Playwright MCP Server Configuration for SmartConnect

## Overview
This document records the setup and configuration of the Playwright MCP (Model Context Protocol) server for end-to-end testing in the SmartConnect multi-tenant collaboration platform.

## Setup Actions Performed

### 1. Project Analysis
**Status**: ✅ Completed  
**Date**: 2025-06-29

- Analyzed existing project structure: React 19 + TypeScript + MUI + Vite
- Identified current testing setup: Vitest + React Testing Library + MSW
- Confirmed multi-tenant architecture with organization/user management features

### 2. Playwright Installation
**Status**: ✅ Completed  
**Date**: 2025-06-29

#### Dependencies Installed
```bash
cd frontendapp
npm install -D @playwright/test playwright
```

**Result**: Added to `devDependencies`:
- `@playwright/test`: ^1.53.1
- `playwright`: ^1.53.1

#### Browser Installation
```bash
npx playwright install
```

**Result**: Downloaded browser binaries:
- Chromium 138.0.7204.23
- Firefox 139.0
- Webkit 18.5
- FFMPEG support

**Note**: System dependencies warning appeared but can be resolved with:
```bash
sudo apt-get install libnspr4 libnss3 libasound2t64
```

### 3. MCP Server Configuration
**Status**: ✅ Completed  
**Date**: 2025-06-29

#### ⚠️ Configuration Update (2025-06-29)
**Issue**: Local `.claude/mcp.json` file was created but Claude Code uses global MCP server configuration.

**Solution**: Used Claude Code CLI to register the MCP server globally:
```bash
claude mcp add playwright 'npx @playwright/mcp@latest'
```

**Verification**: 
```bash
claude mcp list
# Output:
# supabase: npx -y @supabase/mcp-server-supabase@latest --read-only --project-ref=axmikjtbiddtmdepaqhr
# playwright: npx @playwright/mcp@latest
```

#### ~~Created MCP Configuration~~ (Deprecated)
~~**File**: `.claude/mcp.json`~~ (Not used by Claude Code)
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"],
      "env": {
        "PLAYWRIGHT_BROWSERS_PATH": "./browsers",
        "PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD": "false"
      }
    }
  }
}
```

**Note**: The local `.claude/mcp.json` file remains for documentation purposes but is not used by Claude Code.

#### Playwright Configuration
**File**: `frontendapp/playwright.config.ts`

**Key Settings**:
- Test directory: `./src/test/e2e`
- Base URL: `http://localhost:3001` (matches Vite dev server)
- Browsers: Chromium, Firefox, Webkit
- Reporters: HTML (with line option available)
- Web server integration: Automatically starts `npm run dev`

### 4. Project Structure Updates
**Status**: ✅ Completed  
**Date**: 2025-06-29

#### Created Directories
```
frontendapp/src/test/e2e/          # E2E test directory
Execution Plans/playwright/        # Documentation directory
```

#### Updated package.json Scripts
Added E2E testing scripts:
```json
{
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "test:e2e:debug": "playwright test --debug",
  "test:e2e:report": "playwright show-report"
}
```

#### Example Test File
**File**: `frontendapp/src/test/e2e/example.spec.ts`
- Basic navigation test to verify setup
- Placeholder for MCP-driven testing

### 5. Development Server Configuration
**Status**: ✅ Completed  
**Date**: 2025-06-29

**Issue Resolved**: Vite dev server runs on port 3001 (not default 5173)
**Solution**: Updated Playwright config to match actual server port

## Usage Guide

### Traditional Playwright Testing
```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug

# View reports
npm run test:e2e:report
```

### MCP-Driven Testing (Primary Method)
With MCP configured, you can now use natural language commands through Claude:

#### Example Commands
- **"Test the login flow for an admin user"**
- **"Navigate to the organization management page and take a screenshot"**
- **"Fill out the user creation form and verify the user appears in the list"**
- **"Test responsive design on mobile viewport"**

#### MCP Advantages
1. **Natural Language**: No need to write test specifications
2. **AI-Driven**: Claude can infer test steps from user stories
3. **Interactive**: Real-time debugging and exploration
4. **Visual**: Automatic screenshots and accessibility checks
5. **Cross-Browser**: Easy browser switching via commands

## Integration with Existing Testing

### Current Testing Strategy
- **Unit Tests**: Vitest for component logic
- **Integration Tests**: Vitest + MSW for API interactions  
- **E2E Tests**: Playwright MCP for user journeys

### Recommended Workflow
1. **Development**: Use MCP for exploratory testing
2. **Critical Paths**: Convert successful MCP sessions to traditional specs
3. **CI/CD**: Run traditional specs for regression testing
4. **Bug Investigation**: Use MCP for interactive debugging

## Project-Specific Testing Areas

### Authentication & Authorization
- God user vs Org admin vs Org user permissions
- Login/logout flows
- Role-based access control

### Organization Management  
- CRUD operations for organizations
- User assignment and role management
- Multi-tenant data isolation

### User Interface
- MUI component interactions
- Responsive design validation
- Form submissions and validation
- Error handling and loading states

## Next Steps

### System Dependencies (Optional)
If you encounter browser issues, install system dependencies:
```bash
sudo apt-get install libnspr4 libnss3 libasound2t64
```

### Data Test Setup
Consider integrating with existing Supabase test utilities for consistent test data.

### CI/CD Integration
Add E2E testing to your deployment pipeline once critical test paths are established.

## Troubleshooting

### Common Issues
1. **Port conflicts**: Vite may use different ports - update playwright.config.ts accordingly
2. **Browser dependencies**: Install system packages if browsers fail to launch
3. **MCP connection**: Use `claude mcp list` to verify server is registered globally
4. **MCP server not appearing**: Use `claude mcp add playwright 'npx @playwright/mcp@latest'` to register

### File Locations
- MCP Config: Global (managed by `claude mcp` commands)
- Local MCP Config: `.claude/mcp.json` (deprecated, not used by Claude Code)
- Playwright Config: `frontendapp/playwright.config.ts`
- Test Directory: `frontendapp/src/test/e2e/`
- Documentation: `Execution Plans/playwright/`

---

**Setup Completed**: 2025-06-29  
**Status**: Ready for MCP-driven E2E testing  
**Next Action**: Begin testing user flows through natural language commands with Claude