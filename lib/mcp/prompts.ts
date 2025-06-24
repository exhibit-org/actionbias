import { z } from "zod";
import { ActionsService } from "../services/actions";
import { buildActionPrompt } from "../utils/action-prompt-builder";

export function registerPrompts(server: any) {
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
}

export const promptCapabilities = {
  'claude-code-next-action': {
    description: 'Structured prompt summarizing an action with context',
  },
};
