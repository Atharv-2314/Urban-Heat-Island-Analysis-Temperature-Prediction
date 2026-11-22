// City Heat Risk Assessment Component
// client/src/components/CityHeatRiskAssessment.tsx

import React, { useState, useMemo } from 'react';
import { StatusBadge } from './StatusBadge';
import type { CityRiskAssessment, PeerCityRisk } from '../types';
import {
  Info,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Flame,
  Users,
  Trees,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface CityHeatRiskAssessmentProps {
  assessment: CityRiskAssessment | null;
  loading?: boolean;
  error?: string | null;
  onCitySelect?: (cityName: string) => void;
}

export const CityHeatRiskAssessment: React.FC<CityHeatRiskAssessmentProps> = ({
  assessment,
  loading = false,
  error = null,
  onCitySelect,
}) => {
  const [showCaveats, setShowCaveats] = useState(false);

  // Derive dominant contributor dynamically without hardcoding
  const dominantFactor = useMemo(() => {
    if (!assessment) return null;
    const uhiWeight = assessment.weights?.uhi ?? 0.50;
    const popWeight = assessment.weights?.pop ?? 0.30;
    const canopyWeight = assessment.weights?.canopy ?? 0.20;

    const uhiPts = uhiWeight * (assessment.percentiles?.uhi_percentile ?? 0) * 100;
    const popPts = popWeight * (assessment.percentiles?.pop_percentile ?? 0) * 100;
    const canopyPts = canopyWeight * (assessment.percentiles?.canopy_percentile ?? 0) * 100;

    if (uhiPts >= popPts && uhiPts >= canopyPts) {
      return {
        name: 'surface UHI intensity',
        points: uhiPts.toFixed(1),
        weight: `${(uhiWeight * 100).toFixed(0)}%`,
        percentile: ((assessment.percentiles?.uhi_percentile ?? 0) * 100).toFixed(0),
      };
    } else if (popPts >= uhiPts && popPts >= canopyPts) {
      return {
        name: 'population exposure density',
        points: popPts.toFixed(1),
        weight: `${(popWeight * 100).toFixed(0)}%`,
        percentile: ((assessment.percentiles?.pop_percentile ?? 0) * 100).toFixed(0),
      };
    } else {
      return {
        name: 'canopy deficit (1 - NDVI)',
        points: canopyPts.toFixed(1),
        weight: `${(canopyWeight * 100).toFixed(0)}%`,
        percentile: ((assessment.percentiles?.canopy_percentile ?? 0) * 100).toFixed(0),
      };
    }
  }, [assessment]);

  if (loading) {
    return (
      <section
        aria-label="Loading City Heat Risk Assessment"
        className="mt-8 p-6 bg-white border border-stone-200 rounded-lg shadow-xs animate-pulse"
      >
        <div className="h-6 bg-stone-200 rounded w-1/3 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="h-32 bg-stone-100 rounded" />
          <div className="h-32 bg-stone-100 rounded" />
          <div className="h-32 bg-stone-100 rounded" />
        </div>
        <div className="h-48 bg-stone-100 rounded" />
      </section>
    );
  }

  if (!assessment) {
    return (
      <section
        aria-label="City Heat Risk Assessment Unavailable"
        className="mt-8 p-6 bg-stone-50 border border-stone-200 rounded-lg text-center text-stone-600 text-sm"
      >
        No heat risk assessment data available for this city.
      </section>
    );
  }

  const score = assessment.vulnerability_score ?? assessment.risk_score ?? 0;
  const clampedScore = Math.max(0, Math.min(100, score));

  // Circular gauge parameters
  const radius = 44;
  const circumference = 2 * Math.PI * radius; // ~276.46
  const strokeDashoffset = circumference * (1 - clampedScore / 100);

  // Tier color styling
  let ringStroke = '#059669'; // Low: emerald-600
  if (clampedScore > 80) {
    ringStroke = '#e11d48'; // Extreme: rose-600
  } else if (clampedScore > 60) {
    ringStroke = '#ea580c'; // High: orange-600
  } else if (clampedScore > 30) {
    ringStroke = '#d97706'; // Moderate: amber-600
  }

  const isSingleCityGroup = (assessment.peer_cities?.length ?? 0) <= 1;

  return (
    <section
      aria-label={`City Heat Risk Assessment for ${assessment.city}`}
      className="mt-8 bg-white border border-stone-200 rounded-lg shadow-xs overflow-hidden"
    >
      {/* Header Bar */}
      <div className="p-5 border-b border-stone-200 bg-stone-50/70 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-stone-200 text-stone-800">
              <Layers className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-stone-900 tracking-tight">
              City Heat Risk Assessment
            </h2>
            <StatusBadge label={assessment.climate_group} type="climate" />
          </div>
          <p className="text-xs text-stone-600 mt-1">
            Climate-stratified composite vulnerability score calibrated against Köppen classification peers.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCaveats(!showCaveats)}
          aria-expanded={showCaveats}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-stone-700 bg-white border border-stone-300 rounded hover:bg-stone-100 transition-colors"
        >
          <Info className="w-3.5 h-3.5 text-stone-500" />
          <span>Methodology & Caveats</span>
          {showCaveats ? (
            <ChevronUp className="w-3 h-3 text-stone-500" />
          ) : (
            <ChevronDown className="w-3 h-3 text-stone-500" />
          )}
        </button>
      </div>

      {/* Offline baseline notice */}
      {error && (
        <div
          role="alert"
          className="px-5 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Live API risk assessment unavailable: displaying local offline baseline data.</span>
        </div>
      )}

      {/* Caveats Drawer */}
      {showCaveats && (
        <div className="p-4 bg-stone-100/80 border-b border-stone-200 text-xs text-stone-700 space-y-1.5">
          <p className="font-semibold text-stone-900">Important Scientific Caveats:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Relative Ranking:</strong> Risk scores evaluate cities strictly within their respective Köppen climate classification, not on an absolute global scale.
            </li>
            <li>
              <strong>Surface vs Air Temperature:</strong> Indicators reflect satellite-derived Land Surface Temperature (LST) and spectral indices, not ambient air station observations.
            </li>
            <li>
              <strong>Single-City Biomes:</strong> Cities in solitary climate groups receive within-group percentiles reflecting their solitary cohort position.
            </li>
            <li>
              <strong>Non-Causal Index:</strong> The score represents an exposure and vulnerability index; it does not model direct causal health mechanisms or localized micro-interventions.
            </li>
          </ul>
        </div>
      )}

      <div className="p-5 space-y-6">
        {/* Top Grid: Overall Score Card + Interpretation */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Overall Score Card (5 cols) */}
          <div className="lg:col-span-5 p-5 bg-[#fbfbf9] border border-stone-200 rounded-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider font-mono font-medium text-stone-500">
                  Composite Risk Score
                </span>
                <StatusBadge label={assessment.risk_tier} type="risk" />
              </div>

              <div className="mt-4 flex items-center gap-5">
                {/* SVG Circular Gauge */}
                <div className="relative shrink-0 w-24 h-24">
                  <svg
                    className="w-24 h-24 -rotate-90 transform"
                    viewBox="0 0 112 112"
                    role="progressbar"
                    aria-valuenow={clampedScore}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Heat risk score ${clampedScore.toFixed(1)} out of 100`}
                  >
                    <circle
                      cx="56"
                      cy="56"
                      r={radius}
                      stroke="#e7e5e4"
                      strokeWidth="8"
                      fill="transparent"
                    />
                    <circle
                      cx="56"
                      cy="56"
                      r={radius}
                      stroke={ringStroke}
                      strokeWidth="8"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold font-mono text-stone-900 leading-none">
                      {clampedScore.toFixed(1)}
                    </span>
                    <span className="text-[10px] font-mono text-stone-500 mt-0.5">/ 100</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-stone-900">{assessment.city}</h3>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-stone-600">
                    <span>Climate Group:</span>
                    <span className="font-semibold text-stone-800">{assessment.climate_group}</span>
                  </div>
                  <div className="mt-1 text-xs text-stone-500">
                    Tier Boundary: {assessment.risk_tier}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-stone-200/80 text-[11px] text-stone-600 leading-relaxed">
              <span className="font-semibold text-stone-800">Methodology:</span> Composite score is calculated from within-group percentile ranks:
              <span className="font-mono ml-1 text-stone-700">50% P_UHI + 30% P_pop + 20% P_canopy</span>.
            </div>
          </div>

          {/* Data-Driven Interpretation (7 cols) */}
          <div className="lg:col-span-7 p-5 bg-stone-50 border border-stone-200 rounded-lg flex flex-col justify-between">
            <div>
              <span className="text-xs uppercase tracking-wider font-mono font-medium text-stone-500">
                Data-Driven Assessment Summary
              </span>

              {dominantFactor && (
                <div className="mt-3 text-xs leading-relaxed text-stone-700 space-y-2">
                  <p>
                    In <span className="font-bold text-stone-900">{assessment.city}</span>,{' '}
                    <span className="font-semibold text-stone-900">{dominantFactor.name}</span> is the primary contributor to its composite heat risk index within the{' '}
                    <span className="font-semibold text-stone-900">{assessment.climate_group}</span> climate group, contributing{' '}
                    <span className="font-mono font-bold text-stone-900">{dominantFactor.points} pts</span> ({dominantFactor.weight} weight) and positioning it at the{' '}
                    <span className="font-mono font-bold text-stone-900">{dominantFactor.percentile}th percentile</span> relative to regional peers.
                  </p>
                  <p className="text-stone-600">
                    This stratified metric isolates within-biome microclimate elevation while controlling for broad regional baseline differences across Köppen climate zones.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-600">
              <span>Risk Tier Scale: Low (&le;30) | Moderate (30-60) | High (60-80) | Extreme (&gt;80)</span>
              {isSingleCityGroup && (
                <span className="font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Sole group representative
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Component Breakdown (3 Columns) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 font-mono">
              Indicator Component Breakdown
            </h3>
            <span className="text-[11px] font-mono text-stone-500">
              Weights: 50% UHI · 30% Population · 20% Canopy Deficit
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* UHI Intensity Card */}
            <div className="p-4 bg-white border border-stone-200 rounded-lg hover:border-stone-300 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
                  <Flame className="w-3.5 h-3.5 text-rose-600" />
                  <span>UHI Intensity (50%)</span>
                </div>
                <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 font-medium">
                  {((assessment.percentiles?.uhi_percentile ?? 0) * 100).toFixed(0)}th %ile
                </span>
              </div>

              <div className="mt-3">
                <div className="text-xl font-bold font-mono text-stone-900">
                  {(assessment.raw_indicators?.mean_uhi ?? 0).toFixed(2)} K
                </div>
                <div className="text-[11px] text-stone-500 mt-0.5">
                  Max UHI: {(assessment.raw_indicators?.max_uhi ?? 0).toFixed(2)} K
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3 pt-3 border-t border-stone-100">
                <div className="flex justify-between text-[11px] font-mono text-stone-600 mb-1">
                  <span>Contribution:</span>
                  <span className="font-bold text-stone-900">
                    {(50 * (assessment.percentiles?.uhi_percentile ?? 0)).toFixed(1)} / 50.0 pts
                  </span>
                </div>
                <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-rose-500 h-1.5 rounded-full"
                    style={{
                      width: `${Math.max(4, Math.min(100, (assessment.percentiles?.uhi_percentile ?? 0) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Population Density Card */}
            <div className="p-4 bg-white border border-stone-200 rounded-lg hover:border-stone-300 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
                  <Users className="w-3.5 h-3.5 text-orange-600" />
                  <span>Pop. Density (30%)</span>
                </div>
                <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-orange-50 text-orange-800 border border-orange-200 font-medium">
                  {((assessment.percentiles?.pop_percentile ?? 0) * 100).toFixed(0)}th %ile
                </span>
              </div>

              <div className="mt-3">
                <div className="text-xl font-bold font-mono text-stone-900">
                  {Math.round(assessment.raw_indicators?.mean_pop_density ?? 0).toLocaleString()}
                </div>
                <div className="text-[11px] text-stone-500 mt-0.5">people / km²</div>
              </div>

              {/* Progress bar */}
              <div className="mt-3 pt-3 border-t border-stone-100">
                <div className="flex justify-between text-[11px] font-mono text-stone-600 mb-1">
                  <span>Contribution:</span>
                  <span className="font-bold text-stone-900">
                    {(30 * (assessment.percentiles?.pop_percentile ?? 0)).toFixed(1)} / 30.0 pts
                  </span>
                </div>
                <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-orange-500 h-1.5 rounded-full"
                    style={{
                      width: `${Math.max(4, Math.min(100, (assessment.percentiles?.pop_percentile ?? 0) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Canopy Deficit Card */}
            <div className="p-4 bg-white border border-stone-200 rounded-lg hover:border-stone-300 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
                  <Trees className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Canopy Deficit (20%)</span>
                </div>
                <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                  {((assessment.percentiles?.canopy_percentile ?? 0) * 100).toFixed(0)}th %ile
                </span>
              </div>

              <div className="mt-3">
                <div className="text-xl font-bold font-mono text-stone-900">
                  {(assessment.raw_indicators?.canopy_deficit ?? 0).toFixed(2)}
                </div>
                <div className="text-[11px] text-stone-500 mt-0.5">
                  Mean NDVI: {(assessment.raw_indicators?.mean_ndvi ?? 0).toFixed(2)} (Deficit = 1 - NDVI)
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3 pt-3 border-t border-stone-100">
                <div className="flex justify-between text-[11px] font-mono text-stone-600 mb-1">
                  <span>Contribution:</span>
                  <span className="font-bold text-stone-900">
                    {(20 * (assessment.percentiles?.canopy_percentile ?? 0)).toFixed(1)} / 20.0 pts
                  </span>
                </div>
                <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-1.5 rounded-full"
                    style={{
                      width: `${Math.max(4, Math.min(100, (assessment.percentiles?.canopy_percentile ?? 0) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Climate-Group Comparison Table */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 font-mono">
                Climate Group Peers ({assessment.climate_group})
              </h3>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Cities evaluated together within the {assessment.climate_group} climate cohort ({assessment.peer_cities?.length ?? 0} {assessment.peer_cities?.length === 1 ? 'city' : 'cities'}).
              </p>
            </div>
            {isSingleCityGroup && (
              <span className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-2 py-1 rounded">
                Sole cohort member in dataset
              </span>
            )}
          </div>

          <div className="border border-stone-200 rounded-lg overflow-x-auto bg-white">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-mono text-[11px]">
                  <th scope="col" className="p-3 w-12 text-center">Rank</th>
                  <th scope="col" className="p-3">City</th>
                  <th scope="col" className="p-3 text-right">Risk Score</th>
                  <th scope="col" className="p-3">Risk Tier</th>
                  <th scope="col" className="p-3 text-right">Mean UHI</th>
                  <th scope="col" className="p-3 text-right">Pop. Density</th>
                  <th scope="col" className="p-3 text-right">Canopy Deficit</th>
                  <th scope="col" className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-sans">
                {assessment.peer_cities?.map((peer: PeerCityRisk, idx: number) => {
                  const isActive =
                    peer.is_active ||
                    peer.city.toLowerCase() === assessment.city.toLowerCase();

                  return (
                    <tr
                      key={peer.city}
                      className={`transition-colors ${
                        isActive
                          ? 'bg-stone-900 text-stone-50 font-medium'
                          : 'hover:bg-stone-50 text-stone-800'
                      }`}
                    >
                      <td className="p-3 text-center font-mono">
                        #{idx + 1}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <span className={isActive ? 'font-bold text-white' : 'font-semibold text-stone-900'}>
                            {peer.city}
                          </span>
                          {isActive && (
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-stone-700 text-stone-200">
                              Active
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono font-bold">
                        {(peer.vulnerability_score ?? peer.risk_score ?? 0).toFixed(1)}
                      </td>
                      <td className="p-3">
                        <StatusBadge label={peer.risk_tier} type="risk" />
                      </td>
                      <td className="p-3 text-right font-mono">
                        {(peer.mean_uhi ?? 0).toFixed(2)} K
                      </td>
                      <td className="p-3 text-right font-mono">
                        {Math.round(peer.mean_pop_density ?? 0).toLocaleString()} /km²
                      </td>
                      <td className="p-3 text-right font-mono">
                        {(peer.canopy_deficit ?? 0).toFixed(2)}
                      </td>
                      <td className="p-3 text-center">
                        {isActive ? (
                          <span className="text-[11px] text-stone-400 font-mono">Current</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onCitySelect?.(peer.city)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded border border-stone-300 transition-colors cursor-pointer"
                            aria-label={`Switch deep dive to ${peer.city}`}
                          >
                            <span>Inspect</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};
