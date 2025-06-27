'use client';

import { useState } from 'react';
import { ArrowRight, Terminal, GitBranch, FileText, Clock } from 'react-feather';

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
    <div className="min-h-screen bg-black text-gray-300">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Terminal size={20} className="text-green-500" />
              <span className="font-mono text-sm text-gray-300">done.engineering</span>
            </div>
            <nav className="flex items-center space-x-6">
              <a 
                href="https://github.com/exhibit-org/actionbias" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1 font-mono text-sm"
              >
                <GitBranch size={16} />
                <span>github</span>
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="max-w-4xl">
          {/* Terminal prompt style */}
          <div className="mb-8">
            <span className="font-mono text-green-500">$</span>
            <span className="font-mono text-gray-500 ml-2">claude-code</span>
            <span className="font-mono text-gray-600 ml-2">~/projects/startup</span>
          </div>
          
          <h1 className="font-mono text-3xl md:text-4xl text-white mb-6 leading-tight">
            Ship code. Tell the story.<br />
            <span className="text-green-500">Done is the engine of more.</span>
          </h1>
          
          <div className="space-y-4 text-gray-400 mb-12 font-mono text-sm md:text-base">
            <p className="flex items-start">
              <span className="text-green-500 mr-2">&gt;</span>
              <span>Your AI agents complete work with perfect memory. Capture every decision, error, and insight.</span>
            </p>
            <p className="flex items-start">
              <span className="text-green-500 mr-2">&gt;</span>
              <span>Transform verbose logs into beautiful changelogs that showcase your progress.</span>
            </p>
            <p className="flex items-start">
              <span className="text-green-500 mr-2">&gt;</span>
              <span>Build institutional memory. Future you (and your team) will thank you.</span>
            </p>
          </div>

          {/* Email Signup Form */}
          <div className="max-w-xl">
            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-4 py-3 bg-gray-900 border border-gray-800 rounded font-mono text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500 transition-colors"
                  required
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-green-500 text-black font-mono text-sm font-bold rounded hover:bg-green-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    'submitting...'
                  ) : (
                    <>
                      join waitlist
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="bg-gray-900 border border-green-500 text-green-500 px-6 py-4 rounded font-mono text-sm">
                <span className="text-green-500">✓</span> Added to waitlist. We'll be in touch.
              </div>
            )}
            <p className="text-xs text-gray-600 mt-3 font-mono">
              Early access for developers building with AI agents.
            </p>
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="font-mono text-2xl text-white mb-8">
            <span className="text-green-500">## </span>The Problem
          </h2>
          
          <div className="grid md:grid-cols-2 gap-12 font-mono text-sm">
            <div>
              <h3 className="text-green-500 mb-4">When AI agents complete work:</h3>
              <div className="bg-gray-900 border border-gray-800 rounded p-4 space-y-2">
                <div className="text-gray-500">// They remember everything</div>
                <div>- Complete conversation history</div>
                <div>- Every file examined</div>
                <div>- Every error encountered</div>
                <div>- Every decision's rationale</div>
              </div>
            </div>
            
            <div>
              <h3 className="text-orange-500 mb-4">When humans complete work:</h3>
              <div className="bg-gray-900 border border-gray-800 rounded p-4 space-y-2">
                <div className="text-gray-500">// We forget the details</div>
                <div>- Context switching erases memory</div>
                <div>- "What did I change again?"</div>
                <div>- "Why did we decide that?"</div>
                <div>- Knowledge walks out the door</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Solution */}
      <section className="border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="font-mono text-2xl text-white mb-8">
            <span className="text-green-500">## </span>Work Historiography
          </h2>
          
          <div className="space-y-8">
            <div className="flex items-start space-x-4">
              <div className="text-green-500 mt-1">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="font-mono text-white mb-2">Capture Everything</h3>
                <p className="font-mono text-sm text-gray-400">
                  From natural language plans → structured tasks → agent execution logs → completion stories.
                  Never lose the "why" behind the "what".
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="text-green-500 mt-1">
                <Terminal size={20} />
              </div>
              <div>
                <h3 className="font-mono text-white mb-2">Transform Logs into Stories</h3>
                <p className="font-mono text-sm text-gray-400">
                  Verbose agent logs become magazine-quality articles. Share your wins. 
                  Build your portfolio. Show, don't tell.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="text-green-500 mt-1">
                <Clock size={20} />
              </div>
              <div>
                <h3 className="font-mono text-white mb-2">Done → More</h3>
                <p className="font-mono text-sm text-gray-400">
                  Every completion enriches context for the next task. Your AI agents get smarter.
                  Your team learns from history. Progress compounds.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="font-mono text-2xl text-white mb-8">
            <span className="text-green-500">## </span>Built for Real Work
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6 font-mono text-sm">
            <div className="bg-gray-900 border border-gray-800 rounded p-6">
              <h3 className="text-green-500 mb-3">Cross-Agent Memory</h3>
              <p className="text-gray-400">
                Start with Claude Code, continue with Gemini CLI, debug with ChatGPT.
                Your project context travels everywhere via MCP.
              </p>
            </div>
            
            <div className="bg-gray-900 border border-gray-800 rounded p-6">
              <h3 className="text-green-500 mb-3">Differentiated UX</h3>
              <p className="text-gray-400">
                Agents dump logs. Humans need conversation. Voice input, guided prompts,
                and GitHub integration for human-friendly capture.
              </p>
            </div>
            
            <div className="bg-gray-900 border border-gray-800 rounded p-6">
              <h3 className="text-green-500 mb-3">Beautiful Output</h3>
              <p className="text-gray-400">
                Your work deserves better than a git log. Generate magazine-quality
                changelogs that stakeholders actually want to read.
              </p>
            </div>
            
            <div className="bg-gray-900 border border-gray-800 rounded p-6">
              <h3 className="text-green-500 mb-3">Open Source</h3>
              <p className="text-gray-400">
                Self-host for control. Extend for your workflow. Built by an indie
                developer who gets it. MIT licensed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Philosophy */}
      <section className="border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="max-w-3xl">
            <h2 className="font-mono text-2xl text-white mb-8">
              <span className="text-green-500">## </span>The Philosophy
            </h2>
            
            <div className="space-y-6 font-mono text-sm text-gray-400">
              <p>
                <span className="text-white">The future isn't human OR AI—it's human AND AI.</span> 
                {' '}We dream and direct. They execute and log. The system captures and transforms.
                The organization learns and evolves.
              </p>
              
              <p>
                Every line of code has a story. Every bug fix teaches a lesson. Every feature 
                ships with context. <span className="text-green-500">Done becomes the universal 
                magazine of meaningful work</span>—where every completion is a story worth telling.
              </p>
              
              <p className="text-white">
                Because done is the engine of more.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-16 text-center">
          <h2 className="font-mono text-2xl text-white mb-6">
            Ready to ship more and remember why?
          </h2>
          
          {!isSubmitted ? (
            <div className="max-w-md mx-auto">
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-4 py-3 bg-gray-900 border border-gray-800 rounded font-mono text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500 transition-colors"
                  required
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-green-500 text-black font-mono text-sm font-bold rounded hover:bg-green-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    'submitting...'
                  ) : (
                    <>
                      get early access
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
              <p className="text-xs text-gray-600 mt-3 font-mono">
                For developers who ship with AI agents. No spam.
              </p>
            </div>
          ) : (
            <div className="bg-gray-900 border border-green-500 text-green-500 px-6 py-4 rounded font-mono text-sm max-w-md mx-auto">
              <span className="text-green-500">✓</span> You're on the list. Stay tuned.
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs">
            <div className="flex items-center text-gray-600">
              <span>© 2025 done.engineering</span>
              <span className="mx-2">•</span>
              <span>built by @bennevile</span>
            </div>
            <div className="flex items-center space-x-6">
              <a 
                href="https://github.com/exhibit-org/actionbias" 
                className="text-gray-600 hover:text-gray-400 transition-colors"
              >
                github
              </a>
              <a 
                href="https://github.com/exhibit-org/actionbias/blob/main/README.md" 
                className="text-gray-600 hover:text-gray-400 transition-colors"
              >
                docs
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}