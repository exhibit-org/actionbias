import { CompletionContextService } from '../../lib/services/completion-context';
import { ActionsService } from '../../lib/services/actions';
import { getDb, initializePGlite, cleanupPGlite } from '../../lib/db/adapter';

describe('CompletionContextService', () => {
  const originalEnv = process.env;
  let testActionId: string;

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.DATABASE_URL = `pglite://.pglite-completion-context-test-${Math.random().toString(36).substring(7)}`;

    await cleanupPGlite();
    const { resetCache } = require('../../lib/db/adapter');
    resetCache();
    await initializePGlite();

    // Create a test action
    const action = await ActionsService.createAction({
      title: 'Test Action for Completion Context',
      description: 'Test action description',
      vision: 'Test vision'
    });
    testActionId = action.action.id;
  });

  afterEach(async () => {
    await cleanupPGlite();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('createCompletionContext', () => {
    it('should create completion context successfully', async () => {
      const context = await CompletionContextService.createCompletionContext({
        actionId: testActionId,
        implementationStory: '**Used TypeScript and Jest** for implementation\n\n- Created database schema\n- Built service layer\n- Added comprehensive tests',
        impactStory: 'Successfully created working completion context system\n\n*This enables dynamic changelog generation*',
        learningStory: 'Learned about database relationships and testing patterns\n\n> Key insight: Async error handling is crucial',
        changelogVisibility: 'team'
      });

      expect(context).toBeDefined();
      expect(context.actionId).toBe(testActionId);
      expect(context.implementationStory).toBe('**Used TypeScript and Jest** for implementation\n\n- Created database schema\n- Built service layer\n- Added comprehensive tests');
      expect(context.impactStory).toBe('Successfully created working completion context system\n\n*This enables dynamic changelog generation*');
      expect(context.learningStory).toBe('Learned about database relationships and testing patterns\n\n> Key insight: Async error handling is crucial');
      expect(context.changelogVisibility).toBe('team');
    });

    it('should throw error when trying to create duplicate context', async () => {
      // Create first context
      await CompletionContextService.createCompletionContext({
        actionId: testActionId,
        implementationStory: 'First context'
      });

      // Try to create duplicate
      await expect(
        CompletionContextService.createCompletionContext({
          actionId: testActionId,
          implementationStory: 'Second context'
        })
      ).rejects.toThrow(`Completion context already exists for action ${testActionId}`);
    });

    it('should use default visibility when not specified', async () => {
      const context = await CompletionContextService.createCompletionContext({
        actionId: testActionId,
        implementationStory: 'Test implementation'
      });

      expect(context.changelogVisibility).toBe('team');
    });
  });

  describe('upsertCompletionContext', () => {
    it('should create new context when none exists', async () => {
      const context = await CompletionContextService.upsertCompletionContext({
        actionId: testActionId,
        implementationStory: 'New implementation story',
        changelogVisibility: 'public'
      });

      expect(context).toBeDefined();
      expect(context.implementationStory).toBe('New implementation story');
      expect(context.changelogVisibility).toBe('public');
    });

    it('should update existing context', async () => {
      // Create initial context
      await CompletionContextService.createCompletionContext({
        actionId: testActionId,
        implementationStory: 'Original story',
        impactStory: 'Original impact'
      });

      // Update context
      const updatedContext = await CompletionContextService.upsertCompletionContext({
        actionId: testActionId,
        implementationStory: 'Updated story',
        learningStory: 'New learning'
      });

      expect(updatedContext.implementationStory).toBe('Updated story');
      expect(updatedContext.impactStory).toBe('Original impact'); // Should be preserved
      expect(updatedContext.learningStory).toBe('New learning');
    });
  });

  describe('getCompletionContext', () => {
    it('should return completion context when it exists', async () => {
      await CompletionContextService.createCompletionContext({
        actionId: testActionId,
        implementationStory: 'Test story'
      });

      const context = await CompletionContextService.getCompletionContext(testActionId);
      expect(context).toBeDefined();
      expect(context!.implementationStory).toBe('Test story');
    });

    it('should return null when context does not exist', async () => {
      const context = await CompletionContextService.getCompletionContext(testActionId);
      expect(context).toBeNull();
    });
  });

  describe('deleteCompletionContext', () => {
    it('should delete existing context', async () => {
      await CompletionContextService.createCompletionContext({
        actionId: testActionId,
        implementationStory: 'To be deleted'
      });

      const deletedContext = await CompletionContextService.deleteCompletionContext(testActionId);
      expect(deletedContext).toBeDefined();

      // Verify it's deleted
      const context = await CompletionContextService.getCompletionContext(testActionId);
      expect(context).toBeNull();
    });

    it('should return null when trying to delete non-existent context', async () => {
      const deletedContext = await CompletionContextService.deleteCompletionContext(testActionId);
      expect(deletedContext).toBeNull();
    });
  });

  describe('integration with ActionsService', () => {
    it('should handle completion context through updateAction', async () => {
      // Update action with completion context
      const updatedAction = await ActionsService.updateAction({
        action_id: testActionId,
        done: true,
        completion_context: {
          implementation_story: '## Implementation Details\n\n**Used MCP and database services** to build:\n\n- Service layer with TypeScript\n- Database integration with Drizzle ORM\n- Comprehensive error handling',
          impact_story: '✅ **Created a working completion context system**\n\nThis enables:\n- Dynamic changelog generation\n- Rich story capture\n- Better project visibility',
          learning_story: '### Key Learnings\n\n> Async service patterns are essential for scalability\n\n**Important insights:**\n- Error boundaries prevent cascade failures\n- Markdown support enhances readability\n- Test-driven development saves time',
          changelog_visibility: 'team'
        }
      });

      expect(updatedAction.done).toBe(true);

      // Verify completion context was created
      const context = await CompletionContextService.getCompletionContext(testActionId);
      expect(context).toBeDefined();
      expect(context!.implementationStory).toBe('## Implementation Details\n\n**Used MCP and database services** to build:\n\n- Service layer with TypeScript\n- Database integration with Drizzle ORM\n- Comprehensive error handling');
      expect(context!.impactStory).toBe('✅ **Created a working completion context system**\n\nThis enables:\n- Dynamic changelog generation\n- Rich story capture\n- Better project visibility');
      expect(context!.learningStory).toBe('### Key Learnings\n\n> Async service patterns are essential for scalability\n\n**Important insights:**\n- Error boundaries prevent cascade failures\n- Markdown support enhances readability\n- Test-driven development saves time');
      expect(context!.changelogVisibility).toBe('team');
    });
  });
});