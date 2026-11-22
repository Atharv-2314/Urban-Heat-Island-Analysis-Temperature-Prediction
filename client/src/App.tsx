// Main Application Entry with React Router, Accessibility Skip Link, and Global Accessibility
// client/src/App.tsx

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

import { Navbar } from './components/Navbar';
import { PwaPrompt } from './components/PwaPrompt';

// Lazy load all 6 pages for optimal chunking and sub-second transitions
const OverviewMap = lazy(() =>
  import('./pages/OverviewMap').then((m) => ({ default: m.OverviewMap }))
);
const CityDeepDive = lazy(() =>
  import('./pages/CityDeepDive').then((m) => ({ default: m.CityDeepDive }))
);
const SpatialExplorer = lazy(() =>
  import('./pages/SpatialExplorer').then((m) => ({ default: m.SpatialExplorer }))
);
const ModelBenchmarks = lazy(() =>
  import('./pages/ModelBenchmarks').then((m) => ({ default: m.ModelBenchmarks }))
);
const RollingValidation = lazy(() =>
  import('./pages/RollingValidation').then((m) => ({ default: m.RollingValidation }))
);
const Explainability = lazy(() =>
  import('./pages/Explainability').then((m) => ({ default: m.Explainability }))
);
const CoolingSimulator = lazy(() =>
  import('./pages/CoolingSimulator').then((m) => ({ default: m.CoolingSimulator }))
);

const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-[450px]" role="status" aria-live="polite">
    <div className="flex flex-col items-center gap-2">
      <div className="w-6 h-6 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin" />
      <span className="text-xs font-mono text-stone-600">Loading view...</span>
    </div>
  </div>
);

export const App: React.FC = () => {
  const [apiStatus, setApiStatus] = useState<'online' | 'offline' | 'checking'>('checking');

  // Probe backend status on mount
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/health`, { timeout: 5000 });
        // /api/health returns "healthy" or "degraded"; /health returns "ok"
        // Accept any 2xx response with a truthy status field as "online"
        if (res.data && (res.data.status === 'ok' || res.data.status === 'healthy' || res.data.status === 'degraded')) {
          setApiStatus('online');
        } else {
          setApiStatus('offline');
        }
      } catch {
        setApiStatus('offline');
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <BrowserRouter>
      {/* WCAG 2.1 Skip Link */}
      <a href="#main-content" className="skip-to-content focus:outline-hidden">
        Skip to main content
      </a>

      <div className="min-h-screen bg-[#fbfbf9] text-[#1f1e1d] flex flex-col font-sans selection:bg-stone-200">
        <PwaPrompt />
        <Navbar apiStatus={apiStatus} />

        <main id="main-content" tabIndex={-1} className="flex-1 max-w-7xl 2xl:max-w-(--breakpoint-2xl) w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 focus:outline-hidden">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<OverviewMap />} />
              <Route path="/city-dive" element={<CityDeepDive />} />
              <Route path="/spatial" element={<SpatialExplorer />} />
              <Route path="/models" element={<ModelBenchmarks />} />
              <Route path="/rolling" element={<RollingValidation />} />
              <Route path="/shap" element={<Explainability />} />
              <Route path="/simulator" element={<CoolingSimulator />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>

        <footer className="border-t border-[#e9e8e4] bg-[#fbfbf9] py-6 text-xs text-stone-600" role="contentinfo">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-stone-800">Urban Heat Island (UHI) Observatory</span>
              <span aria-hidden="true">•</span>
              <span>42 Global Cities (2016–2025)</span>
            </div>
            <div className="font-mono text-[11px] text-stone-600">
              WCAG 2.1 AA Compliant • Accessible Full-Stack Architecture
            </div>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
};

export default App;
