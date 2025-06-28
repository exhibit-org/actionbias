/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { SearchProvider, useSearch } from '@/components/SearchContext';

describe('SearchContext', () => {
  it('should provide search state and controls', () => {
    const TestComponent = () => {
      const { isOpen, openSearch, closeSearch, toggleSearch } = useSearch();
      
      return (
        <div>
          <div data-testid="state">Search is {isOpen ? 'open' : 'closed'}</div>
          <button onClick={openSearch}>Open</button>
          <button onClick={closeSearch}>Close</button>
          <button onClick={toggleSearch}>Toggle</button>
        </div>
      );
    };

    render(
      <SearchProvider>
        <TestComponent />
      </SearchProvider>
    );

    expect(screen.getByTestId('state')).toHaveTextContent('Search is closed');

    act(() => {
      screen.getByText('Open').click();
    });
    expect(screen.getByTestId('state')).toHaveTextContent('Search is open');

    act(() => {
      screen.getByText('Close').click();
    });
    expect(screen.getByTestId('state')).toHaveTextContent('Search is closed');

    act(() => {
      screen.getByText('Toggle').click();
    });
    expect(screen.getByTestId('state')).toHaveTextContent('Search is open');

    act(() => {
      screen.getByText('Toggle').click();
    });
    expect(screen.getByTestId('state')).toHaveTextContent('Search is closed');
  });

  it('should throw error when used outside provider', () => {
    const TestComponent = () => {
      useSearch();
      return null;
    };

    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useSearch must be used within a SearchProvider');

    consoleError.mockRestore();
  });
});