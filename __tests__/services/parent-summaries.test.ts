import { ActionsService } from '../../lib/services/actions';
import { ParentSummaryService } from '../../lib/services/parent-summary';
import { getDb } from '../../lib/db/adapter';
import { actions, edges } from '../../db/schema';
import { sql } from 'drizzle-orm';
import '../../lib/db/init';

describe('Parent Summaries Integration', () => {
  // Skip cleanup for now to focus on the core issue

  test('should display parent context and vision summaries on action page', async () => {
    // Create a parent action
    const parentAction = await ActionsService.createAction({
      title: 'Parent Action',
      description: 'This is a parent action for testing',
      vision: 'The parent action should accomplish great things'
    });

    // Create a child action
    const childAction = await ActionsService.createAction({
      title: 'Child Action',
      description: 'This is a child action for testing',
      vision: 'The child action should contribute to the parent',
      parent_id: parentAction.id
    });

    // Generate parent summaries for the child action
    await ParentSummaryService.generateParentSummaries(childAction.id);

    // Fetch the action detail resource (this is what the web page uses)
    const actionDetails = await ActionsService.getActionDetailResource(childAction.id);

    // Validate that parent summaries are populated and not showing default messages
    expect(actionDetails.parent_context_summary).toBeDefined();
    expect(actionDetails.parent_context_summary).not.toBe('This action has no parent context.');
    expect(actionDetails.parent_context_summary).not.toBe('This action has no parent context');
    expect(actionDetails.parent_context_summary).toContain('Parent Action');

    expect(actionDetails.parent_vision_summary).toBeDefined();
    expect(actionDetails.parent_vision_summary).not.toBe('This action has no parent vision context.');
    expect(actionDetails.parent_vision_summary).not.toBe('This action has no parent vision context');
    expect(actionDetails.parent_vision_summary).toContain('Child Action');

    // Log the actual values for debugging
    console.log('Parent context summary:', actionDetails.parent_context_summary);
    console.log('Parent vision summary:', actionDetails.parent_vision_summary);
  });

  test('should show default messages when no parent summaries exist', async () => {
    // Create an action without parent summaries
    const action = await ActionsService.createAction({
      title: 'Standalone Action',
      description: 'This action has no parent',
      vision: 'This action stands alone'
    });

    // Fetch the action detail resource
    const actionDetails = await ActionsService.getActionDetailResource(action.id);

    // Should show default messages when no parent context exists
    expect(actionDetails.parent_context_summary).toBe('This action has no parent context.');
    expect(actionDetails.parent_vision_summary).toBe('This action has no parent vision context.');
  });
});