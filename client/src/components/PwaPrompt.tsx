import React, { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { WifiOff, RefreshCw, X } from 'lucide-react';

export const PwaPrompt: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ', r);
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <>
      {/* Offline Status Indicator Banner */}
      {isOffline && (
        <aside
          role="status"
          aria-live="polite"
          className="bg-amber-600 text-stone-900 px-4 py-2 text-xs font-medium flex items-center justify-between shadow-md"
        >
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <WifiOff className="w-4 h-4 shrink-0 text-amber-950" aria-hidden="true" />
            <span>
              You are currently offline. Running from local Progressive Web App cache (offline map tiles & pre-computed models available).
            </span>
          </div>
        </aside>
      )}

      {/* Service Worker New Version Update Prompt */}
      {needRefresh && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed bottom-4 right-4 z-50 max-w-sm p-4 bg-stone-900 text-stone-50 rounded-lg shadow-xl border border-stone-700 flex flex-col gap-2"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-amber-400 shrink-0 animate-spin" aria-hidden="true" />
              <span className="text-xs font-semibold">New version available</span>
            </div>
            <button
              type="button"
              onClick={() => setNeedRefresh(false)}
              className="text-stone-400 hover:text-stone-200 p-0.5 rounded"
              aria-label="Dismiss update notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-stone-300">
            An updated dataset and model checkpoint have been published. Reload to update the offline cache.
          </p>
          <div className="flex items-center gap-2 mt-1">
            <button
              type="button"
              onClick={() => updateServiceWorker(true)}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs rounded transition-colors"
            >
              Reload & Update
            </button>
            <button
              type="button"
              onClick={() => setNeedRefresh(false)}
              className="px-2.5 py-1.5 text-stone-300 hover:text-stone-100 text-xs"
            >
              Later
            </button>
          </div>
        </div>
      )}
    </>
  );
};
