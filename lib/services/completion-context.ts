import { eq, desc } from "drizzle-orm";
import { completionContexts, completionContextSchema, type CompletionContext, type TemplateContent } from "../../db/schema";
import { getDb } from "../db/adapter";

export interface CreateCompletionContextParams {
  actionId: string;
  implementationStory?: string; // Supports markdown formatting
  impactStory?: string; // Supports markdown formatting
  learningStory?: string; // Supports markdown formatting
  headline?: string; // AI-generated compelling headline
  deck?: string; // AI-generated standfirst/subtitle
  pullQuotes?: string[]; // AI-extracted key quotes
  changelogVisibility?: string;
  templateContent?: TemplateContent; // Multi-template content
  // Phase 3: Objective completion data
  technicalChanges?: {
    files_modified?: string[];
    files_created?: string[];
    functions_added?: string[];
    apis_modified?: string[];
    dependencies_added?: string[];
    config_changes?: string[];
  };
  outcomes?: {
    features_implemented?: string[];
    bugs_fixed?: string[];
    performance_improvements?: string[];
    tests_passing?: boolean;
    build_status?: 'success' | 'failed' | 'unknown';
  };
  challenges?: {
    blockers_encountered?: string[];
    blockers_resolved?: string[];
    approaches_tried?: string[];
    discoveries?: string[];
  };
  alignmentReflection?: {
    purpose_interpretation?: string;
    goal_achievement_assessment?: string;
    context_influence?: string;
    assumptions_made?: string[];
  };
  // Git context information
  gitContext?: {
    commits?: Array<{
      hash?: string;
      shortHash?: string;
      message: string;
      author?: {
        name: string;
        email?: string;
        username?: string;
      };
      timestamp?: string;
      branch?: string;
      repository?: string;
      stats?: {
        filesChanged?: number;
        insertions?: number;
        deletions?: number;
        files?: string[];
      };
    }>;
    pullRequests?: Array<{
      number?: number;
      title: string;
      url?: string;
      repository?: string;
      author?: {
        name?: string;
        username?: string;
      };
      state?: 'open' | 'closed' | 'merged' | 'draft';
      merged?: boolean;
      mergedAt?: string;
      branch?: {
        head: string;
        base: string;
      };
    }>;
    repositories?: Array<{
      name: string;
      url?: string;
      platform?: 'github' | 'gitlab' | 'other';
    }>;
  };
}

export interface UpdateCompletionContextParams {
  actionId: string;
  implementationStory?: string; // Supports markdown formatting
  impactStory?: string; // Supports markdown formatting
  learningStory?: string; // Supports markdown formatting
  headline?: string; // AI-generated compelling headline
  deck?: string; // AI-generated standfirst/subtitle
  pullQuotes?: string[]; // AI-extracted key quotes
  changelogVisibility?: string;
  templateContent?: TemplateContent; // Multi-template content
  // Phase 3: Objective completion data
  technicalChanges?: {
    files_modified?: string[];
    files_created?: string[];
    functions_added?: string[];
    apis_modified?: string[];
    dependencies_added?: string[];
    config_changes?: string[];
  };
  outcomes?: {
    features_implemented?: string[];
    bugs_fixed?: string[];
    performance_improvements?: string[];
    tests_passing?: boolean;
    build_status?: 'success' | 'failed' | 'unknown';
  };
  challenges?: {
    blockers_encountered?: string[];
    blockers_resolved?: string[];
    approaches_tried?: string[];
    discoveries?: string[];
  };
  alignmentReflection?: {
    purpose_interpretation?: string;
    goal_achievement_assessment?: string;
    context_influence?: string;
    assumptions_made?: string[];
  };
  // Git context information
  gitContext?: {
    commits?: Array<{
      hash?: string;
      shortHash?: string;
      message: string;
      author?: {
        name: string;
        email?: string;
        username?: string;
      };
      timestamp?: string;
      branch?: string;
      repository?: string;
      stats?: {
        filesChanged?: number;
        insertions?: number;
        deletions?: number;
        files?: string[];
      };
    }>;
    pullRequests?: Array<{
      number?: number;
      title: string;
      url?: string;
      repository?: string;
      author?: {
        name?: string;
        username?: string;
      };
      state?: 'open' | 'closed' | 'merged' | 'draft';
      merged?: boolean;
      mergedAt?: string;
      branch?: {
        head: string;
        base: string;
      };
    }>;
    repositories?: Array<{
      name: string;
      url?: string;
      platform?: 'github' | 'gitlab' | 'other';
    }>;
  };
}

export class CompletionContextService {
  /**
   * Create a new completion context for an action
   */
  static async createCompletionContext(params: CreateCompletionContextParams) {
    const { 
      actionId, implementationStory, impactStory, learningStory, headline, deck, pullQuotes, 
      changelogVisibility, templateContent, gitContext,
      technicalChanges, outcomes, challenges, alignmentReflection 
    } = params;
    
    // Check if completion context already exists for this action
    const existing = await getDb()
      .select()
      .from(completionContexts)
      .where(eq(completionContexts.actionId, actionId))
      .limit(1);
    
    if (existing.length > 0) {
      throw new Error(`Completion context already exists for action ${actionId}`);
    }
    
    const newContext = await getDb()
      .insert(completionContexts)
      .values({
        id: crypto.randomUUID(),
        actionId,
        implementationStory,
        impactStory,
        learningStory,
        headline,
        deck,
        pullQuotes,
        changelogVisibility: changelogVisibility || 'team',
        templateContent,
        gitContext,
        technicalChanges,
        outcomes,
        challenges,
        alignmentReflection,
      })
      .returning();

    return newContext[0];
  }

  /**
   * Update or create completion context for an action
   */
  static async upsertCompletionContext(params: UpdateCompletionContextParams) {
    const { 
      actionId, implementationStory, impactStory, learningStory, headline, deck, pullQuotes, 
      changelogVisibility, templateContent, gitContext,
      technicalChanges, outcomes, challenges, alignmentReflection 
    } = params;
    
    // Check if completion context already exists
    const existing = await getDb()
      .select()
      .from(completionContexts)
      .where(eq(completionContexts.actionId, actionId))
      .limit(1);
    
    if (existing.length > 0) {
      // Update existing context
      const updateData: any = {
        updatedAt: new Date(),
      };
      
      if (implementationStory !== undefined) updateData.implementationStory = implementationStory;
      if (impactStory !== undefined) updateData.impactStory = impactStory;
      if (learningStory !== undefined) updateData.learningStory = learningStory;
      if (headline !== undefined) updateData.headline = headline;
      if (deck !== undefined) updateData.deck = deck;
      if (pullQuotes !== undefined) updateData.pullQuotes = pullQuotes;
      if (changelogVisibility !== undefined) updateData.changelogVisibility = changelogVisibility;
      if (templateContent !== undefined) updateData.templateContent = templateContent;
      if (gitContext !== undefined) updateData.gitContext = gitContext;
      if (technicalChanges !== undefined) updateData.technicalChanges = technicalChanges;
      if (outcomes !== undefined) updateData.outcomes = outcomes;
      if (challenges !== undefined) updateData.challenges = challenges;
      if (alignmentReflection !== undefined) updateData.alignmentReflection = alignmentReflection;
      
      const updatedContext = await getDb()
        .update(completionContexts)
        .set(updateData)
        .where(eq(completionContexts.actionId, actionId))
        .returning();

      return updatedContext[0];
    } else {
      // Create new context
      return await this.createCompletionContext(params);
    }
  }

  /**
   * Get completion context for an action
   */
  static async getCompletionContext(actionId: string) {
    const result = await getDb()
      .select()
      .from(completionContexts)
      .where(eq(completionContexts.actionId, actionId))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  }

  /**
   * Update completion context for an action
   */
  static async updateCompletionContext(actionId: string, updates: Partial<CreateCompletionContextParams>) {
    const { implementationStory, impactStory, learningStory, headline, deck, pullQuotes, changelogVisibility, templateContent, gitContext } = updates;
    
    const updatedContext = await getDb()
      .update(completionContexts)
      .set({
        ...(implementationStory !== undefined && { implementationStory }),
        ...(impactStory !== undefined && { impactStory }),
        ...(learningStory !== undefined && { learningStory }),
        ...(headline !== undefined && { headline }),
        ...(deck !== undefined && { deck }),
        ...(pullQuotes !== undefined && { pullQuotes }),
        ...(changelogVisibility !== undefined && { changelogVisibility }),
        ...(templateContent !== undefined && { templateContent }),
        ...(gitContext !== undefined && { gitContext }),
      })
      .where(eq(completionContexts.actionId, actionId))
      .returning();

    return updatedContext.length > 0 ? updatedContext[0] : null;
  }

  /**
   * Delete completion context for an action
   */
  static async deleteCompletionContext(actionId: string) {
    const deletedContext = await getDb()
      .delete(completionContexts)
      .where(eq(completionContexts.actionId, actionId))
      .returning();

    return deletedContext.length > 0 ? deletedContext[0] : null;
  }

  /**
   * List all completion contexts with optional filtering
   */
  static async listCompletionContexts(params: {
    limit?: number;
    offset?: number;
    visibility?: string;
  } = {}) {
    const { limit = 20, offset = 0, visibility } = params;
    
    let query = getDb()
      .select()
      .from(completionContexts);
    
    if (visibility) {
      query = query.where(eq(completionContexts.changelogVisibility, visibility)) as any;
    }
    
    const contexts = await query
      .limit(limit)
      .offset(offset)
      .orderBy(desc(completionContexts.completionTimestamp));

    return contexts;
  }
}