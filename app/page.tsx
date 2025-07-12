'use client';

import { useState } from 'react';
import { ArrowRight, Terminal, GitBranch, FileText, Clock } from 'react-feather';
import Link from 'next/link';

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
              <span className="font-mono text-sm text-gray-300">actions.engineering</span>
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
            Actions = Code + Context in one loop<br />
            <span className="text-green-500">Ship work with built-in memory, live metrics, and story-ready changelogs.</span>
          </h1>
          
          <div className="space-y-4 text-gray-400 mb-12 font-mono text-sm md:text-base">
            <p className="flex items-start">
              <span className="text-green-500 mr-2">⬤</span>
              <span>Your AI agents <strong className="text-white">execute</strong>.</span>
            </p>
            <p className="flex items-start">
              <span className="text-green-500 mr-2">⬤</span>
              <span>Actions automatically <strong className="text-white">capture every step</strong>.</span>
            </p>
            <p className="flex items-start">
              <span className="text-green-500 mr-2">⬤</span>
              <span>You (and future teammates) <strong className="text-white">see the full story</strong>—no hunting through logs.</span>
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
                      Join the Early-Access Waitlist
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

      {/* Problem → Solution */}
      <section className="border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-2 gap-12 font-mono text-sm">
            <div>
              <h3 className="text-orange-500 mb-4 text-lg">Old Way</h3>
              <blockquote className="text-gray-400 mb-4 italic border-l-2 border-orange-500 pl-4">
                "Ship code now, bolt analytics on later, pray the context still matches."
              </blockquote>
              <div className="bg-gray-900 border border-gray-800 rounded p-4 space-y-2">
                <div>• Context lost in chat threads</div>
                <div>• Metrics drift from the code that generated them</div>
                <div>• New hires ask, "Why did we do that…?"</div>
              </div>
            </div>
            
            <div>
              <h3 className="text-green-500 mb-4 text-lg">Actions Way</h3>
              <blockquote className="text-gray-400 mb-4 italic border-l-2 border-green-500 pl-4">
                <strong className="text-white">Instrumented work items</strong> from the moment they're created.
              </blockquote>
              <div className="bg-gray-900 border border-gray-800 rounded p-4 space-y-2">
                <div><span className="text-green-500">1.</span> <strong className="text-white">Plan</strong> → plain-language intent</div>
                <div><span className="text-green-500">2.</span> <strong className="text-white">Execute</strong> → AI agents run & log everything</div>
                <div><span className="text-green-500">3.</span> <strong className="text-white">Capture</strong> → code, rationale, metrics stitched together</div>
                <div><span className="text-green-500">4.</span> <strong className="text-white">Learn</strong> → next task starts with richer context</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Demo */}
      <section className="border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="font-mono text-2xl text-white mb-8 text-center">
            <span className="text-green-500">## </span>One Command Demo
          </h2>
          
          <div className="max-w-3xl mx-auto">
            <div className="bg-gray-900 border border-gray-800 rounded p-6 font-mono text-sm">
              <div className="text-gray-500 mb-2"># one command demo</div>
              <div className="text-green-500">$ curl -L https://install.actions.engineering | bash</div>
              <div className="text-green-500">$ mcp action create "Add dark-mode toggle"</div>
            </div>
            
            <div className="mt-6 text-center">
              <p className="font-mono text-sm text-gray-400">
                <strong className="text-white">Result:</strong> PR opened, test run, metric link created, changelog drafted.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features (3-pack) */}
      <section className="border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-3 gap-8 font-mono text-sm">
            <div className="bg-gray-900 border border-gray-800 rounded p-6">
              <h3 className="text-green-500 mb-3 text-lg">Live Memory</h3>
              <p className="text-gray-400">
                Actions carries convo history, file diffs & errors from one agent to the next—across Claude → Gemini → ChatGPT.
              </p>
            </div>
            
            <div className="bg-gray-900 border border-gray-800 rounded p-6">
              <h3 className="text-green-500 mb-3 text-lg">Magazine-quality Changelogs</h3>
              <p className="text-gray-400">
                Raw logs become readable stories that impress stakeholders & future you.
              </p>
            </div>
            
            <div className="bg-gray-900 border border-gray-800 rounded p-6">
              <h3 className="text-green-500 mb-3 text-lg">Plug-in, Don't Patch</h3>
              <p className="text-gray-400">
                No extra SDKs; Actions binds directly into your build + deploy pipeline, so metrics stay coherent.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Philosophy */}
      <section className="border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="max-w-3xl mx-auto text-center">
            <div className="space-y-6 font-mono text-lg text-gray-400">
              <blockquote className="text-white text-2xl leading-relaxed">
                Humans imagine.<br />
                Agents execute.<br />
                <span className="text-green-500">Actions remembers.</span>
              </blockquote>
              
              <p className="text-base">
                Software improves fastest when every loop leaves a breadcrumb for the next.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-16 text-center">
          <h2 className="font-mono text-2xl text-white mb-6">
            Join the Early-Access Waitlist
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
                      Join Waitlist
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
              <p className="text-xs text-gray-600 mt-3 font-mono">
                Early access for developers building with AI agents.
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
              <span>© 2025 Actions Engineering</span>
              <span className="mx-2">•</span>
              <span>MIT License</span>
              <span className="mx-2">•</span>
              <span>Open Source</span>
            </div>
            <div className="flex items-center space-x-6">
              <a 
                href="https://github.com/exhibit-org/actionbias" 
                className="text-gray-600 hover:text-gray-400 transition-colors"
              >
                GitHub
              </a>
              <a 
                href="https://github.com/exhibit-org/actionbias/blob/main/README.md" 
                className="text-gray-600 hover:text-gray-400 transition-colors"
              >
                Docs
              </a>
              <a 
                href="https://twitter.com/saoul" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-400 transition-colors"
              >
                X/Twitter
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}