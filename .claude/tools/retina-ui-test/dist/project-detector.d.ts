import { ProjectInfo } from './types';
export declare class ProjectDetector {
    private cwd;
    constructor(cwd?: string);
    detectProject(): Promise<ProjectInfo>;
    private detectFramework;
    private discoverPages;
    private getPagePatterns;
    private detectSrcDir;
    private determineRoutingPattern;
    private detectDevServer;
    private extractPortFromScript;
    private checkConfigFiles;
    private extractPortFromConfigFile;
    generatePageRoutes(pageFiles: string[], framework: ProjectInfo['framework']): Record<string, string>;
    private fileToRoute;
    private fileToPageName;
}
//# sourceMappingURL=project-detector.d.ts.map