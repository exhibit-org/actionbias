import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import type { TemplateContent } from '../../db/schema';

// Persona definitions for template-specific content generation
export const PERSONAS = {
  engineering: {
    name: "Engineering",
    description: "Senior software engineers and technical leads who care about implementation details, architecture decisions, code quality, and technical trade-offs. They want to understand HOW things work and WHY technical decisions were made.",
    interests: ["system_architecture", "code_quality", "performance", "technical_debt", "tooling", "dev_experience"],
    importance_factors: ["technical_complexity", "architectural_impact", "dev_productivity", "system_reliability"],
    tone: "Technical, precise, focused on implementation details and architectural decisions"
  },
  business: {
    name: "Business", 
    description: "Product managers, executives, and stakeholders who care about strategic outcomes, business value, and competitive positioning. They want to understand WHAT was achieved and WHY it matters to the business.",
    interests: ["business_value", "strategic_outcomes", "competitive_advantage", "user_impact", "revenue_impact"],
    importance_factors: ["strategic_value", "user_impact", "business_metrics", "competitive_positioning"],
    tone: "Strategic, measured, focused on outcomes and business value like The Economist"
  },
  customer: {
    name: "Customer",
    description: "End users and customers who care about features, benefits, and how improvements affect their experience. They want to understand WHAT changed for them and HOW it helps them.",
    interests: ["new_features", "user_experience", "problem_solving", "ease_of_use", "value_delivered"],
    importance_factors: ["user_facing_changes", "problem_resolution", "feature_completeness", "user_satisfaction"],
    tone: "User-friendly, benefit-focused, clear explanations of value delivered"
  }
} as const;

type PersonaType = keyof typeof PERSONAS;

// Interface for objective completion data (Phase 3 format)
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
    build_status?: 'success' | 'failed' | 'unknown';
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
      branch?: string;
      repository?: string;
    }>;
    pullRequests?: Array<{
      title: string;
      url?: string;
      state?: string;
    }>;
  };
}

export interface TemplateGenerationOptions {
  actionTitle: string;
  actionDescription?: string;
  objectiveData: ObjectiveCompletionData;
  template: PersonaType;
}

export class TemplateContentService {
  /**
   * Generate template-specific content for a given persona
   */
  static async generateTemplateContent(options: TemplateGenerationOptions): Promise<TemplateContent[PersonaType]> {
    const { actionTitle, actionDescription, objectiveData, template } = options;
    const persona = PERSONAS[template];

    // First, evaluate importance for this persona
    const importance = await this.evaluateImportance(options);

    // Generate template-specific content based on persona
    const content = await this.generateContentForPersona({
      actionTitle,
      actionDescription,
      objectiveData,
      persona,
      personaType: template,
      importance
    });

    return {
      ...content,
      importance
    };
  }

  /**
   * Evaluate how important this completion is for a specific persona
   */
  private static async evaluateImportance(options: TemplateGenerationOptions): Promise<'high' | 'medium' | 'low'> {
    const { actionTitle, objectiveData, template } = options;
    const persona = PERSONAS[template];

    const prompt = `
Evaluate the importance of this completed action for the ${persona.name} persona.

Action: ${actionTitle}
Persona: ${persona.description}
Persona Interests: ${persona.interests.join(', ')}
Importance Factors: ${persona.importance_factors.join(', ')}

Technical Changes: ${JSON.stringify(objectiveData.technical_changes, null, 2)}
Outcomes: ${JSON.stringify(objectiveData.outcomes, null, 2)}

Based on the persona's interests and importance factors, rate this completion as:
- HIGH: Major impact on this persona's interests, significant value delivered
- MEDIUM: Moderate impact, some value but not transformational  
- LOW: Minor impact, limited relevance to this persona's core interests

Respond with only: HIGH, MEDIUM, or LOW
`;

    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt,
      temperature: 0.1,
    });

    const rating = text.trim().toUpperCase();
    if (rating === 'HIGH') return 'high';
    if (rating === 'LOW') return 'low';
    return 'medium';
  }

  /**
   * Generate persona-specific content (headline, story, etc.)
   */
  private static async generateContentForPersona(params: {
    actionTitle: string;
    actionDescription?: string;
    objectiveData: ObjectiveCompletionData;
    persona: typeof PERSONAS[PersonaType];
    personaType: PersonaType;
    importance: 'high' | 'medium' | 'low';
  }) {
    const { actionTitle, actionDescription, objectiveData, persona, personaType, importance } = params;

    // Generate different content based on template type
    if (personaType === 'engineering') {
      return this.generateEngineeringContent({ actionTitle, objectiveData, importance });
    } else if (personaType === 'business') {
      return this.generateBusinessContent({ actionTitle, objectiveData, importance });
    } else if (personaType === 'customer') {
      return this.generateCustomerContent({ actionTitle, objectiveData, importance });
    }

    throw new Error(`Unknown persona: ${personaType}`);
  }

  /**
   * Generate engineering-focused content
   */
  private static async generateEngineeringContent(params: {
    actionTitle: string;
    objectiveData: ObjectiveCompletionData;
    importance: 'high' | 'medium' | 'low';
  }) {
    const { actionTitle, objectiveData, importance } = params;

    const prompt = `
Generate engineering-focused content for this technical completion:

Action: ${actionTitle}
Importance Level: ${importance}

Technical Changes:
${JSON.stringify(objectiveData.technical_changes, null, 2)}

Outcomes:
${JSON.stringify(objectiveData.outcomes, null, 2)}

Challenges:
${JSON.stringify(objectiveData.challenges, null, 2)}

Implementation Approach:
${objectiveData.alignment_reflection.purpose_interpretation}

Generate content in this JSON format:
{
  "headline": "Technical headline focusing on implementation",
  "deck": "Technical summary of what was built and how",
  "implementation_story": "Detailed technical story with code focus",
  "impact_story": "Technical impact and system improvements",
  "pull_quotes": ["Technical insight 1", "Technical insight 2", "Technical insight 3"]
}

Requirements:
- Use technical language appropriate for senior engineers
- Focus on HOW things were implemented and WHY decisions were made
- Include specific technical details from the data
- Emphasize architecture, code quality, and system design
- Use backticks around technical terms and \`code\`
- Be factual and precise, avoid marketing language
`;

    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt,
      temperature: 0.3,
    });

    try {
      return JSON.parse(text);
    } catch (error) {
      console.error('Failed to parse engineering content JSON:', error);
      console.error('Raw AI response:', text);
      
      // Better fallback using actual objective data
      const implementationFeatures = objectiveData.outcomes.features_implemented.length > 0 
        ? objectiveData.outcomes.features_implemented.join(', ')
        : 'Technical implementation completed';
      
      const impactSummary = objectiveData.alignment_reflection.goal_achievement_assessment || 
        'System improvements delivered';
      
      const technicalInsights = [
        objectiveData.alignment_reflection.purpose_interpretation,
        ...objectiveData.challenges.discoveries.slice(0, 2)
      ].filter(Boolean);
      
      return {
        headline: actionTitle,
        deck: objectiveData.alignment_reflection.purpose_interpretation || `Technical implementation: ${actionTitle}`,
        implementation_story: `## Technical Implementation\n\n${objectiveData.alignment_reflection.purpose_interpretation}\n\n### Features Implemented\n${implementationFeatures}\n\n### Technical Approach\n${objectiveData.alignment_reflection.context_influence || 'Implementation completed successfully.'}`,
        impact_story: `## Technical Impact\n\n${impactSummary}\n\n### System Changes\n- Files modified: ${objectiveData.technical_changes.files_modified.length}\n- Functions added: ${objectiveData.technical_changes.functions_added.length}\n- Features implemented: ${objectiveData.outcomes.features_implemented.length}`,
        pull_quotes: technicalInsights.length > 0 ? technicalInsights : [objectiveData.alignment_reflection.purpose_interpretation || "Technical implementation completed successfully"]
      };
    }
  }

  /**
   * Generate business-focused content (Economist style)
   */
  private static async generateBusinessContent(params: {
    actionTitle: string;
    objectiveData: ObjectiveCompletionData;
    importance: 'high' | 'medium' | 'low';
  }) {
    const { actionTitle, objectiveData, importance } = params;

    const prompt = `
Generate business-focused content in The Economist style for this completion:

Action: ${actionTitle}
Importance Level: ${importance}

Outcomes:
${JSON.stringify(objectiveData.outcomes, null, 2)}

Strategic Context:
${objectiveData.alignment_reflection.context_influence}

Business Impact:
${objectiveData.alignment_reflection.goal_achievement_assessment}

Generate content in this JSON format:
{
  "headline": "Strategic headline focusing on business outcomes",
  "deck": "Economist-style standfirst explaining business significance",
  "impact_story": "Strategic analysis of business value delivered",
  "strategic_implications": "Long-term business implications and value",
  "pull_quotes": ["Strategic insight 1", "Business value insight 2", "Market impact insight 3"]
}

Requirements:
- Use The Economist's measured, analytical tone
- Focus on WHAT was achieved and WHY it matters strategically
- Emphasize business value, competitive advantage, user impact
- Be factual and avoid hyperbole
- Focus on strategic outcomes rather than technical details
`;

    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt,
      temperature: 0.2,
    });

    try {
      return JSON.parse(text);
    } catch (error) {
      console.error('Failed to parse business content JSON:', error);
      return {
        headline: actionTitle,
        deck: objectiveData.alignment_reflection.goal_achievement_assessment,
        impact_story: "Strategic value delivered through this initiative.",
        strategic_implications: "Long-term benefits realized for the business.",
        pull_quotes: ["Strategic progress achieved."]
      };
    }
  }

  /**
   * Generate customer-focused content
   */
  private static async generateCustomerContent(params: {
    actionTitle: string;
    objectiveData: ObjectiveCompletionData;
    importance: 'high' | 'medium' | 'low';
  }) {
    const { actionTitle, objectiveData, importance } = params;

    const prompt = `
Generate customer-focused content for this completion:

Action: ${actionTitle}
Importance Level: ${importance}

Features Implemented:
${objectiveData.outcomes.features_implemented.join(', ')}

Bugs Fixed:
${objectiveData.outcomes.bugs_fixed.join(', ')}

Performance Improvements:
${objectiveData.outcomes.performance_improvements.join(', ')}

User Context:
${objectiveData.alignment_reflection.purpose_interpretation}

Generate content in this JSON format:
{
  "headline": "User-friendly headline about what customers get",
  "announcement": "Clear explanation of what changed for users",
  "feature_highlights": "Key features and benefits for users",
  "user_benefits": "Specific benefits users will experience",
  "pull_quotes": ["User benefit 1", "Feature highlight 2", "Experience improvement 3"]
}

Requirements:
- Use clear, non-technical language customers can understand
- Focus on WHAT changed for users and HOW it helps them
- Emphasize user benefits, problem-solving, improved experience
- Avoid technical jargon, focus on value delivered to users
- Be specific about user-facing improvements
`;

    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt,
      temperature: 0.3,
    });

    try {
      return JSON.parse(text);
    } catch (error) {
      console.error('Failed to parse customer content JSON:', error);
      return {
        headline: actionTitle,
        announcement: "Improvements made to enhance your experience.",
        feature_highlights: objectiveData.outcomes.features_implemented.join(', ') || "System enhancements",
        user_benefits: "Better performance and user experience.",
        pull_quotes: ["Enhanced user experience delivered."]
      };
    }
  }

  /**
   * Generate content for all templates in one pass
   */
  static async generateAllTemplateContent(options: Omit<TemplateGenerationOptions, 'template'>): Promise<TemplateContent> {
    const [engineering, business, customer] = await Promise.all([
      this.generateTemplateContent({ ...options, template: 'engineering' }),
      this.generateTemplateContent({ ...options, template: 'business' }),
      this.generateTemplateContent({ ...options, template: 'customer' }),
    ]);

    return {
      engineering,
      business,
      customer,
    };
  }
}