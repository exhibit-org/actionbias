import Link from 'next/link';
import { Terminal, GitBranch } from 'lucide-react';

export default function Header() {
  return (
    <header className="border-b border-border">
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <Terminal size={20} className="text-primary" />
            <span className="font-mono text-sm">done.engineering</span>
          </Link>
          <nav className="flex items-center space-x-6">
            <a 
              href="https://github.com/exhibit-org/actionbias" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 font-mono text-sm"
            >
              <GitBranch size={16} />
              <span>github</span>
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}