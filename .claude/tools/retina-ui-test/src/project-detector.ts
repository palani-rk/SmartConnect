import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import { ProjectInfo } from './types';

export class ProjectDetector {
  private cwd: string;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
  }

  async detectProject(): Promise<ProjectInfo> {
    const packageJsonPath = path.join(this.cwd, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error('No package.json found. This tool requires a Node.js project.');
    }

    const packageJson = await fs.readJson(packageJsonPath);
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

    // Detect framework
    const framework = this.detectFramework(dependencies);
    
    // Detect pages
    const pageFiles = await this.discoverPages(framework);
    
    // Detect dev server
    const devServer = this.detectDevServer(packageJson, framework);

    // Detect source directory
    const srcDir = this.detectSrcDir(framework);

    // Determine routing pattern
    const routingPattern = this.determineRoutingPattern(framework);

    return {
      framework,
      srcDir,
      pageFiles,
      routingPattern,
      devServer,
      baseUrl: `http://localhost:${devServer.port}`
    };
  }

  private detectFramework(dependencies: Record<string, string>): ProjectInfo['framework'] {
    // Check for Next.js first (as it includes React)
    if (dependencies.next || fs.existsSync(path.join(this.cwd, 'next.config.js'))) {
      return 'nextjs';
    }
    
    // Check for React
    if (dependencies.react || dependencies['@types/react']) {
      return 'react';
    }
    
    // Check for Vue
    if (dependencies.vue || dependencies['@vue/cli-service'] || dependencies.nuxt) {
      return 'vue';
    }
    
    // Check for Angular
    if (dependencies['@angular/core'] || dependencies['@angular/cli']) {
      return 'angular';
    }

    return 'vanilla';
  }

  private async discoverPages(framework: ProjectInfo['framework']): Promise<string[]> {
    const pagePatterns = this.getPagePatterns(framework);
    const files: string[] = [];

    for (const pattern of pagePatterns) {
      try {
        const matches = await glob(pattern, { 
          cwd: this.cwd,
          ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.next/**']
        });
        files.push(...matches);
      } catch (error) {
        console.warn(`Warning: Could not search pattern ${pattern}:`, error);
      }
    }

    // Remove duplicates and sort
    const uniqueFiles = [...new Set(files)];
    
    // Filter out common non-page files
    const filteredFiles = uniqueFiles.filter(file => {
      const fileName = path.basename(file).toLowerCase();
      return !fileName.includes('test') && 
             !fileName.includes('spec') && 
             !fileName.includes('stories') &&
             !fileName.includes('index.') || fileName === 'index.tsx' || fileName === 'index.jsx';
    });

    // Limit to reasonable number of pages
    return filteredFiles.slice(0, 20);
  }

  private getPagePatterns(framework: ProjectInfo['framework']): string[] {
    switch (framework) {
      case 'react':
        return [
          'src/pages/**/*.{js,jsx,ts,tsx}',
          'src/components/pages/**/*.{js,jsx,ts,tsx}',
          'src/views/**/*.{js,jsx,ts,tsx}',
          'pages/**/*.{js,jsx,ts,tsx}'
        ];
      
      case 'nextjs':
        return [
          'pages/**/*.{js,jsx,ts,tsx}',
          'app/**/*.{js,jsx,ts,tsx}',
          'src/pages/**/*.{js,jsx,ts,tsx}',
          'src/app/**/*.{js,jsx,ts,tsx}'
        ];
      
      case 'vue':
        return [
          'src/views/**/*.{vue,js,ts}',
          'src/pages/**/*.{vue,js,ts}',
          'pages/**/*.{vue,js,ts}',
          'components/pages/**/*.{vue,js,ts}'
        ];
      
      case 'angular':
        return [
          'src/app/**/*.component.{ts,js}',
          'src/app/pages/**/*.{ts,js}',
          'src/pages/**/*.component.{ts,js}'
        ];
      
      default:
        return [
          'src/**/*.html',
          '*.html',
          'public/**/*.html'
        ];
    }
  }

  private detectSrcDir(framework: ProjectInfo['framework']): string {
    const possibleDirs = ['src', 'app', 'pages', 'public'];
    
    for (const dir of possibleDirs) {
      if (fs.existsSync(path.join(this.cwd, dir))) {
        return dir;
      }
    }
    
    return 'src';
  }

  private determineRoutingPattern(framework: ProjectInfo['framework']): ProjectInfo['routingPattern'] {
    return framework === 'nextjs' ? 'file-based' : 'component-based';
  }

  private detectDevServer(packageJson: any, framework: ProjectInfo['framework']): ProjectInfo['devServer'] {
    const scripts = packageJson.scripts || {};
    
    // Default ports by framework
    const defaultPorts: Record<string, number> = {
      react: 3000,
      nextjs: 3000,
      vue: 8080,
      angular: 4200,
      vanilla: 3000
    };

    let port = defaultPorts[framework] || 3000;
    let command = 'npm run dev';

    // Try to detect custom port from scripts
    if (scripts.dev) {
      command = 'npm run dev';
      port = this.extractPortFromScript(scripts.dev) || port;
    } else if (scripts.start) {
      command = 'npm start';
      port = this.extractPortFromScript(scripts.start) || port;
    } else if (scripts.serve) {
      command = 'npm run serve';
      port = this.extractPortFromScript(scripts.serve) || port;
    }

    // Check for framework-specific config files
    port = this.checkConfigFiles(framework) || port;

    return { port, command };
  }

  private extractPortFromScript(script: string): number | null {
    // Look for various port patterns
    const patterns = [
      /--port[\\s=](\\d+)/,
      /-p[\\s=](\\d+)/,
      /PORT[\\s=](\\d+)/,
      /port[\\s=](\\d+)/i
    ];

    for (const pattern of patterns) {
      const match = script.match(pattern);
      if (match) {
        return parseInt(match[1]);
      }
    }

    return null;
  }

  private checkConfigFiles(framework: ProjectInfo['framework']): number | null {
    const configFiles: Record<string, string[]> = {
      react: ['package.json', '.env', '.env.local'],
      nextjs: ['next.config.js', 'next.config.ts', '.env.local'],
      vue: ['vue.config.js', 'vite.config.js', 'nuxt.config.js'],
      angular: ['angular.json', '.angular-cli.json']
    };

    const files = configFiles[framework] || [];
    
    for (const file of files) {
      const filePath = path.join(this.cwd, file);
      if (fs.existsSync(filePath)) {
        try {
          const port = this.extractPortFromConfigFile(filePath);
          if (port) return port;
        } catch (error) {
          // Continue to next file
        }
      }
    }

    return null;
  }

  private extractPortFromConfigFile(filePath: string): number | null {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Look for port configurations
    const patterns = [
      /"port"\\s*:\\s*(\\d+)/,
      /port:\\s*(\\d+)/,
      /PORT[\\s=](\\d+)/,
      /"dev"\\s*:\\s*{[^}]*"port"\\s*:\\s*(\\d+)/
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        return parseInt(match[1]);
      }
    }

    return null;
  }

  // Generate page routes from discovered files
  generatePageRoutes(pageFiles: string[], framework: ProjectInfo['framework']): Record<string, string> {
    const pages: Record<string, string> = {};
    
    pageFiles.forEach(file => {
      const route = this.fileToRoute(file, framework);
      const pageName = this.fileToPageName(file);
      
      if (pageName && route) {
        pages[pageName] = route;
      }
    });

    // Ensure at least HomePage exists
    if (!pages.HomePage && !pages.Home && !pages.IndexPage) {
      pages.HomePage = '/';
    }

    return pages;
  }

  private fileToRoute(file: string, framework: ProjectInfo['framework']): string {
    let route = '/';
    
    switch (framework) {
      case 'nextjs':
        // Next.js file-based routing
        route = file
          .replace(/^(pages|src\\/pages|app|src\\/app)/, '')
          .replace(/\\.(js|jsx|ts|tsx)$/, '')
          .replace(/\\/index$/, '')
          .replace(/\\[([^\\]]+)\\]/g, ':$1'); // Dynamic routes
        
        if (!route || route === '') route = '/';
        break;
        
      case 'vue':
        // Vue router patterns
        const fileName = path.basename(file, path.extname(file));
        route = '/' + fileName.toLowerCase()
          .replace(/page$/, '')
          .replace(/view$/, '')
          .replace(/component$/, '');
        
        if (fileName.toLowerCase().includes('home') || fileName.toLowerCase().includes('index')) {
          route = '/';
        }
        break;
        
      default:
        // React, Angular, and others
        const baseName = path.basename(file, path.extname(file));
        route = '/' + baseName.toLowerCase()
          .replace(/page$/, '')
          .replace(/component$/, '');
        
        if (baseName.toLowerCase().includes('home') || baseName.toLowerCase().includes('index')) {
          route = '/';
        }
        break;
    }
    
    return route;
  }

  private fileToPageName(file: string): string {
    const fileName = path.basename(file, path.extname(file));
    
    // Clean up filename to create page name
    let pageName = fileName
      .replace(/[^a-zA-Z0-9]/g, '')
      .replace(/^(index|home)$/i, 'HomePage');
    
    // Ensure it starts with uppercase
    pageName = pageName.charAt(0).toUpperCase() + pageName.slice(1);
    
    // Add Page suffix if not present
    if (!pageName.toLowerCase().endsWith('page') && 
        !pageName.toLowerCase().endsWith('view') && 
        !pageName.toLowerCase().endsWith('component')) {
      pageName += 'Page';
    }
    
    return pageName;
  }
}