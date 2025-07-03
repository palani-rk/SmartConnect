import { test, expect } from '@playwright/test'

test('basic navigation test', async ({ page }) => {
  await page.goto('/')
  
  // This is just a basic test to verify Playwright is working
  // With MCP, you'll mainly use natural language commands instead
  await expect(page).toHaveTitle(/SmartConnect/)
})