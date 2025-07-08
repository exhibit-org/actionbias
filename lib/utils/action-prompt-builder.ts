import { ActionDetailResource } from '../types/resources';

export function buildActionPrompt(action: ActionDetailResource): string {
  let prompt = `# Current Task\n**${action.title}**\n`;
  prompt += `https://done.engineering/${action.id}\n`;
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

  // Show action's own completion context if it's completed
  if (action.done && action.completion_context) {
    prompt += `\n# Completion Context\n`;
    prompt += `This action has been completed:\n\n`;
    
    // Show editorial content if available
    if (action.completion_context.headline) {
      prompt += `## ${action.completion_context.headline}\n\n`;
    }
    if (action.completion_context.deck) {
      prompt += `*${action.completion_context.deck}*\n\n`;
    }
    
    if (action.completion_context.implementation_story) {
      prompt += `**How it was built:** ${action.completion_context.implementation_story}\n\n`;
    }
    if (action.completion_context.impact_story) {
      prompt += `**Impact:** ${action.completion_context.impact_story}\n\n`;
    }
    if (action.completion_context.learning_story) {
      prompt += `**Learnings:** ${action.completion_context.learning_story}\n\n`;
    }
    
    // Show pull quotes if available
    if (action.completion_context.pull_quotes && action.completion_context.pull_quotes.length > 0) {
      prompt += `### Key Insights\n`;
      for (const quote of action.completion_context.pull_quotes) {
        prompt += `> ${quote}\n\n`;
      }
    }
  }

  // Add lifecycle instructions for incomplete actions
  if (!action.done) {
    prompt += `\n\n# Task Execution Lifecycle\n\n`;
    prompt += `## Before You Begin\n`;
    prompt += `1. **Start working on this task** - Begin implementation immediately\n`;
    prompt += `2. **Stay focused** - Complete this task fully before considering other work\n`;
    prompt += `3. **Ask for clarification** - If anything is unclear, ask the user before proceeding\n\n`;
    
    prompt += `## During Implementation\n`;
    prompt += `1. **Follow TDD principles** - Write tests first when applicable\n`;
    prompt += `2. **Make incremental progress** - Commit working code frequently\n`;
    prompt += `3. **Document decisions** - Note any important technical choices or trade-offs\n`;
    prompt += `4. **Handle errors gracefully** - If you encounter blockers, communicate them clearly\n\n`;
    
    prompt += `## Before Marking Complete\n`;
    prompt += `**CRITICAL: You MUST verify all of the following before completion:**\n\n`;
    prompt += `1. **Build Verification**\n`;
    prompt += `   - Run \`pnpm build\` and ensure it succeeds without errors\n`;
    prompt += `   - Fix any TypeScript errors, linting issues, or build failures\n\n`;
    
    prompt += `2. **Test Verification**\n`;
    prompt += `   - Run \`pnpm test\` and ensure all tests pass\n`;
    prompt += `   - If you added new functionality, include appropriate tests\n`;
    prompt += `   - Fix any failing tests before proceeding\n\n`;
    
    prompt += `3. **Code Quality Check**\n`;
    prompt += `   - Run \`pnpm typecheck\` if available to verify TypeScript correctness\n`;
    prompt += `   - Run \`pnpm lint\` if available to ensure code style compliance\n`;
    prompt += `   - Address any issues found\n\n`;
    
    prompt += `4. **Deployment Verification**\n`;
    prompt += `   - Push your changes to the main branch\n`;
    prompt += `   - Verify the deployment succeeds (check Vercel deployment status)\n`;
    prompt += `   - Test the functionality in the deployed environment if possible\n\n`;
    
    prompt += `5. **User Validation**\n`;
    prompt += `   - Ask the user to manually test the implemented functionality\n`;
    prompt += `   - Get explicit confirmation that the implementation meets their requirements\n`;
    prompt += `   - Address any feedback or issues they identify\n\n`;
    
    prompt += `## Task Completion\n`;
    prompt += `**MANDATORY: Once all verification steps pass, you MUST:**\n\n`;
    prompt += `1. **Use the \`complete_action\` tool** to mark this action as complete\n`;
    prompt += `2. **Provide comprehensive completion data** including:\n`;
    prompt += `   - Technical changes made (files modified, features implemented)\n`;
    prompt += `   - Outcomes achieved (bugs fixed, features added, improvements made)\n`;
    prompt += `   - Challenges encountered and how they were resolved\n`;
    prompt += `   - Alignment reflection on how well you understood and achieved the goal\n`;
    prompt += `3. **Do NOT start any other tasks** until this action is properly completed\n\n`;
    
    prompt += `## Quality Standards\n`;
    prompt += `- **No exceptions to the verification process** - All steps must pass\n`;
    prompt += `- **No shortcuts** - Build, test, deploy, and validate every time\n`;
    prompt += `- **No moving between tasks** - Complete one task fully before starting another\n`;
    prompt += `- **Document everything** - Leave clear completion context for future reference\n\n`;
    
    prompt += `Remember: A task is not complete until it passes all verification steps AND is marked complete using the \`complete_action\` tool. Partial implementation or skipping verification steps is not acceptable.\n\n`;
  }

  return prompt;
}