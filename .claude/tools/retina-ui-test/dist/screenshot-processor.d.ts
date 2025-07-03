import { ScreenshotAnalysisData } from './types';
export declare class ScreenshotProcessor {
    prepareForAnalysis(screenshotPath: string): Promise<ScreenshotAnalysisData>;
    private findScreenshots;
    private processScreenshot;
    private parseFilename;
    private formatScenarioName;
    private formatBrowserName;
    private formatViewportName;
    private getMimeType;
    private generateSummary;
    generateAnalysisPrompts(screenshots: ScreenshotAnalysisData): string[];
    organizeByPage(screenshots: ScreenshotAnalysisData): Record<string, any[]>;
    compareWithBaseline(currentPath: string, baselinePath: string): Promise<{
        comparisons: Array<{
            scenario: string;
            current: string;
            baseline: string;
            hasChanges: boolean;
        }>;
        summary: {
            total: number;
            changed: number;
            unchanged: number;
        };
    }>;
    cleanupOldScreenshots(dirPath: string, maxAge?: number): Promise<void>;
    createThumbnails(screenshotPath: string, thumbnailPath: string): Promise<void>;
}
//# sourceMappingURL=screenshot-processor.d.ts.map