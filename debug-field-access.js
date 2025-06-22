// Quick debug script to test field access
const { ActionsService } = require('./lib/services/actions.ts');

async function debugFieldAccess() {
  try {
    console.log('🔍 Testing field access for action fcd90a48-0b81-4f25-a832-38f25d0246b7');
    
    const result = await ActionsService.getActionDetailResource('fcd90a48-0b81-4f25-a832-38f25d0246b7');
    
    console.log('📊 Full result object keys:', Object.keys(result));
    console.log('📊 parent_context_summary:', result.parent_context_summary);
    console.log('📊 parent_vision_summary:', result.parent_vision_summary);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugFieldAccess();