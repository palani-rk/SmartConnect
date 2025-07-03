"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScreenshotProcessor = void 0;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const glob_1 = require("glob");
class ScreenshotProcessor {
    async prepareForAnalysis(screenshotPath) {
        const fullPath = path.resolve(screenshotPath);
        if (!fs.existsSync(fullPath)) {
            throw new Error(`Screenshot directory not found: ${fullPath}`);
        }
        // Find all screenshot files
        const screenshotFiles = await this.findScreenshots(fullPath);
        if (screenshotFiles.length === 0) {
            throw new Error(`No screenshots found in: ${fullPath}`);
        }
        // Process each screenshot
        const screenshots = await Promise.all(screenshotFiles.map(file => this.processScreenshot(file)));
        // Generate summary
        const summary = this.generateSummary(screenshots);
        return {
            screenshots: screenshots.filter(s => s !== null),
            summary
        };
    }
    async findScreenshots(dirPath) {
        try {
            const patterns = [
                '**/*.png',
                '**/*.jpg',
                '**/*.jpeg',
                '**/*.webp'
            ];
            const files = [];
            for (const pattern of patterns) {
                const matches = await (0, glob_1.glob)(pattern, {
                    cwd: dirPath,
                    absolute: true
                });
                files.push(...matches);
            }
            // Sort files by modification time (newest first)
            const filesWithStats = await Promise.all(files.map(async (file) => ({
                file,
                mtime: (await fs.stat(file)).mtime
            })));
            return filesWithStats
                .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
                .map(item => item.file);
        }
        catch (error) {
            console.warn('Error finding screenshots:', error);
            return [];
        }
    }
    async processScreenshot(filePath) {
        try {
            // Parse filename to extract metadata
            const filename = path.basename(filePath, path.extname(filePath));
            const metadata = this.parseFilename(filename);
            // Read and encode image as base64
            const imageBuffer = await fs.readFile(filePath);
            const base64 = imageBuffer.toString('base64');
            const mimeType = this.getMimeType(filePath);
            const base64WithPrefix = `data:${mimeType};base64,${base64}`;
            return {
                path: filePath,
                scenario: metadata.scenario,
                browser: metadata.browser,
                viewport: metadata.viewport,
                base64: base64WithPrefix
            };
        }
        catch (error) {
            console.warn(`Error processing screenshot ${filePath}:`, error);
            return null;
        }
    }
    parseFilename(filename) {
        // Expected format: PageName_scenario-id_browser_viewport[_error]
        // Example: HomePage_homepage-loading-basic_chromium_desktop.png
        const parts = filename.split('_');
        if (parts.length >= 4) {
            return {
                scenario: this.formatScenarioName(parts[0], parts[1]),
                browser: this.formatBrowserName(parts[2]),
                viewport: this.formatViewportName(parts[3])
            };
        }
        // Fallback parsing
        return {
            scenario: parts[0] || 'Unknown Scenario',
            browser: parts[parts.length - 2] || 'chromium',
            viewport: parts[parts.length - 1] || 'desktop'
        };
    }
    formatScenarioName(pageName, scenarioId) {
        // Convert from "HomePage_homepage-loading-basic" to "HomePage: Page Loading"
        const parts = scenarioId.split('-');
        // Remove page name prefix if present
        if (parts[0] && parts[0].toLowerCase() === pageName.toLowerCase()) {
            parts.shift();
        }
        // Convert kebab-case to Title Case
        const formatted = parts
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
        return `${pageName}: ${formatted}`;
    }
    formatBrowserName(browser) {
        const browserMap = {
            'chromium': 'Chrome',
            'chrome': 'Chrome',
            'firefox': 'Firefox',
            'webkit': 'Safari',
            'safari': 'Safari'
        };
        return browserMap[browser.toLowerCase()] || browser;
    }
    formatViewportName(viewport) {
        const viewportMap = {
            'desktop': 'Desktop (1920x1080)',
            'tablet': 'Tablet (768x1024)',
            'mobile': 'Mobile (375x667)'
        };
        return viewportMap[viewport.toLowerCase()] || viewport;
    }
    getMimeType(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.webp': 'image/webp'
        };
        return mimeTypes[ext] || 'image/png';
    }
    generateSummary(screenshots) {
        const totalTests = screenshots.length;
        // Determine pass/fail from filename (contains '_error' for failures)
        const failed = screenshots.filter(s => s.path.includes('_error') || s.path.includes('_failed')).length;
        const passed = totalTests - failed;
        return {
            totalTests,
            passed,
            failed,
            skipped: 0
        };
    }
    // Generate analysis prompts for Claude Code
    generateAnalysisPrompts(screenshots) {
        const prompts = [];
        // Overall analysis prompt
        prompts.push(`I've captured ${screenshots.summary.totalTests} UX test screenshots. ` +
            `Please analyze each screenshot for:\n\n` +
            `• Complete page loading and rendering\n` +
            `• Visual errors, broken layouts, or missing elements\n` +
            `• Professional UI/UX quality and design consistency\n` +
            `• Interactive element visibility and accessibility\n` +
            `• Responsive design functionality\n` +
            `• Overall user experience quality\n\n` +
            `For each screenshot, provide a PASS/FAIL assessment with specific reasoning.`);
        // Individual screenshot prompts
        screenshots.screenshots.forEach((screenshot, index) => {
            prompts.push(`Screenshot ${index + 1}: ${screenshot.scenario}\n` +
                `Browser: ${screenshot.browser}, Viewport: ${screenshot.viewport}\n` +
                `Please analyze this screenshot and provide detailed feedback on the UX quality.`);
        });
        return prompts;
    }
    // Organize screenshots by page for better analysis
    organizeByPage(screenshots) {
        const organized = {};
        screenshots.screenshots.forEach(screenshot => {
            const pageName = screenshot.scenario.split(':')[0] || 'Unknown';
            if (!organized[pageName]) {
                organized[pageName] = [];
            }
            organized[pageName].push(screenshot);
        });
        return organized;
    }
    // Generate comparison data for baseline screenshots
    async compareWithBaseline(currentPath, baselinePath) {
        const currentScreenshots = await this.findScreenshots(currentPath);
        const baselineScreenshots = await this.findScreenshots(baselinePath);
        const comparisons = [];
        let changed = 0;
        for (const currentFile of currentScreenshots) {
            const currentName = path.basename(currentFile);
            const baselineFile = baselineScreenshots.find(baseline => path.basename(baseline) === currentName);
            if (baselineFile) {
                // Simple file size comparison (could be enhanced with image diff)
                const currentStats = await fs.stat(currentFile);
                const baselineStats = await fs.stat(baselineFile);
                const hasChanges = Math.abs(currentStats.size - baselineStats.size) > 1024; // 1KB threshold
                if (hasChanges)
                    changed++;
                comparisons.push({
                    scenario: this.parseFilename(path.basename(currentFile, path.extname(currentFile))).scenario,
                    current: currentFile,
                    baseline: baselineFile,
                    hasChanges
                });
            }
        }
        return {
            comparisons,
            summary: {
                total: comparisons.length,
                changed,
                unchanged: comparisons.length - changed
            }
        };
    }
    // Clean up old screenshots
    async cleanupOldScreenshots(dirPath, maxAge = 7) {
        try {
            const files = await this.findScreenshots(dirPath);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - maxAge);
            for (const file of files) {
                const stats = await fs.stat(file);
                if (stats.mtime < cutoffDate) {
                    await fs.remove(file);
                }
            }
        }
        catch (error) {
            console.warn('Error cleaning up screenshots:', error);
        }
    }
    // Create thumbnail versions for reports
    async createThumbnails(screenshotPath, thumbnailPath) {
        // This would use sharp or similar library to create thumbnails
        // For now, just copy the originals
        try {
            await fs.copy(screenshotPath, thumbnailPath);
        }
        catch (error) {
            console.warn('Error creating thumbnails:', error);
        }
    }
}
exports.ScreenshotProcessor = ScreenshotProcessor;
//# sourceMappingURL=screenshot-processor.js.map