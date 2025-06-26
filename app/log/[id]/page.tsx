import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ScopedLogPageClient from './client';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getActionDetails(id: string) {
  // For server components, we need to use the deployment URL or construct it properly
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  try {
    const url = `${baseUrl}/api/actions/${id}`;
    console.log('Fetching action from:', url);
    
    const response = await fetch(url, {
      cache: 'no-store',
    });
    
    if (!response.ok) {
      console.error('Failed to fetch action:', response.status, response.statusText);
      return null;
    }
    
    const data = await response.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error('Error fetching action:', error);
    return null;
  }
}

async function getScopedCompletedActions(rootId: string) {
  // For server components, we need to use the deployment URL or construct it properly
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  try {
    // First get the action tree with completed actions included
    const treeResponse = await fetch(`${baseUrl}/api/actions/tree/${rootId}?includeCompleted=true`, {
      cache: 'no-store',
    });
    
    if (!treeResponse.ok) {
      return [];
    }
    
    const treeData = await treeResponse.json();
    if (!treeData.success) {
      return [];
    }
    
    // Extract all completed action IDs from the tree
    const completedActionIds: string[] = [];
    
    function extractCompletedActions(node: any) {
      if (node.done) {
        completedActionIds.push(node.id);
      }
      if (node.children) {
        node.children.forEach(extractCompletedActions);
      }
    }
    
    extractCompletedActions(treeData.data);
    
    // Fetch completion contexts for all completed actions
    console.log('Fetching completion contexts for', completedActionIds.length, 'completed actions');
    const completedActions = await Promise.all(
      completedActionIds.map(async (actionId) => {
        const response = await fetch(`${baseUrl}/api/changelog/${actionId}`, {
          cache: 'no-store',
        });
        if (response.ok) {
          const data = await response.json();
          return data.success ? data.data : null;
        }
        console.log(`Failed to fetch changelog for action ${actionId}:`, response.status);
        return null;
      })
    );
    
    // Filter out nulls and sort by completion timestamp
    return completedActions
      .filter(Boolean)
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