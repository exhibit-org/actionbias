import NextActionDisplay from './components/NextActionDisplay';

export const metadata = {
  title: 'Next Action - ActionBias',
  description: 'Your next action to focus on',
};

export default function NextPage() {
  return (
    <div className="antialiased min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Next Action
          </h1>
          <p className="text-gray-600">
            Stay focused on what matters most right now
          </p>
        </div>
        
        <NextActionDisplay />
      </div>
    </div>
  );
}
