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
    "Mark an action as completed with required completion context for dynamic changelog generation. Write detailed stories with code snippets where relevant. Format technical terms with backticks (`) for proper rendering in the magazine-style changelog.",
    {
      action_id: z.string().uuid().describe("The ID of the action to complete"),
      implementation_story: z.string().min(1).describe("How was this action implemented? What approach was taken, what tools were used, what challenges were overcome? Supports markdown formatting. IMPORTANT: Use backticks (`) around ALL technical terms including file paths (e.g., `/api/actions`), function names (e.g., `generateText()`), APIs, libraries, commands, and code-related terms."),
      impact_story: z.string().min(1).describe("What was accomplished by completing this action? What impact did it have on the project or users? Supports markdown formatting. IMPORTANT: Use backticks (`) around technical terms like metrics, API endpoints, database fields, etc."),
      learning_story: z.string().min(1).describe("What insights were gained? What worked well or poorly? What would be done differently? Supports markdown formatting. IMPORTANT: Use backticks (`) around technical concepts, tools, and code-related terms."),
      changelog_visibility: z.enum(["private", "team", "public"]).describe("Who should see this completion context in changelog generation"),
      // Required editorial content for magazine-style display
      headline: z.string().describe("AI-generated compelling headline for the completion story (e.g., 'Revolutionary Search Architecture Cuts Query Time by 70%')"),
      deck: z.string().describe("AI-generated standfirst/subtitle that expands on the headline (2-3 sentences that hook the reader)"),
      pull_quotes: z.array(z.string()).describe("AI-extracted powerful quotes from the completion stories to highlight key achievements or insights"),
    },
    async ({ action_id, implementation_story, impact_story, learning_story, changelog_visibility, headline, deck, pull_quotes }: { 
      action_id: string; 
      implementation_story: string;
      impact_story: string;
      learning_story: string;
      changelog_visibility: "private" | "team" | "public";
      headline: string;
      deck: string;
      pull_quotes: string[];
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
            pull_quotes
          }
        });
        
        let message = `✅ Completed action: ${action.data?.title}\nID: ${action.id}\nCompleted: ${action.updatedAt}`;
        message += `\n\n📋 Completion Context Captured:`;
        message += `\n• Implementation: ${implementation_story.substring(0, 100)}${implementation_story.length > 100 ? '...' : ''}`;
        message += `\n• Impact: ${impact_story.substring(0, 100)}${impact_story.length > 100 ? '...' : ''}`;
        message += `\n• Learning: ${learning_story.substring(0, 100)}${learning_story.length > 100 ? '...' : ''}`;
        message += `\n• Visibility: ${changelog_visibility}`;

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

  // suggest_family - Get intelligent family suggestion for a new action
  server.tool(
    "suggest_family",
    "Get an intelligent family suggestion for an action using vector similarity search. Can accept either action details (title, description, vision) or just an action_id to fetch data automatically.",
    {
      title: z.string().default("").describe("The title for the new action (optional if action_id is provided)"),
      description: z.string().optional().describe("Detailed description of what the action involves"),
      vision: z.string().optional().describe("The desired outcome when the action is complete"),
      action_id: z.string().uuid().optional().describe("Optional action ID to exclude from suggestions, or provide to fetch action data automatically"),
      similarity_threshold: z.number().min(0).max(1).default(0.5).optional().describe("Minimum similarity threshold for vector matching (0-1, default: 0.5). Higher values = stricter matching"),
      limit: z.number().min(1).max(20).default(10).optional().describe("Maximum number of family suggestions to return (default: 10)"),
    },
    async ({ title = "", description, vision, action_id, similarity_threshold = 0.5, limit = 10 }: { 
      title: string; 
      description?: string; 
      vision?: string; 
      action_id?: string;
      similarity_threshold?: number;
      limit?: number;
    }, extra: any) => {
      try {
        let actionData = { title, description, vision };
        let excludeIds: string[] = [];
        
        // If action_id is provided, either fetch the action data or use it for exclusion
        if (action_id) {
          excludeIds = [action_id];
          
          // If no title provided (empty string, undefined, or placeholder), fetch action data from database
          if (!title || title.trim() === "" || title === "_fetch_") {
            console.log(`Fetching action data for ID: ${action_id}`);
            try {
              // Use direct database query to get the action
              const actionResult = await getDb().select().from(actions).where(eq(actions.id, action_id)).limit(1);
              if (actionResult.length === 0) {
                return {
                  content: [
                    {
                      type: "text",
                      text: `Error: Action with ID ${action_id} not found`,
                    },
                  ],
                };
              }
              
              const action = actionResult[0];
              actionData = {
                title: action.data?.title || action.title || 'untitled',
                description: description || action.data?.description || action.description,
                vision: vision || action.data?.vision || action.vision
              };
              
              console.log(`Fetched action data: ${actionData.title}`);
            } catch (fetchError) {
              console.error('Error fetching action data:', fetchError);
              return {
                content: [
                  {
                    type: "text",
                    text: `Error fetching action data: ${fetchError instanceof Error ? fetchError.message : "Unknown error"}`,
                  },
                ],
              };
            }
          }
        }
        
        // Validate that we have a title either provided or fetched
        if (!actionData.title || actionData.title.trim() === "") {
          return {
            content: [
              {
                type: "text",
                text: "Error: Either 'title' parameter or 'action_id' (to fetch title automatically) must be provided",
              },
            ],
          };
        }
        
        console.log(`Getting vector-based family suggestion for action: ${actionData.title}`);
        
        // Use VectorPlacementService to find family suggestions
        // Ensure all fields are strings (not undefined) for the EmbeddingInput type
        const embeddingInput = {
          title: actionData.title,
          description: actionData.description || undefined,
          vision: actionData.vision || undefined
        };
        
        const vectorResult = await VectorPlacementService.findVectorFamilySuggestions(
          embeddingInput,
          {
            limit,
            similarityThreshold: similarity_threshold,
            excludeIds,
            includeHierarchyPaths: true
          }
        );
        
        // Debug logging for MCP tool
        console.log('MCP suggest_family debug:', {
          vectorResultType: typeof vectorResult,
          vectorResultKeys: Object.keys(vectorResult || {}),
          candidatesType: typeof vectorResult?.candidates,
          candidatesIsArray: Array.isArray(vectorResult?.candidates),
          candidatesLength: vectorResult?.candidates?.length,
          vectorResult: vectorResult
        });
        
        // Safety check for vectorResult structure
        if (!vectorResult || !vectorResult.candidates || !Array.isArray(vectorResult.candidates)) {
          console.error('Invalid vectorResult structure:', vectorResult);
          return {
            content: [
              {
                type: "text",
                text: `Error: Invalid response from vector placement service. vectorResult: ${JSON.stringify(vectorResult)}`,
              },
            ],
          };
        }
        
        let message = `🔍 **Vector-Based Family Analysis for:** "${actionData.title}"\n`;
        if (action_id && (!title || title.trim() === "" || title === "_fetch_")) {
          message += `📄 **Source:** Automatically fetched from action ${action_id}\n`;
        }
        message += `⚡ **Performance:** ${vectorResult.totalProcessingTimeMs.toFixed(1)}ms total (${vectorResult.embeddingTimeMs.toFixed(1)}ms embedding, ${vectorResult.searchTimeMs.toFixed(1)}ms search)\n`;
        message += `🎛️ **Threshold:** Similarity ≥ ${similarity_threshold}\n\n`;
        
        if (vectorResult.candidates.length > 0) {
          message += `✅ **Found ${vectorResult.candidates.length} Similar Family Candidates:**\n\n`;
          
          vectorResult.candidates.forEach((candidate, index) => {
            message += `${index + 1}. **${candidate.title}** (${(candidate.similarity * 100).toFixed(1)}% match)\n`;
            message += `   ID: ${candidate.id}\n`;
            if (candidate.description) {
              message += `   Description: ${candidate.description.substring(0, 100)}${candidate.description.length > 100 ? '...' : ''}\n`;
            }
            message += `   Hierarchy: ${candidate.hierarchyPath.join(' → ')}\n`;
            message += `   Depth: ${candidate.depth} level${candidate.depth !== 1 ? 's' : ''}\n\n`;
          });
          
          const bestCandidate = vectorResult.candidates[0];
          message += `🏆 **Top Recommendation:** Join the "${bestCandidate.title}" family (ID: ${bestCandidate.id})\n`;
          message += `📊 **Match Quality:** ${(bestCandidate.similarity * 100).toFixed(1)}% semantic similarity\n`;
        } else {
          message += `❌ **No similar family actions found**\n`;
          message += `   No existing actions meet the ${(similarity_threshold * 100).toFixed(0)}% similarity threshold\n`;
          message += `💡 **Suggestion:** This action should be created as a root-level action\n`;
          message += `   or consider lowering the similarity threshold to see more options.\n`;
        }
        
        message += `\n🧠 **Powered by:** Vector embeddings with PostgreSQL pgvector similarity search`;

        return {
          content: [
            {
              type: "text",
              text: message,
            },
          ],
        };
      } catch (error) {
        console.error('Error getting vector family suggestion:', error);
        return {
          content: [
            {
              type: "text",
              text: `Error getting family suggestion: ${error instanceof Error ? error.message : "Unknown error"}`,
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
    description: "Mark an action as completed with required completion context for dynamic changelog generation",
  },
  uncomplete_action: {
    description: "Mark a completed action as incomplete again (reopens action for further work)",
  },
  join_family: {
    description: "Update an action's family relationship by having it join a new family or making it independent",
  },
  suggest_family: {
    description: "Get an intelligent family suggestion for an action using vector similarity search. Can accept either action details or just an action_id to fetch data automatically.",
  },
  search_actions: {
    description: "Search for actions using a combination of vector embeddings (semantic search) and keyword matching. Supports exact phrase search, semantic similarity, and hybrid approaches for finding relevant actions quickly.",
  },
};