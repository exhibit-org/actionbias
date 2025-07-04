import { z } from "zod";
import { ActionsService } from "../services/actions";
import { buildActionPrompt } from "../utils/action-prompt-builder";
import { BRAND } from "../config/brand";

export function registerPrompts(server: any) {
  // Original action detail prompt
  server.prompt(
    'claude-code-next-action',
    'Structured prompt summarizing an action with context',
    { action_id: z.string().uuid().describe('ID of the action to summarize') },
    async ({ action_id }: { action_id: string }) => {
      const action = await ActionsService.getActionDetailResource(action_id);
      const prompt = buildActionPrompt(action);

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: prompt,
            },
          },
        ],
      };
    }
  );

  // Intelligent work prioritization prompt
  server.prompt(
    'prioritize-work',
    'Get intelligent work recommendations based on vision, momentum, and dependencies',
    {},
    async () => {
      const prompt = `I need help prioritizing what to work on next in the ${BRAND.name} project. Please:

1. First, read the project vision using the context://vision MCP resource
2. Check recent momentum using the context://momentum MCP resource  
3. Get all workable actions using the work://unblocked MCP resource
4. Get a count of total incomplete actions using work://count

Then analyze the workable actions and recommend the top 5 to work on based on:
- Strategic alignment with the DONE magazine vision
- Building on recent momentum and completed work
- Unlocking future work through dependencies
- Effort vs impact ratio
- Addressing technical debt or critical issues

CRITICAL: Only recommend actions from the work://unblocked resource. 
- Use the momentum data ONLY to understand context and recent progress
- NEVER recommend any action that appears in the recent completions list
- Before finalizing recommendations, verify each action has "done": false status

For each recommendation, provide:
- The action title, description, and ID
- A score (0-100) 
- Clear reasoning for the score
- Category (strategic, quick-win, momentum, technical-debt)
- Estimated effort (low, medium, high)

VALIDATION: Before submitting your top 5, double-check that:
1. Each recommended action appears in work://unblocked
2. None appear in context://momentum recent completions
3. All have incomplete status

Be selective with scoring - most actions should score 20-80, with 80+ reserved for truly critical work.`;

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: prompt,
            },
          },
        ],
      };
    }
  );

  // Quick next action prompt
  server.prompt(
    'next-action',
    'Simple prompt to find the most important next action',
    {},
    async () => {
      const prompt = `What's the most important thing I should work on next? Use the work://unblocked resource to find available tasks and pick the top priority based on the project vision (context://vision).

IMPORTANT: Once you start working on a task, you must complete it fully before moving to anything else. This includes:
- Running pnpm build and ensuring it succeeds
- Running pnpm test and ensuring all tests pass  
- Pushing to main branch and verifying deployment
- Getting user validation of the implementation
- Using the complete_action tool to mark it done

No task switching until current work is fully complete and verified.`;

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: prompt,
            },
          },
        ],
      };
    }
  );

  // Work state overview prompt
  server.prompt(
    'work-overview',
    'Get an overview of the current work state',
    {},
    async () => {
      const prompt = `Give me an overview of the current work state:
1. Use work://tree to show the hierarchical structure of incomplete work
2. Use context://momentum to show what's been recently completed
3. Use work://unblocked to show what's ready to work on
4. Summarize the key insights`;

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: prompt,
            },
          },
        ],
      };
    }
  );

  // Dependency analysis prompt
  server.prompt(
    'analyze-blockers',
    'Understand what is blocking progress',
    {},
    async () => {
      const prompt = `I want to understand what's blocking progress. Please:
1. Use work://dependencies to see the dependency graph
2. Use work://unblocked to see what's actually workable
3. Identify the key blockers that would unlock the most work if completed`;

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: prompt,
            },
          },
        ],
      };
    }
  );

  // Action deep dive prompt
  server.prompt(
    'action-context',
    'Get full context on a specific action',
    { action_id: z.string().uuid().describe('ID of the action to analyze') },
    async ({ action_id }: { action_id: string }) => {
      const prompt = `I need full context on action ${action_id}. Please:
1. Use work://${action_id} to get the action details
2. Show me the full parent chain and context
3. List all dependencies and dependents
4. Check if it appears in work://unblocked
5. Give me your assessment of whether this is ready to work on`;

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: prompt,
            },
          },
        ],
      };
    }
  );

  // Work pattern analysis prompt
  server.prompt(
    'analyze-patterns',
    'Analyze completed work patterns',
    {},
    async () => {
      const prompt = `Analyze our completed work patterns:
1. Use work://done to get recent completion logs
2. Use context://momentum to see recent activity
3. Identify patterns in:
   - What types of work we complete successfully
   - How long actions typically take
   - What we learn from completed work
4. Suggest process improvements based on these patterns`;

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: prompt,
            },
          },
        ],
      };
    }
  );

  // Quick session start prompt
  server.prompt(
    'start-session',
    'Quick work session startup check',
    {},
    async () => {
      const prompt = `I'm starting my work session. Please quickly check:
- work://next for the recommended next action
- context://momentum for recent activity  
- work://unblocked to see all options

Give me a 3-line summary of what I should focus on.

WORKFLOW REMINDER: Whatever task you recommend, I will work on it with full lifecycle discipline:
1. Start and focus completely on the chosen task
2. Verify with build/test/deploy before completion  
3. Use complete_action tool when done
4. Only then consider the next task

This disciplined approach ensures quality and prevents half-finished work.`;

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: prompt,
            },
          },
        ],
      };
    }
  );

  // Find related actions prompt
  server.prompt(
    'find-related',
    'Find actions related to a specific topic',
    { topic: z.string().describe('Topic to search for (e.g., "UI", "frontend", "API")') },
    async ({ topic }: { topic: string }) => {
      const prompt = `I want to find all actions related to "${topic}". Please:
1. Get all workable actions from work://unblocked
2. Filter for ones that mention ${topic} or related terms in their title/description
3. Check context://vision to see if ${topic} work aligns with current priorities
4. Rank them by importance`;

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: prompt,
            },
          },
        ],
      };
    }
  );

  // Create new action prompt
  server.prompt(
    'create-action',
    'Create a new action with intelligent placement in the hierarchy',
    { 
      title: z.string().describe('Title of the action to place'),
      description: z.string().optional().describe('Description of the action'),
      vision: z.string().optional().describe('Vision/outcome for the action')
    },
    async ({ title, description, vision }: { title: string; description?: string; vision?: string }) => {
      const prompt = `I want to create a new action: "${title}"
${description ? `\nDescription: ${description}` : ''}${vision ? `\nVision: ${vision}` : ''}

Please help me:

1. First check if a similar action already exists:
   - Use search_actions tool with query="${title}" to find potential duplicates
   - If very similar actions exist (>70% match), suggest using those instead

2. If creating new action, find the best placement:
   - Use work://tree to understand the current hierarchy
   - Search for related actions to understand where similar work lives
   - Identify the most logical parent action

3. Create the action using create_action tool with:
   - The title, description, and vision provided
   - The best parent action ID as family_id
   - Any obvious dependencies if you identify them

4. After creation, show me:
   - The new action's ID and full path in the hierarchy
   - Any sibling actions it's now grouped with
   - Suggested next steps or related actions to create

Only proceed with creation if you're confident about the placement. If unsure, show me the top 2-3 parent options and ask for confirmation.`;

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: prompt,
            },
          },
        ],
      };
    }
  );

  // Report completed work prompt
  server.prompt(
    'report-completed',
    'Search for existing actions for completed work, then complete or create as needed',
    { 
      work_description: z.string().describe('Description of the work that was completed'),
      details: z.string().optional().describe('Additional details about the implementation, impact, or learnings')
    },
    async ({ work_description, details }: { work_description: string; details?: string }) => {
      const prompt = `I just completed some work: "${work_description}"
${details ? `\nDetails: ${details}` : ''}

Help me connect this completed work to our action tracking system:

1. **Search for existing actions first:**
   - Use search_actions tool with query="${work_description}" to find related actions
   - Look for actions that match this completed work (even partially)
   - Consider synonyms and related terms in your search

2. **If you find a matching action:**
   - Show me the best match(es) and ask for confirmation
   - If confirmed, use complete_action tool to mark it as done with:
     - Implementation story: How the work was completed
     - Impact story: What was accomplished and its effect
     - Learning story: Key insights and lessons learned
     - Appropriate editorial content (headline, deck, pull_quotes)

3. **If no existing action matches well:**
   - Find the best placement in the hierarchy using work://tree
   - Create a new action using create_action tool
   - Immediately complete it with the completion context

4. **Always provide:**
   - Clear reasoning for your choice (complete existing vs create new)
   - The action's location in the hierarchy
   - How this work connects to the broader project goals

Start with a thorough search - it's better to complete an existing forgotten action than create duplicate work tracking.`;

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: prompt,
            },
          },
        ],
      };
    }
  );
}

export const promptCapabilities = {
  'claude-code-next-action': {
    description: 'Structured prompt summarizing an action with context',
  },
  'prioritize-work': {
    description: 'Get intelligent work recommendations based on vision, momentum, and dependencies',
  },
  'next-action': {
    description: 'Simple prompt to find the most important next action',
  },
  'work-overview': {
    description: 'Get an overview of the current work state',
  },
  'analyze-blockers': {
    description: 'Understand what is blocking progress',
  },
  'action-context': {
    description: 'Get full context on a specific action',
  },
  'analyze-patterns': {
    description: 'Analyze completed work patterns',
  },
  'start-session': {
    description: 'Quick work session startup check',
  },
  'find-related': {
    description: 'Find actions related to a specific topic',
  },
  'create-action': {
    description: 'Create a new action with intelligent placement in the hierarchy',
  },
  'report-completed': {
    description: 'Search for existing actions for completed work, then complete or create as needed',
  },
};
