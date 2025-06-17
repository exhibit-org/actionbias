/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import NextPage from '../../app/next/page';

// Mock the NextActionDisplay component
jest.mock('../../app/next/components/NextActionDisplay', () => {
  return function MockNextActionDisplay() {
    return <div data-testid="next-action-display">Mock Next Action Display</div>;
  };
});

describe('NextPage', () => {
  it('should render the page layout with NextActionDisplay component', () => {
    render(<NextPage />);
    
    expect(screen.getByTestId('next-action-display')).toBeInTheDocument();
  });

  it('should have proper responsive layout structure', () => {
    const { container } = render(<NextPage />);
    
    // Check for main container with inline styles
    const outerDiv = container.querySelector('div[style*="min-height: 100vh"]');
    expect(outerDiv).toBeInTheDocument();
    
    // Check for content wrapper
    const contentDiv = container.querySelector('div[style*="max-width: 48rem"]');
    expect(contentDiv).toBeInTheDocument();
    
    // Check for footer
    const footer = container.querySelector('footer');
    expect(footer).toBeInTheDocument();
  });
});