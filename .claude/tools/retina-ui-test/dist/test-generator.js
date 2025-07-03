"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestGenerator = void 0;
class TestGenerator {
    async generateTestSuites(pageNames, pageRoutes, baseUrl, framework) {
        const testSuites = [];
        for (const pageName of pageNames) {
            const pageUrl = pageRoutes[pageName];
            if (!pageUrl) {
                console.warn(`No route found for page: ${pageName}`);
                continue;
            }
            const scenarios = this.generatePageScenarios(pageName, pageUrl, framework);
            testSuites.push({
                pageName,
                pageUrl,
                scenarios,
            });
        }
        return testSuites;
    }
    generatePageScenarios(pageName, pageUrl, framework) {
        const scenarios = [];
        // 1. Core page loading scenarios
        scenarios.push(...this.generateLoadingScenarios(pageName, pageUrl));
        // 2. Interactive element scenarios
        scenarios.push(...this.generateInteractionScenarios(pageName, pageUrl));
        // 3. Form validation scenarios (if applicable)
        if (this.isFormPage(pageName)) {
            scenarios.push(...this.generateFormScenarios(pageName, pageUrl));
        }
        // 4. Navigation scenarios
        scenarios.push(...this.generateNavigationScenarios(pageName, pageUrl));
        // 5. Responsive design scenarios
        scenarios.push(...this.generateResponsiveScenarios(pageName, pageUrl));
        // 6. Page-specific scenarios based on name
        scenarios.push(...this.generatePageSpecificScenarios(pageName, pageUrl, framework));
        return scenarios;
    }
    generateLoadingScenarios(pageName, pageUrl) {
        return [
            {
                id: `${pageName.toLowerCase()}-loading-basic`,
                description: `${pageName} loads completely without errors`,
                steps: [
                    `Navigate to ${pageUrl}`,
                    'Wait for page to load completely',
                    'Wait for network to be idle',
                    'Take screenshot of loaded page'
                ],
                expected: 'Page loads successfully with all content visible and no console errors',
                waitConditions: ['networkidle', 'load']
            },
            {
                id: `${pageName.toLowerCase()}-loading-elements`,
                description: `${pageName} displays all essential UI elements`,
                steps: [
                    `Navigate to ${pageUrl}`,
                    'Wait for page to load completely',
                    'Check for presence of main content areas',
                    'Verify navigation elements are visible',
                    'Take screenshot showing all elements'
                ],
                expected: 'All essential UI elements are visible and properly positioned',
                waitConditions: ['networkidle', 'load']
            }
        ];
    }
    generateInteractionScenarios(pageName, pageUrl) {
        return [
            {
                id: `${pageName.toLowerCase()}-interactions-buttons`,
                description: `${pageName} button interactions work correctly`,
                steps: [
                    `Navigate to ${pageUrl}`,
                    'Wait for page to load completely',
                    'Identify clickable buttons',
                    'Hover over primary buttons to check hover states',
                    'Take screenshot showing button states'
                ],
                expected: 'Buttons respond to hover with appropriate visual feedback',
                waitConditions: ['networkidle']
            },
            {
                id: `${pageName.toLowerCase()}-interactions-links`,
                description: `${pageName} link interactions are functional`,
                steps: [
                    `Navigate to ${pageUrl}`,
                    'Wait for page to load completely',
                    'Identify navigation links',
                    'Hover over links to verify hover states',
                    'Take screenshot showing link interactions'
                ],
                expected: 'Links display appropriate hover states and cursor changes',
                waitConditions: ['networkidle']
            }
        ];
    }
    generateFormScenarios(pageName, pageUrl) {
        const scenarios = [];
        if (pageName.toLowerCase().includes('login')) {
            scenarios.push({
                id: `${pageName.toLowerCase()}-form-empty-validation`,
                description: `${pageName} shows validation errors for empty form`,
                steps: [
                    `Navigate to ${pageUrl}`,
                    'Wait for page to load completely',
                    'Locate login form submit button',
                    'Click submit button without filling fields',
                    'Wait for validation messages to appear',
                    'Take screenshot showing validation errors'
                ],
                expected: 'Form shows appropriate validation errors for empty required fields',
                waitConditions: ['networkidle']
            }, {
                id: `${pageName.toLowerCase()}-form-invalid-email`,
                description: `${pageName} validates email format`,
                steps: [
                    `Navigate to ${pageUrl}`,
                    'Wait for page to load completely',
                    'Fill email field with invalid email format',
                    'Fill password field with test password',
                    'Click submit button',
                    'Wait for validation messages',
                    'Take screenshot showing email validation error'
                ],
                expected: 'Form shows email format validation error',
                waitConditions: ['networkidle']
            });
        }
        if (pageName.toLowerCase().includes('signup') || pageName.toLowerCase().includes('register')) {
            scenarios.push({
                id: `${pageName.toLowerCase()}-form-password-strength`,
                description: `${pageName} validates password strength`,
                steps: [
                    `Navigate to ${pageUrl}`,
                    'Wait for page to load completely',
                    'Fill password field with weak password',
                    'Check for password strength indicator',
                    'Take screenshot showing password validation'
                ],
                expected: 'Form shows password strength indicator and validation',
                waitConditions: ['networkidle']
            });
        }
        return scenarios;
    }
    generateNavigationScenarios(pageName, pageUrl) {
        return [
            {
                id: `${pageName.toLowerCase()}-navigation-menu`,
                description: `${pageName} navigation menu is accessible and functional`,
                steps: [
                    `Navigate to ${pageUrl}`,
                    'Wait for page to load completely',
                    'Locate main navigation menu',
                    'Check if mobile menu toggle exists and works',
                    'Take screenshot of navigation elements'
                ],
                expected: 'Navigation menu is visible and mobile-responsive',
                waitConditions: ['networkidle']
            }
        ];
    }
    generateResponsiveScenarios(pageName, pageUrl) {
        return [
            {
                id: `${pageName.toLowerCase()}-responsive-mobile`,
                description: `${pageName} displays correctly on mobile viewport`,
                steps: [
                    `Navigate to ${pageUrl}`,
                    'Wait for page to load completely',
                    'Check mobile layout adaptation',
                    'Verify text is readable at mobile size',
                    'Take screenshot of mobile layout'
                ],
                expected: 'Page adapts properly to mobile viewport with readable content',
                viewport: { width: 375, height: 667 },
                waitConditions: ['networkidle']
            },
            {
                id: `${pageName.toLowerCase()}-responsive-tablet`,
                description: `${pageName} displays correctly on tablet viewport`,
                steps: [
                    `Navigate to ${pageUrl}`,
                    'Wait for page to load completely',
                    'Check tablet layout adaptation',
                    'Verify content scaling is appropriate',
                    'Take screenshot of tablet layout'
                ],
                expected: 'Page adapts properly to tablet viewport with optimal content layout',
                viewport: { width: 768, height: 1024 },
                waitConditions: ['networkidle']
            }
        ];
    }
    generatePageSpecificScenarios(pageName, pageUrl, framework) {
        const scenarios = [];
        const lowerPageName = pageName.toLowerCase();
        // Homepage specific scenarios
        if (lowerPageName.includes('home') || pageUrl === '/') {
            scenarios.push({
                id: `${pageName.toLowerCase()}-hero-section`,
                description: `${pageName} hero section displays prominently`,
                steps: [
                    `Navigate to ${pageUrl}`,
                    'Wait for page to load completely',
                    'Verify hero section is visible above the fold',
                    'Check for call-to-action buttons in hero area',
                    'Take screenshot of hero section'
                ],
                expected: 'Hero section is prominently displayed with clear call-to-action',
                waitConditions: ['networkidle']
            });
        }
        // Dashboard specific scenarios
        if (lowerPageName.includes('dashboard')) {
            scenarios.push({
                id: `${pageName.toLowerCase()}-data-loading`,
                description: `${pageName} loads dashboard data correctly`,
                steps: [
                    `Navigate to ${pageUrl}`,
                    'Wait for page to load completely',
                    'Wait for dashboard widgets to load',
                    'Check for loading states and data display',
                    'Take screenshot of loaded dashboard'
                ],
                expected: 'Dashboard loads with all widgets displaying data or appropriate loading states',
                waitConditions: ['networkidle'],
            });
        }
        // Profile/Settings specific scenarios
        if (lowerPageName.includes('profile') || lowerPageName.includes('settings')) {
            scenarios.push({
                id: `${pageName.toLowerCase()}-form-sections`,
                description: `${pageName} form sections are organized and accessible`,
                steps: [
                    `Navigate to ${pageUrl}`,
                    'Wait for page to load completely',
                    'Identify form sections and tabs',
                    'Check form field accessibility',
                    'Take screenshot of form layout'
                ],
                expected: 'Form is well-organized with clear sections and accessible fields',
                waitConditions: ['networkidle']
            });
        }
        // E-commerce specific scenarios
        if (lowerPageName.includes('product') || lowerPageName.includes('shop')) {
            scenarios.push({
                id: `${pageName.toLowerCase()}-product-display`,
                description: `${pageName} displays products with proper layout`,
                steps: [
                    `Navigate to ${pageUrl}`,
                    'Wait for page to load completely',
                    'Check product grid or list layout',
                    'Verify product images load correctly',
                    'Take screenshot of product display'
                ],
                expected: 'Products are displayed in an organized grid with loaded images',
                waitConditions: ['networkidle']
            });
        }
        return scenarios;
    }
    isFormPage(pageName) {
        const formPageKeywords = ['login', 'signup', 'register', 'contact', 'profile', 'settings', 'checkout'];
        const lowerPageName = pageName.toLowerCase();
        return formPageKeywords.some(keyword => lowerPageName.includes(keyword));
    }
    // Generate framework-specific scenarios
    generateFrameworkSpecificScenarios(pageName, pageUrl, framework) {
        const scenarios = [];
        switch (framework) {
            case 'react':
                scenarios.push({
                    id: `${pageName.toLowerCase()}-react-hydration`,
                    description: `${pageName} React hydration completes successfully`,
                    steps: [
                        `Navigate to ${pageUrl}`,
                        'Wait for React to hydrate',
                        'Check for React development tools presence',
                        'Verify interactive elements are functional',
                        'Take screenshot after hydration'
                    ],
                    expected: 'React app hydrates successfully with interactive elements working',
                    waitConditions: ['networkidle']
                });
                break;
            case 'nextjs':
                scenarios.push({
                    id: `${pageName.toLowerCase()}-nextjs-ssr`,
                    description: `${pageName} server-side rendering works correctly`,
                    steps: [
                        `Navigate to ${pageUrl}`,
                        'Check initial HTML content before hydration',
                        'Wait for Next.js hydration',
                        'Verify SSR content matches client-side rendering',
                        'Take screenshot after full load'
                    ],
                    expected: 'Page loads with SSR content and hydrates properly',
                    waitConditions: ['networkidle']
                });
                break;
            case 'vue':
                scenarios.push({
                    id: `${pageName.toLowerCase()}-vue-mounting`,
                    description: `${pageName} Vue components mount correctly`,
                    steps: [
                        `Navigate to ${pageUrl}`,
                        'Wait for Vue app to mount',
                        'Check for Vue devtools availability',
                        'Verify component reactivity',
                        'Take screenshot of mounted app'
                    ],
                    expected: 'Vue app mounts successfully with reactive components',
                    waitConditions: ['networkidle']
                });
                break;
            case 'angular':
                scenarios.push({
                    id: `${pageName.toLowerCase()}-angular-bootstrap`,
                    description: `${pageName} Angular app bootstraps correctly`,
                    steps: [
                        `Navigate to ${pageUrl}`,
                        'Wait for Angular app to bootstrap',
                        'Check for Angular-specific attributes',
                        'Verify component initialization',
                        'Take screenshot of bootstrapped app'
                    ],
                    expected: 'Angular app bootstraps and initializes components correctly',
                    waitConditions: ['networkidle']
                });
                break;
        }
        return scenarios;
    }
}
exports.TestGenerator = TestGenerator;
//# sourceMappingURL=test-generator.js.map