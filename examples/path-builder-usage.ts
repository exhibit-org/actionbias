/**
 * Example usage of the Path-builder helper utility
 * 
 * This file demonstrates how to use the various path-building functions
 * to create breadcrumb navigation and hierarchical displays in the UI.
 */

import { 
  buildActionPath, 
  buildActionBreadcrumb, 
  getActionPathTitles, 
  getParentPathTitles,
  buildRelativeActionPath 
} from '../lib/utils/path-builder';

// Example function showing different ways to use the path builder
export async function demonstratePathBuilder() {
  const actionId = 'some-action-id';
  
  try {
    // 1. Get full path details (most comprehensive)
    const fullPath = await buildActionPath(actionId);
    console.log('Full path details:', {
      segments: fullPath.segments,
      breadcrumb: fullPath.breadcrumb,
      titles: fullPath.titles
    });
    // Example output:
    // {
    //   segments: [
    //     { id: 'root-id', title: 'Product Development' },
    //     { id: 'parent-id', title: 'Marketing Campaign' },
    //     { id: 'some-action-id', title: 'Launch Ads' }
    //   ],
    //   breadcrumb: 'Product Development > Marketing Campaign > Launch Ads',
    //   titles: ['Product Development', 'Marketing Campaign', 'Launch Ads']
    // }

    // 2. Get just the breadcrumb string (for simple displays)
    const breadcrumb = await buildActionBreadcrumb(actionId);
    console.log('Breadcrumb string:', breadcrumb);
    // Example output: "Product Development > Marketing Campaign > Launch Ads"

    // 3. Get only the parent path (excluding current action)
    const parentTitles = await getParentPathTitles(actionId);
    console.log('Parent path only:', parentTitles);
    // Example output: ['Product Development', 'Marketing Campaign']

    // 4. Get relative path with limited context (for compact displays)
    const relativePath = await buildRelativeActionPath(actionId, 2);
    console.log('Relative path (2 levels):', relativePath);
    // Example output: "... > Marketing Campaign > Launch Ads"

    // 5. Custom separator for different UI styles
    const customPath = await buildActionBreadcrumb(actionId, ' / ');
    console.log('Custom separator:', customPath);
    // Example output: "Product Development / Marketing Campaign / Launch Ads"

    // 6. Path without current action (for parent context only)
    const parentOnlyPath = await buildActionPath(actionId, ' > ', false);
    console.log('Parent context only:', parentOnlyPath.breadcrumb);
    // Example output: "Product Development > Marketing Campaign"

  } catch (error) {
    console.error('Error building path:', error);
  }
}

// Example: Using path builder in a React component
export function BreadcrumbComponent({ actionId }: { actionId: string }) {
  // This would be used in a React component with useEffect/useState
  // const [breadcrumb, setBreadcrumb] = useState<string>('');
  
  // useEffect(() => {
  //   buildActionBreadcrumb(actionId).then(setBreadcrumb);
  // }, [actionId]);

  // return <div className="breadcrumb">{breadcrumb}</div>;
  
  console.log(`Would display breadcrumb for action: ${actionId}`);
}

// Example: Using path builder for navigation menus
export async function buildNavigationMenu(actionId: string) {
  try {
    const fullPath = await buildActionPath(actionId);
    
    // Create clickable navigation items
    const navigationItems = fullPath.segments.map((segment, index) => ({
      id: segment.id,
      title: segment.title,
      href: `/${segment.id}`,
      isActive: index === fullPath.segments.length - 1, // Last item is current
      isCurrent: segment.id === actionId
    }));
    
    console.log('Navigation menu items:', navigationItems);
    return navigationItems;
    
  } catch (error) {
    console.error('Error building navigation:', error);
    return [];
  }
}

// Example: Using relative paths for compact UI displays
export async function buildCompactDisplay(actionId: string) {
  try {
    // For mobile or compact displays, show limited context
    const compactPath = await buildRelativeActionPath(actionId, 1);
    console.log('Compact display path:', compactPath);
    
    // For full displays, show complete path
    const fullPath = await buildActionBreadcrumb(actionId);
    console.log('Full display path:', fullPath);
    
    return {
      compact: compactPath,
      full: fullPath
    };
    
  } catch (error) {
    console.error('Error building display paths:', error);
    return { compact: '', full: '' };
  }
}

// Example: Error handling patterns
export async function safePathBuilder(actionId: string) {
  try {
    const path = await buildActionBreadcrumb(actionId);
    return path;
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      console.warn(`Action ${actionId} not found, showing fallback`);
      return 'Unknown Action';
    }
    
    console.error('Unexpected error in path building:', error);
    return 'Error Loading Path';
  }
}

// Export for potential use in other files
export const PathBuilderExamples = {
  demonstratePathBuilder,
  BreadcrumbComponent,
  buildNavigationMenu,
  buildCompactDisplay,
  safePathBuilder
};