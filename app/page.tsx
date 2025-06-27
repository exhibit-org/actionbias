'use client';

import { useState } from 'react';
import { ArrowRight, Zap, GitBranch, CheckCircle, ChevronRight } from 'react-feather';

export default function HomePage() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          source: 'homepage',
          metadata: {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
          }
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsSubmitted(true);
        setEmail(''); // Clear the form
      } else {
        // In production, you'd want better error handling
        alert(data.error || 'Something went wrong. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting email:', error);
      alert('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-xl font-semibold text-gray-900">done.engineering</span>
          </div>
          <nav className="flex items-center space-x-6">
            <a 
              href="https://github.com/exhibit-org/actionbias" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1"
            >
              <GitBranch size={16} />
              <span>GitHub</span>
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-6">
            <Zap size={16} />
            <span>Built for Claude Code & Gemini CLI power users</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Your context, everywhere.<br />Never start over again.
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed">
            Stop losing context when switching between Claude Code, Gemini CLI, and other AI tools.
            <span className="text-gray-900 font-semibold"> Keep your entire project history alive</span>{' '}
            across every conversation, every agent, every session.
          </p>

          <p className="text-lg text-gray-500 mb-12 max-w-2xl mx-auto">
            Done is the engine of more. Every completed task becomes context for the next.
            Your AI agents understand not just what to do, but why—because they have the full story.
          </p>

          {/* Email Signup Form */}
          <div className="max-w-md mx-auto">
            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-5 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  required
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    'Requesting...'
                  ) : (
                    <>
                      Request Early Access
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="bg-green-50 text-green-800 px-6 py-4 rounded-lg flex items-center justify-center gap-2">
                <CheckCircle size={20} />
                <span className="font-medium">Thanks! We'll be in touch soon.</span>
              </div>
            )}
            <p className="text-sm text-gray-500 mt-3">
              Get early access to the context layer for AI development. No spam, ever.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-16">
          Context that travels with you
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-600">1</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">Start anywhere</h3>
            <p className="text-gray-600">
              Begin with Claude Code, switch to Gemini CLI, jump to ChatGPT.
              Your project context follows you everywhere.
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-600">2</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">Build continuously</h3>
            <p className="text-gray-600">
              Every completed action enriches your project's context.
              Your AI agents get smarter with each task they complete.
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-600">3</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">Ship confidently</h3>
            <p className="text-gray-600">
              Beautiful changelogs showcase your progress. Every "done"
              becomes fuel for what's next. Done is the engine of more.
            </p>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-16">
            Essential for AI-native developers
          </h2>
          
          <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <CheckCircle className="text-green-600" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Never lose context again</h3>
                <p className="text-gray-600">
                  Switch between Claude Code and Gemini CLI without missing a beat.
                  Your entire project history, decisions, and progress travel with you.
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <CheckCircle className="text-green-600" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Context-aware AI agents</h3>
                <p className="text-gray-600">
                  Your AI understands not just the current task, but the entire project story.
                  Every agent knows what's been done and why it matters.
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <CheckCircle className="text-green-600" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Done is the engine of more</h3>
                <p className="text-gray-600">
                  Every completed task enriches your project's context. Beautiful changelogs
                  showcase progress and fuel what comes next.
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <CheckCircle className="text-green-600" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Built for your workflow</h3>
                <p className="text-gray-600">
                  Works with your existing tools via MCP (Model Context Protocol).
                  Open source and self-hostable for complete control.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">
          Stop starting over. Start shipping more.
        </h2>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Join developers who use Claude Code and Gemini CLI to build faster
          without losing context between sessions.
        </p>
        
        {!isSubmitted ? (
          <div className="max-w-md mx-auto">
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-5 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                required
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  'Requesting...'
                ) : (
                  <>
                    Get Early Access
                    <ChevronRight size={18} />
                  </>
                )}
              </button>
            </form>
            <p className="text-sm text-gray-500 mt-3">
              Be among the first to experience persistent context across all your AI tools.
            </p>
          </div>
        ) : (
          <div className="bg-green-50 text-green-800 px-6 py-4 rounded-lg max-w-md mx-auto flex items-center justify-center gap-2">
            <CheckCircle size={20} />
            <span className="font-medium">You're on the list! We'll reach out soon.</span>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center">
              <span className="text-sm text-gray-600">© 2025 done.engineering</span>
            </div>
            <div className="flex items-center space-x-6 text-sm">
              <a 
                href="https://github.com/exhibit-org/actionbias" 
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                GitHub
              </a>
              <a 
                href="https://github.com/exhibit-org/actionbias/blob/main/README.md" 
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Documentation
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}