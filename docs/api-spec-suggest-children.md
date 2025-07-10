# API Specification: POST /api/actions/[id]/suggest-children

## Quick Reference

**Endpoint:** `POST /api/actions/[id]/suggest-children`  
**Purpose:** Generate AI-powered child action suggestions with dependencies  
**Service Method:** `ActionsService.decomposeAction()`  
**Auth:** Required (follows existing pattern)  
**Rate Limit:** 10 req/min per user  

## Request

### Path Parameters
- `id` (string, required): UUID of the parent action to decompose

### Body Schema (Zod)
```typescript
const requestSchema = z.object({
  max_suggestions: z.number().min(1).max(10).default(5).optional(),
  include_reasoning: z.boolean().default(true).optional(),
  complexity_level: z.enum(['simple', 'detailed', 'comprehensive']).default('detailed').optional(),
});
```

### Example Request
```json
{
  "max_suggestions": 5,
  "include_reasoning": true,
  "complexity_level": "detailed"
}
```

## Response

### Success Response (200)
```typescript
interface SuccessResponse {
  success: true;
  data: {
    action: {
      id: string;
      title: string;
      description?: string;
      vision?: string;
    };
    suggestions: Array<{
      index: number;
      title: string;
      description: string;
      reasoning?: string;
      confidence: number; // 0.0-1.0
    }>;
    dependencies: Array<{
      dependent_index: number;
      depends_on_index: number;
      reasoning?: string;
      dependency_type: 'sequential' | 'prerequisite' | 'informational';
    }>;
    metadata: {
      processingTimeMs: number;
      aiModel: 'gpt-4o-mini';
      analysisDepth: string;
    };
  };
}
```

### Error Responses
```typescript
// 400 Bad Request
{ success: false, error: "Invalid action ID format" }

// 404 Not Found  
{ success: false, error: "Action with ID 'xxx' not found" }

// 422 Unprocessable Entity
{ success: false, error: "Action is already completed" }

// 500 Internal Server Error
{ success: false, error: "AI service temporarily unavailable" }
```

## Implementation Checklist

### Route Handler (`app/api/actions/[id]/suggest-children/route.ts`)
- [ ] Import NextRequest, NextResponse from 'next/server'
- [ ] Import and validate with Zod schema
- [ ] Extract and validate UUID from params
- [ ] Call `ActionsService.decomposeAction()`
- [ ] Handle errors (400, 404, 422, 500)
- [ ] Return consistent response format
- [ ] Add performance logging

### Validation Logic
```typescript
// UUID validation (consistent with existing endpoints)
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!uuidRegex.test(actionId)) {
  return NextResponse.json({ success: false, error: "Invalid action ID format" }, { status: 400 });
}

// Action existence check
const actionResult = await ActionsService.getAction(actionId);
if (!actionResult) {
  return NextResponse.json({ success: false, error: `Action with ID '${actionId}' not found` }, { status: 404 });
}

// Completion status check
if (actionResult.done) {
  return NextResponse.json({ success: false, error: "Action is already completed" }, { status: 422 });
}
```

### Service Integration
```typescript
const result = await ActionsService.decomposeAction({
  action_id: actionId,
  max_suggestions: validatedInput.max_suggestions,
  include_reasoning: validatedInput.include_reasoning
});

// Map to API response format
const response = {
  success: true,
  data: {
    action: result.action,
    suggestions: result.suggestions,
    dependencies: result.dependencies.map(dep => ({
      ...dep,
      dependency_type: 'prerequisite' as const // Default type
    })),
    metadata: {
      processingTimeMs: result.metadata.processingTimeMs,
      aiModel: 'gpt-4o-mini' as const,
      analysisDepth: validatedInput.complexity_level
    }
  }
};
```

## Testing

### Test Cases
1. **Valid request** - Returns suggestions with dependencies
2. **Invalid UUID** - Returns 400 error
3. **Nonexistent action** - Returns 404 error  
4. **Completed action** - Returns 422 error
5. **AI service failure** - Returns 500 error
6. **Edge case: max_suggestions=1** - Returns single suggestion
7. **Edge case: include_reasoning=false** - Omits reasoning fields

### Performance Requirements
- P95 latency: < 3000ms
- P50 latency: < 1500ms
- Success rate: > 99%

## Deployment Notes

### Environment Variables
- `OPENAI_API_KEY` - Required for AI service
- Standard database connection variables

### Monitoring
- Log processing times for performance analysis
- Track AI service errors and retry patterns
- Monitor cache hit rates (if implemented)

### Error Patterns to Watch
- High latency from AI service (>5s)
- Action not found errors (may indicate UI bugs)
- UUID validation failures (client-side issues)