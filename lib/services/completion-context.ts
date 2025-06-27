import { eq, desc } from "drizzle-orm";
import { completionContexts, completionContextSchema, type CompletionContext } from "../../db/schema";
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
  structuredData?: Record<string, any>;
  // Git commit information
  gitCommitHash?: string;
  gitCommitMessage?: string;
  gitBranch?: string;
  gitCommitAuthor?: string;
  gitCommitTimestamp?: string;
  gitDiffStats?: {
    filesChanged?: number;
    insertions?: number;
    deletions?: number;
    files?: string[];
  };
  gitRelatedCommits?: string[];
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
  structuredData?: Record<string, any>;
  // Git commit information
  gitCommitHash?: string;
  gitCommitMessage?: string;
  gitBranch?: string;
  gitCommitAuthor?: string;
  gitCommitTimestamp?: string;
  gitDiffStats?: {
    filesChanged?: number;
    insertions?: number;
    deletions?: number;
    files?: string[];
  };
  gitRelatedCommits?: string[];
}

export class CompletionContextService {
  /**
   * Create a new completion context for an action
   */
  static async createCompletionContext(params: CreateCompletionContextParams) {
    const { actionId, implementationStory, impactStory, learningStory, headline, deck, pullQuotes, changelogVisibility, structuredData, gitCommitHash, gitCommitMessage, gitBranch, gitCommitAuthor, gitCommitTimestamp, gitDiffStats, gitRelatedCommits } = params;
    
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
        structuredData,
        gitCommitHash,
        gitCommitMessage,
        gitBranch,
        gitCommitAuthor,
        gitCommitTimestamp: gitCommitTimestamp ? new Date(gitCommitTimestamp) : undefined,
        gitDiffStats,
        gitRelatedCommits,
      })
      .returning();

    return newContext[0];
  }

  /**
   * Update or create completion context for an action
   */
  static async upsertCompletionContext(params: UpdateCompletionContextParams) {
    const { actionId, implementationStory, impactStory, learningStory, headline, deck, pullQuotes, changelogVisibility, structuredData, gitCommitHash, gitCommitMessage, gitBranch, gitCommitAuthor, gitCommitTimestamp, gitDiffStats, gitRelatedCommits } = params;
    
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
      if (structuredData !== undefined) updateData.structuredData = structuredData;
      if (gitCommitHash !== undefined) updateData.gitCommitHash = gitCommitHash;
      if (gitCommitMessage !== undefined) updateData.gitCommitMessage = gitCommitMessage;
      if (gitBranch !== undefined) updateData.gitBranch = gitBranch;
      if (gitCommitAuthor !== undefined) updateData.gitCommitAuthor = gitCommitAuthor;
      if (gitCommitTimestamp !== undefined) updateData.gitCommitTimestamp = gitCommitTimestamp ? new Date(gitCommitTimestamp) : null;
      if (gitDiffStats !== undefined) updateData.gitDiffStats = gitDiffStats;
      if (gitRelatedCommits !== undefined) updateData.gitRelatedCommits = gitRelatedCommits;
      
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