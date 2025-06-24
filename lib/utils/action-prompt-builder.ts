import { ActionDetailResource } from '../types/resources';

export function buildActionPrompt(action: ActionDetailResource): string {
  let prompt = `# Current Task\n**${action.title}**\n`;
  if (action.description) prompt += `${action.description}\n\n`;
  else prompt += `\n`;
  prompt += `# Vision\n${action.vision || 'No vision defined for this action.'}\n\n`;
  prompt += `# Context from Family Chain\n${action.family_context_summary || 'No family context.'}\n\n`;
  prompt += `# Broader Vision\n${action.family_vision_summary || 'No family vision context.'}\n\n`;

  if (action.dependency_completion_context && action.dependency_completion_context.length > 0) {
    prompt += `# Completion Context from Dependencies\n`;
    prompt += `This action builds on completed dependencies:\n\n`;
    for (const context of action.dependency_completion_context) {
      prompt += `## ${context.action_title}\n`;
      if (context.implementation_story) {
        prompt += `**How it was built:** ${context.implementation_story}\n`;
      }
      if (context.impact_story) {
        prompt += `**Impact:** ${context.impact_story}\n`;
      }
      if (context.learning_story) {
        prompt += `**Learnings:** ${context.learning_story}\n`;
      }
      prompt += `\n`;
    }
    prompt += `Apply these insights to avoid repeating mistakes and build on successful approaches.\n\n`;
  }

  prompt += `# Resource URLs\n`;
  prompt += `- action://tree (full action hierarchy)\n`;
  prompt += `- action://next (current priority action)\n`;
  prompt += `- action://${action.id} (this action's details)\n\n`;
  prompt += `# Repository Quick Setup\n`;
  prompt += `pnpm install\npnpm db:setup\npnpm dev\n\n`;
  prompt += `Refer to README.md for full details.`;

  return prompt;
}