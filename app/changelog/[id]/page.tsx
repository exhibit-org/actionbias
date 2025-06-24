'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import ChangelogItem from '@/components/ChangelogItem';
import Footer from '../../components/Footer';
import Link from 'next/link';

interface ChangelogData {
  id: string;
  actionId: string;
  implementationStory?: string;
  impactStory?: string;
  learningStory?: string;
  changelogVisibility: string;
  completionTimestamp: string;
  actionTitle: string;
  actionDescription?: string;
  actionVision?: string;
  actionDone: boolean;
  actionCreatedAt: string;
}

interface ChangelogResponse {
  success: boolean;
  data: ChangelogData;
}

export default function ChangelogItemPage() {
  const params = useParams();
  const actionId = params.id as string;
  
  const [changelogItem, setChangelogItem] = useState<ChangelogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Color scheme to match the rest of the app
  const colors = {
    border: '#e5e7eb',
    text: '#111827',
    textMuted: '#4b5563',
    textSubtle: '#6b7280',
    textFaint: '#9ca3af'
  };

  useEffect(() => {
    fetchChangelogItem();
  }, [actionId]);

  const fetchChangelogItem = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/changelog/${actionId}`);
      const data: ChangelogResponse = await response.json();

      if (data.success) {
        setChangelogItem(data.data);
      } else {
        setError('Changelog item not found');
      }
    } catch (err) {
      setError('Error fetching changelog item');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error || !changelogItem) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error || 'Changelog item not found'}</div>
          <Link 
            href="/feed" 
            className="text-blue-600 hover:text-blue-800 underline"
          >
            View all changelog items
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 pb-48">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Share button at top */}
          <div className="flex justify-end mb-6">
            <button
              onClick={handleShare}
              className="group relative p-3 hover:bg-gray-100 rounded-full transition-all duration-200"
              aria-label="Share changelog item"
            >
              <svg 
                className={`w-8 h-8 transition-all duration-300 ${
                  copied ? 'text-green-600 scale-110' : 'text-gray-600 group-hover:text-gray-800'
                }`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                {copied ? (
                  // Checkmark icon when copied
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M5 13l4 4L19 7"
                  />
                ) : (
                  // iOS-style share icon
                  <>
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.632 4.268C18.114 15.33 18 15.786 18 16.268c0 .482.114.938.316 1.342m0-2.684a3 3 0 110 2.684M12 8v8"
                    />
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M12 8l-3 3m3-3l3 3"
                    />
                  </>
                )}
              </svg>
              {copied && (
                <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-sm text-green-600 font-medium whitespace-nowrap">
                  Link copied!
                </span>
              )}
            </button>
          </div>

          {/* Changelog Item */}
          <ChangelogItem item={changelogItem} />
        </div>
      </div>
      <Footer colors={colors} />
    </>
  );
}