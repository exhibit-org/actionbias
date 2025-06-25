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
            <span>Where human creativity meets machine precision</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Dream like a human.<br />Execute like a machine.
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed">
            Let your imagination run wild. Explore possibilities. Change direction. 
            When you're ready, ActionBias{' '}
            <span className="text-gray-900 font-semibold">transforms your vision into precisely calibrated instructions</span>{' '}
            any AI can follow.
          </p>

          <p className="text-lg text-gray-500 mb-12 max-w-2xl mx-auto">
            Your ideas evolve organically through conversations. We capture every insight, 
            every connection, every dependency—building a living blueprint for flawless execution.
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
          From dreams to reality in three steps
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-600">1</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">Dream freely</h3>
            <p className="text-gray-600">
              Brainstorm with ChatGPT, Claude, or any AI. Change your mind. 
              Explore tangents. ActionBias remembers everything.
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-600">2</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">Shape organically</h3>
            <p className="text-gray-600">
              Your vision evolves naturally through conversations. 
              We map every connection, building a complete picture of your project.
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-600">3</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">Execute flawlessly</h3>
            <p className="text-gray-600">
              When you're ready, we transform your organic plan into 
              machine-precise instructions any AI agent can follow perfectly.
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
          Ready to bridge the gap between dreams and execution?
        </h2>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Join visionary builders who refuse to compromise between 
          creative exploration and flawless implementation.
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