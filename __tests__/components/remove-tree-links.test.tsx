import { render, screen } from '@testing-library/react';
import HomePage from '../../app/page';
import Header from '../../app/components/Header';
import Footer from '../../app/components/Footer';

describe('Remove exposed data links', () => {
  describe('HomePage', () => {
    it('should not contain /tree link', () => {
      render(<HomePage />);
      const treeLinks = screen.queryAllByRole('link', { name: /tree/i });
      expect(treeLinks).toHaveLength(0);
    });

    it('should not contain /search link', () => {
      render(<HomePage />);
      const searchLinks = screen.queryAllByRole('link', { name: /search/i });
      expect(searchLinks).toHaveLength(0);
    });
  });

  describe('Header component', () => {
    it('should not contain /tree link', () => {
      render(<Header />);
      const treeLinks = screen.queryAllByRole('link', { name: /tree/i });
      expect(treeLinks).toHaveLength(0);
    });

    it('should not contain /search link', () => {
      render(<Header />);
      const searchLinks = screen.queryAllByRole('link', { name: /search/i });
      expect(searchLinks).toHaveLength(0);
    });

    it('should not contain /log link', () => {
      render(<Header />);
      const logLinks = screen.queryAllByRole('link', { name: /log/i });
      expect(logLinks).toHaveLength(0);
    });
  });

  describe('Footer component', () => {
    it('should not contain /tree link', () => {
      const colors = {
        border: '#ccc',
        text: '#000',
        textMuted: '#666',
        textSubtle: '#999',
        textFaint: '#ccc'
      };
      render(<Footer colors={colors} />);
      // Check that done.engineering is not a link anymore
      const doneEngineering = screen.getByText('done.engineering');
      expect(doneEngineering.tagName).toBe('SPAN');
      expect(doneEngineering.tagName).not.toBe('A');
    });
  });
});