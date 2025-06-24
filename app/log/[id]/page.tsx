'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import ChangelogItem from '@/components/ChangelogItem';
import ViralFooter from '../../components/ViralFooter';
import Link from 'next/link';
import { Share, Check } from 'react-feather';

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
            href="/log" 
            className="text-blue-600 hover:text-blue-800 underline"
          >
            View all log items
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 pb-64">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Share button at top */}
          <div className="flex justify-end mb-6">
            <button
              onClick={handleShare}
              className="group flex items-center gap-2 p-3 hover:bg-gray-100 rounded-full transition-all duration-200"
              aria-label="Share changelog item"
            >
              {copied && (
                <span className="text-sm text-green-600 font-medium">
                  Link copied!
                </span>
              )}
              {copied ? (
                <Check 
                  className="w-8 h-8 text-green-600 scale-110 transition-all duration-300" 
                />
              ) : (
                <Share 
                  className="w-8 h-8 text-gray-600 group-hover:text-gray-800 transition-all duration-300" 
                />
              )}
            </button>
          </div>

          {/* Changelog Item */}
          <ChangelogItem item={changelogItem} />
        </div>
      </div>
      <ViralFooter colors={colors} />
    </>
  );
}