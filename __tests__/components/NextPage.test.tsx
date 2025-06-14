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

  it('should have proper responsive layout classes', () => {
    const { container } = render(<NextPage />);
    
    const outerDiv = container.querySelector('.min-h-screen.bg-gray-50.py-8');
    expect(outerDiv).toBeInTheDocument();
    
    const innerDiv = container.querySelector('.max-w-2xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8');
    expect(innerDiv).toBeInTheDocument();
  });
});