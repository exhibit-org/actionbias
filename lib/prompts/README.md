# JSON-Mode Classification Template

This module provides a robust, production-ready JSON-mode prompt template for action classification that yields deterministic `ADD_AS_CHILD | CREATE_PARENT | ADD_AS_ROOT` decisions without hallucinated keys.

## Overview

The classification system determines optimal placement for new actions in hierarchical task structures using semantic reasoning and structured JSON output. Built on the **Vercel AI SDK**, it ensures 100% valid JSON responses with no hallucinated keys through strict Zod schema validation and the `generateObject` function.

## Key Features

- ✅ **Vercel AI SDK Integration**: Uses `generateObject` for guaranteed structured output
- ✅ **Deterministic JSON Output**: Always returns valid JSON matching exact schema
- ✅ **No Hallucinated Keys**: Strict Zod schema validation prevents extra/invalid fields  
- ✅ **Three Decision Types**: Support for ADD_AS_CHILD, CREATE_PARENT, ADD_AS_ROOT
- ✅ **Semantic Reasoning**: Advanced prompt engineering with domain knowledge
- ✅ **OpenAI GPT-4o-mini**: Optimized model selection for cost and performance
- ✅ **Comprehensive Testing**: 100% test coverage with edge case validation
- ✅ **Error Handling**: Graceful fallbacks when LLM calls fail
- ✅ **Batch Processing**: Efficient multi-action classification

## Usage

### Basic Classification

```typescript
import { 
  buildClassificationPrompt, 
  parseClassificationResponse,
  type ClassificationContext 
} from '../lib/prompts/classification-template';

const context: ClassificationContext = {
  action: {
    title: 'Create OAuth integration',
    description: 'Implement OAuth2 flow for authentication',
    vision: 'Secure user authentication with external providers'
  },
  existingActions: [
    {
      id: 'auth-001',
      title: 'Authentication System',
      description: 'User authentication and authorization'
    }
  ],
  confidenceThreshold: 0.7
};

const prompt = buildClassificationPrompt(context);
// Use prompt.systemMessage and prompt.userMessage with your LLM
```

### Using the Classification Service (Vercel AI SDK)

```typescript
import { ClassificationService } from '../lib/services/classification';

// The service uses Vercel AI SDK's generateObject internally
const result = await ClassificationService.classifyAction(
  {
    title: 'Add rate limiting',
    description: 'Implement API rate limiting middleware'
  },
  existingActions,
  0.7 // confidence threshold
);

console.log(result.decision); // 'ADD_AS_CHILD' | 'CREATE_PARENT' | 'ADD_AS_ROOT'
console.log(result.parentId); // ID of parent when ADD_AS_CHILD
console.log(result.confidence); // 0-1 confidence score
console.log(result.reasoning); // Clear explanation
```

### Direct Vercel AI SDK Usage

```typescript
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { classificationSchema, buildClassificationPrompt } from './classification-template';

const prompt = buildClassificationPrompt(context);

const result = await generateObject({
  model: openai('gpt-4o-mini'),
  system: prompt.systemMessage,
  prompt: prompt.userMessage,
  schema: classificationSchema,  // Zod schema ensures no hallucinated keys
  temperature: 0,               // Deterministic results
});

const classification = result.object; // Fully typed and validated
```

## Decision Types

### ADD_AS_CHILD
- **When**: Action fits semantically under an existing parent
- **Example**: "Create login form" → under "Authentication System"
- **Result**: `{ decision: 'ADD_AS_CHILD', parentId: 'auth-001', ... }`

### CREATE_PARENT
- **When**: Action represents new domain needing organizational structure
- **Example**: "Analytics dashboard" when no analytics category exists
- **Result**: `{ decision: 'CREATE_PARENT', suggestedParent: { title: '...', description: '...' } }`

### ADD_AS_ROOT  
- **When**: Action is major independent initiative
- **Example**: "Launch mobile application" as new product line
- **Result**: `{ decision: 'ADD_AS_ROOT', parentId: null, ... }`

## Vercel AI SDK Integration

### Schema Validation

The system uses strict Zod schema validation with Vercel AI SDK's `generateObject`:

```typescript
import { z } from 'zod';

const classificationSchema = z.object({
  decision: z.enum(['ADD_AS_CHILD', 'CREATE_PARENT', 'ADD_AS_ROOT']),
  parentId: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  newParentTitle: z.string().optional(),
  newParentDescription: z.string().optional()
});

// Vercel AI SDK automatically validates against this schema
const result = await generateObject({
  model: openai('gpt-4o-mini'),
  schema: classificationSchema,  // No hallucinated keys possible
  // ... other parameters
});
```

### Why Vercel AI SDK?

- **Guaranteed Structure**: `generateObject` ensures JSON always matches schema
- **Type Safety**: Full TypeScript support with automatic type inference  
- **Error Prevention**: Schema validation prevents hallucinated keys
- **Performance**: Optimized for structured outputs vs. raw text generation
- **Consistency**: Same patterns used across ActionBias codebase

## Error Handling

The system provides robust error handling:

```typescript
try {
  const result = await ClassificationService.classifyAction(action, existing);
  // Success case
} catch (error) {
  // Automatic fallback to ADD_AS_ROOT with confidence 0
  // Error details logged for debugging
}
```

## Validation & Quality Checks

```typescript
const validation = ClassificationService.validateClassification(result, action, existing);

if (!validation.isValid) {
  console.log('Warnings:', validation.warnings);
  // Handle validation issues
}

if (validation.recommendations.length > 0) {
  console.log('Recommendations:', validation.recommendations);
  // Optional improvements
}
```

## Testing

Run the comprehensive test suite:

```bash
pnpm test lib/prompts/__tests__/classification-template.test.ts
pnpm test lib/services/__tests__/classification.test.ts
```

The tests cover:
- ✅ Prompt generation correctness
- ✅ JSON schema validation  
- ✅ All decision type scenarios
- ✅ Error handling and fallbacks
- ✅ Hierarchy formatting
- ✅ Batch processing
- ✅ Validation logic

## Demo

See the complete working example:

```bash
npx tsx examples/classification-demo.ts
```

## Integration with Existing System

This classification template integrates seamlessly with the existing ActionBias codebase:

### Placement Service Compatibility

```typescript
// Convert classification result to placement format
const placementResult = ClassificationService.toPlacementResult(
  classificationResult, 
  existingActions
);

// Use with existing MCP tools and API endpoints
```

### Consistent Vercel AI SDK Usage

The implementation follows the same patterns as other ActionBias AI services:

- **PlacementService**: Uses `generateObject` with `placementSchema`
- **AnalysisService**: Uses `generateObject` with `analysisSchema`  
- **SummaryService**: Uses `generateText` for content generation
- **ClassificationService**: Uses `generateObject` with `classificationSchema`

All services use:
- OpenAI GPT-4o-mini model for cost efficiency
- Temperature 0 for deterministic results  
- Proper error handling and fallbacks
- TypeScript for full type safety

## Prompt Engineering Details

The system uses advanced prompt engineering techniques:

- **Domain Knowledge**: Specific guidance for auth, payments, UI, API domains
- **Architectural Patterns**: Consideration of frontend/backend/infrastructure layers  
- **Business Context**: Understanding of organizational structure
- **Semantic Similarity**: Prioritizes meaning over keyword matching
- **Decision Logic**: Multi-step reasoning process with confidence thresholds

## Performance Considerations

### Vercel AI SDK Optimizations

- **`generateObject` vs `generateText`**: Structured generation is more efficient than parsing
- **Schema Validation**: Client-side validation reduces retry loops
- **Temperature 0**: Deterministic results for consistent classifications
- **Model Selection**: GPT-4o-mini optimized for structured tasks

### Operational Efficiency  

- **Batch Processing**: Sequential processing to maintain context
- **Rate Limiting**: Built-in error handling for API limits
- **Caching**: Template results can be cached for identical inputs
- **Error Recovery**: Graceful degradation when AI calls fail

### Cost Optimization

- **GPT-4o-mini**: 10x cheaper than GPT-4 with comparable structured output quality
- **Deterministic Results**: No need for multiple attempts or validation calls
- **Efficient Prompts**: Optimized token usage while maintaining quality