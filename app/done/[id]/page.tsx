import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ActionsService } from '@/lib/services/actions';
import { ObjectiveEditorialService } from '@/lib/services/objective-editorial';
import { TemplateContentService } from '@/lib/services/template-content';
import { CompletionContextService } from '@/lib/services/completion-context';
import MagazineArticle from '@/components/MagazineArticle';
import EngineeringTemplate from '@/components/EngineeringTemplate';
import BusinessTemplate from '@/components/BusinessTemplate';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ template?: 'engineering' | 'business' | 'customer'; view?: string }>;
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
    
    // Debug: Check what's actually in the completion context
    console.log('getCompletionData - context:', context);
    console.log('getCompletionData - context.templateContent:', context.templateContent);
    
    // Check if this action has objective completion data (Phase 3)
    const hasObjectiveData = context.technical_changes || context.outcomes || context.challenges || context.alignment_reflection;
    
    let templateContent = context.templateContent;
    let editorialContent;

    if (hasObjectiveData) {
      // Generate template content from objective data using TemplateContentService
      console.log(`Generating template content from objective data for action ${id}`);
      
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

      // Generate template content if not already present
      if (!templateContent) {
        templateContent = await TemplateContentService.generateAllTemplateContent({
          actionTitle: actionDetail.title,
          actionDescription: actionDetail.description,
          objectiveData
        });

        // Persist template content to database
        try {
          await CompletionContextService.updateCompletionContext(id, {
            templateContent
          });
          console.log(`Persisted generated template content for action ${id}`);
        } catch (error) {
          console.error(`Failed to persist template content for action ${id}:`, error);
        }
      }
      
      // Also generate editorial content for backward compatibility
      editorialContent = await ObjectiveEditorialService.generateEditorialContent(
        actionDetail.title,
        objectiveData
      );
    } else {
      // Fallback for actions without objective data
      const hasStoryContent = context.implementation_story || context.impact_story || context.learning_story;
      
      if (!hasStoryContent && (context.headline || context.deck || context.pull_quotes)) {
        // Generate missing content from available editorial fields
        console.log(`Generating content for action ${id} with existing editorial fields`);
        
        const minimalObjectiveData = {
          technical_changes: {
            files_modified: [],
            files_created: [],
            functions_added: [],
            apis_modified: [],
            dependencies_added: [],
            config_changes: []
          },
          outcomes: {
            features_implemented: [actionDetail.title],
            bugs_fixed: [],
            performance_improvements: [],
            tests_passing: undefined,
            build_status: undefined
          },
          challenges: {
            blockers_encountered: [],
            blockers_resolved: [],
            approaches_tried: [],
            discoveries: []
          },
          alignment_reflection: {
            purpose_interpretation: context.deck || actionDetail.description || "Implementation completed successfully",
            goal_achievement_assessment: "Goal achieved as indicated by completion",
            context_influence: "Work completed within project context",
            assumptions_made: []
          }
        };
        
        // Generate both template content and editorial content
        if (!templateContent) {
          templateContent = await TemplateContentService.generateAllTemplateContent({
            actionTitle: actionDetail.title,
            actionDescription: actionDetail.description,
            objectiveData: minimalObjectiveData
          });
        }

        editorialContent = await ObjectiveEditorialService.generateEditorialContent(
          actionDetail.title,
          minimalObjectiveData
        );
        
        // Persist both types of content
        try {
          await CompletionContextService.updateCompletionContext(id, {
            implementationStory: editorialContent.implementation_story,
            impactStory: editorialContent.impact_story,
            learningStory: editorialContent.learning_story,
            templateContent
          });
          console.log(`Persisted generated content for action ${id}`);
        } catch (error) {
          console.error(`Failed to persist content for action ${id}:`, error);
        }
      } else {
        // Use existing content as-is
        editorialContent = {
          implementation_story: context.implementation_story || '',
          impact_story: context.impact_story || '',
          learning_story: context.learning_story || '',
          headline: context.headline || actionDetail.title,
          deck: context.deck || '',
          pull_quotes: context.pull_quotes || []
        };
      }
    }

    return {
      id: actionDetail.id,
      actionId: actionDetail.id,
      // Traditional editorial content for backward compatibility
      implementationStory: editorialContent?.implementation_story || '',
      impactStory: editorialContent?.impact_story || '',
      learningStory: editorialContent?.learning_story || '',
      headline: editorialContent?.headline || actionDetail.title,
      deck: editorialContent?.deck || '',
      pullQuotes: editorialContent?.pull_quotes || [],
      // New template content
      templateContent,
      changelogVisibility: context.changelog_visibility,
      completionTimestamp: context.completion_timestamp,
      actionTitle: actionDetail.title,
      actionDescription: actionDetail.description,
      actionVision: actionDetail.vision,
      actionDone: actionDetail.done,
      actionCreatedAt: actionDetail.created_at,
      gitContext: context.git_context,
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
  const { template, view } = await searchParams;
  
  const completionData = await getCompletionData(id);
  
  if (!completionData) {
    notFound();
  }

  // Default to engineering template, with business as fallback for view=economist
  const selectedTemplate = template || (view === 'economist' ? 'business' : 'engineering');
  
  // Render appropriate template component based on selection
  switch (selectedTemplate) {
    case 'engineering':
      return (
        <EngineeringTemplate 
          item={completionData}
          showShare={true}
        />
      );
    
    case 'business':
      return (
        <BusinessTemplate 
          item={completionData}
          showShare={true}
        />
      );
    
    case 'customer':
      // For now, fall back to business template until customer template is implemented
      return (
        <BusinessTemplate 
          item={completionData}
          showShare={true}
        />
      );
    
    default:
      // Default to engineering template
      return (
        <EngineeringTemplate 
          item={completionData}
          showShare={true}
        />
      );
  }
}