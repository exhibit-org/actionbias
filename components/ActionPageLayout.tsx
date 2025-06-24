'use client';

import React from 'react';
import Footer from '../app/components/Footer';

interface ActionPageLayoutProps {
  children: React.ReactNode;
  colors: {
    bg: string;
    surface: string;
    border: string;
    borderAccent: string;
    text: string;
    textMuted: string;
    textSubtle: string;
    textFaint: string;
  };
}

export const ActionPageLayout: React.FC<ActionPageLayoutProps> = ({
  children,
  colors,
}) => {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.bg,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Content area - scrollable */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '2rem 1rem 1rem 1rem',
      }}>
        <div style={{
          maxWidth: '48rem',
          margin: '0 auto',
        }}>
          {children}
        </div>
      </div>
      
      <Footer colors={colors} />
    </div>
  );
};