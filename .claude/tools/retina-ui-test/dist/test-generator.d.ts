import { UXTestSuite, ProjectInfo } from './types';
export declare class TestGenerator {
    generateTestSuites(pageNames: string[], pageRoutes: Record<string, string>, baseUrl: string, framework: ProjectInfo['framework']): Promise<UXTestSuite[]>;
    private generatePageScenarios;
    private generateLoadingScenarios;
    private generateInteractionScenarios;
    private generateFormScenarios;
    private generateNavigationScenarios;
    private generateResponsiveScenarios;
    private generatePageSpecificScenarios;
    private isFormPage;
    private generateFrameworkSpecificScenarios;
}
//# sourceMappingURL=test-generator.d.ts.map