'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface PathSegment {
  id: string;
  title: string;
}

interface TreemapBreadcrumbsProps {
  actionId: string;
  isRootView: boolean;
  maxDepth?: number;
}

export default function TreemapBreadcrumbs({ actionId, isRootView, maxDepth }: TreemapBreadcrumbsProps) {
  const router = useRouter();
  const [pathSegments, setPathSegments] = useState<PathSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isRootView) {
      setPathSegments([]);
      return;
    }

    const fetchBreadcrumbs = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch action details which should include parent_chain
        const response = await fetch(`/api/actions/${actionId}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to fetch action details');
        
        // Extract parent chain from the action detail
        const actionDetail = data.data;
        const parentChain = actionDetail.parent_chain || [];
        
        // Convert parent chain to path segments
        const segments: PathSegment[] = parentChain.map((parent: any) => ({
          id: parent.id,
          title: parent.title
        }));
        
        setPathSegments(segments);
      } catch (err) {
        console.error('Failed to fetch breadcrumbs:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchBreadcrumbs();
  }, [actionId, isRootView]);

  const handleBreadcrumbClick = (segmentId: string) => {
    const params = new URLSearchParams();
    if (maxDepth) params.set('depth', maxDepth.toString());
    router.push(`/treemap/${segmentId}?${params.toString()}`);
  };

  if (isRootView || pathSegments.length === 0) {
    return null;
  }

  if (loading) {
    return (
      <div className="absolute top-6 left-6 z-20 bg-gray-700/90 backdrop-blur-sm border border-gray-600 rounded-lg px-3 py-2">
        <span className="text-gray-300 text-sm font-mono">Loading path...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="absolute top-6 left-6 z-20 bg-red-900/90 backdrop-blur-sm border border-red-600 rounded-lg px-3 py-2">
        <span className="text-red-300 text-sm font-mono">Error loading path</span>
      </div>
    );
  }

  // Create breadcrumb path including root
  const allSegments = [
    { id: 'root', title: 'Actions' },
    ...pathSegments
  ];

  return (
    <div className="absolute top-4 left-4 z-20">
      <div className="flex items-center gap-1 bg-black/20 backdrop-blur-sm rounded px-2 py-1">
        {allSegments.map((segment, index) => (
          <div key={segment.id} className="flex items-center">
            <button
              onClick={() => {
                if (segment.id === 'root') {
                  const params = new URLSearchParams();
                  if (maxDepth) params.set('depth', maxDepth.toString());
                  router.push(`/treemap/root?${params.toString()}`);
                } else {
                  handleBreadcrumbClick(segment.id);
                }
              }}
              className="text-gray-300 hover:text-white text-xs font-mono transition-colors px-1 py-0.5 rounded hover:bg-white/10"
              title={segment.title}
            >
              {segment.title}
            </button>
            {index < allSegments.length - 1 && (
              <span className="text-gray-500 text-xs mx-0.5">/</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}