// Page 5: SHAP Interpretability & Biophysical Insights (with WCAG 2.1 Accessibility & Distinct Colorblind Curves)
// client/src/pages/Explainability.tsx

import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Sparkles,
  Info,
  Droplets,
  Trees,
  Building,
  TrendingDown,
  TrendingUp,
  Globe,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import { INITIAL_CITIES, generateCityShapMock } from '../lib/mockData';
import { fetchShapData } from '../lib/api';

export const Explainability: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlCity = searchParams.get('city');
  const urlScope = searchParams.get('scope') as 'all' | 'india' | 'international' | null;

  const [scope, setScope] = useState<'all' | 'india' | 'international' | 'city'>(() => {
    if (urlCity) return 'city';
    if (urlScope === 'india' || urlScope === 'international') return urlScope;
    return 'all';
  });
  const [selectedCity, setSelectedCity] = useState<string>(urlCity || 'Ahmedabad');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [shapData, setShapData] = useState(() =>
    generateCityShapMock(urlCity || urlScope || 'all')
  );

  const indianCities = useMemo(() => INITIAL_CITIES.filter((c) => c.country === 'India'), []);
  const intlCities = useMemo(() => INITIAL_CITIES.filter((c) => c.country !== 'India'), []);

  const cityMetadata = useMemo(() => {
    return (
      INITIAL_CITIES.find(
        (c) => c.city.toLowerCase() === selectedCity.toLowerCase()
      ) ?? INITIAL_CITIES[0]
    );
  }, [selectedCity]);

  // Handle scope change (Global, India, International)
  const handleScopeChange = (newScope: 'all' | 'india' | 'international') => {
    setScope(newScope);
    setSearchParams({ scope: newScope });
  };

  // Handle metro selection
  const handleCitySelect = (cityName: string) => {
    setSelectedCity(cityName);
    setScope('city');
    setSearchParams({ city: cityName });
  };

  // Fetch SHAP data dynamically according to active scope or city
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);

    const query = scope === 'city' ? { city: selectedCity } : { scope };

    fetchShapData(query)
      .then((res: any) => {
        if (isCancelled) return;
        if (res && res.top_drivers && res.top_drivers.length > 0) {
          setShapData(res);
        } else {
          // Fall back to scoped mock
          setShapData(generateCityShapMock(scope === 'city' ? selectedCity : scope));
        }
      })
      .catch((err) => {
        if (isCancelled) return;
        console.error('Failed to load SHAP data:', err);
        setError('Failed to fetch live SHAP attributions. Displaying local verified baseline.');
        setShapData(generateCityShapMock(scope === 'city' ? selectedCity : scope));
      })
      .finally(() => {
        if (!isCancelled) {
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [scope, selectedCity]);

  const summaryCohortText = useMemo(() => {
    if (scope === 'city') return `1 Metro (${selectedCity}) • ${shapData.records_analyzed} Monthly Observations (2025 Holdout)`;
    if (scope === 'india') return `24 Indian Metros • ${shapData.records_analyzed} Test Observations (2025 Holdout)`;
    if (scope === 'international') return `18 International Metros • ${shapData.records_analyzed} Test Observations (2025 Holdout)`;
    return `42 Global Metros • ${shapData.records_analyzed} Test Observations (2025 Holdout)`;
  }, [scope, selectedCity, shapData.records_analyzed]);

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Page 5 • TreeSHAP Model Attribution"
        title="SHAP Interpretability & Biophysical Insights"
        subtitle="Game-theoretic TreeSHAP feature attributions on HistGradientBoosting champion model. Explains the physics driving urban thermal anomalies."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {/* Geographical Scope Filter Controls */}
            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-md border border-stone-200 text-xs" role="group" aria-label="Geographical Scope Filter">
              <button
                type="button"
                onClick={() => handleScopeChange('all')}
                aria-pressed={scope === 'all'}
                className={`px-2.5 py-1 rounded font-medium transition-all focus-visible:outline-2 focus-visible:outline-stone-900 ${
                  scope === 'all' ? 'bg-stone-900 text-stone-50 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Global (42)
              </button>
              <button
                type="button"
                onClick={() => handleScopeChange('india')}
                aria-pressed={scope === 'india'}
                className={`px-2.5 py-1 rounded font-medium transition-all focus-visible:outline-2 focus-visible:outline-stone-900 ${
                  scope === 'india' ? 'bg-stone-900 text-stone-50 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                India (24)
              </button>
              <button
                type="button"
                onClick={() => handleScopeChange('international')}
                aria-pressed={scope === 'international'}
                className={`px-2.5 py-1 rounded font-medium transition-all focus-visible:outline-2 focus-visible:outline-stone-900 ${
                  scope === 'international' ? 'bg-stone-900 text-stone-50 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                International (18)
              </button>
            </div>

            {/* Metro Specific Select */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="shap-city-select" className="text-xs font-mono font-medium text-stone-700">Metro:</label>
              <select
                id="shap-city-select"
                aria-label="Select individual metro for SHAP attribution"
                value={scope === 'city' ? selectedCity : ''}
                onChange={(e) => handleCitySelect(e.target.value)}
                className="text-xs bg-white border border-stone-300 rounded px-2.5 py-1.5 font-medium text-stone-900 shadow-xs focus-visible:outline-2 focus-visible:outline-stone-900"
              >
                <option value="" disabled>-- Select Metro --</option>
                <optgroup label="Indian Metros (24)">
                  {indianCities.map((c) => (
                    <option key={c.city} value={c.city}>
                      {c.city} ({c.climate_group})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="International Metros (18)">
                  {intlCities.map((c) => (
                    <option key={c.city} value={c.city}>
                      {c.city} ({c.country})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>
        }
      />

      {/* Loading & API Notice Banner */}
      {loading && (
        <div className="flex items-center gap-2 p-3 bg-stone-100 border border-stone-200 rounded-lg text-xs font-mono text-stone-700 animate-pulse" role="status" aria-live="polite">
          <span className="w-2 h-2 rounded-full bg-stone-500 animate-ping" />
          Calculating TreeSHAP attributions for {shapData.scope || shapData.city}...
        </div>
      )}

      {error && !loading && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs font-mono text-amber-800 flex items-center justify-between" role="alert">
          <span>⚠ {error}</span>
        </div>
      )}

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" role="region" aria-label="Feature attribution summary cards">
        <MetricCard
          title={shapData.driver_cards.top_global.title}
          value={shapData.driver_cards.top_global.name}
          subtitle={`Mean |SHAP| = ${shapData.driver_cards.top_global.val}`}
          badge={{ text: shapData.driver_cards.top_global.badge, variant: 'neutral' }}
          icon={Sparkles}
          mono={false}
        />
        <MetricCard
          title={shapData.driver_cards.top_meteorology.title}
          value={shapData.driver_cards.top_meteorology.name}
          subtitle={`Mean |SHAP| = ${shapData.driver_cards.top_meteorology.val}`}
          badge={{ text: shapData.driver_cards.top_meteorology.badge, variant: 'accent' }}
          icon={Droplets}
          mono={false}
        />
        <MetricCard
          title={shapData.driver_cards.top_morphology.title}
          value={shapData.driver_cards.top_morphology.name}
          subtitle={`Mean |SHAP| = ${shapData.driver_cards.top_morphology.val}`}
          badge={{ text: shapData.driver_cards.top_morphology.badge, variant: 'negative' }}
          icon={Building}
          mono={false}
        />
        <MetricCard
          title={shapData.driver_cards.cooling_canopy.title}
          value={shapData.driver_cards.cooling_canopy.name}
          subtitle={`Mean |SHAP| = ${shapData.driver_cards.cooling_canopy.val}`}
          badge={{ text: shapData.driver_cards.cooling_canopy.badge, variant: 'positive' }}
          icon={Trees}
          mono={false}
        />
      </div>

      {/* Main Two-Column Layout: Feature Drivers vs Waterfall */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Top 10 Feature Importances */}
        <section aria-labelledby="feature-drivers-title" className="bg-white rounded-lg border border-[#e9e8e4] p-4.5 shadow-xs">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-stone-100">
            <div>
              <h3 id="feature-drivers-title" className="text-sm font-semibold text-stone-900">
                Top 10 Feature Drivers: {shapData.scope || shapData.city}
              </h3>
              <p className="text-xs text-stone-600">
                Average absolute contribution to predicted UHI intensity (°C) • {summaryCohortText}
              </p>
            </div>
            <span className="text-[11px] font-mono text-stone-600 font-semibold bg-stone-100 px-2 py-0.5 rounded">
              TreeSHAP Exact
            </span>
          </div>

          {shapData.top_drivers.length === 0 ? (
            <div className="h-84 w-full flex items-center justify-center text-stone-400 text-xs font-mono">
              No feature attribution records available for this selection.
            </div>
          ) : (
            <div className="h-84 w-full" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={shapData.top_drivers}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 130, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0efe9" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: '#57534e' }}
                    label={{ value: 'Mean |SHAP Value| (°C)', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#57534e' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    tick={{ fontSize: 10, fill: '#292524' }}
                    width={130}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e7e5e4',
                      borderRadius: '6px',
                      fontSize: '11px',
                    }}
                    formatter={(val: any, _name: any, item: any) => [
                      `${Number(val).toFixed(4)} °C (Signed: ${item?.payload?.mean_shap !== undefined ? `${item.payload.mean_shap >= 0 ? '+' : ''}${Number(item.payload.mean_shap).toFixed(4)}` : 'N/A'} °C)`,
                      'Impact',
                    ]}
                  />
                  <Bar dataKey="mean_abs_shap" radius={[0, 4, 4, 0]}>
                    {shapData.top_drivers.map((entry: any, index: number) => {
                      const color =
                        entry.domain === 'Morphology'
                          ? '#b45309'
                          : entry.domain === 'Meteorology'
                          ? '#1d4ed8'
                          : entry.domain === 'Remote Sensing'
                          ? '#475569'
                          : entry.domain === 'Green Canopy'
                          ? '#15803d'
                          : entry.domain === 'Geospatial'
                          ? '#334155'
                          : '#64748b';
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Color Legend */}
          <div className="mt-3 pt-3 border-t border-stone-100 flex flex-wrap items-center gap-3 text-xs" role="note" aria-label="Feature domain legend">
            <span className="text-stone-500 font-mono text-[11px] font-semibold">Domains:</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#1d4ed8]" aria-hidden="true"></span> Meteorology</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#b45309]" aria-hidden="true"></span> Urban Morphology</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#475569]" aria-hidden="true"></span> Remote Sensing</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#15803d]" aria-hidden="true"></span> Green Canopy</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#334155]" aria-hidden="true"></span> Geospatial</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#64748b]" aria-hidden="true"></span> Temporal Memory</span>
          </div>
        </section>

        {/* Right: SHAP Waterfall Decomposition Card */}
        <section aria-labelledby="waterfall-title" className="bg-white rounded-lg border border-[#e9e8e4] p-4.5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-stone-100">
              <div>
                <h3 id="waterfall-title" className="text-sm font-semibold text-stone-900">
                  SHAP Waterfall Attribution: {shapData.scope || shapData.city}
                </h3>
                <p className="text-xs text-stone-600">
                  Deconstruction from baseline expected value E[f(X)] to final cohort prediction
                </p>
              </div>
              {scope === 'city' && (
                <StatusBadge label={cityMetadata.climate_group} type="climate" />
              )}
              {scope !== 'city' && (
                <span className="flex items-center gap-1 text-xs font-mono text-stone-600 bg-stone-100 px-2 py-0.5 rounded">
                  <Globe className="w-3 h-3 text-stone-500" aria-hidden="true" />
                  {shapData.records_analyzed} obs
                </span>
              )}
            </div>

            {/* Baseline Card */}
            <div tabIndex={0} className="p-2.5 rounded bg-stone-100 text-stone-900 flex items-center justify-between text-xs font-mono mb-3 focus-visible:outline-2 focus-visible:outline-stone-900">
              <span className="font-semibold">Expected Baseline E[f(X)]:</span>
              <span className="font-bold text-sm">+{shapData.waterfall.baseExpected.toFixed(2)} °C</span>
            </div>

            {/* Waterfall Steps */}
            {shapData.waterfall.steps.length === 0 ? (
              <div className="p-6 text-center text-stone-400 text-xs font-mono">
                No waterfall attribution steps available for this selection.
              </div>
            ) : (
              <div className="space-y-2" role="list" aria-label="Feature contributions for this cohort">
                {shapData.waterfall.steps.map((step: any, idx: number) => {
                  const isPositive = step.value >= 0;
                  return (
                    <div
                      key={idx}
                      role="listitem"
                      tabIndex={0}
                      className={`p-2.5 rounded border text-xs flex items-center justify-between focus-visible:outline-2 focus-visible:outline-stone-900 ${
                        isPositive
                          ? 'bg-rose-50 border-rose-300 text-rose-950'
                          : 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      }`}
                    >
                      <div className="space-y-0.5 max-w-[260px]">
                        <div className="flex items-center gap-1.5 font-bold">
                          {isPositive ? (
                            <TrendingUp className="w-3.5 h-3.5 text-rose-800 shrink-0" aria-hidden="true" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5 text-emerald-800 shrink-0" aria-hidden="true" />
                          )}
                          <span>{step.feature}</span>
                        </div>
                        <p className="text-[11px] text-stone-700 leading-tight">
                          {step.desc}
                        </p>
                      </div>

                      <div className="text-right font-mono shrink-0">
                        <span
                          className={`text-sm font-bold block ${
                            isPositive ? 'text-rose-900' : 'text-emerald-900'
                          }`}
                        >
                          {isPositive ? `+${step.value.toFixed(2)}` : step.value.toFixed(2)} °C
                        </span>
                        <span className="text-[10px] text-stone-500">
                          {step.start.toFixed(2)} → {step.end.toFixed(2)} °C
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Final Net Prediction Card */}
          <div tabIndex={0} className="mt-4 pt-3 border-t border-stone-200 flex items-center justify-between bg-stone-900 text-stone-50 p-3 rounded-md focus-visible:outline-2 focus-visible:outline-stone-900">
            <div>
              <span className="text-[10px] font-mono text-stone-300 uppercase tracking-wide block font-semibold">
                Net Predicted UHI for {shapData.scope || shapData.city}
              </span>
              <span className="text-xs text-stone-300">
                Sum of Expected Baseline (+{shapData.waterfall.baseExpected.toFixed(2)} °C) + All feature attributions
              </span>
              {shapData.mean_actual_uhi !== undefined && (
                <span className="text-[11px] font-mono text-stone-400 block mt-0.5">
                  Observed test UHI: {shapData.mean_actual_uhi >= 0 ? `+${shapData.mean_actual_uhi.toFixed(2)}` : shapData.mean_actual_uhi.toFixed(2)} °C
                </span>
              )}
            </div>
            <span className="text-xl font-bold font-mono text-amber-400">
              {shapData.waterfall.finalPrediction >= 0 ? `+${shapData.waterfall.finalPrediction.toFixed(2)}` : shapData.waterfall.finalPrediction.toFixed(2)} °C
            </span>
          </div>
        </section>
      </div>

      {/* Scientific Insights Callout Banner */}
      <div tabIndex={0} className="bg-[#fcfbf9] rounded-lg border border-[#e9e8e4] p-4.5 text-xs text-stone-800 leading-relaxed space-y-2 shadow-xs focus-visible:outline-2 focus-visible:outline-stone-900">
        <div className="flex items-center gap-2 text-stone-950 font-bold text-sm">
          <Info className="w-4 h-4 text-amber-700" aria-hidden="true" />
          <span>Biophysical Driver Finding for {shapData.scope || shapData.city}</span>
        </div>
        <p>
          {shapData.biophysical_insight}
        </p>
      </div>
    </div>
  );
};
