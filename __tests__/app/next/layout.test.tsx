/**
 * @jest-environment jsdom
 */
import { render } from '@testing-library/react';
import NextLayout, { metadata } from '../../../app/next/layout';

describe('Next Layout', () => {
  describe('metadata export', () => {
    it('should export correct metadata object', () => {
      expect(metadata).toEqual({
        title: 'Next Action - ActionBias',
        description: 'Your next action to focus on',
      });
    });

    it('should have required metadata properties', () => {
      expect(metadata).toHaveProperty('title');
      expect(metadata).toHaveProperty('description');
      expect(typeof metadata.title).toBe('string');
      expect(typeof metadata.description).toBe('string');
    });
  });

  describe('NextLayout component', () => {
    it('should render children within antialiased div', () => {
      const TestChild = () => <div data-testid="test-child">Test Content</div>;
      
      const { container, getByTestId } = render(
        <NextLayout>
          <TestChild />
        </NextLayout>
      );

      // Check that children are rendered
      expect(getByTestId('test-child')).toBeInTheDocument();
      expect(getByTestId('test-child')).toHaveTextContent('Test Content');

      // Check the wrapper div has antialiased class
      const wrapperDiv = container.firstChild as HTMLElement;
      expect(wrapperDiv).toHaveClass('antialiased');
    });

    it('should render multiple children correctly', () => {
      const { getByTestId } = render(
        <NextLayout>
          <div data-testid="child-1">First Child</div>
          <div data-testid="child-2">Second Child</div>
        </NextLayout>
      );

      expect(getByTestId('child-1')).toBeInTheDocument();
      expect(getByTestId('child-2')).toBeInTheDocument();
    });

    it('should render without children', () => {
      const { container } = render(<NextLayout children={undefined as any} />);
      
      const wrapperDiv = container.firstChild as HTMLElement;
      expect(wrapperDiv).toHaveClass('antialiased');
      expect(wrapperDiv).toBeEmptyDOMElement();
    });

    it('should have correct DOM structure', () => {
      const { container } = render(
        <NextLayout>
          <span>Content</span>
        </NextLayout>
      );

      expect(container.firstChild).toBeInstanceOf(HTMLDivElement);
      expect(container.firstChild).toHaveClass('antialiased');
      expect(container.querySelector('span')).toHaveTextContent('Content');
    });
  });
});