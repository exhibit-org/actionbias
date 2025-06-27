import { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  // Await the params
  const { id } = await params;
  
  // Try to fetch the action title for the scope
  let scopeTitle = 'Project';
  
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/actions/${id}`);
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data.title) {
        scopeTitle = data.data.title;
      }
    }
  } catch (error) {
    console.error('Error fetching scope title for metadata:', error);
  }

  return {
    title: `Next Action in ${scopeTitle} - done.engineering`,
    description: `Your next action to focus on within the ${scopeTitle} project`,
  };
}

export default function ScopedNextLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}