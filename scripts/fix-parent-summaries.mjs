#!/usr/bin/env node

// Manual script to generate missing parent summaries
// This bypasses the cron authentication and directly calls the service

import { ParentSummaryService } from '../lib/services/parent-summary.js';

async function fixParentSummaries() {
  try {
    console.log('Starting manual parent summaries fix...');
    
    // Get actions without parent summaries
    const actionsWithoutSummaries = await ParentSummaryService.getActionsWithoutParentSummaries(10);
    
    console.log(`Found ${actionsWithoutSummaries.length} actions without parent summaries`);
    
    if (actionsWithoutSummaries.length === 0) {
      console.log('No actions need parent summaries');
      return;
    }
    
    // Process each action
    for (const action of actionsWithoutSummaries) {
      try {
        console.log(`Processing action: ${action.actionId} - ${action.title}`);
        
        const { contextSummary, visionSummary } = await ParentSummaryService.generateBothParentSummaries(action);
        
        await ParentSummaryService.updateParentSummaries(action.actionId, contextSummary, visionSummary);
        
        console.log(`✅ Successfully generated parent summaries for: ${action.actionId}`);
        
      } catch (error) {
        console.error(`❌ Failed to process action ${action.actionId}:`, error.message);
      }
    }
    
    console.log('✅ Manual parent summaries fix completed');
    
  } catch (error) {
    console.error('❌ Manual parent summaries fix failed:', error);
  }
}

fixParentSummaries();