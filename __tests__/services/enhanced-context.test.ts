import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { EnhancedContextService } from '../../lib/services/enhanced-context';
import { ActionsService } from '../../lib/services/actions';
import { CompletionContextService } from '../../lib/services/completion-context';

describe('EnhancedContextService', () => {
  let parentActionId: string;
  let childActionId: string;
  let siblingActionId: string;
  let dependencyActionId: string;

  beforeEach(async () => {
    // Create test actions with hierarchy and dependencies
    parentActionId = await ActionsService.createAction({
      title: 'Parent Action',
      description: 'A parent action for testing',
      vision: 'To test parent context'
    });

    childActionId = await ActionsService.createAction({
      title: 'Child Action',
      description: 'A child action for testing',
      vision: 'To test child context',
      parent_id: parentActionId
    });

    siblingActionId = await ActionsService.createAction({
      title: 'Sibling Action',
      description: 'A sibling action for testing',
      vision: 'To test sibling context',
      parent_id: parentActionId
    });

    dependencyActionId = await ActionsService.createAction({
      title: 'Dependency Action',
      description: 'A dependency action for testing',
      vision: 'To test dependency context'
    });

    // Create dependency relationship
    await ActionsService.addDependency(childActionId, dependencyActionId);

    // Complete the dependency with context
    await ActionsService.updateAction(dependencyActionId, {
      done: true,
      completion_context: {
        implementation_story: 'Implemented the dependency successfully',
        impact_story: 'This dependency enables child functionality',
        learning_story: 'Learned about dependency patterns',
        changelog_visibility: 'team'
      }
    });

    // Complete the sibling with context
    await ActionsService.updateAction(siblingActionId, {
      done: true,
      completion_context: {
        implementation_story: 'Implemented the sibling successfully',
        impact_story: 'This sibling provides parallel functionality',
        learning_story: 'Learned about parallel development',
        changelog_visibility: 'team'
      }
    });
  });

  afterEach(async () => {
    // Clean up test actions
    if (parentActionId) {
      await ActionsService.deleteAction(parentActionId, 'delete_recursive');
    }
    if (dependencyActionId) {
      try {
        await ActionsService.deleteAction(dependencyActionId, 'delete_recursive');
      } catch (e) {
        // May have been deleted as part of parent cleanup
      }
    }
  });

  describe('getEnhancedDependencyCompletions', () => {
    it('should return empty array when action has no dependencies', async () => {
      const result = await EnhancedContextService.getEnhancedDependencyCompletions(parentActionId);
      expect(result).toEqual([]);
    });

    it('should return enhanced dependency context with full completion stories', async () => {
      const result = await EnhancedContextService.getEnhancedDependencyCompletions(childActionId);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        title: 'Dependency Action',
        impactStory: 'This dependency enables child functionality',
        implementationStory: 'Implemented the dependency successfully',
        learningStory: 'Learned about dependency patterns',
        isBlocker: false
      });
      expect(result[0].completedAt).toBeDefined();
    });

    it('should handle incomplete dependencies gracefully', async () => {
      // Create a new action with incomplete dependency
      const incompleteDepId = await ActionsService.createAction({
        title: 'Incomplete Dependency',
        description: 'Not yet completed'
      });

      await ActionsService.addDependency(childActionId, incompleteDepId);

      const result = await EnhancedContextService.getEnhancedDependencyCompletions(childActionId);
      
      // Should only include the completed dependency
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Dependency Action');

      // Clean up
      await ActionsService.deleteAction(incompleteDepId, 'delete_recursive');
    });
  });

  describe('getSiblingContext', () => {
    it('should return undefined when action has no family', async () => {
      const result = await EnhancedContextService.getSiblingContext(dependencyActionId);
      expect(result).toBeUndefined();
    });

    it('should return sibling context with completed and active siblings', async () => {
      const result = await EnhancedContextService.getSiblingContext(childActionId);
      
      expect(result).toBeDefined();
      expect(result?.completedSiblings).toHaveLength(1);
      expect(result?.completedSiblings?.[0]).toMatchObject({
        title: 'Sibling Action',
        impactStory: 'This sibling provides parallel functionality'
      });
      expect(result?.activeSiblings).toBeUndefined();
    });

    it('should include active siblings when they exist', async () => {
      // Create another active sibling
      const activeSiblingId = await ActionsService.createAction({
        title: 'Active Sibling',
        description: 'Still in progress',
        vision: 'To provide more functionality',
        parent_id: parentActionId
      });

      const result = await EnhancedContextService.getSiblingContext(childActionId);
      
      expect(result?.completedSiblings).toHaveLength(1);
      expect(result?.activeSiblings).toHaveLength(1);
      expect(result?.activeSiblings?.[0]).toMatchObject({
        title: 'Active Sibling',
        vision: 'To provide more functionality'
      });

      // Clean up
      await ActionsService.deleteAction(activeSiblingId, 'delete_recursive');
    });
  });

  describe('getEnhancedEditorialContext', () => {
    it('should return combined dependency and sibling context', async () => {
      const result = await EnhancedContextService.getEnhancedEditorialContext(childActionId);
      
      expect(result.dependencyCompletions).toBeDefined();
      expect(result.dependencyCompletions).toHaveLength(1);
      expect(result.dependencyCompletions![0].title).toBe('Dependency Action');

      expect(result.siblingContext).toBeDefined();
      expect(result.siblingContext!.completedSiblings).toHaveLength(1);
      expect(result.siblingContext!.completedSiblings![0].title).toBe('Sibling Action');
    });

    it('should handle actions with no context gracefully', async () => {
      const isolatedActionId = await ActionsService.createAction({
        title: 'Isolated Action',
        description: 'No dependencies or siblings'
      });

      const result = await EnhancedContextService.getEnhancedEditorialContext(isolatedActionId);
      
      expect(result.dependencyCompletions).toBeUndefined();
      expect(result.siblingContext).toBeUndefined();

      // Clean up
      await ActionsService.deleteAction(isolatedActionId, 'delete_recursive');
    });
  });
});