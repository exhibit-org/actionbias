import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../../lib/db/adapter";
import { actions, edges } from "../../../../../db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const actionId = resolvedParams.id;
    
    // Get the action itself
    const action = await getDb().select().from(actions).where(eq(actions.id, actionId)).limit(1);
    
    // Get all edges where this action is the source (children)
    const childEdges = await getDb().select().from(edges).where(
      and(eq(edges.src, actionId), eq(edges.kind, "family"))
    );
    
    // Get all edges where this action is the destination (parents)
    const parentEdges = await getDb().select().from(edges).where(
      and(eq(edges.dst, actionId), eq(edges.kind, "family"))
    );
    
    // For each child edge, check if the target action exists
    const childValidation = [];
    for (const edge of childEdges) {
      const childAction = await getDb().select().from(actions).where(eq(actions.id, edge.dst)).limit(1);
      childValidation.push({
        edge: edge,
        childExists: childAction.length > 0,
        childAction: childAction[0] || null
      });
    }
    
    // For each parent edge, check if the source action exists
    const parentValidation = [];
    for (const edge of parentEdges) {
      const parentAction = await getDb().select().from(actions).where(eq(actions.id, edge.src)).limit(1);
      parentValidation.push({
        edge: edge,
        parentExists: parentAction.length > 0,
        parentAction: parentAction[0] || null
      });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        actionId,
        actionExists: action.length > 0,
        action: action[0] || null,
        childEdges: childEdges,
        parentEdges: parentEdges,
        childValidation,
        parentValidation,
        summary: {
          totalChildEdges: childEdges.length,
          validChildEdges: childValidation.filter(v => v.childExists).length,
          invalidChildEdges: childValidation.filter(v => !v.childExists).length,
          totalParentEdges: parentEdges.length,
          validParentEdges: parentValidation.filter(v => v.parentExists).length,
          invalidParentEdges: parentValidation.filter(v => !v.parentExists).length,
        }
      }
    });
  } catch (error) {
    console.error('Error debugging action edges:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}