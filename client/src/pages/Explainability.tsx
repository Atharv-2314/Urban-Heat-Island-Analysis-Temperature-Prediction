// Page 5: SHAP Interpretability & Biophysical Insights (with WCAG 2.1 Accessibility & Distinct Colorblind Curves)
// client/src/pages/Explainability.tsx

import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import { TOP_SHAP_DRIVERS, INITIAL_CITIES } from '../lib/mockData';

export const Explainability: React.FC = () => {
  const [selectedCity, setSelectedCity] = useState<string>('Ahmedabad');

  const cityMetadata = useMemo(() => {
    return (
      INITIAL_CITIES.find(
        (c) => c.city.toLowerCase() === selectedCity.toLowerCase()
      ) ?? INITIAL_CITIES[0]
    );
  }, [selectedCity]);

  // City-specific SHAP Waterfall Decomposition
  const cityWaterfall = useMemo(() => {
    const isArid = cityMetadata.climate_group === 'Arid';

    const baseExpected = 1.85; // E[f(X)] global expected UHI
    const contributions = [
      {
        feature: 'Built Impervious Index (NDBI)',
        value: isArid ? +0.68 : +0.44,
        direction: 'warming',
        featureVal: '0.48',
        desc: 'High concrete & asphalt surface thermal absorption',
      },
      {
        feature: 'Relative Humidity',
        value: isArid ? +0.52 : -0.28,
        direction: isArid ? 'warming' : 'cooling',
        featureVal: isArid ? '28%' : '76%',
        desc: isArid ? 'Dry air boundary layer amplifies radiative storage' : 'Moisture suppresses urban-rural gradient',
      },
      {
        feature: 'Built-to-Vegetation Ratio',
        value: isArid ? +0.35 : +0.22,
        direction: 'warming',
        featureVal: '0.36',
        desc: 'Severe deficit of evapotranspirative tree canopy',
      },
      {
        feature: 'Vegetation Canopy (NDVI)',
        value: isArid ? -0.12 : -0.38,
        direction: 'cooling',
        featureVal: isArid ? '0.14' : '0.42',
        desc: 'Evaporative cooling from urban greenery',
      },
      {
        feature: 'Wind Speed',
        value: -0.18,
        direction: 'cooling',
        featureVal: '3.4 m/s',
        desc: 'Advective dispersion of urban boundary heat dome',
      },
      {
        feature: 'Valid LST Pixel Density',
        value: +0.22,
        direction: 'warming',
        featureVal: '98.5%',
        desc: 'Unobstructed clear-sky thermal sensing capture',
      },
    ];

    let runningTotal = baseExpected;
    const steps = contributions.map((c) => {
      const start = runningTotal;
      runningTotal = parseFloat((runningTotal + c.value).toFixed(2));
      return {
        ...c,
        start,
        end: runningTotal,
      };
    });

    return {
      baseExpected,
      steps,
      finalPrediction: runningTotal,
    };
  }, [cityMetadata]);

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Page 5 • TreeSHAP Model Attribution"
        title="SHAP Interpretability & Biophysical Insights"
        subtitle="Game-theoretic TreeSHAP feature attributions on HistGradientBoosting champion model. Explains the physics driving urban thermal anomalies."
        actions={
          <div className="flex items-center gap-2">
            <label htmlFor="shap-city-select" className="text-xs font-mono font-medium text-stone-700">Select Metro:</label>
            <select
              id="shap-city-select"
              aria-label="Select city for SHAP attribution"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="text-xs bg-white border border-stone-300 rounded px-3 py-1.5 font-medium text-stone-900 shadow-xs focus-visible:outline-2 focus-visible:outline-stone-900"
            >
              {INITIAL_CITIES.map((c) => (
                <option key={c.city} value={c.city}>
                  {c.city} ({c.climate_group})
                </option>
              ))}
            </select>
          </div>
        }
      />

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" role="region" aria-label="Feature attribution summary cards">
        <MetricCard
          title="Top Global Driver"
          value="Pixel Count / Quality"
          subtitle="Clear-sky remote sensing thermal signal"
          badge={{ text: 'RANK #1 (0.423)', variant: 'neutral' }}
          icon={Sparkles}
          mono={false}
        />
        <MetricCard
          title="Top Meteorological Driver"
          value="Relative Humidity"
          subtitle="Mean |SHAP| = 0.3646 °C effect"
          badge={{ text: 'RANK #2 (0.365)', variant: 'accent' }}
          icon={Droplets}
          mono={false}
        />
        <MetricCard
          title="Top Morphology Driver"
          value="Built-Up Index (NDBI)"
          subtitle="Mean |SHAP| = 0.1385 °C direct effect"
          badge={{ text: 'RANK #6 (0.138)', variant: 'negative' }}
          icon={Building}
          mono={false}
        />
        <MetricCard
          title="Cooling Canopy Driver"
          value="NDVI Vegetation"
          subtitle="Suppresses UHI across high humidity zones"
          badge={{ text: 'COOLING FACTOR', variant: 'positive' }}
          icon={Trees}
          mono={false}
        />
      </div>

      {/* Main Two-Column Layout: Global Beeswarm/Bar vs Individual City Waterfall */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Top 10 Global SHAP Feature Importances */}
        <section aria-labelledby="global-shap-title" className="bg-white rounded-lg border border-[#e9e8e4] p-4.5 shadow-xs">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-stone-100">
            <div>
              <h3 id="global-shap-title" className="text-sm font-semibold text-stone-900">
                Top 10 Global Drivers (Mean |SHAP| Value)
              </h3>
              <p className="text-xs text-stone-600">
                Average absolute contribution to predicted UHI intensity (°C) across all 504 test months
              </p>
            </div>
            <span className="text-[11px] font-mono text-stone-600 font-semibold">
              TreeSHAP Exact
            </span>
          </div>

          <div className="h-80 w-full" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={TOP_SHAP_DRIVERS}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 110, bottom: 5 }}
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
                  width={110}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e7e5e4',
                    borderRadius: '6px',
                    fontSize: '11px',
                  }}
                  formatter={(val: any) => [`${Number(val).toFixed(4)} °C`, 'Impact']}
                />
                <Bar dataKey="mean_abs_shap" radius={[0, 4, 4, 0]}>
                  {TOP_SHAP_DRIVERS.map((entry, index) => {
                    // Accessible high-contrast Okabe-Ito colors
                    const color =
                      index === 0
                        ? '#475569'
                        : index === 1
                        ? '#0369a1'
                        : index === 2
                        ? '#334155'
                        : entry.domain === 'Morphology'
                        ? '#b45309'
                        : entry.domain === 'Meteorology'
                        ? '#1d4ed8'
                        : '#15803d';
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Color Legend */}
          <div className="mt-3 pt-3 border-t border-stone-100 flex flex-wrap items-center gap-3 text-xs" role="note" aria-label="Feature domain legend">
            <span className="text-stone-500 font-mono text-[11px] font-semibold">Domains:</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#1d4ed8]" aria-hidden="true"></span> Meteorology</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#b45309]" aria-hidden="true"></span> Urban Morphology</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#475569]" aria-hidden="true"></span> Remote Sensing</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#15803d]" aria-hidden="true"></span> Green Canopy</span>
          </div>
        </section>

        {/* Right: Individual City SHAP Waterfall Decomposition Card */}
        <section aria-labelledby="city-waterfall-title" className="bg-white rounded-lg border border-[#e9e8e4] p-4.5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-stone-100">
              <div>
                <h3 id="city-waterfall-title" className="text-sm font-semibold text-stone-900">
                  SHAP Waterfall Attribution: {cityMetadata.city}
                </h3>
                <p className="text-xs text-stone-600">
                  Deconstruction from baseline expected value E[f(X)] to final city prediction
                </p>
              </div>
              <StatusBadge label={cityMetadata.climate_group} type="climate" />
            </div>

            {/* Baseline Card */}
            <div tabIndex={0} className="p-2.5 rounded bg-stone-100 text-stone-900 flex items-center justify-between text-xs font-mono mb-3 focus-visible:outline-2 focus-visible:outline-stone-900">
              <span className="font-semibold">Expected Baseline E[f(X)]:</span>
              <span className="font-bold text-sm">+{cityWaterfall.baseExpected} °C</span>
            </div>

            {/* Waterfall Steps */}
            <div className="space-y-2" role="list" aria-label="Feature contributions for this city">
              {cityWaterfall.steps.map((step, idx) => {
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
                        <span className="text-[10px] font-mono text-stone-600">
                          ({step.featureVal})
                        </span>
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
                        → {step.end.toFixed(2)} °C
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Final Net Prediction Card */}
          <div tabIndex={0} className="mt-4 pt-3 border-t border-stone-200 flex items-center justify-between bg-stone-900 text-stone-50 p-3 rounded-md focus-visible:outline-2 focus-visible:outline-stone-900">
            <div>
              <span className="text-[10px] font-mono text-stone-300 uppercase tracking-wide block font-semibold">
                Net Predicted UHI for {cityMetadata.city}
              </span>
              <span className="text-xs text-stone-300">
                Sum of Expected Baseline + All SHAP attributions
              </span>
            </div>
            <span className="text-xl font-bold font-mono text-amber-400">
              +{cityWaterfall.finalPrediction.toFixed(2)} °C
            </span>
          </div>
        </section>
      </div>

      {/* Scientific Insights Callout Banner */}
      <div tabIndex={0} className="bg-[#fcfbf9] rounded-lg border border-[#e9e8e4] p-4.5 text-xs text-stone-800 leading-relaxed space-y-2 shadow-xs focus-visible:outline-2 focus-visible:outline-stone-900">
        <div className="flex items-center gap-2 text-stone-950 font-bold text-sm">
          <Info className="w-4 h-4 text-amber-700" aria-hidden="true" />
          <span>Core Biophysical Finding from SHAP Attributions</span>
        </div>
        <p>
          TreeSHAP attributions reveal that urban morphology proxies (<strong>NDBI built-up index</strong> and <strong>built-to-vegetation ratio</strong>) exert an asymmetric warming push across all 42 metros, but their absolute thermal expression is modulated by <strong>ambient relative humidity</strong> and <strong>antecedent soil moisture</strong>. In arid climates (Delhi, Ahmedabad, Riyadh), dry atmosphere allows unmitigated thermal accumulation (+0.52 °C push), whereas in humid tropical regimes (Mumbai, Chennai, Singapore), moisture acts as a thermal buffer, dampening the surface temperature differential.
        </p>
      </div>
    </div>
  );
};
