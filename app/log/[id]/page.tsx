import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ScopedLogPageClient from './client';
import { ActionsService } from '@/lib/services/actions';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getActionDetails(id: string) {
  try {
    // For internal server-to-server calls, we can call the service directly
    const actionDetails = await ActionsService.getActionDetailResource(id);
    return actionDetails;
  } catch (error) {
    console.error('Error fetching action:', error);
    return null;
  }
}

async function getScopedCompletedActions(rootId: string) {
  try {
    // Get the action tree with completed actions included
    const treeResource = await ActionsService.getActionTreeResourceScoped(rootId, true);
    const rootNode = treeResource.rootActions[0]; // Get the first (and only) root node for scoped tree
    
    if (!rootNode) {
      console.log('No root node found for action:', rootId);
      return [];
    }
    
    console.log('Tree root:', rootNode.id, rootNode.title, 'done:', rootNode.done);
    console.log('Tree has', rootNode.children?.length || 0, 'children');
    
    // Extract all completed action IDs from the tree
    const completedActionIds: string[] = [];
    
    function extractCompletedActions(node: any) {
      if (node.done) {
        completedActionIds.push(node.id);
        console.log('Found completed action:', node.id, node.title);
      }
      if (node.children) {
        node.children.forEach(extractCompletedActions);
      }
    }
    
    extractCompletedActions(rootNode);
    
    // Fetch detailed action data for all completed actions
    console.log('Fetching completion contexts for', completedActionIds.length, 'completed actions');
    const completedActions = await Promise.all(
      completedActionIds.map(async (actionId) => {
        try {
          const actionDetail = await ActionsService.getActionDetailResource(actionId);
          
          // Only return if action has completion context
          if (!actionDetail.completion_context) return null;
          
          return {
            id: actionDetail.id, // Use action ID as the identifier
            actionId: actionDetail.id,
            implementationStory: actionDetail.completion_context.implementation_story,
            impactStory: actionDetail.completion_context.impact_story,
            learningStory: actionDetail.completion_context.learning_story,
            headline: actionDetail.completion_context.headline,
            deck: actionDetail.completion_context.deck,
            pullQuotes: actionDetail.completion_context.pull_quotes,
            changelogVisibility: actionDetail.completion_context.changelog_visibility,
            completionTimestamp: actionDetail.completion_context.completion_timestamp,
            actionTitle: actionDetail.title,
            actionDescription: actionDetail.description,
            actionVision: actionDetail.vision,
            actionDone: actionDetail.done,
            actionCreatedAt: actionDetail.created_at,
          };
        } catch (error) {
          console.log(`Failed to fetch action detail for ${actionId}:`, error);
          return null;
        }
      })
    );
    
    // Filter out nulls and sort by completion timestamp
    return completedActions
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => new Date(b.completionTimestamp).getTime() - new Date(a.completionTimestamp).getTime());
  } catch (error) {
    console.error('Error fetching scoped completed actions:', error);
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const action = await getActionDetails(id);
  
  if (!action) {
    return {
      title: 'Action Not Found - ActionBias',
      description: 'The requested action could not be found.',
    };
  }
  
  const title = `${action.title} - Completion Log`;
  const description = action.vision || action.description || 'View completed actions in this subtree';
  
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'ActionBias',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default async function ScopedLogPage({ params }: PageProps) {
  const { id } = await params;
  
  console.log('ScopedLogPage - Action ID:', id);
  
  const [action, completedActions] = await Promise.all([
    getActionDetails(id),
    getScopedCompletedActions(id)
  ]);
  
  console.log('ScopedLogPage - Action found:', !!action);
  console.log('ScopedLogPage - Completed actions count:', completedActions.length);
  
  if (!action) {
    notFound();
  }
  
  return (
    <ScopedLogPageClient 
      rootAction={action}
      completedActions={completedActions}
    />
  );
}