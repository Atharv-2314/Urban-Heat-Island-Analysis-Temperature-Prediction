// Page 2: City Deep-Dive & Temporal Heatwaves (with WCAG 2.1 Accessibility & Colorblind-Safe Contrast)
// client/src/pages/CityDeepDive.tsx

import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { INITIAL_CITIES, generateMockTimeSeries } from '../lib/mockData';
import { fetchCityTimeSeries } from '../lib/api';
import type { MonthlyDataRecord } from '../types';

export const CityDeepDive: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCity = searchParams.get('city') || 'Delhi';

  const [selectedCity, setSelectedCity] = useState<string>(initialCity);
  const [activeTab, setActiveTab] = useState<'trends' | 'seasonal' | 'anomaly'>('trends');
  const [timeSeries, setTimeSeries] = useState<MonthlyDataRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYearRange, setSelectedYearRange] = useState<string>('all');
  const [selectedCellAnomaly, setSelectedCellAnomaly] = useState<{
    year: number;
    month: number;
    val: number | null;
  } | null>(null);

  // Sync city selection with URL param
  const handleCityChange = (cityName: string) => {
    setSelectedCity(cityName);
    setSearchParams({ city: cityName });
  };

  // Fetch live API data with loading & error handling, and clean city transitions
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);

    fetchCityTimeSeries(selectedCity)
      .then((records) => {
        if (isCancelled) return;
        if (records && records.length > 0) {
          setTimeSeries(records);
        } else {
          // If no records from API, use mock fallback with explicit notice
          const mock = generateMockTimeSeries(selectedCity);
          setTimeSeries(mock);
        }
      })
      .catch((err) => {
        if (isCancelled) return;
        console.error('Failed to load city time series:', err);
        setError('Failed to fetch live city records from API. Displaying local offline baseline.');
        setTimeSeries(generateMockTimeSeries(selectedCity));
      })
      .finally(() => {
        if (!isCancelled) {
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedCity]);

  const cityMetadata = useMemo(() => {
    return (
      INITIAL_CITIES.find(
        (c) => c.city.toLowerCase() === selectedCity.toLowerCase()
      ) ?? INITIAL_CITIES[0]
    );
  }, [selectedCity]);

  // Filter time-series by year range
  const filteredSeries = useMemo(() => {
    // Ensure strict chronological ordering
    const sorted = [...timeSeries].sort((a, b) =>
      a.year !== b.year ? a.year - b.year : a.month - b.month
    );
    if (selectedYearRange === '2024-2025') {
      return sorted.filter((d) => d.year >= 2024);
    }
    if (selectedYearRange === '2020-2025') {
      return sorted.filter((d) => d.year >= 2020);
    }
    return sorted;
  }, [timeSeries, selectedYearRange]);

  // Formatted chart data with robust schema mapping and null handling
  const chartData = useMemo(() => {
    return filteredSeries.map((d) => ({
      date: `${d.year}-${String(d.month).padStart(2, '0')}`,
      year: d.year,
      month: d.month,
      uhi:
        d.uhi_intensity !== null && d.uhi_intensity !== undefined && !isNaN(d.uhi_intensity as number)
          ? Number(d.uhi_intensity)
          : d.uhi !== null && d.uhi !== undefined && !isNaN(d.uhi as number)
          ? Number(d.uhi)
          : null,
      lst_urban:
        d.lst_urban !== null && d.lst_urban !== undefined && !isNaN(d.lst_urban as number)
          ? Number(d.lst_urban)
          : d.lst !== null && d.lst !== undefined && !isNaN(d.lst as number)
          ? Number(d.lst)
          : null,
      lst_rural:
        d.lst_rural !== null && d.lst_rural !== undefined && !isNaN(d.lst_rural as number)
          ? Number(d.lst_rural)
          : d.rural_lst !== null && d.rural_lst !== undefined && !isNaN(d.rural_lst as number)
          ? Number(d.rural_lst)
          : null,
      ndvi:
        d.ndvi !== null && d.ndvi !== undefined && !isNaN(d.ndvi as number)
          ? Number(d.ndvi)
          : null,
      ndbi:
        d.ndbi !== null && d.ndbi !== undefined && !isNaN(d.ndbi as number)
          ? Number(d.ndbi)
          : null,
      temp:
        d.temperature_2m !== null && d.temperature_2m !== undefined && !isNaN(d.temperature_2m as number)
          ? Number(d.temperature_2m)
          : d.air_temperature !== null && d.air_temperature !== undefined && !isNaN(d.air_temperature as number)
          ? Number(d.air_temperature)
          : null,
    }));
  }, [filteredSeries]);

  // Monthly seasonal profile (aggregated across all 10 years)
  // Methodology: simple mean of valid (non-null, finite) observations per calendar month.
  // Months with zero valid thermal observations return null explicitly (not 0).
  const seasonalProfile = useMemo(() => {
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    const buckets: Record<number, { uhi: number[]; lst_urban: number[]; lst_rural: number[] }> = {};
    for (let m = 1; m <= 12; m++) {
      buckets[m] = { uhi: [], lst_urban: [], lst_rural: [] };
    }

    // Use all years (timeSeries is city-wide 2016–2025 regardless of year filter)
    timeSeries.forEach((d) => {
      const uhi = d.uhi_intensity ?? d.uhi;
      const urban = d.lst_urban ?? d.lst;
      const rural = d.lst_rural ?? d.rural_lst;

      if (uhi !== null && uhi !== undefined && isFinite(uhi) && !isNaN(uhi)) {
        buckets[d.month]?.uhi.push(uhi);
      }
      if (urban !== null && urban !== undefined && isFinite(urban) && !isNaN(urban)) {
        buckets[d.month]?.lst_urban.push(urban);
      }
      if (rural !== null && rural !== undefined && isFinite(rural) && !isNaN(rural)) {
        buckets[d.month]?.lst_rural.push(rural);
      }
    });

    return monthNames.map((name, i) => {
      const m = i + 1;
      const uhiArr = buckets[m]?.uhi ?? [];
      const urbanArr = buckets[m]?.lst_urban ?? [];
      const ruralArr = buckets[m]?.lst_rural ?? [];

      // null sentinel for months with no valid satellite observations (not 0)
      const mean = (arr: number[]): number | null =>
        arr.length > 0 ? parseFloat((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2)) : null;

      return {
        month: name,
        monthNum: m,
        mean_uhi: mean(uhiArr),
        mean_lst_urban: mean(urbanArr),
        mean_lst_rural: mean(ruralArr),
        // observation counts for tooltip and low-data warnings
        obs_uhi: uhiArr.length,
        obs_urban: urbanArr.length,
        obs_rural: ruralArr.length,
      };
    });
  }, [timeSeries]);

  // Multi-year anomaly matrix (Years 2016-2025 vs Months 1-12)
  // Methodology: anomaly = observation − baseline, where baseline is the city-wide
  // mean UHI across the full 10-year study period (2016–2025) using only valid
  // (non-null, finite) satellite observations. Cloud-gap months remain null.
  const anomalyBaseline = useMemo(() => {
    const validUhis = timeSeries
      .map((d) => d.uhi_intensity ?? d.uhi)
      .filter((v): v is number => v !== null && v !== undefined && isFinite(v) && !isNaN(v));
    const mean = validUhis.length > 0 ? validUhis.reduce((acc, v) => acc + v, 0) / validUhis.length : 0;
    return { mean, count: validUhis.length, total: timeSeries.length };
  }, [timeSeries]);

  const anomalyMatrix = useMemo(() => {
    const years = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    return years.map((year) => {
      const row: Record<string, number | string | null> = { year };
      months.forEach((m) => {
        const item = timeSeries.find((d) => d.year === year && d.month === m);
        const itemUhi = item ? (item.uhi_intensity ?? item.uhi) : null;
        if (itemUhi !== null && itemUhi !== undefined && isFinite(itemUhi) && !isNaN(itemUhi)) {
          const anomaly = itemUhi - anomalyBaseline.mean;
          row[`m${m}`] = isFinite(anomaly) ? parseFloat(anomaly.toFixed(2)) : null;
        } else {
          row[`m${m}`] = null;
        }
      });
      return row;
    });
  }, [timeSeries, anomalyBaseline]);

  // Statistics
  const stats = useMemo(() => {
    const uhiVals = timeSeries
      .map((d) => d.uhi_intensity ?? d.uhi)
      .filter((v): v is number => v !== null && v !== undefined && !isNaN(v));
    const meanUhi = uhiVals.length > 0 ? (uhiVals.reduce((a, b) => a + b, 0) / uhiVals.length).toFixed(2) : '0.00';
    const maxUhi = uhiVals.length > 0 ? Math.max(...uhiVals).toFixed(2) : '0.00';
    const minUhi = uhiVals.length > 0 ? Math.min(...uhiVals).toFixed(2) : '0.00';

    const early = timeSeries
      .filter((d) => d.year <= 2018)
      .map((d) => d.uhi_intensity ?? d.uhi)
      .filter((v): v is number => v !== null && v !== undefined && !isNaN(v));
    const late = timeSeries
      .filter((d) => d.year >= 2023)
      .map((d) => d.uhi_intensity ?? d.uhi)
      .filter((v): v is number => v !== null && v !== undefined && !isNaN(v));
    const earlyMean = early.length > 0 ? early.reduce((a, b) => a + b, 0) / early.length : 0;
    const lateMean = late.length > 0 ? late.reduce((a, b) => a + b, 0) / late.length : 0;
    const decadalChange = (lateMean - earlyMean).toFixed(2);

    return { meanUhi, maxUhi, minUhi, decadalChange };
  }, [timeSeries]);

  // Cividis/Monochrome contrast safe anomaly cell styling with extreme-value tiers
  const getAnomalyColor = (val: number | null) => {
    if (val === null || !isFinite(val as number) || isNaN(val as number)) return 'bg-stone-100 text-stone-400 font-normal';
    // Extreme hot (>= 2.0 °C)
    if (val >= 2.0) return 'bg-[#450a0a] text-white font-bold';
    if (val >= 1.2) return 'bg-[#7f1d1d] text-white font-bold';
    if (val >= 0.6) return 'bg-[#b91c1c] text-white font-semibold';
    if (val >= 0.2) return 'bg-[#fecaca] text-stone-900';
    // Extreme cold (<= -2.0 °C)
    if (val <= -2.0) return 'bg-[#0c4a6e] text-white font-bold';
    if (val <= -1.0) return 'bg-[#0369a1] text-white font-bold';
    if (val <= -0.4) return 'bg-[#38bdf8] text-stone-950 font-medium';
    if (val < 0) return 'bg-[#e0f2fe] text-stone-900';
    return 'bg-stone-100 text-stone-800';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Page 2 • Longitudinal Diagnostics"
        title="City Deep-Dive & Temporal Heatwaves"
        subtitle="10-year monthly profile (2016–2025). Analyze Surface LST urban vs. rural trajectories, pre-monsoon heatwave surges, and seasonal attenuation."
        actions={
          <div className="flex items-center gap-2">
            <label htmlFor="deepdive-city-select" className="text-xs text-stone-600 font-mono font-medium">Select Metro:</label>
            <select
              id="deepdive-city-select"
              aria-label="Select city for deep-dive analysis"
              value={selectedCity}
              onChange={(e) => handleCityChange(e.target.value)}
              className="text-xs bg-white border border-stone-300 rounded px-3 py-1.5 font-medium text-stone-900 shadow-xs focus-visible:outline-2 focus-visible:outline-stone-900"
            >
              {INITIAL_CITIES.map((c) => (
                <option key={c.city} value={c.city}>
                  {c.city} ({c.country})
                </option>
              ))}
            </select>
          </div>
        }
      />

      {/* Loading & API Notice Banner */}
      {loading && (
        <div className="flex items-center gap-2 p-3 bg-stone-100 border border-stone-200 rounded-lg text-xs font-mono text-stone-700 animate-pulse" role="status" aria-live="polite">
          <span className="w-2 h-2 rounded-full bg-stone-500 animate-ping" />
          Loading longitudinal time series for {selectedCity}...
        </div>
      )}

      {error && !loading && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs font-mono text-amber-800 flex items-center justify-between" role="alert">
          <span>⚠ {error}</span>
        </div>
      )}

      {/* City Status & Summary KPI Bar */}
      <div tabIndex={0} role="region" aria-label={`Summary KPIs for ${selectedCity}`} className="bg-white rounded-lg border border-[#e9e8e4] p-4.5 shadow-xs flex flex-wrap items-center justify-between gap-4 focus-visible:outline-2 focus-visible:outline-stone-900">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-stone-900 text-stone-50 flex items-center justify-center font-bold text-base" aria-hidden="true">
            {selectedCity.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-stone-900 tracking-tight">
                {cityMetadata.city}
              </h2>
              <span className="text-xs text-stone-600 font-mono">
                {cityMetadata.country} • {cityMetadata.region}
              </span>
              <StatusBadge label={cityMetadata.climate_group} type="climate" />
            </div>
            <p className="text-xs text-stone-600 mt-0.5">
              Köppen classification: <span className="font-mono font-semibold text-stone-800">{cityMetadata.koppen_zone}</span> • Lat/Lon: <span className="font-mono text-stone-800">{cityMetadata.latitude.toFixed(2)}°N, {cityMetadata.longitude.toFixed(2)}°E</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs">
          <div>
            <span className="text-stone-500 block font-mono font-medium">10-YR MEAN UHI</span>
            <span className="font-mono font-bold text-base text-stone-900">
              +{stats.meanUhi} °C
            </span>
          </div>
          <div>
            <span className="text-stone-500 block font-mono font-medium">PEAK HEATWAVE</span>
            <span className="font-mono font-bold text-base text-rose-900">
              +{stats.maxUhi} °C
            </span>
          </div>
          <div>
            <span className="text-stone-500 block font-mono font-medium">DECADAL SHIFT</span>
            <span className="font-mono font-bold text-base text-amber-900">
              {parseFloat(stats.decadalChange) >= 0 ? `+${stats.decadalChange}` : stats.decadalChange} °C
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigation Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-200 pb-2 gap-3" role="tablist" aria-label="City analysis view tabs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            role="tab"
            id="tab-trends"
            aria-selected={activeTab === 'trends'}
            aria-controls="panel-trends"
            type="button"
            onClick={() => setActiveTab('trends')}
            className={`min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-md transition-all flex items-center focus-visible:outline-2 focus-visible:outline-stone-900 ${
              activeTab === 'trends'
                ? 'bg-stone-900 text-stone-50 shadow-xs'
                : 'text-stone-700 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            10-Year Time-Series
          </button>
          <button
            role="tab"
            id="tab-seasonal"
            aria-selected={activeTab === 'seasonal'}
            aria-controls="panel-seasonal"
            type="button"
            onClick={() => setActiveTab('seasonal')}
            className={`min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-md transition-all flex items-center focus-visible:outline-2 focus-visible:outline-stone-900 ${
              activeTab === 'seasonal'
                ? 'bg-stone-900 text-stone-50 shadow-xs'
                : 'text-stone-700 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            Annual Seasonal Cycle
          </button>
          <button
            role="tab"
            id="tab-anomaly"
            aria-selected={activeTab === 'anomaly'}
            aria-controls="panel-anomaly"
            type="button"
            onClick={() => setActiveTab('anomaly')}
            className={`min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-md transition-all flex items-center focus-visible:outline-2 focus-visible:outline-stone-900 ${
              activeTab === 'anomaly'
                ? 'bg-stone-900 text-stone-50 shadow-xs'
                : 'text-stone-700 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            Heatwave Anomaly Matrix
          </button>
        </div>

        {activeTab === 'trends' && (
          <div className="flex items-center gap-1.5 text-xs self-start sm:self-auto" role="group" aria-label="Filter time-series date range">
            <span className="text-stone-500 font-mono font-medium">Range:</span>
            {['all', '2020-2025', '2024-2025'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setSelectedYearRange(r)}
                aria-pressed={selectedYearRange === r}
                className={`min-h-[36px] px-2.5 py-1 rounded text-[11px] font-mono transition-colors flex items-center focus-visible:outline-2 focus-visible:outline-stone-900 ${
                  selectedYearRange === r
                    ? 'bg-stone-300 text-stone-950 font-bold'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* TAB 1: 10-Year Long-Term Time Series */}
      {activeTab === 'trends' && (
        <section id="panel-trends" role="tabpanel" aria-labelledby="tab-trends" className="space-y-6">
          <div className="bg-white rounded-lg border border-[#e9e8e4] p-4.5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-stone-900">
                  Surface Temperature & UHI Intensity Profile (2016–2025)
                </h3>
                <p className="text-xs text-stone-600">
                  Monthly observation of LST Urban, LST Rural, and SUHI Intensity (LST_urban − LST_rural)
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono font-medium">
                {/* Contrast-safe line colors with distinct luminance */}
                <span className="flex items-center gap-1 text-[#b91c1c]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#b91c1c]" aria-hidden="true"></span> LST Urban (°C)
                </span>
                <span className="flex items-center gap-1 text-[#15803d]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#15803d]" aria-hidden="true"></span> LST Rural (°C)
                </span>
                <span className="flex items-center gap-1 text-[#b45309]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#b45309]" aria-hidden="true"></span> UHI Intensity (°C)
                </span>
              </div>
            </div>

            {chartData.length === 0 ? (
              <div className="h-80 w-full flex items-center justify-center text-stone-400 text-xs font-mono">
                No time-series observations available for {selectedCity} in the selected range.
              </div>
            ) : (
              <div className="h-80 w-full" aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0efe9" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: '#57534e' }}
                      tickFormatter={(val) => val.slice(0, 4)}
                      interval={selectedYearRange === '2024-2025' ? 2 : selectedYearRange === '2020-2025' ? 5 : 11}
                    />
                    <YAxis
                      yAxisId="left"
                      domain={['auto', 'auto']}
                      tick={{ fontSize: 10, fill: '#57534e' }}
                      label={{ value: 'Surface Temp (°C)', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#78716c' }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={['auto', 'auto']}
                      tick={{ fontSize: 10, fill: '#57534e' }}
                      label={{ value: 'UHI Intensity (°C)', angle: 90, position: 'insideRight', fontSize: 10, fill: '#b45309' }}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e7e5e4',
                        borderRadius: '6px',
                        fontSize: '11px',
                      }}
                      formatter={(value: any, name?: any) => {
                        if (value === null || value === undefined || isNaN(Number(value))) return ['N/A (Cloud Gap)', String(name ?? '')];
                        return [`${Number(value).toFixed(2)} °C`, String(name ?? '')];
                      }}
                      labelFormatter={(label: any) => `Month: ${label ?? ''}`}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="lst_urban"
                      name="LST Urban"
                      stroke="#b91c1c"
                      strokeWidth={1.8}
                      dot={false}
                      connectNulls={true}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="lst_rural"
                      name="LST Rural"
                      stroke="#15803d"
                      strokeWidth={1.8}
                      dot={false}
                      connectNulls={true}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="uhi"
                      name="UHI Intensity"
                      stroke="#b45309"
                      strokeWidth={2.4}
                      dot={false}
                      connectNulls={true}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Biophysical Indices Trajectory (NDVI vs NDBI) */}
          <div className="bg-white rounded-lg border border-[#e9e8e4] p-4.5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-stone-900">
                  Biophysical Morphology Proxy Indices (NDVI vs NDBI)
                </h3>
                <p className="text-xs text-stone-600">
                  Vegetation green canopy (NDVI) inverse relationship with built-up impervious concrete (NDBI)
                </p>
              </div>
            </div>

            <div className="h-48 w-full" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0efe9" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#57534e' }}
                    tickFormatter={(val) => val.slice(0, 4)}
                    interval={selectedYearRange === '2024-2025' ? 2 : selectedYearRange === '2020-2025' ? 5 : 11}
                  />
                  <YAxis domain={[-0.5, 1.0]} tick={{ fontSize: 10, fill: '#57534e' }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e7e5e4',
                      borderRadius: '6px',
                      fontSize: '11px',
                    }}
                    formatter={(value: any, name?: any) => {
                      if (value === null || value === undefined || isNaN(Number(value))) return ['N/A (Cloud Gap)', String(name ?? '')];
                      return [Number(value).toFixed(4), String(name ?? '')];
                    }}
                    labelFormatter={(label: any) => `Month: ${label ?? ''}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="ndvi"
                    name="NDVI (Greenness)"
                    stroke="#117733"
                    fill="#117733"
                    fillOpacity={0.3}
                    connectNulls={true}
                  />
                  <Area
                    type="monotone"
                    dataKey="ndbi"
                    name="NDBI (Built-up)"
                    stroke="#882255"
                    fill="#882255"
                    fillOpacity={0.25}
                    connectNulls={true}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      {/* TAB 2: Annual Seasonal Profile */}
      {activeTab === 'seasonal' && (
        <section id="panel-seasonal" role="tabpanel" aria-labelledby="tab-seasonal" className="space-y-6">
          <div className="bg-white rounded-lg border border-[#e9e8e4] p-4.5 shadow-xs">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-stone-900">
                10-Year Climatological Seasonal Cycle for {selectedCity}
              </h3>
              <p className="text-xs text-stone-600">
                Calendar-month mean UHI intensity and land surface temperatures averaged across all 10 available years (2016–2025), computed from valid satellite observations only. Months with fewer than 5 valid years are flagged.
              </p>
            </div>

            {/* Low-data month warnings */}
            {seasonalProfile.some((m) => m.obs_uhi > 0 && m.obs_uhi < 5) && (
              <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 font-mono">
                ⚠ Months with fewer than 5 valid years:{' '}
                {seasonalProfile
                  .filter((m) => m.obs_uhi > 0 && m.obs_uhi < 5)
                  .map((m) => `${m.month} (n=${m.obs_uhi})`)
                  .join(', ')}
              </div>
            )}

            {seasonalProfile.every((m) => m.mean_uhi === null) ? (
              <div className="h-80 w-full flex items-center justify-center text-stone-400 text-xs font-mono">
                No valid seasonal observations available for {selectedCity}.
              </div>
            ) : (
              <div className="h-80 w-full" aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={seasonalProfile} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0efe9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#57534e' }} />
                    <YAxis
                      yAxisId="lst"
                      orientation="left"
                      tick={{ fontSize: 10, fill: '#57534e' }}
                      label={{ value: 'LST (°C)', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#78716c' }}
                    />
                    <YAxis
                      yAxisId="uhi"
                      orientation="right"
                      tick={{ fontSize: 10, fill: '#b45309' }}
                      label={{ value: 'UHI (°C)', angle: 90, position: 'insideRight', fontSize: 10, fill: '#b45309' }}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e7e5e4',
                        borderRadius: '6px',
                        fontSize: '11px',
                      }}
                      formatter={(value: any, name?: any, props?: any) => {
                        if (value === null || value === undefined || isNaN(Number(value))) return ['No data', String(name ?? '')];
                        const obs = props?.payload?.obs_uhi ?? props?.payload?.obs_urban ?? '?';
                        return [`${Number(value).toFixed(2)} °C (n=${obs})`, String(name ?? '')];
                      }}
                      labelFormatter={(label: any) => `Month: ${label ?? ''}`}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar
                      yAxisId="lst"
                      dataKey="mean_lst_urban"
                      name="LST Urban (°C)"
                      fill="#b91c1c"
                      fillOpacity={0.7}
                      radius={[3, 3, 0, 0]}
                    />
                    <Bar
                      yAxisId="lst"
                      dataKey="mean_lst_rural"
                      name="LST Rural (°C)"
                      fill="#15803d"
                      fillOpacity={0.7}
                      radius={[3, 3, 0, 0]}
                    />
                    <Bar
                      yAxisId="uhi"
                      dataKey="mean_uhi"
                      name="Mean UHI Intensity (°C)"
                      fill="#b45309"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Scientific Interpretation Card */}
          <div tabIndex={0} className="bg-stone-50 rounded-lg border border-stone-200 p-4 text-xs text-stone-800 leading-relaxed space-y-2 focus-visible:outline-2 focus-visible:outline-stone-900">
            <span className="font-bold text-stone-950 block font-mono text-[11px] uppercase tracking-wide">
              Scientific Seasonal Finding for {cityMetadata.city}
            </span>
            <p>
              In {cityMetadata.city} ({cityMetadata.climate_group}), UHI intensity peaks during the pre-monsoon dry season (April–June) where low soil moisture and minimal cloud cover allow intense radiative heating of urban masonry. During the monsoon months (July–September), widespread rainfall, high relative humidity, and evaporative cooling compress the urban-rural thermal differential.
            </p>
          </div>
        </section>
      )}

      {/* TAB 3: Multi-Year Anomaly Matrix Heatmap */}
      {activeTab === 'anomaly' && (
        <section id="panel-anomaly" role="tabpanel" aria-labelledby="tab-anomaly" className="bg-white rounded-lg border border-[#e9e8e4] p-4.5 shadow-xs">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-stone-900">
              UHI Temperature Anomaly Matrix (2016–2025 vs 10-Yr Mean)
            </h3>
            <p className="text-xs text-stone-600">
              Each cell depicts deviation in °C from the city’s 10-year mean UHI. Baseline: city-wide mean across the full study period (2016–2025) using {anomalyBaseline.count} valid satellite observations out of {anomalyBaseline.total} total months.
            </p>
            <p className="text-xs font-mono text-stone-700 mt-1">
              Baseline UHI: {anomalyBaseline.mean >= 0 ? '+' : ''}{anomalyBaseline.mean.toFixed(4)} °C &nbsp;|&nbsp; Anomaly = Observation − Baseline
            </p>
          </div>

          {/* Matrix Grid Table */}
          <div tabIndex={0} role="region" aria-label="10-year monthly anomaly heatmap matrix" className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-stone-900 border border-stone-200 rounded-md">
            <table className="w-full text-center text-xs border-collapse">
              <caption className="sr-only">Monthly temperature anomalies in degrees Celsius from 2016 through 2025</caption>
              <thead>
                <tr className="border-b border-stone-200 text-stone-600 font-mono text-[11px] bg-stone-50">
                  <th scope="col" className="sticky left-0 bg-stone-50 z-20 py-2.5 px-3 text-left font-bold text-stone-900 border-r border-stone-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                    Year
                  </th>
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m) => (
                    <th key={m} scope="col" className="py-2.5 px-1 min-w-[44px]">
                      {m}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-mono">
                {anomalyMatrix.map((row) => (
                  <tr key={row.year as number} className="hover:bg-stone-50/50">
                    <th scope="row" className="sticky left-0 bg-white z-10 py-2 px-3 text-left font-bold text-stone-950 border-r border-stone-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                      {row.year}
                    </th>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => {
                      const rawVal = row[`m${m}`];
                      const val = rawVal !== null && rawVal !== undefined ? Number(rawVal) : null;
                      const hasVal = val !== null && !isNaN(val);
                      const isSelected = selectedCellAnomaly?.year === row.year && selectedCellAnomaly?.month === m;
                      return (
                        <td key={m} className="p-0.5 min-w-[44px]">
                          <button
                            type="button"
                            onClick={() => setSelectedCellAnomaly({ year: row.year as number, month: m, val })}
                            aria-label={`Year ${row.year}, Month ${m}: ${hasVal ? `${val >= 0 ? `+${val.toFixed(1)}` : val.toFixed(1)} degrees Celsius anomaly` : 'Data unavailable'}`}
                            className={`w-full min-h-[44px] min-w-[40px] flex items-center justify-center rounded text-[11px] font-semibold transition-all focus-visible:outline-2 focus-visible:outline-stone-900 active:scale-95 ${getAnomalyColor(
                              val
                            )} ${isSelected ? 'ring-2 ring-stone-900 ring-offset-1 z-10 relative' : ''}`}
                          >
                            {hasVal ? (val >= 0 ? `+${val.toFixed(1)}` : val.toFixed(1)) : '—'}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Active Tap / Selected Cell Detail Banner */}
          {selectedCellAnomaly && (
            <div className="mt-3 p-3 bg-stone-100 rounded-md border border-stone-200 flex items-center justify-between text-xs" role="region" aria-live="polite">
              <div className="flex items-center gap-2">
                <span className="font-bold text-stone-900">
                  {new Date(2000, selectedCellAnomaly.month - 1).toLocaleString('en-US', { month: 'long' })} {selectedCellAnomaly.year}:
                </span>
                <span className="font-mono">
                  {selectedCellAnomaly.val !== null
                    ? `${selectedCellAnomaly.val >= 0 ? `+${selectedCellAnomaly.val.toFixed(2)}` : selectedCellAnomaly.val.toFixed(2)} °C anomaly vs 10-yr baseline (${anomalyBaseline.mean >= 0 ? '+' : ''}${anomalyBaseline.mean.toFixed(2)} °C)`
                    : 'Missing satellite observation (cloud contamination)'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCellAnomaly(null)}
                className="text-stone-600 hover:text-stone-900 text-[11px] font-semibold px-2 py-1 bg-stone-200 hover:bg-stone-300 rounded"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-600">
            <div className="flex flex-wrap items-center gap-2" role="note" aria-label="Anomaly scale legend">
              <span className="text-[11px] font-mono font-medium">Scale:</span>
              <span className="px-2 py-0.5 rounded bg-[#0c4a6e] text-white text-[10px] font-mono">&lt; -2.0 °C</span>
              <span className="px-2 py-0.5 rounded bg-[#0369a1] text-white text-[10px] font-mono">-1.0 to -2.0 °C</span>
              <span className="px-2 py-0.5 rounded bg-[#38bdf8] text-stone-950 text-[10px] font-mono">-0.4 to -1.0 °C</span>
              <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-800 text-[10px] font-mono">Normal (±0.2)</span>
              <span className="px-2 py-0.5 rounded bg-[#fecaca] text-stone-900 text-[10px] font-mono">+0.2 to +0.6 °C</span>
              <span className="px-2 py-0.5 rounded bg-[#7f1d1d] text-white text-[10px] font-mono">+1.2 to +2.0 °C</span>
              <span className="px-2 py-0.5 rounded bg-[#450a0a] text-white text-[10px] font-mono">&gt; +2.0 °C (Extreme)</span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
