import { UXTestSuite, TestExecutionResult } from './types';
export declare class PlaywrightRunner {
    private browsers;
    private readonly defaultViewports;
    executeTestSuites(testSuites: UXTestSuite[], browsers?: string[], viewports?: string[]): Promise<TestExecutionResult[]>;
    private launchBrowsers;
    private closeBrowsers;
    private executeTestSuite;
    private executeScenario;
    private executeStep;
    private parseStepToAction;
    private extractSelector;
    private generateFieldSelector;
    private navigateStep;
    private clickStep;
    private fillStep;
    private waitStep;
    private expectStep;
    private smartWait;
    private takeScreenshot;
    private getViewport;
    private getUserAgent;
}
//# sourceMappingURL=playwright-runner.d.ts.map