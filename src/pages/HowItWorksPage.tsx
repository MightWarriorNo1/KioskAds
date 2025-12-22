import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import SiteHeader from '../components/layouts/SiteHeader';
import Footer from '../components/shared/Footer';

export default function HowItWorksPage() {
  const { user } = useAuth();
  const [title, setTitle] = useState('How It Works');
  const [description, setDescription] = useState('');
  
  // Client video settings
  const [clientVideoTitle, setClientVideoTitle] = useState('');
  const [clientVideoDescription, setClientVideoDescription] = useState('');
  const [clientYoutubeUrl, setClientYoutubeUrl] = useState('');
  
  // Host video settings
  const [hostVideoTitle, setHostVideoTitle] = useState('');
  const [hostVideoDescription, setHostVideoDescription] = useState('');
  const [hostYoutubeUrl, setHostYoutubeUrl] = useState('');
  
  const [isHidden, setIsHidden] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPageSettings();
  }, []);

  const loadPageSettings = async () => {
    try {
      setLoading(true);
      
      // Get public system settings for how it works page
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', [
          'how_it_works_title',
          'how_it_works_description',
          'how_it_works_hidden',
          'how_it_works_client_video_title',
          'how_it_works_client_video_description',
          'how_it_works_client_youtube_url',
          'how_it_works_host_video_title',
          'how_it_works_host_video_description',
          'how_it_works_host_youtube_url'
        ])
        .eq('is_public', true);

      if (error) throw error;

      const settings = data || [];
      const settingsMap = new Map(settings.map(s => [s.key, s.value]));

      setTitle(settingsMap.get('how_it_works_title') || 'How It Works');
      setDescription(settingsMap.get('how_it_works_description') || '');
      setIsHidden(settingsMap.get('how_it_works_hidden') === true || settingsMap.get('how_it_works_hidden') === 'true');
      
      // Client video settings
      setClientVideoTitle(settingsMap.get('how_it_works_client_video_title') || '');
      setClientVideoDescription(settingsMap.get('how_it_works_client_video_description') || '');
      setClientYoutubeUrl(settingsMap.get('how_it_works_client_youtube_url') || '');
      
      // Host video settings
      setHostVideoTitle(settingsMap.get('how_it_works_host_video_title') || '');
      setHostVideoDescription(settingsMap.get('how_it_works_host_video_description') || '');
      setHostYoutubeUrl(settingsMap.get('how_it_works_host_youtube_url') || '');
    } catch (error) {
      console.error('Error loading how it works page settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Extract YouTube video ID from URL
  const getYouTubeVideoId = (url: string): string | null => {
    if (!url) return null;
    
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  };

  // Determine which video to show based on user role
  const isHost = user?.role === 'host';
  const isClient = user?.role === 'client';
  
  const activeYoutubeUrl = isHost ? hostYoutubeUrl : isClient ? clientYoutubeUrl : (clientYoutubeUrl || hostYoutubeUrl);
  const activeVideoTitle = isHost ? hostVideoTitle : isClient ? clientVideoTitle : '';
  const activeVideoDescription = isHost ? hostVideoDescription : isClient ? clientVideoDescription : '';
  
  const videoId = getYouTubeVideoId(activeYoutubeUrl);

  // If page is hidden, show 404-like message
  if (isHidden) {
    return (
      <div className="min-h-screen bg-[rgb(var(--bg))] dark:bg-gradient-to-br dark:from-slate-900 dark:via-blue-900 dark:to-slate-800 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Page Not Available</h1>
          <p className="text-gray-600 dark:text-gray-400">This page is currently unavailable.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[rgb(var(--bg))] dark:bg-gradient-to-br dark:from-slate-900 dark:via-blue-900 dark:to-slate-800 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--bg))] dark:bg-gradient-to-br dark:from-slate-900 dark:via-blue-900 dark:to-slate-800">
      <SiteHeader />
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">{title}</h1>
          {description && (
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {description}
            </p>
          )}
        </div>

        {videoId && (
          <div className="mb-8">
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute top-0 left-0 w-full h-full rounded-lg"
                src={`https://www.youtube.com/embed/${videoId}`}
                title={title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}

        {!videoId && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 mb-8">
            <p className="text-yellow-800 dark:text-yellow-200 text-sm">
              No video has been configured for this page. Please contact an administrator.
            </p>
          </div>
        )}

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Getting Started</h2>
          <div className="space-y-4 text-gray-700 dark:text-gray-300">
            <div>
              <h3 className="font-semibold mb-2">1. Create Your Account</h3>
              <p className="text-sm">Sign up for an account to get started with EZ Kiosk Ads. Choose whether you're an advertiser (client) or a kiosk owner (host).</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">2. Set Up Your Campaign</h3>
              <p className="text-sm">For clients: Select kiosks, choose your campaign dates, and upload your ad content. For hosts: List your kiosks and set your pricing.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">3. Review & Approval</h3>
              <p className="text-sm">Our team reviews all submissions to ensure content meets our standards and complies with advertising guidelines.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">4. Launch & Monitor</h3>
              <p className="text-sm">Once approved, your campaign goes live! Monitor performance through our analytics dashboard.</p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

