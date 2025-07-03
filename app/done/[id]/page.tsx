import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ActionsService } from '@/lib/services/actions';
import { ObjectiveEditorialService } from '@/lib/services/objective-editorial';
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

    const context = actionDetail.completion_context;
    
    // Check if this action has objective completion data (Phase 3)
    const hasObjectiveData = context.technical_changes || context.outcomes || context.challenges || context.alignment_reflection;
    
    let editorialContent;
    if (hasObjectiveData) {
      // Generate editorial content from objective data using ObjectiveEditorialService
      console.log(`Generating editorial content from objective data for action ${id}`);
      
      const objectiveData = {
        technical_changes: {
          files_modified: context.technical_changes?.files_modified || [],
          files_created: context.technical_changes?.files_created || [],
          functions_added: context.technical_changes?.functions_added || [],
          apis_modified: context.technical_changes?.apis_modified || [],
          dependencies_added: context.technical_changes?.dependencies_added || [],
          config_changes: context.technical_changes?.config_changes || []
        },
        outcomes: {
          features_implemented: context.outcomes?.features_implemented || [],
          bugs_fixed: context.outcomes?.bugs_fixed || [],
          performance_improvements: context.outcomes?.performance_improvements || [],
          tests_passing: context.outcomes?.tests_passing,
          build_status: context.outcomes?.build_status
        },
        challenges: {
          blockers_encountered: context.challenges?.blockers_encountered || [],
          blockers_resolved: context.challenges?.blockers_resolved || [],
          approaches_tried: context.challenges?.approaches_tried || [],
          discoveries: context.challenges?.discoveries || []
        },
        alignment_reflection: {
          purpose_interpretation: context.alignment_reflection?.purpose_interpretation || "No purpose interpretation provided",
          goal_achievement_assessment: context.alignment_reflection?.goal_achievement_assessment || "No goal achievement assessment provided",
          context_influence: context.alignment_reflection?.context_influence || "No context influence documented",
          assumptions_made: context.alignment_reflection?.assumptions_made || []
        },
        git_context: context.git_context
      };
      
      // Generate editorial content from objective data
      editorialContent = await ObjectiveEditorialService.generateEditorialContent(
        actionDetail.title,
        objectiveData
      );
    } else {
      // Use existing editorial content (backward compatibility)
      editorialContent = {
        implementation_story: context.implementation_story || '',
        impact_story: context.impact_story || '',
        learning_story: context.learning_story || '',
        headline: context.headline || actionDetail.title,
        deck: context.deck || '',
        pull_quotes: context.pull_quotes || []
      };
    }

    return {
      id: actionDetail.id,
      actionId: actionDetail.id,
      implementationStory: editorialContent.implementation_story,
      impactStory: editorialContent.impact_story,
      learningStory: editorialContent.learning_story,
      headline: editorialContent.headline,
      deck: editorialContent.deck,
      pullQuotes: editorialContent.pull_quotes,
      changelogVisibility: context.changelog_visibility,
      completionTimestamp: context.completion_timestamp,
      actionTitle: actionDetail.title,
      actionDescription: actionDetail.description,
      actionVision: actionDetail.vision,
      actionDone: actionDetail.done,
      actionCreatedAt: actionDetail.created_at,
      // Git context information
      gitContext: context.git_context,
      // Flag to indicate if content was generated from objective data
      generatedFromObjectiveData: hasObjectiveData,
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