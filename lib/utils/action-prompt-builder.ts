import { ActionDetailResource } from '../types/resources';

export function buildActionPrompt(action: ActionDetailResource): string {
  let prompt = `# Current Task\n**${action.title}**\n`;
  prompt += `https://www.actionbias.ai/${action.id}\n`;
  if (action.description) prompt += `\n${action.description}\n\n`;
  else prompt += `\n`;
  prompt += `# Vision\n${action.vision || 'No vision defined for this action.'}\n\n`;
  prompt += `# Context from Family Chain\n${action.family_context_summary || 'No family context.'}\n\n`;
  prompt += `# Broader Vision\n${action.family_vision_summary || 'No family vision context.'}\n\n`;

  // Show dependencies list if any exist
  if (action.dependencies && action.dependencies.length > 0) {
    prompt += `# Dependencies\n`;
    for (const dep of action.dependencies) {
      const status = dep.done ? '✓ Complete' : '○ Incomplete';
      prompt += `- **${dep.title}** — ${status}\n`;
    }
    prompt += `\n`;
  }

  // Show completion context only if there are completed dependencies
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
  } else if (!action.dependencies || action.dependencies.length === 0) {
    prompt += `# Dependencies\n`;
    prompt += `No dependencies. This is a standalone action.\n`;
  }

  return prompt;
}