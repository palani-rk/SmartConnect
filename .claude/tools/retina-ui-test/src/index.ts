#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import { ProjectDetector } from './project-detector.js';
import { TestGenerator } from './test-generator.js';
import { PlaywrightRunner } from './playwright-runner.js';
import { ScreenshotProcessor } from './screenshot-processor.js';
import { MCPToolRequest, MCPToolResponse } from './types.js';

class RetinaUITestMCPServer {
  private server: Server;
  private projectDetector: ProjectDetector;
  private testGenerator: TestGenerator;
  private playwrightRunner: PlaywrightRunner;
  private screenshotProcessor: ScreenshotProcessor;

  constructor() {
    this.server = new Server(
      {
        name: 'retina-ui-test-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.projectDetector = new ProjectDetector();
    this.testGenerator = new TestGenerator();
    this.playwrightRunner = new PlaywrightRunner();
    this.screenshotProcessor = new ScreenshotProcessor();

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'execute_ux_tests',
            description: 'Execute UX tests for specified pages with comprehensive scenario generation',
            inputSchema: {
              type: 'object',
              properties: {
                pages: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of page names to test (e.g., ["HomePage", "LoginPage"])',
                },
                baseUrl: {
                  type: 'string',
                  description: 'Base URL for the application (default: auto-detected)',
                },
                browsers: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Browsers to test on (default: ["chromium"])',
                },
                viewports: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Viewports to test (default: ["desktop"])',
                },
              },
              required: [],
            },
          },
          {
            name: 'analyze_screenshots',
            description: 'Process and prepare screenshots for Claude Code analysis',
            inputSchema: {
              type: 'object',
              properties: {
                screenshotPath: {
                  type: 'string',
                  description: 'Path to screenshots directory (default: tests/ux-screenshots/current)',
                },
              },
              required: [],
            },
          },
          {
            name: 'generate_test_report',
            description: 'Generate comprehensive HTML test report',
            inputSchema: {
              type: 'object',
              properties: {
                outputPath: {
                  type: 'string',
                  description: 'Output path for the report (default: tests/reports/ux-report.html)',
                },
              },
              required: [],
            },
          },
          {
            name: 'setup_baseline',
            description: 'Save current screenshots as baseline for future comparisons',
            inputSchema: {
              type: 'object',
              properties: {
                pages: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Pages to capture baseline for',
                },
              },
              required: [],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'execute_ux_tests':
            return await this.executeUXTests(args as MCPToolRequest);
          
          case 'analyze_screenshots':
            return await this.analyzeScreenshots(args as MCPToolRequest);
          
          case 'generate_test_report':
            return await this.generateTestReport(args as MCPToolRequest);
          
          case 'setup_baseline':
            return await this.setupBaseline(args as MCPToolRequest);
          
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });
  }

  private async executeUXTests(request: MCPToolRequest): Promise<MCPToolResponse> {
    try {
      // 1. Detect project information
      const projectInfo = await this.projectDetector.detectProject();
      
      // 2. Determine pages to test
      const pagesToTest = request.pages || Object.keys(
        this.projectDetector.generatePageRoutes(projectInfo.pageFiles, projectInfo.framework)
      );
      
      if (pagesToTest.length === 0) {
        return {
          success: false,
          message: 'No pages found to test. Please specify pages or ensure your project has discoverable pages.',
        };
      }

      // 3. Generate test scenarios for each page
      const pageRoutes = this.projectDetector.generatePageRoutes(projectInfo.pageFiles, projectInfo.framework);
      const testSuites = await this.testGenerator.generateTestSuites(
        pagesToTest,
        pageRoutes,
        request.baseUrl || projectInfo.baseUrl,
        projectInfo.framework
      );

      // 4. Execute tests with Playwright
      const browsers = request.browsers || ['chromium'];
      const viewports = request.viewports || ['desktop'];
      
      const results = await this.playwrightRunner.executeTestSuites(
        testSuites,
        browsers,
        viewports
      );

      // 5. Process screenshots for analysis
      const screenshots = await this.screenshotProcessor.prepareForAnalysis(
        'tests/ux-screenshots/current'
      );

      return {
        success: true,
        message: `Successfully executed ${results.length} test scenarios across ${browsers.length} browsers and ${viewports.length} viewports`,
        data: {
          projectInfo,
          testSuites,
          totalScenarios: results.length,
          browsers,
          viewports,
        },
        results,
        screenshots,
      };
    } catch (error) {
      return {
        success: false,
        message: `Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async analyzeScreenshots(request: MCPToolRequest): Promise<MCPToolResponse> {
    try {
      const screenshotPath = request.screenshotPath || 'tests/ux-screenshots/current';
      const screenshots = await this.screenshotProcessor.prepareForAnalysis(screenshotPath);

      return {
        success: true,
        message: `Prepared ${screenshots.screenshots.length} screenshots for analysis`,
        screenshots,
      };
    } catch (error) {
      return {
        success: false,
        message: `Screenshot analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async generateTestReport(request: MCPToolRequest): Promise<MCPToolResponse> {
    try {
      const outputPath = request.outputPath || 'tests/reports/ux-report.html';
      
      // This would generate an HTML report
      // For now, return a placeholder response
      return {
        success: true,
        message: `Test report would be generated at: ${outputPath}`,
        data: { reportPath: outputPath },
      };
    } catch (error) {
      return {
        success: false,
        message: `Report generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async setupBaseline(request: MCPToolRequest): Promise<MCPToolResponse> {
    try {
      const pages = request.pages || [];
      
      // This would capture and save baseline screenshots
      // For now, return a placeholder response
      return {
        success: true,
        message: `Baseline screenshots would be saved for ${pages.length} pages`,
        data: { pages },
      };
    } catch (error) {
      return {
        success: false,
        message: `Baseline setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Retina UI Test MCP server running on stdio');
  }
}

const server = new RetinaUITestMCPServer();
server.run().catch(console.error);