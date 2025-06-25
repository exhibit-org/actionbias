import NextActionDisplay from '../next/components/NextActionDisplay';
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
  
  // Full grayscale color scheme with enhanced visual hierarchy (no colors)
  const colors = {
    bg: '#f9fafb',           // Very light gray background
    surface: '#f3f4f6',      // Light gray surface  
    border: '#e5e7eb',       // Medium gray border
    borderAccent: '#1f2937', // Very dark gray accent (no color, maximum contrast)
    text: '#111827',         // Very dark gray (black) for primary text
    textMuted: '#4b5563',    // Medium dark gray for secondary text
    textSubtle: '#6b7280',   // Medium gray for tertiary text
    textFaint: '#9ca3af'     // Light gray for faint text/metadata
  };

  return (
    <TreeSidebarLayout colors={colors}>
      <NextActionDisplay colors={colors} actionId={resolvedParams.id} />
    </TreeSidebarLayout>
  );
}