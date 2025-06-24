import Logo from '../components/Logo';

export default function HomePage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-fg)' }}>
      <div className="max-w-2xl mx-auto px-6 py-12">
        <header className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-mono font-semibold">
              <Logo />
            </h1>
            <nav className="flex items-center space-x-6 text-sm font-mono">
              <a 
                href="https://github.com/exhibit-org/actionbias" 
                target="_blank" 
                rel="noopener noreferrer"
                className="transition-colors hover:opacity-80"
                style={{ color: 'var(--color-secondary)' }}
              >
                github
              </a>
              <a 
                href="#try" 
                className="px-4 py-2 rounded-md transition-colors hover:opacity-90"
                style={{ 
                  backgroundColor: 'var(--color-fg)', 
                  color: 'var(--color-bg)' 
                }}
              >
                try it
              </a>
            </nav>
          </div>
        </header>

        <main>
          <section className="mb-16">
            <h2 className="text-4xl font-bold mb-6 leading-tight">
              AI-forward planning that persists across conversations
            </h2>
            <p className="text-xl mb-8 leading-relaxed" style={{ color: 'var(--color-secondary)' }}>
              Transform ephemeral AI conversations into a durable planning platform. 
              Any LLM can understand context, build upon existing plans, and maintain 
              continuity across sessions.
            </p>
            <p className="text-lg mb-12" style={{ color: 'var(--color-secondary)', opacity: '0.8' }}>
              Turn "Hey, save this to the project plan" into a reality that actually works 
              across different AI tools and conversations.
            </p>
          </section>

          <section className="mb-16">
            <h3 className="text-2xl font-semibold mb-8">What we're building</h3>
            <div className="space-y-6">
              <div className="border-l-4 pl-6" style={{ borderColor: 'var(--color-border)' }}>
                <h4 className="font-semibold mb-2">Cross-LLM Persistence</h4>
                <p style={{ color: 'var(--color-secondary)' }}>
                  Plans that survive across Claude, ChatGPT, and any other AI assistant. 
                  Your project context never gets lost in translation.
                </p>
              </div>
              <div className="border-l-4 pl-6" style={{ borderColor: 'var(--color-border)' }}>
                <h4 className="font-semibold mb-2">Intelligent Planning</h4>
                <p style={{ color: 'var(--color-secondary)' }}>
                  AI-powered action generation, dependency tracking, and context-aware 
                  suggestions that actually understand your project.
                </p>
              </div>
              <div className="border-l-4 pl-6" style={{ borderColor: 'var(--color-border)' }}>
                <h4 className="font-semibold mb-2">Built for Scale</h4>
                <p style={{ color: 'var(--color-secondary)' }}>
                  From individual prototypes to team collaboration, with authentication, 
                  multi-tenancy, and production-ready infrastructure.
                </p>
              </div>
            </div>
          </section>

          <section id="try" className="mb-16">
            <h3 className="text-2xl font-semibold mb-8">Get started</h3>
            <div className="rounded-lg p-8" style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-3">Try the MCP Server</h4>
                  <p className="mb-4" style={{ color: 'var(--color-secondary)' }}>
                    Install and connect to any MCP-compatible AI assistant:
                  </p>
                  <pre 
                    className="p-4 rounded-md overflow-x-auto text-sm font-mono"
                    style={{ 
                      backgroundColor: 'var(--color-fg)', 
                      color: 'var(--color-bg)' 
                    }}
                  >
                    <code>{`pnpm install
pnpm db:setup
pnpm dev`}</code>
                  </pre>
                </div>
                <div className="pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
                  <div className="flex flex-wrap gap-4">
                    <a 
                      href="https://github.com/exhibit-org/actionbias" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-6 py-3 rounded-md transition-colors font-medium hover:opacity-90"
                      style={{ 
                        backgroundColor: 'var(--color-fg)', 
                        color: 'var(--color-bg)' 
                      }}
                    >
                      View on GitHub
                    </a>
                    <a 
                      href="https://github.com/exhibit-org/actionbias#quick-setup" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-6 py-3 rounded-md transition-colors font-medium hover:opacity-80"
                      style={{ 
                        border: '1px solid var(--color-border)', 
                        color: 'var(--color-fg)' 
                      }}
                    >
                      Quick Setup Guide
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="pt-16" style={{ borderTop: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between text-sm font-mono" style={{ color: 'var(--color-secondary)' }}>
            <p>© 2024 ActionBias</p>
            <div className="space-x-4">
              <a 
                href="https://github.com/exhibit-org/actionbias" 
                target="_blank" 
                rel="noopener noreferrer"
                className="transition-colors hover:opacity-80"
              >
                github
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}