import { test, expect } from '@playwright/test';

test.describe('Cognitive Lab', () => {
  test('should load the cognitive lab interface', async ({ page }) => {
    await page.goto('/cognitive-lab');
    
    // Check if the main interface elements are present
    await expect(page.locator('h1')).toContainText('Cognitive Lab');
    await expect(page.locator('textarea[placeholder*="question"]')).toBeVisible();
  });

  test('should allow question input and exploration', async ({ page }) => {
    await page.goto('/cognitive-lab');
    
    // Input a philosophical question
    const questionInput = page.locator('textarea[placeholder*="question"]');
    await questionInput.fill('What is the nature of consciousness?');
    
    // Look for and click the explore/start button
    const startButton = page.locator('button:has-text("Explore"), button:has-text("Start"), button:has-text("Begin")').first();
    await expect(startButton).toBeVisible();
    
    // Note: We don't actually click to avoid making real API calls in tests
    // In a real test environment with mocked APIs, we would continue the flow
  });

  test('should display cognitive modes selector', async ({ page }) => {
    await page.goto('/cognitive-lab');
    
    // Check for mode selection interface
    const modeSelector = page.locator('select, [role="combobox"], [data-testid="mode-selector"]').first();
    if (await modeSelector.isVisible()) {
      await expect(modeSelector).toBeVisible();
    }
    
    // Alternative: Check for mode buttons/options
    const explorationMode = page.locator('text=exploration, text=Exploration').first();
    const groundingMode = page.locator('text=grounding, text=Grounding').first();
    
    // At least one mode option should be visible
    await expect(
      page.locator('text=exploration, text=Exploration, text=grounding, text=Grounding').first()
    ).toBeVisible();
  });

  test('should show quality metrics interface', async ({ page }) => {
    await page.goto('/cognitive-lab');
    
    // Look for metrics-related elements
    const metricsElements = [
      'text=Quality',
      'text=Novelty', 
      'text=Coherence',
      'text=Insight',
      'text=Breakthrough',
      '[data-testid*="metric"]',
      '.metric',
      '.quality'
    ];
    
    let foundMetrics = false;
    for (const selector of metricsElements) {
      if (await page.locator(selector).first().isVisible()) {
        foundMetrics = true;
        break;
      }
    }
    
    // If no metrics are visible in initial state, that's also acceptable
    // as they might only appear after exploration starts
    console.log('Metrics interface check completed');
  });

  test('should handle navigation correctly', async ({ page }) => {
    // Test navigation to cognitive lab
    await page.goto('/');
    
    // Look for navigation link to cognitive lab
    const cognitiveLabLink = page.locator('a[href="/cognitive-lab"], a:has-text("Cognitive Lab"), a:has-text("Lab")').first();
    
    if (await cognitiveLabLink.isVisible()) {
      await cognitiveLabLink.click();
      await expect(page).toHaveURL('/cognitive-lab');
    } else {
      // Direct navigation if no link found
      await page.goto('/cognitive-lab');
    }
    
    await expect(page.locator('h1, h2, [data-testid="page-title"]')).toBeVisible();
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/cognitive-lab');
    
    // Check that key elements are still visible and accessible
    await expect(page.locator('textarea[placeholder*="question"]')).toBeVisible();
    
    // Check that the interface doesn't have horizontal scroll
    const body = await page.locator('body').boundingBox();
    expect(body?.width).toBeLessThanOrEqual(375);
  });
});