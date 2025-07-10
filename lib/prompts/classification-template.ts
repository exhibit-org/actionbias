/**
 * JSON-mode prompt template for action classification
 * 
 * This module provides structured prompt templates that yield deterministic
 * JSON responses for action placement decisions without hallucinated keys.
 * The classification system determines whether to ADD_AS_CHILD, CREATE_PARENT,
 * or ADD_AS_ROOT based on semantic analysis of the action and context.
 */

import { z } from 'zod';

// Classification decision types
export type ClassificationDecision = 'ADD_AS_CHILD' | 'CREATE_PARENT' | 'ADD_AS_ROOT';

// Zod schema for classification response
export const classificationSchema = z.object({
  decision: z.enum(['ADD_AS_CHILD', 'CREATE_PARENT', 'ADD_AS_ROOT']).describe(
    'The classification decision for action placement'
  ),
  parentId: z.string().nullable().describe(
    'The ID of the parent action when decision is ADD_AS_CHILD, null otherwise'
  ),
  confidence: z.number().min(0).max(1).describe(
    'Confidence score between 0 and 1 for the classification decision'
  ),
  reasoning: z.string().describe(
    'Clear explanation of why this classification was chosen'
  ),
  newParentTitle: z.string().nullable().optional().describe(
    'Title for new parent when decision is CREATE_PARENT'
  ),
  newParentDescription: z.string().nullable().optional().describe(
    'Description for new parent when decision is CREATE_PARENT'
  )
});

export type ClassificationResponse = z.infer<typeof classificationSchema>;

export interface ActionToClassify {
  title: string;
  description?: string;
  vision?: string;
}

export interface ExistingAction {
  id: string;
  title: string;
  description?: string;
  vision?: string;
  parentId?: string;
  children?: ExistingAction[];
}

export interface ClassificationContext {
  action: ActionToClassify;
  existingActions: ExistingAction[];
  confidenceThreshold?: number;
}

/**
 * Builds the system message for JSON-mode classification
 */
export function buildClassificationSystemMessage(): string {
  return `You are an intelligent action classification system that determines optimal placement for new actions in hierarchical task structures.

Your task is to analyze a new action and determine one of three classification decisions:

1. **ADD_AS_CHILD**: The action should be added as a child of an existing action
   - Use when the new action is a specific implementation detail or subtask
   - The parent action represents a broader category that encompasses this work
   - Example: "Create login form" under "User Authentication System"

2. **CREATE_PARENT**: A new parent category should be created with this action as its first child
   - Use when the action represents a new functional domain not covered by existing structure
   - Multiple related actions would benefit from this new organizational category
   - Example: "Analytics Dashboard" when no analytics category exists

3. **ADD_AS_ROOT**: The action should be added at the root level
   - Use when the action is a major independent initiative or project
   - It represents a top-level business objective or system component
   - Example: "Launch Mobile Application" as a new product initiative

**Decision Criteria:**
- Semantic similarity: Actions in same functional domain should be grouped
- Scope alignment: Child actions should be narrower in scope than parents
- Business context: Consider organizational structure and project priorities
- Architectural layers: Group by technical domains (frontend, backend, infrastructure)

**Quality Requirements:**
- Always return valid JSON with no hallucinated keys
- Confidence scores should reflect actual certainty about placement
- Reasoning must clearly explain the semantic logic behind the decision
- Only use the three specified decision types

You must respond with structured JSON matching the exact schema provided.`;
}

/**
 * Builds the user message for JSON-mode classification
 */
export function buildClassificationUserMessage(context: ClassificationContext): string {
  const { action, existingActions, confidenceThreshold = 0.7 } = context;

  const actionDescription = `
**New Action to Classify:**
Title: ${action.title}
${action.description ? `Description: ${action.description}` : ''}
${action.vision ? `Vision: ${action.vision}` : ''}
`;

  const existingActionsDescription = existingActions.length > 0 ? `
**Existing Action Hierarchy:**
${formatActionHierarchy(existingActions)}
` : '**No existing actions in the hierarchy.**';

  const instructions = `
**Classification Instructions:**
1. Analyze the semantic meaning and scope of the new action
2. Compare against existing action hierarchy for logical placement
3. Consider functional domains (auth, payments, UI, database, etc.)
4. Evaluate whether the action fits as a child, needs a new parent, or stands alone
5. Use confidence threshold of ${confidenceThreshold} - lower confidence suggests CREATE_PARENT or ADD_AS_ROOT

**Decision Rules:**
- ADD_AS_CHILD: If there's a clear semantic parent with confidence >= ${confidenceThreshold}
- CREATE_PARENT: If action represents new domain but should have children/structure
- ADD_AS_ROOT: If action is major independent initiative or no good organizational fit

Respond with valid JSON matching the schema exactly. No additional text or explanation outside the JSON structure.`;

  return actionDescription + existingActionsDescription + instructions;
}

/**
 * Formats existing actions into a readable hierarchy
 */
function formatActionHierarchy(actions: ExistingAction[], level: number = 0): string {
  const indent = '  '.repeat(level);
  let output = '';

  // Flatten all actions from nested structure
  const flatActions = flattenActions(actions);
  
  // Find root actions (no parent)
  const rootActions = flatActions.filter(action => !action.parentId);
  
  for (const action of rootActions) {
    output += `${indent}- ${action.title} (ID: ${action.id})`;
    if (action.description) {
      output += ` - ${action.description}`;
    }
    output += '\n';

    // Find and format children
    const children = flatActions.filter(child => child.parentId === action.id);
    if (children.length > 0) {
      output += formatActionChildren(children, flatActions, level + 1);
    }
  }

  return output;
}

/**
 * Recursively formats child actions
 */
function formatActionChildren(children: ExistingAction[], allActions: ExistingAction[], level: number): string {
  const indent = '  '.repeat(level);
  let output = '';

  for (const child of children) {
    output += `${indent}- ${child.title} (ID: ${child.id})`;
    if (child.description) {
      output += ` - ${child.description}`;
    }
    output += '\n';

    // Find grandchildren
    const grandchildren = allActions.filter(action => action.parentId === child.id);
    if (grandchildren.length > 0) {
      output += formatActionChildren(grandchildren, allActions, level + 1);
    }
  }

  return output;
}

/**
 * Flattens nested action structure into a flat array
 */
function flattenActions(actions: ExistingAction[]): ExistingAction[] {
  const flattened: ExistingAction[] = [];
  
  function processAction(action: ExistingAction) {
    // Add the action itself
    flattened.push(action);
    
    // Process children if they exist
    if (action.children) {
      for (const child of action.children) {
        processAction(child);
      }
    }
  }
  
  for (const action of actions) {
    processAction(action);
  }
  
  return flattened;
}

/**
 * Validates and parses classification response
 */
export function parseClassificationResponse(jsonResponse: string): ClassificationResponse {
  try {
    const parsed = JSON.parse(jsonResponse);
    return classificationSchema.parse(parsed);
  } catch (error) {
    throw new Error(`Invalid classification response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Complete classification prompt builder that combines system and user messages
 */
export function buildClassificationPrompt(context: ClassificationContext): {
  systemMessage: string;
  userMessage: string;
} {
  return {
    systemMessage: buildClassificationSystemMessage(),
    userMessage: buildClassificationUserMessage(context)
  };
}

/**
 * Example usage function demonstrating the template
 */
export function getClassificationExample(): {
  context: ClassificationContext;
  expectedResponse: ClassificationResponse;
} {
  const context: ClassificationContext = {
    action: {
      title: "Create OAuth2 integration for Google",
      description: "Implement OAuth2 flow for Google sign-in authentication",
      vision: "Users can sign in with their Google accounts securely"
    },
    existingActions: [
      {
        id: "auth-001",
        title: "User Authentication System",
        description: "Complete authentication and authorization infrastructure",
        children: [
          {
            id: "auth-002", 
            title: "JWT Token Management",
            parentId: "auth-001"
          }
        ]
      },
      {
        id: "ui-001",
        title: "Frontend User Interface",
        description: "Web application user interface components"
      }
    ],
    confidenceThreshold: 0.7
  };

  const expectedResponse: ClassificationResponse = {
    decision: 'ADD_AS_CHILD',
    parentId: 'auth-001',
    confidence: 0.9,
    reasoning: 'OAuth2 Google integration is clearly an authentication feature that belongs under the existing User Authentication System. It extends the authentication capabilities and fits semantically with the existing JWT Token Management.',
    newParentTitle: undefined,
    newParentDescription: undefined
  };

  return { context, expectedResponse };
}