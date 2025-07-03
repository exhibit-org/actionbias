import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

export interface ObjectiveCompletionData {
  technical_changes: {
    files_modified: string[];
    files_created: string[];
    functions_added: string[];
    apis_modified: string[];
    dependencies_added: string[];
    config_changes: string[];
  };
  outcomes: {
    features_implemented: string[];
    bugs_fixed: string[];
    performance_improvements: string[];
    tests_passing?: boolean;
    build_status?: "success" | "failed" | "unknown";
  };
  challenges: {
    blockers_encountered: string[];
    blockers_resolved: string[];
    approaches_tried: string[];
    discoveries: string[];
  };
  alignment_reflection: {
    purpose_interpretation: string;
    goal_achievement_assessment: string;
    context_influence: string;
    assumptions_made: string[];
  };
  git_context?: {
    commits?: Array<{
      hash?: string;
      message: string;
      author?: { name: string };
    }>;
  };
}

export interface HookActivity {
  session_id: string;
  tool_usage: Array<{
    tool_name: string;
    timestamp: string;
    inputs?: any;
    outputs?: any;
  }>;
}

export interface EditorialContent {
  implementation_story: string;
  impact_story: string;
  learning_story: string;
  headline: string;
  deck: string;
  pull_quotes: string[];
}

export class ObjectiveEditorialService {
  /**
   * Transform objective completion data and hook activity into editorial content
   */
  static async generateEditorialContent(
    actionTitle: string,
    objectiveData: ObjectiveCompletionData,
    hookActivity?: HookActivity
  ): Promise<EditorialContent> {
    
    const [implementation_story, impact_story, learning_story, headline, deck, pull_quotes] = await Promise.all([
      this.formatImplementationStory(actionTitle, objectiveData, hookActivity),
      this.formatImpactStory(actionTitle, objectiveData),
      this.formatLearningStory(actionTitle, objectiveData),
      this.generateHeadline(actionTitle, objectiveData),
      this.generateDeck(actionTitle, objectiveData),
      this.extractPullQuotes(objectiveData)
    ]);

    return {
      implementation_story,
      impact_story,
      learning_story,
      headline,
      deck,
      pull_quotes
    };
  }

  /**
   * Generate implementation story from technical changes and hook activity
   */
  static async formatImplementationStory(
    actionTitle: string,
    data: ObjectiveCompletionData,
    hookActivity?: HookActivity
  ): Promise<string> {
    
    const technicalChangesText = this.formatTechnicalChanges(data.technical_changes);
    const challengesText = this.formatChallenges(data.challenges);
    const hookContext = hookActivity ? this.formatHookActivity(hookActivity) : '';

    const prompt = `
Transform this objective completion data into a clear, technical implementation story in markdown format:

Action: ${actionTitle}

Technical Changes:
${technicalChangesText}

Challenges & Problem-Solving:
${challengesText}

${hookContext ? `Tool Usage Context:\n${hookContext}\n` : ''}

Agent's Understanding:
${data.alignment_reflection.purpose_interpretation}

Write a clear implementation story that explains:
1. The technical approach taken
2. Key implementation decisions 
3. How challenges were overcome
4. Tools and methods used

Use markdown formatting with backticks around technical terms. Keep it factual and technical, around 150-200 words.
`;

    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt,
      temperature: 0.3,
    });

    return text;
  }

  /**
   * Generate impact story from outcomes data
   */
  static async formatImpactStory(
    actionTitle: string,
    data: ObjectiveCompletionData
  ): Promise<string> {
    
    const outcomesText = this.formatOutcomes(data.outcomes);

    const prompt = `
Transform this objective outcomes data into a clear impact story in markdown format:

Action: ${actionTitle}

Outcomes Achieved:
${outcomesText}

Agent's Assessment:
${data.alignment_reflection.goal_achievement_assessment}

Write a clear impact story that explains:
1. What was accomplished
2. The value delivered
3. Measurable improvements
4. User or system benefits

Use markdown formatting with backticks around technical terms. Keep it results-focused, around 100-150 words.
`;

    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt,
      temperature: 0.3,
    });

    return text;
  }

  /**
   * Generate learning story from challenges and discoveries
   */
  static async formatLearningStory(
    actionTitle: string,
    data: ObjectiveCompletionData
  ): Promise<string> {
    
    const challengesText = this.formatChallenges(data.challenges);
    const assumptionsText = data.alignment_reflection.assumptions_made.length > 0 
      ? data.alignment_reflection.assumptions_made.map(a => `• ${a}`).join('\n')
      : 'No specific assumptions documented';

    const prompt = `
Transform this objective challenges data into a clear learning story in markdown format:

Action: ${actionTitle}

Challenges & Solutions:
${challengesText}

Key Assumptions Made:
${assumptionsText}

Context Influence:
${data.alignment_reflection.context_influence}

Write a clear learning story that explains:
1. Insights gained during implementation
2. What worked well and what didn't
3. Key lessons for future work
4. Process improvements identified

Use markdown formatting. Keep it reflective and educational, around 100-150 words.
`;

    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt,
      temperature: 0.3,
    });

    return text;
  }

  /**
   * Generate compelling headline from action and outcomes
   */
  static async generateHeadline(
    actionTitle: string,
    data: ObjectiveCompletionData
  ): Promise<string> {
    
    const keyOutcomes = [
      ...data.outcomes.features_implemented,
      ...data.outcomes.performance_improvements,
      ...data.outcomes.bugs_fixed
    ].slice(0, 3);

    const prompt = `
Generate a compelling, technical headline for this software development completion:

Action: ${actionTitle}
Key Outcomes: ${keyOutcomes.join(', ')}
Status: ${data.outcomes.build_status || 'completed'}

Write a headline in the style of technical publications like InfoQ or The Economist technology section:
- Factual and measured tone
- Focus on the main technical achievement
- No hyperbole or marketing language
- 8-12 words maximum
- Highlight concrete results

Examples:
"Query performance improved 40% through caching optimization"
"Authentication system deployed with zero-downtime migration"
"Memory leak eliminated in file upload handler"
`;

    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt,
      temperature: 0.2,
    });

    return text.replace(/[""]/g, '').trim();
  }

  /**
   * Generate deck/standfirst from implementation and impact
   */
  static async generateDeck(
    actionTitle: string,
    data: ObjectiveCompletionData
  ): Promise<string> {
    
    const technicalSummary = this.formatTechnicalChanges(data.technical_changes, true);
    const outcomesSummary = this.formatOutcomes(data.outcomes, true);

    const prompt = `
Generate a standfirst/deck for this software development story:

Action: ${actionTitle}
Technical Changes: ${technicalSummary}
Outcomes: ${outcomesSummary}

Write a 2-3 sentence standfirst in the style of The Economist:
- Measured, analytical tone
- Provides context and key findings
- No hyperbole or superlatives
- Technical but accessible
- Sets up the story that follows

Focus on what was done and why it matters.
`;

    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt,
      temperature: 0.3,
    });

    return text.trim();
  }

  /**
   * Extract pull quotes from the completion data
   */
  static async extractPullQuotes(data: ObjectiveCompletionData): Promise<string[]> {
    
    const quotes = [];

    // Quote from purpose interpretation if insightful
    if (data.alignment_reflection.purpose_interpretation.length > 50) {
      quotes.push(data.alignment_reflection.purpose_interpretation);
    }

    // Quote from goal achievement if it shows specific results
    if (data.alignment_reflection.goal_achievement_assessment.length > 30) {
      quotes.push(data.alignment_reflection.goal_achievement_assessment);
    }

    // Quote from context influence if it shows interesting decision-making
    if (data.alignment_reflection.context_influence.length > 40) {
      quotes.push(data.alignment_reflection.context_influence);
    }

    // Quote key discoveries
    if (data.challenges.discoveries.length > 0) {
      quotes.push(...data.challenges.discoveries);
    }

    // Take up to 3 most meaningful quotes
    return quotes.slice(0, 3);
  }

  // Helper methods for formatting data

  private static formatTechnicalChanges(changes: ObjectiveCompletionData['technical_changes'], summary = false): string {
    const items = [];
    
    if (changes.files_modified.length > 0) {
      items.push(`Modified ${changes.files_modified.length} files`);
      if (!summary) items.push(...changes.files_modified.map(f => `  • ${f}`));
    }
    
    if (changes.files_created.length > 0) {
      items.push(`Created ${changes.files_created.length} files`);
      if (!summary) items.push(...changes.files_created.map(f => `  • ${f}`));
    }
    
    if (changes.functions_added.length > 0) {
      items.push(`Added ${changes.functions_added.length} functions`);
      if (!summary) items.push(...changes.functions_added.map(f => `  • ${f}()`));
    }
    
    if (changes.apis_modified.length > 0) {
      items.push(`Modified ${changes.apis_modified.length} APIs`);
      if (!summary) items.push(...changes.apis_modified.map(a => `  • ${a}`));
    }
    
    if (changes.dependencies_added.length > 0) {
      items.push(`Added ${changes.dependencies_added.length} dependencies`);
      if (!summary) items.push(...changes.dependencies_added.map(d => `  • ${d}`));
    }
    
    if (changes.config_changes.length > 0) {
      items.push(`Made ${changes.config_changes.length} configuration changes`);
      if (!summary) items.push(...changes.config_changes.map(c => `  • ${c}`));
    }

    return items.length > 0 ? items.join('\n') : 'No technical changes documented';
  }

  private static formatOutcomes(outcomes: ObjectiveCompletionData['outcomes'], summary = false): string {
    const items = [];
    
    if (outcomes.features_implemented.length > 0) {
      items.push(`Implemented ${outcomes.features_implemented.length} features`);
      if (!summary) items.push(...outcomes.features_implemented.map(f => `  • ${f}`));
    }
    
    if (outcomes.bugs_fixed.length > 0) {
      items.push(`Fixed ${outcomes.bugs_fixed.length} bugs`);
      if (!summary) items.push(...outcomes.bugs_fixed.map(b => `  • ${b}`));
    }
    
    if (outcomes.performance_improvements.length > 0) {
      items.push(`Performance improvements: ${outcomes.performance_improvements.length}`);
      if (!summary) items.push(...outcomes.performance_improvements.map(p => `  • ${p}`));
    }
    
    if (outcomes.tests_passing !== undefined) {
      items.push(`Tests: ${outcomes.tests_passing ? 'passing' : 'failing'}`);
    }
    
    if (outcomes.build_status) {
      items.push(`Build status: ${outcomes.build_status}`);
    }

    return items.length > 0 ? items.join('\n') : 'No outcomes documented';
  }

  private static formatChallenges(challenges: ObjectiveCompletionData['challenges']): string {
    const items = [];
    
    if (challenges.blockers_encountered.length > 0) {
      items.push('Blockers encountered:');
      items.push(...challenges.blockers_encountered.map(b => `  • ${b}`));
    }
    
    if (challenges.blockers_resolved.length > 0) {
      items.push('Solutions applied:');
      items.push(...challenges.blockers_resolved.map(r => `  • ${r}`));
    }
    
    if (challenges.approaches_tried.length > 0) {
      items.push('Approaches tried:');
      items.push(...challenges.approaches_tried.map(a => `  • ${a}`));
    }
    
    if (challenges.discoveries.length > 0) {
      items.push('Key discoveries:');
      items.push(...challenges.discoveries.map(d => `  • ${d}`));
    }

    return items.length > 0 ? items.join('\n') : 'No challenges documented';
  }

  private static formatHookActivity(activity: HookActivity): string {
    const toolCounts: Record<string, number> = {};
    
    activity.tool_usage.forEach(tool => {
      toolCounts[tool.tool_name] = (toolCounts[tool.tool_name] || 0) + 1;
    });

    const items = Object.entries(toolCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([tool, count]) => `${tool}: ${count} uses`);

    return items.length > 0 
      ? `Primary tools used: ${items.join(', ')}`
      : 'No tool usage data available';
  }
}