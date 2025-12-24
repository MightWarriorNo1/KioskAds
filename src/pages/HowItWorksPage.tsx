import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Loader2 } from 'lucide-react';
import SiteHeader from '../components/layouts/SiteHeader';
import Footer from '../components/shared/Footer';

export default function HowItWorksPage() {
  const [title, setTitle] = useState('How It Works');
  
  // Video settings
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  
  const [isHidden, setIsHidden] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadPageSettings = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get public system settings for how it works page
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', [
          'how_it_works_title',
          'how_it_works_hidden',
          'how_it_works_video_title',
          'how_it_works_video_description',
          'how_it_works_video_url'
        ])
        .eq('is_public', true);

      if (error) throw error;

      const settings = data || [];
      const settingsMap = new Map(settings.map(s => [s.key, s.value]));

      setTitle(settingsMap.get('how_it_works_title') || 'How It Works');
      setIsHidden(settingsMap.get('how_it_works_hidden') === true || settingsMap.get('how_it_works_hidden') === 'true');
      
      // Video settings
      setVideoTitle(settingsMap.get('how_it_works_video_title') || '');
      setVideoDescription(settingsMap.get('how_it_works_video_description') || '');
      setYoutubeUrl(settingsMap.get('how_it_works_video_url') || '');
    } catch (error) {
      console.error('Error loading how it works page settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPageSettings();
  }, [loadPageSettings]);

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

  const videoId = getYouTubeVideoId(youtubeUrl);

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
        </div>

        {videoId && (
          <div className="mb-8">
            {videoTitle && (
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                {videoTitle}
              </h2>
            )}
            {videoDescription && (
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {videoDescription}
              </p>
            )}
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute top-0 left-0 w-full h-full rounded-lg"
                src={`https://www.youtube.com/embed/${videoId}`}
                title={videoTitle || title}
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

        
      </div>
      <Footer />
    </div>
  );
}

