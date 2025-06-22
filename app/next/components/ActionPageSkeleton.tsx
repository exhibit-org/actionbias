import { ColorScheme } from './types';

interface Props {
  colors: ColorScheme;
  isMobile?: boolean; // Optional: to adjust layout like in NextActionDisplay
}

const ActionPageSkeleton = ({ colors, isMobile }: Props) => {
  const skeletonBlock = (height: string, width = '100%', marginBottom = '0.5rem') => (
    <div style={{ height, width, backgroundColor: colors.border, borderRadius: '0.25rem', marginBottom }}></div>
  );

  return (
    <div data-testid="loading-skeleton" style={{ backgroundColor: 'white', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', borderRadius: '0.5rem', padding: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gridTemplateRows: isMobile ? 'auto auto auto auto' : 'auto auto', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Quadrant 1: Action Details Skeleton */}
        <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '0.5rem', padding: '1rem', order: isMobile ? 1 : 'unset' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ width: '20px', height: '20px', backgroundColor: colors.border, borderRadius: '0.375rem', flexShrink: 0 }}></div>
            {skeletonBlock('1.125rem', '60%', '0')}
          </div>
          {skeletonBlock('0.875rem', '90%')}
          {skeletonBlock('0.875rem', '70%')}
        </div>

        {/* Quadrant 2: Vision Skeleton */}
        <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '0.5rem', padding: '1rem', borderLeft: `4px solid ${colors.borderAccent}`, order: isMobile ? 2 : 'unset' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{ width: '16px', height: '16px', backgroundColor: colors.border, borderRadius: '50%', marginTop: '0.125rem', flexShrink: 0 }}></div>
            {skeletonBlock('0.875rem', '30%', '0')}
          </div>
          {skeletonBlock('0.875rem', '80%')}
          {skeletonBlock('0.875rem', '60%')}
        </div>

        {/* Quadrant 3: Broader Context Skeleton */}
        <div style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '0.5rem', padding: '1rem', borderLeft: `4px solid ${colors.textFaint}`, order: isMobile ? 3 : 'unset' }}>
          {skeletonBlock('0.875rem', '40%', '0.75rem')}
          {skeletonBlock('0.8rem', '90%')}
          {skeletonBlock('0.8rem', '70%')}
          {skeletonBlock('0.8rem', '80%')}
        </div>

        {/* Quadrant 4: Broader Vision (Metadata) Skeleton */}
        <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '0.5rem', padding: '1rem', borderLeft: `4px solid ${colors.textFaint}`, order: isMobile ? 4 : 'unset' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{ width: '14px', height: '14px', backgroundColor: colors.border, borderRadius: '50%', marginTop: '0.125rem', flexShrink: 0 }}></div>
            {skeletonBlock('0.875rem', '35%', '0')}
          </div>
          {skeletonBlock('0.8rem', '85%')}
          {skeletonBlock('0.8rem', '65%')}
        </div>
      </div>
      {/* Placeholder for buttons and navigation, mimicking NextActionDisplay structure but simpler */}
      <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem', paddingTop: '1rem', borderTop: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        {skeletonBlock('2.25rem', '200px', '0')}
        {skeletonBlock('2.25rem', '200px', '0')}
      </div>
      <div>
        {skeletonBlock('1rem', '30%', '0.75rem')}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {skeletonBlock('1.5rem', '20%', '0')}
            {skeletonBlock('1.5rem', '20%', '0')}
        </div>
      </div>
    </div>
  );
};

export default ActionPageSkeleton;
