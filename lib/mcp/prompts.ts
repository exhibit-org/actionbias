import { z } from "zod";
import { ActionsService } from "../services/actions";
import { buildActionPrompt } from "../utils/action-prompt-builder";

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
      const prompt = `I need help prioritizing what to work on next in the ActionBias project. Please:

1. First, read the project vision using the context://vision MCP resource
2. Check recent momentum using the context://momentum MCP resource  
3. Get actions with no dependencies using the action://no-dependencies MCP resource
4. Get blocking dependencies using the action://blockers MCP resource
5. Get a count of total incomplete actions using action://list with limit=1

Then analyze and recommend the top 5 actions to work on based on:
- Strategic alignment with the DONE magazine vision
- Building on recent momentum and completed work
- Whether they will unblock other work (check blockers resource)
- Effort vs impact ratio
- Addressing technical debt or critical issues

For each recommendation, provide:
- The action title and description
- A score (0-100) 
- Clear reasoning for the score
- Category (strategic, quick-win, momentum, technical-debt, unblocker)
- Estimated effort (low, medium, high)
- If it's a blocker, list what it would unblock

Be selective with scoring - most actions should score 20-80, with 80+ reserved for truly critical work. Prioritize actions that unblock the most other work.`;

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
      const prompt = `What's the most important thing I should work on next? Check both the action://no-dependencies resource for immediately available tasks and the action://blockers resource to see what would unblock the most work. Pick the top priority based on the project vision (context://vision).`;

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
1. Use action://tree to show the hierarchical structure of incomplete work
2. Use context://momentum to show what's been recently completed
3. Use action://no-dependencies to show what's ready to work on
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
1. Use action://blockers to see which incomplete actions are blocking the most work
2. Use action://no-dependencies to see what's immediately workable
3. Identify the top 3 blockers that would unlock the most work if completed
4. For each blocker, list what specific actions it's preventing`;

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
1. Use action://item/${action_id} to get the action details
2. Show me the full parent chain and context
3. List all dependencies and dependents
4. Check if it appears in action://no-dependencies or if it's listed in action://blockers
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
1. Use action://log to get recent completion logs
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
- action://next for the recommended next action
- context://momentum for recent activity  
- action://no-dependencies to see immediately available work

Give me a 3-line summary of what I should focus on.`;

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
1. Get actions with no dependencies from action://no-dependencies
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
};
