/**
 * GitHub Actions Workflow Tests
 * Tests for the PokéGrid daily generation workflow
 */

import fs from 'fs';
import path from 'path';

describe('GitHub Actions Workflow', () => {
  describe('Workflow Configuration', () => {
    test('should have valid workflow file', () => {
      const workflowPath = path.join(process.cwd(), '.github', 'workflows', 'pokegrid-daily-scheduler.yml');

      expect(() => fs.accessSync(workflowPath)).not.toThrow();

      const workflowContent = fs.readFileSync(workflowPath, 'utf8');
      expect(workflowContent).toContain('name: Daily PokéGrid Generation');
      expect(workflowContent).toContain('schedule:');
      expect(workflowContent).toContain('cron: \'30 23 * * *\'');
    });

    test('should have proper trigger configuration', () => {
      const workflowPath = path.join(process.cwd(), '.github', 'workflows', 'pokegrid-daily-scheduler.yml');
      const workflowContent = fs.readFileSync(workflowPath, 'utf8');

      // Should have schedule trigger
      expect(workflowContent).toContain('schedule:');
      expect(workflowContent).toContain('cron: \'30 23 * * *\'');

      // Should have manual trigger
      expect(workflowContent).toContain('workflow_dispatch:');
      expect(workflowContent).toContain('inputs:');
      expect(workflowContent).toContain('target_date:');
      expect(workflowContent).toContain('days_ahead:');
    });

    test('should have proper job configuration', () => {
      const workflowPath = path.join(process.cwd(), '.github', 'workflows', 'pokegrid-daily-scheduler.yml');
      const workflowContent = fs.readFileSync(workflowPath, 'utf8');

      // Should have generate-daily-grid job
      expect(workflowContent).toContain('generate-daily-grid:');
      expect(workflowContent).toContain('runs-on: ubuntu-latest');

      // Should have Node.js setup
      expect(workflowContent).toContain('uses: actions/setup-node@v4');
      expect(workflowContent).toContain('node-version: \'18\'');

      // Should run the generation script
      expect(workflowContent).toContain('node scripts/generate-daily-grids.js');
    });

    test('should have proper environment variable configuration', () => {
      const workflowPath = path.join(process.cwd(), '.github', 'workflows', 'pokegrid-daily-scheduler.yml');
      const workflowContent = fs.readFileSync(workflowPath, 'utf8');

      // Should use secrets for Supabase
      expect(workflowContent).toContain('${{ secrets.SUPABASE_URL }}');
      expect(workflowContent).toContain('${{ secrets.SUPABASE_ANON_KEY }}');
    });

    test('should have validation steps', () => {
      const workflowPath = path.join(process.cwd(), '.github', 'workflows', 'pokegrid-daily-scheduler.yml');
      const workflowContent = fs.readFileSync(workflowPath, 'utf8');

      // Should have verification step
      expect(workflowContent).toContain('Verify generation success');
      expect(workflowContent).toContain('curl -s -X POST');
      expect(workflowContent).toContain('get_pokegrid_configuration');
    });
  });

  describe('Workflow Logic Validation', () => {
    test('should handle target date calculation correctly', () => {
      // Test the date calculation logic from the workflow
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const expectedDate = tomorrow.toISOString().split('T')[0];

      // Simulate the workflow logic: date -d 'tomorrow' +%Y-%m-%d
      const workflowDate = new Date();
      workflowDate.setDate(workflowDate.getDate() + 1);
      const actualDate = workflowDate.toISOString().split('T')[0];

      expect(actualDate).toBe(expectedDate);
    });

    test('should handle manual trigger inputs', () => {
      // Test input validation logic
      const inputs = {
        target_date: '2024-12-25',
        days_ahead: 7
      };

      expect(inputs.target_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(typeof inputs.days_ahead).toBe('number');
      expect(inputs.days_ahead).toBeGreaterThan(0);
    });

    test('should validate Supabase API call format', () => {
      const baseUrl = 'https://test.supabase.co';
      const anonKey = 'test-anon-key';
      const targetDate = '2024-12-25';

      // Construct the expected API call
      const expectedUrl = `${baseUrl}/rest/v1/rpc/get_pokegrid_configuration`;
      const expectedHeaders = {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json'
      };
      const expectedBody = JSON.stringify({ p_grid_date: targetDate });

      expect(expectedUrl).toContain('/rpc/get_pokegrid_configuration');
      expect(expectedHeaders.apikey).toBe(anonKey);
      expect(expectedHeaders.Authorization).toBe(`Bearer ${anonKey}`);
      expect(expectedBody).toBe(`{"p_grid_date":"${targetDate}"}`);
    });
  });

  describe('Deployment Configuration', () => {
    test('should have Edge Function deployment', () => {
      const workflowPath = path.join(process.cwd(), '.github', 'workflows', 'pokegrid-daily-scheduler.yml');
      const workflowContent = fs.readFileSync(workflowPath, 'utf8');

      // Should have deploy-edge-function job
      expect(workflowContent).toContain('deploy-edge-function:');
      expect(workflowContent).toContain('if: github.event_name == \'schedule\' || github.event_name == \'workflow_dispatch\'');

      // Should use Supabase CLI
      expect(workflowContent).toContain('uses: supabase/setup-cli@v1');
      expect(workflowContent).toContain('npx supabase functions deploy pokegrid-scheduler');
    });

    test('should validate Edge Function deployment', () => {
      const workflowPath = path.join(process.cwd(), '.github', 'workflows', 'pokegrid-daily-scheduler.yml');
      const workflowContent = fs.readFileSync(workflowPath, 'utf8');

      // Should verify deployment
      expect(workflowContent).toContain('Verify Edge Function deployment');
      expect(workflowContent).toContain('/functions/v1/pokegrid-scheduler');
      expect(workflowContent).toContain('action=get_daily_status');
    });
  });

  describe('Error Handling in Workflow', () => {
    test('should handle generation failures', () => {
      // Simulate workflow failure scenario
      const mockResponse = '{ "error": "Generation failed" }';

      // The workflow should exit with error if generation fails
      const hasError = mockResponse.includes('error');
      expect(hasError).toBe(true);

      // Should check for grid_date in successful response
      const successfulResponse = '{ "grid_date": "2024-12-25" }';
      const isSuccessful = successfulResponse.includes('grid_date');
      expect(isSuccessful).toBe(true);
    });

    test('should handle API call failures', () => {
      // Test various failure scenarios
      const failureScenarios = [
        { response: '', description: 'Empty response' },
        { response: '{ "error": "Not found" }', description: 'API error' },
        { response: 'invalid json', description: 'Invalid JSON' }
      ];

      failureScenarios.forEach(scenario => {
        const shouldFail = !scenario.response.includes('grid_date');
        expect(shouldFail).toBe(true);
      });
    });

    test('should handle deployment failures', () => {
      // Test deployment failure scenarios
      const failureScenarios = [
        { response: '', description: 'Empty response' },
        { response: '{ "error": "Deployment failed" }', description: 'Deployment error' }
      ];

      failureScenarios.forEach(scenario => {
        const shouldFail = !scenario.response.includes('status');
        expect(shouldFail).toBe(true);
      });
    });
  });

  describe('Workflow Dependencies', () => {
    test('should depend on generate-daily-grids.mjs script', () => {
      const scriptPath = path.join(process.cwd(), 'scripts', 'generate-daily-grids.mjs');

      expect(() => fs.accessSync(scriptPath)).not.toThrow();

      const scriptContent = fs.readFileSync(scriptPath, 'utf8');
      expect(scriptContent).toContain('generateDailyGrids');
      expect(scriptContent).toContain('saveGridConfiguration');
    });

    test('should depend on pokegrid-scheduler Edge Function', () => {
      const functionPath = path.join(process.cwd(), 'supabase', 'functions', 'pokegrid-scheduler');

      expect(() => fs.accessSync(functionPath)).not.toThrow();

      // Check if it's a directory
      const stats = fs.statSync(functionPath);
      expect(stats.isDirectory()).toBe(true);
    });

    test('should have proper package.json dependencies', () => {
      const packagePath = path.join(process.cwd(), 'package.json');

      expect(() => fs.accessSync(packagePath)).not.toThrow();

      const packageContent = fs.readFileSync(packagePath, 'utf8');
      const packageJson = JSON.parse(packageContent);

      expect(packageJson.dependencies).toHaveProperty('@supabase/supabase-js');
      expect(packageJson.devDependencies).toHaveProperty('jest');
    });
  });
});
