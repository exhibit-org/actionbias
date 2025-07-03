import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ActionsService } from '@/lib/services/actions';
import MagazineArticle from '@/components/MagazineArticle';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}

async function getCompletionData(id: string) {
  try {
    // Get the action detail with completion context
    const actionDetail = await ActionsService.getActionDetailResource(id);
    
    // Check if action is completed and has completion context
    if (!actionDetail.done || !actionDetail.completion_context) {
      return null;
    }

    return {
      id: actionDetail.id,
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
      // Git context information
      gitContext: actionDetail.completion_context.git_context,
    };
  } catch (error) {
    console.error('Error fetching completion data:', error);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const completionData = await getCompletionData(id);
  
  if (!completionData) {
    return {
      title: 'Completed Action Not Found - done.engineering',
      description: 'The requested completed action could not be found.',
    };
  }
  
  const title = completionData.headline || `${completionData.actionTitle} - DONE`;
  const description = completionData.deck || completionData.actionDescription || 'Engineering achievement documented';
  
  // Build the canonical URL
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'https://done.engineering';
  const canonicalUrl = `${baseUrl}/done/${id}`;
  
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      siteName: 'done.engineering',
      url: canonicalUrl,
      publishedTime: completionData.completionTimestamp,
      authors: ['done.engineering'],
      images: [
        {
          url: `${baseUrl}/api/og/log/${id}`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${baseUrl}/api/og/log/${id}`],
      creator: '@doneengineering',
    },
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export default async function DonePage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { view } = await searchParams;
  
  const completionData = await getCompletionData(id);
  
  if (!completionData) {
    notFound();
  }

  // For prototype: always show internal template regardless of view parameter
  // In future: will respect view parameter for different templates
  
  return (
    <MagazineArticle 
      item={completionData}
      showShare={true}
    />
  );
}