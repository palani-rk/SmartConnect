// Core TypeScript interfaces for Retina UI Testing

export interface UXTestScenario {
  id: string;
  description: string;
  steps: string[];
  expected: string;
  viewport?: { width: number; height: number };
  waitConditions?: string[];
}

export interface UXTestSuite {
  pageName: string;
  pageUrl: string;
  scenarios: UXTestScenario[];
}

export interface TestExecutionResult {
  scenarioId: string;
  description: string;
  status: 'completed' | 'failed' | 'skipped';
  screenshotPath?: string;
  executionTime: number;
  error?: string;
  timestamp: string;
  browser?: string;
  viewport?: string;
}

export interface UXTestConfig {
  baseUrl: string;
  browsers: string[];
  viewports: Array<{ name: string; width: number; height: number }>;
  timeout: number;
  screenshotOptions: {
    fullPage: boolean;
    quality?: number;
  };
}

export interface ProjectInfo {
  framework: 'react' | 'vue' | 'angular' | 'nextjs' | 'vanilla';
  srcDir: string;
  pageFiles: string[];
  routingPattern: 'file-based' | 'component-based';
  devServer: { port: number; command: string };
  baseUrl: string;
}

export interface ScreenshotAnalysisData {
  screenshots: Array<{
    path: string;
    scenario: string;
    browser: string;
    viewport: string;
    base64: string;
  }>;
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
  };
}

export interface StepAction {
  type: 'navigate' | 'click' | 'fill' | 'wait' | 'screenshot' | 'expect';
  target?: string;
  value?: string;
  timeout?: number;
  selector?: string;
}

export interface MCPToolRequest {
  pages?: string[];
  baseUrl?: string;
  browsers?: string[];
  viewports?: string[];
  config?: Partial<UXTestConfig>;
}

export interface MCPToolResponse {
  success: boolean;
  message: string;
  data?: any;
  screenshots?: ScreenshotAnalysisData;
  results?: TestExecutionResult[];
}