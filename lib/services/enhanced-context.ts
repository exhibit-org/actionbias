import { eq, and, inArray } from "drizzle-orm";
import { actions, edges, completionContexts } from "../../db/schema";
import { getDb } from "../db/adapter";
import { DependencyCompletion, SiblingContext } from "./editorial-ai";

export class EnhancedContextService {
  /**
   * Get enriched dependency completions with full context
   */
  static async getEnhancedDependencyCompletions(actionId: string): Promise<DependencyCompletion[]> {
    try {
      // Get dependency edges
      const dependencyEdges = await getDb()
        .select()
        .from(edges)
        .where(and(
          eq(edges.dst, actionId),
          eq(edges.kind, 'depends_on')
        ));

      if (dependencyEdges.length === 0) {
        return [];
      }

      const depIds = dependencyEdges.map((e: any) => e.src).filter(Boolean);
      
      // Get completed dependencies with their completion contexts
      const deps = await getDb()
        .select({
          action: actions,
          context: completionContexts
        })
        .from(actions)
        .leftJoin(completionContexts, eq(completionContexts.actionId, actions.id))
        .where(and(
          inArray(actions.id, depIds),
          eq(actions.done, true)
        ));

      // Enhance each dependency with full context
      const enhancedDeps: DependencyCompletion[] = [];
      
      for (const dep of deps) {
        const dependencyCompletion: DependencyCompletion = {
          title: dep.action.title || '',
          impactStory: dep.context?.impactStory || undefined,
          implementationStory: dep.context?.implementationStory || undefined,
          learningStory: dep.context?.learningStory || undefined,
          completedAt: dep.context?.completionTimestamp || undefined,
          familyContext: dep.action.familyContextSummary || undefined,
          isBlocker: false // For now, could be enhanced with criticality analysis
        };
        
        enhancedDeps.push(dependencyCompletion);
      }

      // Sort by completion date, most recent first
      return enhancedDeps.sort((a, b) => {
        if (!a.completedAt || !b.completedAt) return 0;
        return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
      });

    } catch (error) {
      console.error('Failed to get enhanced dependency completions:', error);
      return [];
    }
  }

  /**
   * Get sibling context for an action
   */
  static async getSiblingContext(actionId: string): Promise<SiblingContext | undefined> {
    try {
      // Get the family parent of this action
      const familyEdges = await getDb()
        .select()
        .from(edges)
        .where(and(
          eq(edges.dst, actionId),
          eq(edges.kind, 'family')
        ));

      if (familyEdges.length === 0) {
        return undefined; // No family, no siblings
      }

      const parentId = familyEdges[0].src;
      if (!parentId) {
        return undefined;
      }

      // Get all children of the same parent (siblings)
      const siblingEdges = await getDb()
        .select()
        .from(edges)
        .where(and(
          eq(edges.src, parentId),
          eq(edges.kind, 'family')
        ));

      const siblingIds = siblingEdges
        .map((e: any) => e.dst)
        .filter(Boolean)
        .filter((id: string) => id !== actionId); // Exclude self

      if (siblingIds.length === 0) {
        return undefined;
      }

      // Get sibling actions with their completion contexts
      const siblings = await getDb()
        .select({
          action: actions,
          context: completionContexts
        })
        .from(actions)
        .leftJoin(completionContexts, eq(completionContexts.actionId, actions.id))
        .where(inArray(actions.id, siblingIds));

      const completedSiblings = siblings
        .filter((sib: any) => sib.action.done)
        .map((sib: any) => ({
          title: sib.action.title || '',
          impactStory: sib.context?.impactStory || undefined
        }));

      const activeSiblings = siblings
        .filter((sib: any) => !sib.action.done)
        .map((sib: any) => ({
          title: sib.action.title || '',
          vision: sib.action.vision || undefined
        }));

      if (completedSiblings.length === 0 && activeSiblings.length === 0) {
        return undefined;
      }

      return {
        completedSiblings: completedSiblings.length > 0 ? completedSiblings : undefined,
        activeSiblings: activeSiblings.length > 0 ? activeSiblings : undefined
      };

    } catch (error) {
      console.error('Failed to get sibling context:', error);
      return undefined;
    }
  }

  /**
   * Get complete enhanced context for editorial generation
   */
  static async getEnhancedEditorialContext(actionId: string) {
    const [dependencyCompletions, siblingContext] = await Promise.all([
      this.getEnhancedDependencyCompletions(actionId),
      this.getSiblingContext(actionId)
    ]);

    return {
      dependencyCompletions: dependencyCompletions.length > 0 ? dependencyCompletions : undefined,
      siblingContext
    };
  }
}