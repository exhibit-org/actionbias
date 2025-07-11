import { redirect, notFound } from 'next/navigation';
import { ActionsService } from '@/lib/services/actions';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ActionPage({ params }: PageProps) {
  const { id } = await params;
  
  try {
    // Get action details to determine where to redirect
    const action = await ActionsService.getActionDetailResource(id);
    
    if (!action) {
      notFound();
    }
    
    // If action is completed, redirect to /done/[id]
    if (action.done) {
      redirect(`/done/${id}`);
    }
    
    // If action is not completed, redirect to /treemap/[id] (or another appropriate page)
    redirect(`/treemap/${id}`);
    
  } catch (error) {
    console.error('Error fetching action for redirect:', error);
    notFound();
  }
}