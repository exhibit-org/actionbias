import { NextRequest, NextResponse } from 'next/server';
import { ActionsService } from '@/lib/services/actions';

export async function GET(request: NextRequest) {
  try {
    console.log('[ValidateTreeIntegrity] Validating tree structure...');
    
    // Get the full action tree
    const treeData = await ActionsService.getActionTreeResource(false);
    
    const validationResults = {
      totalNodes: 0,
      accessibleNodes: 0,
      inaccessibleNodes: 0,
      errors: [] as Array<{id: string, title: string, error: string}>,
      nodeDetails: [] as Array<{id: string, title: string, accessible: boolean, childCount: number}>
    };
    
    // Validate each node in the tree
    async function validateNode(node: any, depth = 0): Promise<void> {
      validationResults.totalNodes++;
      
      try {
        // Try to access the individual action
        const actionDetail = await ActionsService.getActionDetailResource(node.id);
        if (actionDetail) {
          validationResults.accessibleNodes++;
          validationResults.nodeDetails.push({
            id: node.id,
            title: node.title || 'No title',
            accessible: true,
            childCount: node.children?.length || 0
          });
        } else {
          validationResults.inaccessibleNodes++;
          validationResults.errors.push({
            id: node.id,
            title: node.title || 'No title',
            error: 'Action detail returned null'
          });
          validationResults.nodeDetails.push({
            id: node.id,
            title: node.title || 'No title',
            accessible: false,
            childCount: node.children?.length || 0
          });
        }
      } catch (error) {
        validationResults.inaccessibleNodes++;
        validationResults.errors.push({
          id: node.id,
          title: node.title || 'No title',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        validationResults.nodeDetails.push({
          id: node.id,
          title: node.title || 'No title',
          accessible: false,
          childCount: node.children?.length || 0
        });
      }
      
      // Recursively validate children
      if (node.children && Array.isArray(node.children)) {
        for (const child of node.children) {
          await validateNode(child, depth + 1);
        }
      }
    }
    
    // Validate all root actions and their children
    if (treeData.rootActions && Array.isArray(treeData.rootActions)) {
      for (const rootAction of treeData.rootActions) {
        await validateNode(rootAction);
      }
    }
    
    return NextResponse.json({
      success: true,
      validationResults,
      summary: {
        totalNodes: validationResults.totalNodes,
        accessibleNodes: validationResults.accessibleNodes,
        inaccessibleNodes: validationResults.inaccessibleNodes,
        errorCount: validationResults.errors.length,
        integrityPercentage: validationResults.totalNodes > 0 
          ? Math.round((validationResults.accessibleNodes / validationResults.totalNodes) * 100)
          : 100
      }
    });
    
  } catch (error) {
    console.error('[ValidateTreeIntegrity] Failed to validate tree:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 });
  }
}