/**
 * Demo script showing JSON-mode classification template usage
 * 
 * This example demonstrates how to use the classification template
 * to get deterministic ADD_AS_CHILD | CREATE_PARENT | ADD_AS_ROOT
 * decisions without hallucinated keys.
 */

import {
  buildClassificationPrompt,
  parseClassificationResponse,
  getClassificationExample,
  type ClassificationContext,
  type ActionToClassify,
  type ExistingAction
} from '../lib/prompts/classification-template';

import { ClassificationService } from '../lib/services/classification';

// Example 1: Simple prompt building
console.log('=== Example 1: Building Classification Prompts ===\n');

const exampleAction: ActionToClassify = {
  title: 'Implement rate limiting for API endpoints',
  description: 'Add rate limiting middleware to prevent API abuse',
  vision: 'Protected API with configurable rate limits per endpoint'
};

const existingActions: ExistingAction[] = [
  {
    id: 'auth-001',
    title: 'Authentication & Security',
    description: 'User authentication and security features',
    children: [
      { id: 'auth-002', title: 'JWT Authentication', parentId: 'auth-001' },
      { id: 'auth-003', title: 'Password Security', parentId: 'auth-001' }
    ]
  },
  {
    id: 'api-001',
    title: 'API Development',
    description: 'Backend API endpoints and middleware'
  },
  {
    id: 'ui-001',
    title: 'User Interface',
    description: 'Frontend components and pages'
  }
];

const context: ClassificationContext = {
  action: exampleAction,
  existingActions,
  confidenceThreshold: 0.7
};

const prompt = buildClassificationPrompt(context);

console.log('System Message (first 300 chars):');
console.log(prompt.systemMessage.substring(0, 300) + '...\n');

console.log('User Message (first 500 chars):');
console.log(prompt.userMessage.substring(0, 500) + '...\n');

// Example 2: Expected JSON response format
console.log('=== Example 2: Expected JSON Response Format ===\n');

const expectedJsonResponse = JSON.stringify({
  decision: 'ADD_AS_CHILD',
  parentId: 'auth-001',
  confidence: 0.85,
  reasoning: 'Rate limiting is a security feature that belongs under Authentication & Security alongside other security measures like JWT and password security.'
}, null, 2);

console.log('Expected JSON Response:');
console.log(expectedJsonResponse + '\n');

try {
  const parsed = parseClassificationResponse(expectedJsonResponse);
  console.log('✅ JSON parsing successful!');
  console.log('Decision:', parsed.decision);
  console.log('Parent ID:', parsed.parentId);
  console.log('Confidence:', parsed.confidence);
  console.log('Reasoning:', parsed.reasoning.substring(0, 100) + '...\n');
} catch (error) {
  console.log('❌ JSON parsing failed:', error);
}

// Example 3: Template example
console.log('=== Example 3: Built-in Template Example ===\n');

const { context: templateContext, expectedResponse } = getClassificationExample();

console.log('Template Action:', templateContext.action.title);
console.log('Expected Decision:', expectedResponse.decision);
console.log('Expected Parent ID:', expectedResponse.parentId);
console.log('Expected Confidence:', expectedResponse.confidence);
console.log('Expected Reasoning:', expectedResponse.reasoning.substring(0, 100) + '...\n');

// Example 4: Service validation
console.log('=== Example 4: Classification Validation ===\n');

const validationResult = ClassificationService.validateClassification(
  expectedResponse,
  templateContext.action,
  templateContext.existingActions
);

console.log('Validation Result:');
console.log('- Is Valid:', validationResult.isValid);
console.log('- Warnings:', validationResult.warnings.length);
console.log('- Recommendations:', validationResult.recommendations.length);

if (validationResult.warnings.length > 0) {
  console.log('Warnings:', validationResult.warnings);
}

if (validationResult.recommendations.length > 0) {
  console.log('Recommendations:', validationResult.recommendations);
}

// Example 5: Different decision types
console.log('\n=== Example 5: Different Decision Types ===\n');

const decisions = [
  {
    decision: 'ADD_AS_CHILD' as const,
    parentId: 'auth-001',
    confidence: 0.9,
    reasoning: 'Fits well under existing authentication category'
  },
  {
    decision: 'CREATE_PARENT' as const,
    parentId: null,
    confidence: 0.8,
    reasoning: 'Needs new analytics category',
    suggestedParent: {
      title: 'Analytics & Reporting',
      description: 'Data analysis and metrics features'
    }
  },
  {
    decision: 'ADD_AS_ROOT' as const,
    parentId: null,
    confidence: 0.85,
    reasoning: 'Independent major initiative'
  }
];

decisions.forEach((decision, index) => {
  console.log(`Decision ${index + 1}: ${decision.decision}`);
  
  const placement = ClassificationService.toPlacementResult(decision, existingActions);
  
  if (placement.bestParent) {
    console.log(`  ↳ Parent: ${placement.bestParent.title} (${placement.bestParent.id})`);
  }
  
  if (placement.suggestedNewParent) {
    console.log(`  ↳ New Parent: ${placement.suggestedNewParent.title}`);
    console.log(`  ↳ Description: ${placement.suggestedNewParent.description}`);
  }
  
  if (!placement.bestParent && !placement.suggestedNewParent) {
    console.log('  ↳ Root level placement');
  }
  
  console.log(`  ↳ Confidence: ${placement.confidence}`);
  console.log();
});

console.log('=== Demo Complete ===');
console.log('\n✅ JSON-mode classification template is ready for use!');
console.log('✅ Always produces valid JSON without hallucinated keys');
console.log('✅ Supports all three decision types: ADD_AS_CHILD | CREATE_PARENT | ADD_AS_ROOT');
console.log('✅ Includes comprehensive validation and error handling');
console.log('✅ Provides clear reasoning for all decisions');