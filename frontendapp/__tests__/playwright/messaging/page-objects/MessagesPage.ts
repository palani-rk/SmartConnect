import { Page, Locator, expect } from '@playwright/test';

export class MessagesPage {
  private page: Page;
  
  // Main page elements
  private readonly pageTitle: Locator;
  private readonly channelsList: Locator;
  private readonly messageInterface: Locator;
  private readonly selectedChannelHeader: Locator;
  
  // Authentication and error elements
  private readonly authWarning: Locator;
  private readonly organizationWarning: Locator;
  private readonly channelLoadingSpinner: Locator;
  private readonly channelError: Locator;
  
  // Channel elements
  private readonly channelItems: Locator;
  private readonly emptyChannelMessage: Locator;
  
  constructor(page: Page) {
    this.page = page;
    
    // Main page elements - using actual selectors from the component
    this.pageTitle = page.locator('h4:has-text("Messages")');
    this.channelsList = page.locator('div').filter({ hasText: 'Channels' }).locator('..').locator('div[role="list"]');
    this.messageInterface = page.locator('div').filter({ hasText: 'messages' }).last();
    this.selectedChannelHeader = page.locator('h6').first();
    
    // Authentication and error elements
    this.authWarning = page.locator('text=Please log in to view messages');
    this.organizationWarning = page.locator('text=No organization found');
    this.channelLoadingSpinner = page.locator('[role="progressbar"]');
    this.channelError = page.locator('[role="alert"]');
    
    // Channel elements
    this.channelItems = page.locator('[role="button"]').filter({ hasText: '#' });
    this.emptyChannelMessage = page.locator('text=Select a channel to start messaging');
  }

  async navigateToMessages(): Promise<void> {
    await this.page.goto('/messages');
    await this.page.waitForLoadState('networkidle');
  }

  async isPageLoaded(): Promise<boolean> {
    try {
      await this.pageTitle.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async getPageTitle(): Promise<string> {
    return await this.pageTitle.textContent() || '';
  }

  // Authentication checks
  async isAuthenticated(): Promise<boolean> {
    try {
      await this.authWarning.waitFor({ state: 'visible', timeout: 2000 });
      return false;
    } catch {
      return true;
    }
  }

  async hasOrganization(): Promise<boolean> {
    try {
      await this.organizationWarning.waitFor({ state: 'visible', timeout: 2000 });
      return false;
    } catch {
      return true;
    }
  }

  async getAuthenticationError(): Promise<string | null> {
    try {
      if (await this.authWarning.isVisible()) {
        return await this.authWarning.textContent();
      }
      if (await this.organizationWarning.isVisible()) {
        return await this.organizationWarning.textContent();
      }
      return null;
    } catch {
      return null;
    }
  }

  // Channel management
  async waitForChannelsToLoad(): Promise<void> {
    // Wait for loading spinner to disappear
    try {
      await this.channelLoadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
    } catch {
      // Loading spinner might not appear for fast loads
    }
    
    // Wait for channels to appear or error message
    await Promise.race([
      this.channelItems.first().waitFor({ state: 'visible', timeout: 5000 }),
      this.channelError.waitFor({ state: 'visible', timeout: 5000 })
    ]);
  }

  async getChannelList(): Promise<string[]> {
    await this.waitForChannelsToLoad();
    
    const channels = await this.channelItems.all();
    const channelNames: string[] = [];
    
    for (const channel of channels) {
      const name = await channel.textContent();
      if (name && name.includes('#')) {
        channelNames.push(name.replace('#', '').trim());
      }
    }
    
    return channelNames;
  }

  async selectChannel(channelName: string): Promise<void> {
    const channelButton = this.page.locator(`[role="button"]:has-text("#${channelName}")`);
    await channelButton.click();
    
    // Wait for channel to be selected
    await this.page.waitForTimeout(500);
  }

  async isChannelSelected(channelName: string): Promise<boolean> {
    const selectedChannel = this.page.locator(`[data-testid="channel-item"].Mui-selected:has-text("${channelName}")`);
    return await selectedChannel.isVisible();
  }

  async getSelectedChannelInfo(): Promise<{ name: string; description: string } | null> {
    try {
      const header = this.selectedChannelHeader;
      const nameElement = header.locator('h6');
      const descriptionElement = header.locator('[data-testid="channel-description"]');
      
      const name = await nameElement.textContent();
      const description = await descriptionElement.textContent();
      
      return {
        name: name?.replace('#', '') || '',
        description: description || ''
      };
    } catch {
      return null;
    }
  }

  // Message interface checks
  async isMessageInterfaceVisible(): Promise<boolean> {
    return await this.messageInterface.isVisible();
  }

  async isEmptyChannelMessageVisible(): Promise<boolean> {
    return await this.emptyChannelMessage.isVisible();
  }

  async hasChannelError(): Promise<boolean> {
    return await this.channelError.isVisible();
  }

  async getChannelError(): Promise<string | null> {
    try {
      return await this.channelError.textContent();
    } catch {
      return null;
    }
  }

  // Performance checks
  async measurePageLoadTime(): Promise<number> {
    const startTime = Date.now();
    await this.navigateToMessages();
    await this.isPageLoaded();
    return Date.now() - startTime;
  }

  async measureChannelLoadTime(): Promise<number> {
    const startTime = Date.now();
    await this.waitForChannelsToLoad();
    return Date.now() - startTime;
  }
}