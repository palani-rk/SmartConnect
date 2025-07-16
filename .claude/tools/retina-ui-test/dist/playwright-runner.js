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
exports.PlaywrightRunner = void 0;
const playwright_1 = require("playwright");
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
class PlaywrightRunner {
    browsers = new Map();
    defaultViewports = {
        desktop: { width: 1920, height: 1080 },
        tablet: { width: 768, height: 1024 },
        mobile: { width: 375, height: 667 }
    };
    async executeTestSuites(testSuites, browsers = ['chromium'], viewports = ['desktop']) {
        const results = [];
        const screenshotDir = path.join(process.cwd(), 'tests', 'ux-screenshots', 'current');
        // Ensure screenshot directory exists
        await fs.ensureDir(screenshotDir);
        try {
            // Launch browsers
            await this.launchBrowsers(browsers);
            // Execute tests for each browser and viewport combination
            for (const browserName of browsers) {
                const browser = this.browsers.get(browserName);
                if (!browser)
                    continue;
                for (const viewportName of viewports) {
                    const viewport = this.getViewport(viewportName);
                    for (const testSuite of testSuites) {
                        const suiteResults = await this.executeTestSuite(browser, testSuite, browserName, viewportName, viewport, screenshotDir);
                        results.push(...suiteResults);
                    }
                }
            }
        }
        finally {
            // Close all browsers
            await this.closeBrowsers();
        }
        return results;
    }
    async launchBrowsers(browserNames) {
        for (const browserName of browserNames) {
            let browser;
            switch (browserName.toLowerCase()) {
                case 'chromium':
                case 'chrome':
                    browser = await playwright_1.chromium.launch({
                        headless: true,
                        args: ['--no-sandbox', '--disable-dev-shm-usage']
                    });
                    break;
                case 'firefox':
                    browser = await playwright_1.firefox.launch({
                        headless: true
                    });
                    break;
                case 'webkit':
                case 'safari':
                    browser = await playwright_1.webkit.launch({
                        headless: true
                    });
                    break;
                default:
                    console.warn(`Unsupported browser: ${browserName}, using chromium`);
                    browser = await playwright_1.chromium.launch({
                        headless: true,
                        args: ['--no-sandbox', '--disable-dev-shm-usage']
                    });
            }
            this.browsers.set(browserName, browser);
        }
    }
    async closeBrowsers() {
        for (const [name, browser] of this.browsers) {
            try {
                await browser.close();
            }
            catch (error) {
                console.warn(`Error closing browser ${name}:`, error);
            }
        }
        this.browsers.clear();
    }
    async executeTestSuite(browser, testSuite, browserName, viewportName, viewport, screenshotDir) {
        const results = [];
        const context = await browser.newContext({
            viewport,
            userAgent: this.getUserAgent(browserName),
        });
        const page = await context.newPage();
        // Set up page error handling
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.error(`Console error on ${testSuite.pageName}:`, msg.text());
            }
        });
        page.on('pageerror', error => {
            console.error(`Page error on ${testSuite.pageName}:`, error);
        });
        try {
            for (const scenario of testSuite.scenarios) {
                const result = await this.executeScenario(page, testSuite, scenario, browserName, viewportName, screenshotDir);
                results.push(result);
            }
        }
        finally {
            await context.close();
        }
        return results;
    }
    async executeScenario(page, testSuite, scenario, browserName, viewportName, screenshotDir) {
        const startTime = Date.now();
        const timestamp = new Date().toISOString();
        try {
            // Set viewport if scenario specifies one
            if (scenario.viewport) {
                await page.setViewportSize(scenario.viewport);
            }
            // Execute each step
            for (const step of scenario.steps) {
                await this.executeStep(page, step, testSuite.pageUrl);
            }
            // Take final screenshot
            const screenshotPath = await this.takeScreenshot(page, screenshotDir, testSuite.pageName, scenario.id, browserName, viewportName);
            const executionTime = Date.now() - startTime;
            return {
                scenarioId: scenario.id,
                description: scenario.description,
                status: 'completed',
                screenshotPath,
                executionTime,
                timestamp,
                browser: browserName,
                viewport: viewportName,
            };
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            // Try to take screenshot even on failure
            let screenshotPath;
            try {
                screenshotPath = await this.takeScreenshot(page, screenshotDir, testSuite.pageName, scenario.id, browserName, viewportName, 'error');
            }
            catch (screenshotError) {
                console.warn('Could not take error screenshot:', screenshotError);
            }
            return {
                scenarioId: scenario.id,
                description: scenario.description,
                status: 'failed',
                screenshotPath,
                executionTime,
                error: errorMessage,
                timestamp,
                browser: browserName,
                viewport: viewportName,
            };
        }
    }
    async executeStep(page, step, baseUrl) {
        const action = this.parseStepToAction(step, baseUrl);
        switch (action.type) {
            case 'navigate':
                await this.navigateStep(page, action);
                break;
            case 'click':
                await this.clickStep(page, action);
                break;
            case 'fill':
                await this.fillStep(page, action);
                break;
            case 'wait':
                await this.waitStep(page, action);
                break;
            case 'screenshot':
                // Screenshots are handled at the scenario level
                break;
            case 'expect':
                await this.expectStep(page, action);
                break;
            default:
                console.warn(`Unknown step type: ${action.type} for step: ${step}`);
        }
    }
    parseStepToAction(step, baseUrl) {
        const lowerStep = step.toLowerCase();
        // Navigate actions
        if (lowerStep.includes('navigate to')) {
            const urlMatch = step.match(/navigate to (.+)/i);
            const url = urlMatch?.[1] || '/';
            return {
                type: 'navigate',
                target: url.startsWith('http') ? url : `${baseUrl}${url}`,
                timeout: 30000
            };
        }
        // Click actions
        if (lowerStep.includes('click')) {
            const selector = this.extractSelector(step);
            return {
                type: 'click',
                selector,
                timeout: 10000
            };
        }
        // Fill actions
        if (lowerStep.includes('fill') && lowerStep.includes('with')) {
            const parts = step.match(/fill (.+?) with (.+)/i);
            const fieldName = parts?.[1] || '';
            const value = parts?.[2] || '';
            const selector = this.generateFieldSelector(fieldName);
            return {
                type: 'fill',
                selector,
                value,
                timeout: 5000
            };
        }
        // Wait actions
        if (lowerStep.includes('wait for')) {
            if (lowerStep.includes('page to load')) {
                return { type: 'wait', target: 'load', timeout: 30000 };
            }
            if (lowerStep.includes('network')) {
                return { type: 'wait', target: 'networkidle', timeout: 30000 };
            }
            const elementMatch = step.match(/wait for (.+?) to/i);
            if (elementMatch) {
                return {
                    type: 'wait',
                    selector: this.extractSelector(elementMatch[1]),
                    timeout: 10000
                };
            }
        }
        // Screenshot actions
        if (lowerStep.includes('screenshot') || lowerStep.includes('take screenshot')) {
            return { type: 'screenshot' };
        }
        // Expect/Check actions
        if (lowerStep.includes('check') || lowerStep.includes('verify')) {
            const selector = this.extractSelector(step);
            return {
                type: 'expect',
                selector,
                timeout: 5000
            };
        }
        // Default to wait
        return { type: 'wait', target: 'networkidle', timeout: 5000 };
    }
    extractSelector(description) {
        const lowerDesc = description.toLowerCase();
        // Common UI element mappings with multiple selector strategies
        const selectorMap = {
            // Buttons
            'submit button': [
                'button[type="submit"]',
                '[data-testid*="submit"]',
                'button:has-text("submit")',
                'input[type="submit"]'
            ],
            'login button': [
                '[data-testid*="login"]',
                'button:has-text("login")',
                'button:has-text("sign in")',
                '[type="submit"]'
            ],
            'primary button': [
                '[data-testid*="primary"]',
                'button.primary',
                'button.btn-primary',
                '.primary-button'
            ],
            // Forms
            'email field': [
                '[data-testid*="email"]',
                '[name="email"]',
                '[type="email"]',
                'input[placeholder*="email" i]'
            ],
            'password field': [
                '[data-testid*="password"]',
                '[name="password"]',
                '[type="password"]',
                'input[placeholder*="password" i]'
            ],
            'username field': [
                '[data-testid*="username"]',
                '[name="username"]',
                'input[placeholder*="username" i]'
            ],
            // Navigation
            'navigation menu': [
                '[data-testid*="nav"]',
                'nav',
                '.navigation',
                '.navbar',
                '.nav-menu'
            ],
            'mobile menu toggle': [
                '[data-testid*="menu-toggle"]',
                '.menu-toggle',
                '.hamburger',
                'button[aria-label*="menu" i]'
            ],
            // Content areas
            'main content': [
                'main',
                '[role="main"]',
                '.main-content',
                '#main'
            ],
            'hero section': [
                '[data-testid*="hero"]',
                '.hero',
                '.hero-section',
                '.banner'
            ]
        };
        // Try to find a match in our selector map
        for (const [key, selectors] of Object.entries(selectorMap)) {
            if (lowerDesc.includes(key)) {
                return selectors.join(', ');
            }
        }
        // Extract quoted text as selector
        const quotedMatch = description.match(/"([^"]+)"/);
        if (quotedMatch) {
            const text = quotedMatch[1];
            return `text="${text}", [aria-label*="${text}" i], [title*="${text}" i]`;
        }
        // Generic selector based on common patterns
        if (lowerDesc.includes('button')) {
            return 'button, [role="button"], input[type="button"], input[type="submit"]';
        }
        if (lowerDesc.includes('link')) {
            return 'a, [role="link"]';
        }
        if (lowerDesc.includes('form')) {
            return 'form, [role="form"]';
        }
        if (lowerDesc.includes('input') || lowerDesc.includes('field')) {
            return 'input, textarea, select, [role="textbox"]';
        }
        // Fallback: use the description as text selector
        return `text="${description}", [aria-label*="${description}" i]`;
    }
    generateFieldSelector(fieldName) {
        const lowerField = fieldName.toLowerCase();
        const fieldSelectors = {
            'email': [
                '[data-testid*="email"]',
                '[name="email"]',
                '[type="email"]',
                'input[placeholder*="email" i]'
            ],
            'password': [
                '[data-testid*="password"]',
                '[name="password"]',
                '[type="password"]',
                'input[placeholder*="password" i]'
            ],
            'username': [
                '[data-testid*="username"]',
                '[name="username"]',
                'input[placeholder*="username" i]'
            ],
            'first name': [
                '[name="firstName"]',
                '[name="first_name"]',
                'input[placeholder*="first name" i]'
            ],
            'last name': [
                '[name="lastName"]',
                '[name="last_name"]',
                'input[placeholder*="last name" i]'
            ]
        };
        for (const [key, selectors] of Object.entries(fieldSelectors)) {
            if (lowerField.includes(key)) {
                return selectors.join(', ');
            }
        }
        // Generic field selector
        return `[name*="${fieldName}" i], [placeholder*="${fieldName}" i], [data-testid*="${fieldName}" i]`;
    }
    async navigateStep(page, action) {
        if (!action.target)
            return;
        await page.goto(action.target, {
            waitUntil: 'networkidle',
            timeout: action.timeout || 30000
        });
        // Additional wait for SPA frameworks
        await this.smartWait(page);
    }
    async clickStep(page, action) {
        if (!action.selector)
            return;
        const element = page.locator(action.selector).first();
        await element.waitFor({ timeout: action.timeout || 10000 });
        await element.click();
        // Wait for potential navigation or state changes
        await page.waitForTimeout(1000);
    }
    async fillStep(page, action) {
        if (!action.selector || !action.value)
            return;
        const element = page.locator(action.selector).first();
        await element.waitFor({ timeout: action.timeout || 5000 });
        await element.fill(action.value);
    }
    async waitStep(page, action) {
        if (action.target === 'load') {
            await page.waitForLoadState('load', { timeout: action.timeout });
        }
        else if (action.target === 'networkidle') {
            await page.waitForLoadState('networkidle', { timeout: action.timeout });
        }
        else if (action.selector) {
            await page.locator(action.selector).waitFor({ timeout: action.timeout });
        }
        await this.smartWait(page);
    }
    async expectStep(page, action) {
        if (!action.selector)
            return;
        const element = page.locator(action.selector).first();
        await element.waitFor({ timeout: action.timeout || 5000 });
    }
    async smartWait(page) {
        try {
            // Wait for network to be idle
            await page.waitForLoadState('networkidle', { timeout: 5000 });
            // Wait for animations to complete
            await page.waitForFunction(() => {
                const elements = document.querySelectorAll('*');
                for (const el of elements) {
                    const styles = window.getComputedStyle(el);
                    if (styles.animationPlayState === 'running' ||
                        styles.transitionProperty !== 'none') {
                        return false;
                    }
                }
                return true;
            }, { timeout: 5000 }).catch(() => {
                // Ignore timeout, animations might be ongoing
            });
            // Wait for React/Vue/Angular to be ready
            await page.waitForFunction(() => {
                // React
                if (typeof window !== 'undefined' && window.React) {
                    return true;
                }
                // Vue
                if (typeof window !== 'undefined' && window.Vue) {
                    return true;
                }
                // Angular
                if (document.querySelector('[ng-version]')) {
                    return true;
                }
                // Generic check for data-reactroot or similar
                if (document.querySelector('[data-reactroot], [data-vue-app], [ng-version]')) {
                    return true;
                }
                return true; // Continue if no framework detected
            }, { timeout: 3000 }).catch(() => {
                // Framework detection is optional
            });
        }
        catch (error) {
            // Smart wait is best effort, don't fail the test
            console.warn('Smart wait failed:', error);
        }
    }
    async takeScreenshot(page, screenshotDir, pageName, scenarioId, browserName, viewportName, suffix = '') {
        const filename = `${pageName}_${scenarioId}_${browserName}_${viewportName}${suffix ? `_${suffix}` : ''}.png`;
        const screenshotPath = path.join(screenshotDir, filename);
        await page.screenshot({
            path: screenshotPath,
            fullPage: true,
            quality: 90
        });
        return screenshotPath;
    }
    getViewport(viewportName) {
        return this.defaultViewports[viewportName] ||
            this.defaultViewports.desktop;
    }
    getUserAgent(browserName) {
        const userAgents = {
            chromium: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
            webkit: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
        };
        return userAgents[browserName] || userAgents.chromium;
    }
}
exports.PlaywrightRunner = PlaywrightRunner;
//# sourceMappingURL=playwright-runner.js.map