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
    // Simulate API call - in production, this would save to a database
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSubmitted(true);
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-xl font-semibold text-gray-900">ActionBias</span>
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
            <span>The future of AI-assisted project management</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Not just another task manager
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed">
            A platform that understands project relationships deeply enough to{' '}
            <span className="text-gray-900 font-semibold">calibrate AI agents precisely</span>{' '}
            before you set them in motion.
          </p>

          <p className="text-lg text-gray-500 mb-12 max-w-2xl mx-auto">
            ActionBias captures vertical (family) and lateral (dependency) context, 
            turning your project into a living knowledge graph that any AI can understand.
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
              Join the waitlist to be first when we launch. No spam, ever.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-16">
          How ActionBias transforms your workflow
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-600">1</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">Plan with any AI</h3>
            <p className="text-gray-600">
              Use ChatGPT, Claude, or any LLM to break down projects. 
              ActionBias captures and organizes everything automatically.
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-600">2</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">Context builds over time</h3>
            <p className="text-gray-600">
              Every conversation adds to your project's knowledge graph. 
              Dependencies and relationships are tracked automatically.
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-600">3</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">Calibrated agents, perfect execution</h3>
            <p className="text-gray-600">
              When ready to execute, ActionBias calibrates your AI agents with 
              complete context, ensuring they're precisely tuned before launch.
            </p>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-16">
            Built for engineers who ship
          </h2>
          
          <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <CheckCircle className="text-green-600" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Cross-LLM persistence</h3>
                <p className="text-gray-600">
                  Your project context works seamlessly across ChatGPT, Claude, Gemini, 
                  and any other AI assistant. Never lose context again.
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <CheckCircle className="text-green-600" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Intelligent dependencies</h3>
                <p className="text-gray-600">
                  Automatically tracks what needs to happen before what. 
                  Your AI agents always know the right order of operations.
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <CheckCircle className="text-green-600" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Beautiful changelogs</h3>
                <p className="text-gray-600">
                  Share your wins with automatically generated changelog pages. 
                  Perfect for team updates and stakeholder communication.
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <CheckCircle className="text-green-600" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Open source</h3>
                <p className="text-gray-600">
                  Self-host for complete control. Extend and customize to fit 
                  your workflow. Join a growing community of builders.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">
          Ready to supercharge your AI workflow?
        </h2>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Join forward-thinking engineers who are building the future with AI agents 
          that actually understand their projects.
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
              Be among the first to experience the future of AI project management.
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
              <span className="text-sm text-gray-600">© 2025 ActionBias</span>
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