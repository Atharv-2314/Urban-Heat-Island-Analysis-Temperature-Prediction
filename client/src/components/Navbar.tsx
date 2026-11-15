// Anthropic-styled Navigation Bar
// client/src/components/Navbar.tsx

import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Globe,
  LineChart,
  Grid,
  BarChart3,
  Sparkles,
  Sliders,
  Activity,
  CheckCircle2,
  AlertCircle,
  Menu,
  X,
} from 'lucide-react';

interface NavbarProps {
  apiStatus?: 'online' | 'offline' | 'checking';
}

export const Navbar: React.FC<NavbarProps> = ({ apiStatus = 'checking' }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const navItems = [
    { to: '/', label: 'Overview Map', icon: Globe, exact: true },
    { to: '/city-dive', label: 'City Deep-Dive', icon: LineChart },
    { to: '/spatial', label: 'Spatial Grid', icon: Grid },
    { to: '/models', label: 'ML Benchmarks', icon: BarChart3 },
    { to: '/shap', label: 'Explainability', icon: Sparkles },
    { to: '/simulator', label: 'Cooling Simulator', icon: Sliders },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#fbfbf9]/90 backdrop-blur-md border-b border-[#e9e8e4]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#292524] text-[#fbfbf9] flex items-center justify-center font-semibold text-lg shadow-xs tracking-tight">
              UHI
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-stone-900 tracking-tight text-base">
                  Urban Heat Island Observatory
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono tracking-wide uppercase bg-stone-200/70 text-stone-700 rounded-sm">
                  2016–2025 Study
                </span>
              </div>
              <p className="text-xs text-stone-500 hidden md:block">
                42 Global Cities • Chronological Machine Learning • Biophysical Policy Simulator
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-stone-900 text-stone-50 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                    }`
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Right Status Indicator & Mobile Toggle */}
          <div className="flex items-center gap-3">
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border ${
                apiStatus === 'online'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : apiStatus === 'offline'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-stone-100 text-stone-600 border-stone-200'
              }`}
              title={
                apiStatus === 'online'
                  ? 'Node.js Express backend API connected (Port 3001)'
                  : 'Using client-side high fidelity cache (Start server on :3001 for live pipeline)'
              }
            >
              {apiStatus === 'online' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : apiStatus === 'offline' ? (
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              ) : (
                <Activity className="w-3.5 h-3.5 text-stone-500 animate-spin" />
              )}
              <span>{apiStatus === 'online' ? 'API LIVE' : 'CLIENT CACHE'}</span>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-md text-stone-600 hover:text-stone-900 hover:bg-stone-200/60"
              aria-label="Toggle navigation menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-b border-[#e9e8e4] bg-[#fbfbf9] px-4 pt-2 pb-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium ${
                    isActive
                      ? 'bg-stone-900 text-stone-50'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      )}
    </header>
  );
};
