import TreeSidebarLayout from '../components/TreeSidebarLayout';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const resolvedParams = await params;
  
  return {
    title: `Action ${resolvedParams.id.slice(0, 8)} - ActionBias`,
    description: `View details for action ${resolvedParams.id}`,
  };
}

export default async function ActionPage({ params }: Props) {
  const resolvedParams = await params;
  
  // Redirect to the action detail view in treemap
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-gray-900 mb-4">Action Detail</h1>
        <p className="text-gray-600 mb-6">
          The next action functionality has been removed. 
        </p>
        <a 
          href={`/treemap/${resolvedParams.id}`}
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          View Action in Treemap
        </a>
      </div>
    </div>
  );
}