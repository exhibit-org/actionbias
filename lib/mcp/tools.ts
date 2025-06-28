import { z } from "zod";
import { ActionsService } from "../services/actions";
import { VectorPlacementService } from "../services/vector-placement";
import { ActionSearchService } from "../services/action-search";
import { getDb } from "../db/adapter";
import { actions, edges, actionDataSchema } from "../../db/schema";
import { eq, and } from "drizzle-orm";

// Helper function to make internal API calls with authentication
async function makeApiCall(endpoint: string, options: RequestInit = {}, authToken?: string, hostHeader?: string) {
  // Use the host header from the current request if available, otherwise fall back to VERCEL_URL
  let baseUrl;
  if (hostHeader) {
    baseUrl = `https://${hostHeader}`;
  } else if (typeof window !== 'undefined') {
    baseUrl = window.location.origin;
  } else if (process.env.VERCEL_URL) {
    baseUrl = `https://${process.env.VERCEL_URL}`;
  } else {
    baseUrl = 'http://localhost:3000';
  }
  
  const url = `${baseUrl}/api${endpoint}`;
  console.log(`Making API call to: ${url}`);
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Add existing headers
  if (options.headers) {
    Object.assign(headers, options.headers);
  }
  
  // Add authentication if available
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
    console.log('Adding authentication to API call');
  } else {
    console.log('No authentication token available for API call');
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  console.log(`API response status: ${response.status} ${response.statusText}`);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`API call failed: ${response.status} ${response.statusText}`, errorText);
    throw new Error(`API call failed: ${response.status} ${response.statusText}`);
  }
  
  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    const errorText = await response.text();
    console.error(`Expected JSON but got: ${contentType}`, errorText);
    throw new Error(`Expected JSON response but got ${contentType}`);
  }
  
  const data = await response.json();
  return data;
}


export function registerTools(server: any) {
  // create_action - Create a new action
  server.tool(
    "create_action",
    "Create a new action in the database with a required family (use suggest_family to find appropriate placement)",
    {
      title: z.string().min(1).describe("The title for the action"),
      description: z.string().optional().describe("Detailed instructions or context describing how the action should be performed"),
      vision: z.string().optional().describe("A clear communication of the state of the world when the action is complete"),
      family_id: z.string().uuid().describe("Required family action ID to create a family relationship (use suggest_family tool to find appropriate family)"),
      depends_on_ids: z.array(z.string().uuid()).optional().describe("Optional array of action IDs that this action depends on"),
      override_duplicate_check: z.boolean().optional().describe("Override duplicate detection check if you intentionally want to create a similar action"),
    },
    async ({ title, description, vision, family_id, depends_on_ids, override_duplicate_check }: { title: string; description?: string; vision?: string; family_id: string; depends_on_ids?: string[]; override_duplicate_check?: boolean }, extra: any) => {
      try {
        console.log(`Creating action with title: ${title}`);
        
        // Validate family_id exists
        const db = getDb();
        const familyAction = await db.select().from(actions).where(eq(actions.id, family_id)).limit(1);
        
        if (familyAction.length === 0) {
          throw new Error(`Family action with ID ${family_id} not found. Use suggest_family tool to find a valid family.`);
        }
        
        // Call ActionsService directly to avoid HTTP authentication issues
        const result = await ActionsService.createAction({ 
          title, 
          description, 
          vision, 
          parent_id: family_id, 
          depends_on_ids,
          override_duplicate_check 
        });

        // Check if duplicate warning was returned
        if (result.duplicate_warning) {
          let warningMessage = `⚠️ **Duplicate Detection Warning**\n\n`;
          warningMessage += `${result.duplicate_warning.message}\n\n`;
          warningMessage += `**Potential Duplicates Found:**\n\n`;
          
          result.duplicate_warning.potential_duplicates.forEach((dup, index) => {
            warningMessage += `${index + 1}. **${dup.title}** (${(dup.similarity * 100).toFixed(1)}% similarity)\n`;
            warningMessage += `   ID: ${dup.id}\n`;
            if (dup.description) {
              warningMessage += `   Description: ${dup.description.substring(0, 100)}${dup.description.length > 100 ? '...' : ''}\n`;
            }
            if (dup.path && dup.path.length > 0) {
              warningMessage += `   Path: ${dup.path.join(' → ')}\n`;
            }
            warningMessage += `\n`;
          });
          
          warningMessage += `**Suggestion:** ${result.duplicate_warning.suggestion}`;
          
          return {
            content: [
              {
                type: "text",
                text: warningMessage,
              },
            ],
          };
        }

        const { action, dependencies_count } = result;
        let message = `Created action: ${title}\nID: ${action.id}\nCreated: ${action.createdAt}`;
        
        message += `\nParent: ${family_id}`;
        
        if (dependencies_count > 0) {
          message += `\nDependencies: ${dependencies_count} actions`;
        }

        return {
          content: [
            {
              type: "text",
              text: message,
            },
          ],
        };
      } catch (error) {
        console.error('Error creating action:', error);
        return {
          content: [
            {
              type: "text",
              text: `Error creating action: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    },
  );


  // add_dependency - Create dependency relationship
  server.tool(
    "add_dependency",
    "Create a dependency relationship between two existing actions",
    {
      action_id: z.string().uuid().describe("The ID of the action that depends on another"),
      depends_on_id: z.string().uuid().describe("The ID of the action that must be completed first"),
    },
    async ({ action_id, depends_on_id }: { action_id: string; depends_on_id: string }, extra: any) => {
      try {
        console.log(`Creating dependency: ${action_id} depends on ${depends_on_id}`);
        
        // Call ActionsService directly to avoid HTTP authentication issues
        const edge = await ActionsService.addDependency({ action_id, depends_on_id });

        return {
          content: [
            {
              type: "text",
              text: `Created dependency: ${action_id} depends on ${depends_on_id}\nCreated: ${edge.createdAt}`,
            },
          ],
        };
      } catch (error) {
        console.error('Error creating dependency:', error);
        return {
          content: [
            {
              type: "text",
              text: `Error creating dependency: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    },
  );

  // delete_action - Delete an action
  server.tool(
    "delete_action",
    "Delete an action and handle its children",
    {
      action_id: z.string().uuid().describe("The ID of the action to delete"),
      child_handling: z.enum(["delete_recursive", "reparent"]).default("reparent").describe("How to handle child actions: delete_recursive (delete all children), or reparent (move children to deleted action's parent)"),
      new_parent_id: z.string().uuid().optional().describe("Required if child_handling is 'reparent' - the new parent for orphaned children"),
    },
    async ({ action_id, child_handling, new_parent_id }: { action_id: string; child_handling?: "delete_recursive" | "reparent"; new_parent_id?: string }, extra: any) => {
      try {
        console.log(`Deleting action ${action_id} with child handling: ${child_handling}`);
        
        // Call ActionsService directly to avoid HTTP authentication issues
        const result = await ActionsService.deleteAction({ action_id, child_handling, new_parent_id });

        const { deleted_action, children_count, child_handling: handling, new_parent_id: newParentId } = result;
        let message = `Deleted action: ${deleted_action.data?.title}\nID: ${action_id}`;
        
        if (children_count > 0) {
          message += `\nChildren handled via ${handling}: ${children_count} child actions`;
          if (handling === "reparent" && newParentId) {
            message += `\nNew parent: ${newParentId}`;
          }
        }

        return {
          content: [
            {
              type: "text",
              text: message,
            },
          ],
        };
      } catch (error) {
        console.error('Error deleting action:', error);
        return {
          content: [
            {
              type: "text",
              text: `Error deleting action: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    },
  );

  // remove_dependency - Remove dependency relationship
  server.tool(
    "remove_dependency",
    "Remove a dependency relationship between two actions",
    {
      action_id: z.string().uuid().describe("The ID of the action that currently depends on another"),
      depends_on_id: z.string().uuid().describe("The ID of the action that the dependency should be removed from"),
    },
    async ({ action_id, depends_on_id }: { action_id: string; depends_on_id: string }, extra: any) => {
      try {
        console.log(`Removing dependency: ${action_id} no longer depends on ${depends_on_id}`);
        
        // Call ActionsService directly to avoid HTTP authentication issues
        const result = await ActionsService.removeDependency({ action_id, depends_on_id });

        const { action, depends_on, deleted_edge } = result;

        return {
          content: [
            {
              type: "text",
              text: `Removed dependency: ${action.data?.title} no longer depends on ${depends_on.data?.title}\nRemoved: ${deleted_edge.createdAt}`,
            },
          ],
        };
      } catch (error) {
        console.error('Error removing dependency:', error);
        return {
          content: [
            {
              type: "text",
              text: `Error removing dependency: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    },
  );

  // update_action - Update an action
  server.tool(
    "update_action",
    "Update an existing action's properties including title and description (use complete_action to mark actions as done)",
    {
      action_id: z.string().uuid().describe("The ID of the action to update"),
      title: z.string().min(1).optional().describe("The new title for the action"),
      description: z.string().optional().describe("Detailed instructions or context describing how the action should be performed"),
      vision: z.string().optional().describe("A clear communication of the state of the world when the action is complete"),
    },
    async ({ action_id, title, description, vision }: { 
      action_id: string; 
      title?: string; 
      description?: string; 
      vision?: string; 
    }, extra: any) => {
      try {
        // Validate that at least one field is provided
        if (title === undefined && description === undefined && vision === undefined) {
          return {
            content: [
              {
                type: "text",
                text: "Error: At least one field (title, description, or vision) must be provided",
              },
            ],
          };
        }

        const updateData: any = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (vision !== undefined) updateData.vision = vision;
        
        console.log(`Updating action ${action_id} with:`, updateData);
        
        // Call ActionsService directly to avoid HTTP authentication issues
        const action = await ActionsService.updateAction({
          action_id,
          ...updateData
        });
        let message = `Updated action: ${action.data?.title}\nID: ${action.id}\nUpdated: ${action.updatedAt}`;

        return {
          content: [
            {
              type: "text",
              text: message,
            },
          ],
        };
      } catch (error) {
        console.error('Error updating action:', error);
        return {
          content: [
            {
              type: "text",
              text: `Error updating action: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    },
  );

  // complete_action - Mark an action as completed with required completion context
  server.tool(
    "complete_action",
    "Mark an action as completed with REQUIRED completion context for dynamic changelog generation. ALL parameters are REQUIRED including editorial content (headline, deck, pull_quotes). Write detailed stories with code snippets where relevant. Format technical terms with backticks (`) for proper rendering. Adopt a measured, analytical tone similar to The Economist or scientific journals. Optionally include git commit information to link completed work with code changes.",
    {
      action_id: z.string().uuid().describe("The ID of the action to complete"),
      implementation_story: z.string().min(1).describe("How was this action implemented? What approach was taken, what tools were used, what challenges were overcome? Supports markdown formatting. IMPORTANT: Use backticks (`) around ALL technical terms including file paths (e.g., `/api/actions`), function names (e.g., `generateText()`), APIs, libraries, commands, and code-related terms."),
      impact_story: z.string().min(1).describe("What was accomplished by completing this action? What impact did it have on the project or users? Supports markdown formatting. IMPORTANT: Use backticks (`) around technical terms like metrics, API endpoints, database fields, etc."),
      learning_story: z.string().min(1).describe("What insights were gained? What worked well or poorly? What would be done differently? Supports markdown formatting. IMPORTANT: Use backticks (`) around technical concepts, tools, and code-related terms."),
      changelog_visibility: z.enum(["private", "team", "public"]).describe("REQUIRED: Who should see this completion context in changelog generation (default: 'team')"),
      // Required editorial content for magazine-style display
      headline: z.string().describe("REQUIRED: AI-generated headline in the style of The Economist or Nature (e.g., 'Search latency reduced by 70% through architectural improvements', 'New caching strategy improves database performance')"),
      deck: z.string().describe("REQUIRED: AI-generated standfirst in the style of The Economist - a measured 2-3 sentence summary that provides context and key findings without hyperbole"),
      pull_quotes: z.array(z.string()).describe("REQUIRED: AI-extracted notable quotes from the completion stories that highlight key findings, technical insights, or lessons learned - avoid superlatives"),
      // Optional git context information
      git_context: z.object({
        commits: z.array(z.object({
          hash: z.string().optional().describe("SHA hash (optional - might not know yet)"),
          shortHash: z.string().optional().describe("Short SHA (7 chars)"),
          message: z.string().describe("Commit message (required)"),
          author: z.object({
            name: z.string().describe("Author name"),
            email: z.string().optional().describe("Author email"),
            username: z.string().optional().describe("GitHub username")
          }).optional(),
          timestamp: z.string().optional().describe("ISO timestamp"),
          branch: z.string().optional().describe("Branch name"),
          repository: z.string().optional().describe("Repository name/URL"),
          stats: z.object({
            filesChanged: z.number().optional(),
            insertions: z.number().optional(),
            deletions: z.number().optional(),
            files: z.array(z.string()).optional()
          }).optional()
        })).optional().describe("Array of commits associated with this action"),
        pullRequests: z.array(z.object({
          number: z.number().optional().describe("PR number (optional - might not exist yet)"),
          title: z.string().describe("PR title (required)"),
          url: z.string().optional().describe("Full PR URL"),
          repository: z.string().optional().describe("Repository name/URL"),
          author: z.object({
            name: z.string().optional(),
            username: z.string().optional()
          }).optional(),
          state: z.enum(['open', 'closed', 'merged', 'draft']).optional(),
          merged: z.boolean().optional(),
          mergedAt: z.string().optional(),
          branch: z.object({
            head: z.string().describe("Source branch"),
            base: z.string().describe("Target branch")
          }).optional()
        })).optional().describe("Array of pull requests associated with this action"),
        repositories: z.array(z.object({
          name: z.string().describe("Repository name"),
          url: z.string().optional().describe("Repository URL"),
          platform: z.enum(['github', 'gitlab', 'other']).optional()
        })).optional().describe("Repositories involved in this work")
      }).optional().describe("Flexible git context including commits, pull requests, and repository information. Provide whatever information you have available."),
    },
    async ({ action_id, implementation_story, impact_story, learning_story, changelog_visibility, headline, deck, pull_quotes, git_context }: { 
      action_id: string; 
      implementation_story: string;
      impact_story: string;
      learning_story: string;
      changelog_visibility: "private" | "team" | "public";
      headline: string;
      deck: string;
      pull_quotes: string[];
      git_context?: {
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
    }, extra: any) => {
      try {
        console.log(`Completing action ${action_id} with completion context`);
        
        // Call ActionsService directly to avoid HTTP authentication issues
        const action = await ActionsService.updateAction({
          action_id,
          done: true,
          completion_context: {
            implementation_story,
            impact_story,
            learning_story,
            changelog_visibility,
            headline,
            deck,
            pull_quotes,
            git_context
          }
        });
        
        let message = `✅ Completed action: ${action.data?.title}\nID: ${action.id}\nCompleted: ${action.updatedAt}`;
        message += `\n\n📋 Completion Context Captured:`;
        message += `\n• Implementation: ${implementation_story.substring(0, 100)}${implementation_story.length > 100 ? '...' : ''}`;
        message += `\n• Impact: ${impact_story.substring(0, 100)}${impact_story.length > 100 ? '...' : ''}`;
        message += `\n• Learning: ${learning_story.substring(0, 100)}${learning_story.length > 100 ? '...' : ''}`;
        message += `\n• Visibility: ${changelog_visibility}`;
        
        if (git_context?.commits && git_context.commits.length > 0) {
          message += `\n\n🔗 Git Information:`;
          git_context.commits.forEach((commit, index) => {
            if (index < 3) { // Show up to 3 commits in summary
              if (commit.hash) message += `\n• Commit: ${commit.shortHash || commit.hash.substring(0, 7)}`;
              message += `\n  ${commit.message.substring(0, 50)}${commit.message.length > 50 ? '...' : ''}`;
              if (commit.branch) message += `\n  Branch: ${commit.branch}`;
              if (commit.author) message += `\n  Author: ${commit.author.name}`;
            }
          });
          if (git_context.commits.length > 3) {
            message += `\n• ...and ${git_context.commits.length - 3} more commit${git_context.commits.length - 3 === 1 ? '' : 's'}`;
          }
          if (git_context.pullRequests && git_context.pullRequests.length > 0) {
            message += `\n• Pull Requests: ${git_context.pullRequests.length}`;
          }
        }

        return {
          content: [
            {
              type: "text",
              text: message,
            },
          ],
        };
      } catch (error) {
        console.error('Error completing action:', error);
        return {
          content: [
            {
              type: "text",
              text: `Error completing action: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    },
  );

  // uncomplete_action - Mark a completed action as incomplete again
  server.tool(
    "uncomplete_action",
    "Mark a completed action as incomplete again (reopens action for further work)",
    {
      action_id: z.string().uuid().describe("The ID of the completed action to reopen"),
    },
    async ({ action_id }: { action_id: string }, extra: any) => {
      try {
        console.log(`Uncompleting action ${action_id}`);
        
        // Call ActionsService directly to avoid HTTP authentication issues
        const action = await ActionsService.updateAction({
          action_id,
          done: false
        });
        
        let message = `🔄 Reopened action: ${action.data?.title}\nID: ${action.id}\nReopened: ${action.updatedAt}`;
        message += `\n\nAction is now available for further work. Previous completion context is preserved.`;

        return {
          content: [
            {
              type: "text",
              text: message,
            },
          ],
        };
      } catch (error) {
        console.error('Error uncompleting action:', error);
        return {
          content: [
            {
              type: "text",
              text: `Error uncompleting action: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    },
  );

  // join_family - Update an action's family relationship
  server.tool(
    "join_family",
    "Update an action's family relationship by having it join a new family or making it independent",
    {
      action_id: z.string().uuid().describe("The ID of the action to move"),
      new_family_id: z.string().uuid().optional().describe("The ID of the new family action to join, or omit to make this an independent action"),
    },
    async ({ action_id, new_family_id }: { action_id: string; new_family_id?: string }, extra: any) => {
      try {
        console.log(`Updating family for action ${action_id} to family ${new_family_id || 'none (independent action)'}`);
        
        // Call ActionsService directly to avoid HTTP authentication issues
        const result = await ActionsService.updateFamily({
          action_id,
          new_family_id: new_family_id
        });
        
        let message = `Updated family relationship for action: ${action_id}`;
        if (new_family_id) {
          message += `\nJoined family: ${new_family_id}`;
        } else {
          message += `\nAction is now independent (no family)`;
        }

        return {
          content: [
            {
              type: "text",
              text: message,
            },
          ],
        };
      } catch (error) {
        console.error('Error updating family:', error);
        return {
          content: [
            {
              type: "text",
              text: `Error updating family: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    },
  );


  // search_actions - Search for actions using vector embeddings and keyword matching
  server.tool(
    "search_actions",
    "Search for actions using a combination of vector embeddings (semantic search) and keyword matching. Supports exact phrase search, semantic similarity, and hybrid approaches for finding relevant actions quickly.",
    {
      query: z.string().min(1).describe("Search query - can be keywords, phrases, or natural language description of what you're looking for"),
      limit: z.number().min(1).max(50).default(10).optional().describe("Maximum number of results to return (default: 10)"),
      search_mode: z.enum(["vector", "keyword", "hybrid"]).default("hybrid").optional().describe("Search mode: 'vector' for semantic similarity, 'keyword' for exact/fuzzy text matching, 'hybrid' for both (default: hybrid)"),
      similarity_threshold: z.number().min(0).max(1).default(0.3).optional().describe("Minimum similarity threshold for vector search (0-1, default: 0.3). Lower values = more results"),
      include_completed: z.boolean().default(false).optional().describe("Include completed actions in results (default: false)"),
      exclude_ids: z.array(z.string().uuid()).optional().describe("Action IDs to exclude from search results"),
    },
    async ({ query, limit = 10, search_mode = "hybrid", similarity_threshold = 0.3, include_completed = false, exclude_ids = [] }: { 
      query: string; 
      limit?: number; 
      search_mode?: "vector" | "keyword" | "hybrid";
      similarity_threshold?: number;
      include_completed?: boolean;
      exclude_ids?: string[];
    }, extra: any) => {
      try {
        console.log(`[MCP search_actions] Searching for: "${query}" (mode: ${search_mode})`);
        
        const searchResult = await ActionSearchService.searchActions(query, {
          limit,
          similarityThreshold: similarity_threshold,
          includeCompleted: include_completed,
          searchMode: search_mode,
          excludeIds: exclude_ids
        });

        let message = `🔍 **Search Results for:** "${query}"\n`;
        message += `🎯 **Mode:** ${search_mode} search\n`;
        message += `⚡ **Performance:** ${searchResult.metadata.processingTimeMs.toFixed(1)}ms total`;
        
        if (searchResult.metadata.embeddingTimeMs) {
          message += ` (${searchResult.metadata.embeddingTimeMs.toFixed(1)}ms embedding, ${searchResult.metadata.searchTimeMs.toFixed(1)}ms search)`;
        } else {
          message += ` (${searchResult.metadata.searchTimeMs.toFixed(1)}ms search)`;
        }
        message += `\n`;
        
        message += `📊 **Found:** ${searchResult.totalMatches} result${searchResult.totalMatches !== 1 ? 's' : ''}`;
        if (searchResult.metadata.vectorMatches > 0 || searchResult.metadata.keywordMatches > 0) {
          message += ` (${searchResult.metadata.vectorMatches} vector, ${searchResult.metadata.keywordMatches} keyword, ${searchResult.metadata.hybridMatches} hybrid)`;
        }
        message += `\n\n`;
        
        if (searchResult.results.length > 0) {
          message += `✅ **Results:**\n\n`;
          
          searchResult.results.forEach((result, index) => {
            const matchIcon = result.matchType === 'vector' ? '🧠' : result.matchType === 'keyword' ? '🔤' : '🎯';
            const scoreDisplay = result.matchType === 'vector' ? 
              `${(result.similarity! * 100).toFixed(1)}% similarity` : 
              `score: ${result.score.toFixed(2)}`;
            
            message += `${index + 1}. ${matchIcon} **${result.title}** (${scoreDisplay})${result.done ? ' ✅' : ''}\n`;
            message += `   ID: ${result.id}\n`;
            
            if (result.description) {
              message += `   Description: ${result.description.substring(0, 100)}${result.description.length > 100 ? '...' : ''}\n`;
            }
            
            if (result.keywordMatches && result.keywordMatches.length > 0) {
              message += `   Keywords: ${result.keywordMatches.join(', ')}\n`;
            }
            
            if (result.hierarchyPath && result.hierarchyPath.length > 1) {
              message += `   Path: ${result.hierarchyPath.join(' → ')}\n`;
            }
            
            message += `   ${result.matchType} match\n`;
            message += `\n`;
          });
          
          if (searchResult.results.length > 0) {
            const topResult = searchResult.results[0];
            message += `🏆 **Top Result:** "${topResult.title}" (ID: ${topResult.id})\n`;
            message += `📈 **Best Match:** ${topResult.matchType} search with `;
            if (topResult.matchType === 'vector') {
              message += `${(topResult.similarity! * 100).toFixed(1)}% semantic similarity`;
            } else {
              message += `score ${topResult.score.toFixed(2)}`;
            }
          }
        } else {
          message += `❌ **No results found**\n`;
          message += `   Try:\n`;
          message += `   • Different keywords or phrases\n`;
          message += `   • Lower similarity threshold (current: ${similarity_threshold})\n`;
          message += `   • Including completed actions (--include_completed=true)\n`;
          message += `   • Different search mode (vector, keyword, or hybrid)\n`;
        }
        
        message += `\n\n🧠 **Powered by:** OpenAI embeddings + PostgreSQL pgvector + fuzzy text matching`;

        return {
          content: [
            {
              type: "text",
              text: message,
            },
          ],
        };
      } catch (error) {
        console.error('[MCP search_actions] Search failed:', error);
        return {
          content: [
            {
              type: "text",
              text: `Error searching actions: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    },
  );


}

export const toolCapabilities = {
  create_action: {
    description: "Create a new action in the database with a required family (use suggest_family to find appropriate placement)",
  },
  add_dependency: {
    description: "Create a dependency relationship between two existing actions",
  },
  delete_action: {
    description: "Delete an action and handle its children",
  },
  remove_dependency: {
    description: "Remove a dependency relationship between two actions",
  },
  update_action: {
    description: "Update an existing action's properties including title and description (use complete_action to mark actions as done)",
  },
  complete_action: {
    description: "Mark an action as completed with required completion context for dynamic changelog generation. ALL parameters are required including editorial content (headline, deck, pull_quotes). Use measured, analytical language similar to The Economist or scientific journals.",
  },
  uncomplete_action: {
    description: "Mark a completed action as incomplete again (reopens action for further work)",
  },
  join_family: {
    description: "Update an action's family relationship by having it join a new family or making it independent",
  },
  search_actions: {
    description: "Search for actions using a combination of vector embeddings (semantic search) and keyword matching. Supports exact phrase search, semantic similarity, and hybrid approaches for finding relevant actions quickly.",
  },
};