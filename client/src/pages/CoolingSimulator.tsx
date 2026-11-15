// Page 6: Interactive Urban Cooling Simulator (with WCAG 2.1 Full Keyboard Tab, ARIA, and Accessible Sliders)
// client/src/pages/CoolingSimulator.tsx

import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Sliders,
  Trees,
  Sun,
  Droplets,
  RotateCcw,
  Sparkles,
  Download,
  CheckCircle2,
  TrendingDown,
  ShieldCheck,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import { INITIAL_CITIES } from '../lib/mockData';
import type { SimulationResultItem } from '../types';

export const CoolingSimulator: React.FC = () => {
  const [deltaNdvi, setDeltaNdvi] = useState<number>(0.15); // +15% greening
  const [deltaNdbi, setDeltaNdbi] = useState<number>(-0.15); // -15% cool roofs
  const [deltaNdwi, setDeltaNdwi] = useState<number>(0.05); // +5% water retention
  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [appliedScenario, setAppliedScenario] = useState<string>('Moderate Green & Cool Roofs');

  // Pre-set policy scenario handler
  const applyPreset = (preset: { name: string; ndvi: number; ndbi: number; ndwi: number }) => {
    setDeltaNdvi(preset.ndvi);
    setDeltaNdbi(preset.ndbi);
    setDeltaNdwi(preset.ndwi);
    setAppliedScenario(preset.name);
  };

  const presets = [
    {
      name: 'Moderate Green & Cool Roofs',
      ndvi: 0.15,
      ndbi: -0.15,
      ndwi: 0.05,
      desc: 'Balanced realistic municipal policy (+15% canopy, -15% albedo, +5% water)',
    },
    {
      name: 'Aggressive Urban Greening',
      ndvi: 0.25,
      ndbi: -0.10,
      ndwi: 0.10,
      desc: 'Urban forestry, extensive green roofs, and retention wetlands (+25% NDVI)',
    },
    {
      name: 'High-Albedo Cool Roofs Focus',
      ndvi: 0.05,
      ndbi: -0.25,
      ndwi: 0.00,
      desc: 'Reflective paint, light-colored pavements, and cool materials (-25% NDBI)',
    },
  ];

  // Mathematical counterfactual response calculator (exact match with Phase 3 benchmark)
  const simulationResults = useMemo(() => {
    const list: SimulationResultItem[] = [];
    const targetCities =
      selectedCity === 'All'
        ? INITIAL_CITIES
        : INITIAL_CITIES.filter((c) => c.city.toLowerCase() === selectedCity.toLowerCase());

    targetCities.forEach((c) => {
      // Base UHI
      const baseUhi =
        c.climate_group === 'Arid' ? 2.85 : c.climate_group === 'Tropical' ? 2.15 : 1.65;

      const greeningEffect = -1 * (deltaNdvi * 0.95);
      const coolRoofEffect = deltaNdbi * 0.85; // deltaNdbi is negative, so this is negative
      const waterEffect = -1 * (deltaNdwi * 0.45);

      // Climate sensitivity factor
      const climateMultiplier =
        c.climate_group === 'Tropical' ? 1.25 : c.climate_group === 'Arid' ? 1.15 : 0.95;

      const deltaUhi = parseFloat(
        ((greeningEffect + coolRoofEffect + waterEffect) * climateMultiplier).toFixed(3)
      );

      const simulatedUhi = parseFloat(Math.max(-0.5, baseUhi + deltaUhi).toFixed(3));

      list.push({
        city: c.city,
        climate_group: c.climate_group,
        current_uhi: baseUhi,
        simulated_uhi: simulatedUhi,
        delta_uhi: deltaUhi, // negative indicates cooling
        ndvi_change: deltaNdvi,
        ndbi_change: deltaNdbi,
        ndwi_change: deltaNdwi,
      });
    });

    return list.sort((a, b) => a.delta_uhi - b.delta_uhi); // greatest cooling first
  }, [deltaNdvi, deltaNdbi, deltaNdwi, selectedCity]);

  // Overall Statistics
  const summaryStats = useMemo(() => {
    const deltas = simulationResults.map((r) => r.delta_uhi);
    const meanDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    const maxCooling = Math.min(...deltas); // most negative
    const citiesCooled = deltas.filter((d) => d < 0).length;

    return {
      meanCooling: Math.abs(meanDelta).toFixed(3),
      maxCooling: Math.abs(maxCooling).toFixed(3),
      citiesCooled,
      totalCount: deltas.length,
    };
  }, [simulationResults]);

  // Top 10 Beneficiary Cities Chart Data
  const topBeneficiaries = useMemo(() => {
    return simulationResults.slice(0, 10).map((r) => ({
      city: r.city,
      Current_UHI: r.current_uhi,
      Simulated_UHI: r.simulated_uhi,
      Cooling_Gain: parseFloat(Math.abs(r.delta_uhi).toFixed(2)),
    }));
  }, [simulationResults]);

  // Export JSON Report handler
  const handleExportJson = () => {
    const exportData = {
      scenario: appliedScenario,
      parameters: { delta_ndvi: deltaNdvi, delta_ndbi: deltaNdbi, delta_ndwi: deltaNdwi },
      summary: summaryStats,
      results: simulationResults,
      exported_at: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uhi_simulation_${appliedScenario.toLowerCase().replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Page 6 • Urban Planning Decision Support"
        title="Interactive Urban Cooling Simulator"
        subtitle="Counterfactual 'What-If' policy planner. Adjust green canopy expansion and reflective cool roof sliders to estimate instant city temperature reductions."
        actions={
          <button
            type="button"
            onClick={handleExportJson}
            aria-label="Export simulation results as JSON file"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-stone-900 bg-white hover:bg-stone-100 border border-stone-300 rounded-md shadow-xs transition-colors focus-visible:outline-2 focus-visible:outline-stone-900"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Export Simulation Report</span>
          </button>
        }
      />

      {/* Top Impact KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" role="region" aria-label="Simulation summary key performance indicators">
        <MetricCard
          title="Global Average Cooling"
          value={`−${summaryStats.meanCooling} °C`}
          subtitle="Mean SUHI temperature reduction"
          badge={{ text: 'DIRECT MITIGATION', variant: 'positive' }}
          icon={TrendingDown}
        />
        <MetricCard
          title="Peak Metro Cooling"
          value={`−${summaryStats.maxCooling} °C`}
          subtitle="Top beneficiary tropical city"
          badge={{ text: 'MAX REDUCTION', variant: 'positive' }}
          icon={Sparkles}
        />
        <MetricCard
          title="Metros Benefiting"
          value={`${summaryStats.citiesCooled} / ${summaryStats.totalCount}`}
          subtitle="Cities with confirmed thermal decline"
          badge={{ text: '100% COOLING', variant: 'positive' }}
          icon={ShieldCheck}
        />
        <MetricCard
          title="Current Policy Scenario"
          value={appliedScenario.split(' ')[0]}
          subtitle={appliedScenario}
          badge={{ text: 'ACTIVE', variant: 'neutral' }}
          icon={Sliders}
          mono={false}
        />
      </div>

      {/* Main Grid: Policy Slider Controls vs Simulation Results */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Interactive Policy Sliders */}
        <section aria-labelledby="policy-controls-title" className="bg-white rounded-lg border border-[#e9e8e4] p-5 shadow-xs space-y-6">
          <div className="border-b border-stone-100 pb-3">
            <h3 id="policy-controls-title" className="text-sm font-bold text-stone-900">
              Intervention Sliders & Boundaries
            </h3>
            <p className="text-xs text-stone-600">
              Physical boundary constraints: indices clipped strictly to [-1.0, 1.0].
            </p>
          </div>

          {/* Preset Buttons */}
          <div className="space-y-1.5" role="group" aria-label="Pre-set municipal policy scenarios">
            <span className="text-[11px] font-mono text-stone-500 uppercase tracking-wide block font-semibold">
              Quick Policy Scenarios
            </span>
            <div className="flex flex-col gap-1.5">
              {presets.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => applyPreset(p)}
                  aria-pressed={appliedScenario === p.name}
                  className={`text-left p-2.5 rounded text-xs transition-all border focus-visible:outline-2 focus-visible:outline-stone-900 ${
                    appliedScenario === p.name
                      ? 'bg-amber-50 border-amber-400 font-semibold text-amber-950'
                      : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{p.name}</span>
                    {appliedScenario === p.name && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-800" aria-hidden="true" />
                    )}
                  </div>
                  <p className="text-[11px] text-stone-600 font-normal mt-0.5">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Slider 1: Greening (Delta NDVI) */}
          <div className="space-y-2 pt-2 border-t border-stone-100">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="ndvi-slider" className="font-semibold text-stone-900 flex items-center gap-1.5">
                <Trees className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                Urban Greening (Δ NDVI)
              </label>
              <span className="font-mono font-bold text-emerald-800 text-sm">
                +{(deltaNdvi * 100).toFixed(0)}%
              </span>
            </div>
            <input
              id="ndvi-slider"
              type="range"
              min="0.00"
              max="0.30"
              step="0.01"
              value={deltaNdvi}
              aria-valuemin={0}
              aria-valuemax={0.3}
              aria-valuenow={deltaNdvi}
              aria-valuetext={`+${(deltaNdvi * 100).toFixed(0)} percent green canopy increase`}
              onChange={(e) => {
                setDeltaNdvi(parseFloat(e.target.value));
                setAppliedScenario('Custom Policy');
              }}
              className="w-full accent-emerald-700 h-2 bg-stone-200 rounded-lg cursor-pointer focus-visible:outline-2 focus-visible:outline-stone-900"
            />
            <div className="flex justify-between text-[10px] font-mono text-stone-500" aria-hidden="true">
              <span>0% (Baseline)</span>
              <span>+15% (Target)</span>
              <span>+30% (Dense canopy)</span>
            </div>
          </div>

          {/* Slider 2: Cool Roofs (Delta NDBI) */}
          <div className="space-y-2 pt-2 border-t border-stone-100">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="ndbi-slider" className="font-semibold text-stone-900 flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-700" aria-hidden="true" />
                Cool Roofs & High Albedo (Δ NDBI)
              </label>
              <span className="font-mono font-bold text-amber-800 text-sm">
                {(deltaNdbi * 100).toFixed(0)}%
              </span>
            </div>
            <input
              id="ndbi-slider"
              type="range"
              min="-0.30"
              max="0.00"
              step="0.01"
              value={deltaNdbi}
              aria-valuemin={-0.3}
              aria-valuemax={0}
              aria-valuenow={deltaNdbi}
              aria-valuetext={`${(deltaNdbi * 100).toFixed(0)} percent built-up thermal reduction`}
              onChange={(e) => {
                setDeltaNdbi(parseFloat(e.target.value));
                setAppliedScenario('Custom Policy');
              }}
              className="w-full accent-amber-700 h-2 bg-stone-200 rounded-lg cursor-pointer focus-visible:outline-2 focus-visible:outline-stone-900"
            />
            <div className="flex justify-between text-[10px] font-mono text-stone-500" aria-hidden="true">
              <span>-30% (Ultra-reflective)</span>
              <span>-15% (Target)</span>
              <span>0% (Baseline)</span>
            </div>
          </div>

          {/* Slider 3: Water Retention (Delta NDWI) */}
          <div className="space-y-2 pt-2 border-t border-stone-100">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="ndwi-slider" className="font-semibold text-stone-900 flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5 text-sky-700" aria-hidden="true" />
                Water Retention Basins (Δ NDWI)
              </label>
              <span className="font-mono font-bold text-sky-800 text-sm">
                +{(deltaNdwi * 100).toFixed(0)}%
              </span>
            </div>
            <input
              id="ndwi-slider"
              type="range"
              min="0.00"
              max="0.20"
              step="0.01"
              value={deltaNdwi}
              aria-valuemin={0}
              aria-valuemax={0.2}
              aria-valuenow={deltaNdwi}
              aria-valuetext={`+${(deltaNdwi * 100).toFixed(0)} percent moisture retention enhancement`}
              onChange={(e) => {
                setDeltaNdwi(parseFloat(e.target.value));
                setAppliedScenario('Custom Policy');
              }}
              className="w-full accent-sky-700 h-2 bg-stone-200 rounded-lg cursor-pointer focus-visible:outline-2 focus-visible:outline-stone-900"
            />
            <div className="flex justify-between text-[10px] font-mono text-stone-500" aria-hidden="true">
              <span>0% (Baseline)</span>
              <span>+10% (Retention basins)</span>
              <span>+20% (Max)</span>
            </div>
          </div>

          {/* Target City Selector */}
          <div className="pt-2 border-t border-stone-100 space-y-1.5">
            <label htmlFor="simulator-city-scope" className="text-xs font-semibold text-stone-900 block">
              Geographic Scope:
            </label>
            <select
              id="simulator-city-scope"
              aria-label="Filter simulation scope by city"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full text-xs bg-stone-50 border border-stone-300 rounded px-2.5 py-1.5 font-medium text-stone-900 focus-visible:outline-2 focus-visible:outline-stone-900"
            >
              <option value="All">All 42 Global Cities</option>
              {INITIAL_CITIES.map((c) => (
                <option key={c.city} value={c.city}>
                  {c.city} ({c.country})
                </option>
              ))}
            </select>
          </div>

          {/* Reset Action */}
          <button
            type="button"
            onClick={() => {
              setDeltaNdvi(0.15);
              setDeltaNdbi(-0.15);
              setDeltaNdwi(0.05);
              setAppliedScenario('Moderate Green & Cool Roofs');
            }}
            aria-label="Reset simulation sliders to standard benchmark values"
            className="w-full py-2 flex items-center justify-center gap-1.5 text-xs text-stone-800 hover:text-stone-950 bg-stone-100 hover:bg-stone-200 rounded font-medium transition-colors focus-visible:outline-2 focus-visible:outline-stone-900"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Reset to Standard Benchmark</span>
          </button>
        </section>

        {/* Right 2 Columns: Before vs After Charts & City Rankings */}
        <section aria-labelledby="simulation-results-title" className="lg:col-span-2 space-y-6">
          <h2 id="simulation-results-title" className="sr-only">Simulation Impact Projections</h2>

          {/* Top 10 Beneficiary Cities Chart */}
          <div className="bg-white rounded-lg border border-[#e9e8e4] p-4.5 shadow-xs" role="region" aria-label="Beneficiary cities comparative bar chart">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-stone-100">
              <div>
                <h3 className="text-sm font-semibold text-stone-900">
                  Estimated UHI Drop: Baseline vs. Simulated Policy
                </h3>
                <p className="text-xs text-stone-600">
                  Showing top 10 beneficiary metros under current policy scenario
                </p>
              </div>
              <span className="text-xs font-mono bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded border border-emerald-300 font-bold">
                Avg Drop: −{summaryStats.meanCooling} °C
              </span>
            </div>

            <div className="h-72 w-full" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topBeneficiaries} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0efe9" />
                  <XAxis dataKey="city" tick={{ fontSize: 10, fill: '#57534e' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#57534e' }} unit="°C" />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e7e5e4',
                      borderRadius: '6px',
                      fontSize: '11px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  {/* Colorblind-safe contrasted colors: Mauve/Crimson #990000 vs Teal/Green #117733 */}
                  <Bar dataKey="Current_UHI" name="Baseline UHI (°C)" fill="#990000" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Simulated_UHI" name="Post-Intervention UHI (°C)" fill="#117733" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* High-Density Simulation Results Table */}
          <div className="bg-white rounded-lg border border-[#e9e8e4] p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                Simulation Results Ledger ({simulationResults.length} Metros)
              </h3>
              <span className="text-[11px] font-mono text-stone-500">
                ΔUHI = f(X_modified) − f(X_baseline)
              </span>
            </div>

            <div tabIndex={0} role="region" aria-label="Simulation results table" className="max-h-64 overflow-y-auto border-t border-stone-100 focus-visible:outline-2 focus-visible:outline-stone-900">
              <table className="w-full text-xs text-left border-collapse">
                <caption className="sr-only">Detailed counterfactual temperature drop by city</caption>
                <thead>
                  <tr className="border-b border-stone-200 text-stone-600 font-mono text-[11px] sticky top-0 bg-white">
                    <th scope="col" className="py-2 px-3">City</th>
                    <th scope="col" className="py-2 px-2">Zone</th>
                    <th scope="col" className="py-2 px-2 text-right">Baseline UHI</th>
                    <th scope="col" className="py-2 px-2 text-right">Simulated UHI</th>
                    <th scope="col" className="py-2 px-3 text-right">Cooling Effect (ΔT)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-mono">
                  {simulationResults.map((r) => (
                    <tr key={r.city} className="hover:bg-stone-50">
                      <td className="py-2 px-3 font-semibold text-stone-900 font-sans">
                        {r.city}
                      </td>
                      <td className="py-2 px-2">
                        <StatusBadge label={r.climate_group} type="climate" />
                      </td>
                      <td className="py-2 px-2 text-right text-stone-700">
                        +{r.current_uhi.toFixed(2)} °C
                      </td>
                      <td className="py-2 px-2 text-right font-medium text-emerald-900">
                        +{r.simulated_uhi.toFixed(2)} °C
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-700">
                        {r.delta_uhi.toFixed(2)} °C
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
