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
  const [timeSeries, setTimeSeries] = useState<MonthlyDataRecord[]>(() =>
    generateMockTimeSeries(initialCity)
  );
  const [selectedYearRange, setSelectedYearRange] = useState<string>('all');

  // Sync city selection with URL param
  const handleCityChange = (cityName: string) => {
    setSelectedCity(cityName);
    setSearchParams({ city: cityName });
  };

  // Try live API fetch if online
  useEffect(() => {
    fetchCityTimeSeries(selectedCity)
      .then((records) => {
        if (records && records.length > 0) {
          setTimeSeries(records);
        } else {
          setTimeSeries(generateMockTimeSeries(selectedCity));
        }
      })
      .catch(() => {
        setTimeSeries(generateMockTimeSeries(selectedCity));
      });
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
    if (selectedYearRange === '2024-2025') {
      return timeSeries.filter((d) => d.year >= 2024);
    }
    if (selectedYearRange === '2020-2025') {
      return timeSeries.filter((d) => d.year >= 2020);
    }
    return timeSeries;
  }, [timeSeries, selectedYearRange]);

  // Formatted chart data
  const chartData = useMemo(() => {
    return filteredSeries.map((d) => ({
      date: `${d.year}-${String(d.month).padStart(2, '0')}`,
      year: d.year,
      month: d.month,
      uhi: d.uhi_intensity,
      lst_urban: d.lst_urban,
      lst_rural: d.lst_rural,
      ndvi: d.ndvi,
      ndbi: d.ndbi,
      temp: d.temperature_2m,
    }));
  }, [filteredSeries]);

  // Monthly seasonal profile (aggregated across all 10 years)
  const seasonalProfile = useMemo(() => {
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    const buckets: Record<number, { uhi: number[]; lst_urban: number[]; lst_rural: number[] }> = {};
    for (let m = 1; m <= 12; m++) {
      buckets[m] = { uhi: [], lst_urban: [], lst_rural: [] };
    }

    timeSeries.forEach((d) => {
      buckets[d.month]?.uhi.push(d.uhi_intensity);
      buckets[d.month]?.lst_urban.push(d.lst_urban);
      buckets[d.month]?.lst_rural.push(d.lst_rural);
    });

    return monthNames.map((name, i) => {
      const m = i + 1;
      const uhiArr = buckets[m]?.uhi ?? [0];
      const urbanArr = buckets[m]?.lst_urban ?? [0];
      const ruralArr = buckets[m]?.lst_rural ?? [0];

      const avgUhi = uhiArr.reduce((a, b) => a + b, 0) / uhiArr.length;
      const avgUrban = urbanArr.reduce((a, b) => a + b, 0) / urbanArr.length;
      const avgRural = ruralArr.reduce((a, b) => a + b, 0) / ruralArr.length;

      return {
        month: name,
        monthNum: m,
        mean_uhi: parseFloat(avgUhi.toFixed(2)),
        mean_lst_urban: parseFloat(avgUrban.toFixed(1)),
        mean_lst_rural: parseFloat(avgRural.toFixed(1)),
      };
    });
  }, [timeSeries]);

  // Multi-year anomaly matrix (Years 2016-2025 vs Months 1-12)
  const anomalyMatrix = useMemo(() => {
    const meanOverall =
      timeSeries.reduce((acc, d) => acc + d.uhi_intensity, 0) / timeSeries.length;
    const years = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    return years.map((year) => {
      const row: Record<string, number | string> = { year };
      months.forEach((m) => {
        const item = timeSeries.find((d) => d.year === year && d.month === m);
        const val = item ? item.uhi_intensity - meanOverall : 0;
        row[`m${m}`] = parseFloat(val.toFixed(2));
      });
      return row;
    });
  }, [timeSeries]);

  // Statistics
  const stats = useMemo(() => {
    const uhiVals = timeSeries.map((d) => d.uhi_intensity);
    const meanUhi = (uhiVals.reduce((a, b) => a + b, 0) / uhiVals.length).toFixed(2);
    const maxUhi = Math.max(...uhiVals).toFixed(2);
    const minUhi = Math.min(...uhiVals).toFixed(2);

    const early = timeSeries.filter((d) => d.year <= 2018).map((d) => d.uhi_intensity);
    const late = timeSeries.filter((d) => d.year >= 2023).map((d) => d.uhi_intensity);
    const earlyMean = early.reduce((a, b) => a + b, 0) / early.length;
    const lateMean = late.reduce((a, b) => a + b, 0) / late.length;
    const decadalChange = (lateMean - earlyMean).toFixed(2);

    return { meanUhi, maxUhi, minUhi, decadalChange };
  }, [timeSeries]);

  // Cividis/Monochrome contrast safe anomaly cell styling
  const getAnomalyColor = (val: number) => {
    if (val >= 1.2) return 'bg-[#7f1d1d] text-white font-bold';
    if (val >= 0.6) return 'bg-[#b91c1c] text-white font-semibold';
    if (val >= 0.2) return 'bg-[#fecaca] text-stone-900';
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
      <div className="flex items-center justify-between border-b border-stone-200 pb-2" role="tablist" aria-label="City analysis view tabs">
        <div className="flex items-center gap-2">
          <button
            role="tab"
            id="tab-trends"
            aria-selected={activeTab === 'trends'}
            aria-controls="panel-trends"
            type="button"
            onClick={() => setActiveTab('trends')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all focus-visible:outline-2 focus-visible:outline-stone-900 ${
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
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all focus-visible:outline-2 focus-visible:outline-stone-900 ${
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
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all focus-visible:outline-2 focus-visible:outline-stone-900 ${
              activeTab === 'anomaly'
                ? 'bg-stone-900 text-stone-50 shadow-xs'
                : 'text-stone-700 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            Heatwave Anomaly Matrix
          </button>
        </div>

        {activeTab === 'trends' && (
          <div className="flex items-center gap-1.5 text-xs" role="group" aria-label="Filter time-series date range">
            <span className="text-stone-500 font-mono font-medium">Range:</span>
            {['all', '2020-2025', '2024-2025'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setSelectedYearRange(r)}
                aria-pressed={selectedYearRange === r}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors focus-visible:outline-2 focus-visible:outline-stone-900 ${
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

            <div className="h-80 w-full" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0efe9" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#57534e' }}
                    tickFormatter={(val) => val.slice(0, 4)}
                    interval={11}
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#57534e' }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e7e5e4',
                      borderRadius: '6px',
                      fontSize: '11px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="lst_urban"
                    name="LST Urban"
                    stroke="#b91c1c"
                    strokeWidth={1.8}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="lst_rural"
                    name="LST Rural"
                    stroke="#15803d"
                    strokeWidth={1.8}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="uhi"
                    name="UHI Intensity"
                    stroke="#b45309"
                    strokeWidth={2.4}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
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
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0efe9" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#57534e' }}
                    tickFormatter={(val) => val.slice(0, 4)}
                    interval={11}
                  />
                  <YAxis domain={[-0.5, 1.0]} tick={{ fontSize: 10, fill: '#57534e' }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e7e5e4',
                      borderRadius: '6px',
                      fontSize: '11px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="ndvi"
                    name="NDVI (Greenness)"
                    stroke="#117733"
                    fill="#117733"
                    fillOpacity={0.3}
                  />
                  <Area
                    type="monotone"
                    dataKey="ndbi"
                    name="NDBI (Built-up)"
                    stroke="#882255"
                    fill="#882255"
                    fillOpacity={0.25}
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
                Averaged monthly UHI behavior across all 10 years showing peak summer divergence and monsoon attenuation
              </p>
            </div>

            <div className="h-80 w-full" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={seasonalProfile} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0efe9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#57534e' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#57534e' }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e7e5e4',
                      borderRadius: '6px',
                      fontSize: '11px',
                    }}
                  />
                  <Bar dataKey="mean_uhi" name="Mean UHI (°C)" fill="#b45309" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
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
              Each cell depicts deviation in °C from the city’s 10-year mean UHI. High-contrast color coding with explicit values for screen reader accessibility.
            </p>
          </div>

          {/* Matrix Grid Table */}
          <div tabIndex={0} role="region" aria-label="10-year monthly anomaly heatmap matrix" className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-stone-900">
            <table className="w-full text-center text-xs border-collapse">
              <caption className="sr-only">Monthly temperature anomalies in degrees Celsius from 2016 through 2025</caption>
              <thead>
                <tr className="border-b border-stone-200 text-stone-600 font-mono text-[11px]">
                  <th scope="col" className="py-2 px-3 text-left">Year</th>
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m) => (
                    <th key={m} scope="col" className="py-2 px-1 w-12">
                      {m}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-mono">
                {anomalyMatrix.map((row) => (
                  <tr key={row.year as number} className="hover:bg-stone-50/50">
                    <th scope="row" className="py-2 px-3 text-left font-bold text-stone-950">
                      {row.year}
                    </th>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => {
                      const val = Number(row[`m${m}`]);
                      return (
                        <td key={m} className="p-1">
                          <span
                            tabIndex={0}
                            aria-label={`Year ${row.year}, Month ${m}: ${val >= 0 ? `+${val.toFixed(1)}` : val.toFixed(1)} degrees Celsius anomaly`}
                            className={`inline-block w-full py-1 rounded text-[10px] font-semibold transition-all focus-visible:outline-2 focus-visible:outline-stone-900 ${getAnomalyColor(
                              val
                            )}`}
                          >
                            {val >= 0 ? `+${val.toFixed(1)}` : val.toFixed(1)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
            <div className="flex items-center gap-2" role="note" aria-label="Anomaly scale legend">
              <span className="text-[11px] font-mono font-medium">Scale:</span>
              <span className="px-2 py-0.5 rounded bg-[#0369a1] text-white text-[10px] font-mono">&lt; -1.0 °C</span>
              <span className="px-2 py-0.5 rounded bg-[#38bdf8] text-stone-950 text-[10px] font-mono">-0.4 to 0.0 °C</span>
              <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-800 text-[10px] font-mono">Normal (0.0)</span>
              <span className="px-2 py-0.5 rounded bg-[#fecaca] text-stone-900 text-[10px] font-mono">+0.2 to +0.6 °C</span>
              <span className="px-2 py-0.5 rounded bg-[#7f1d1d] text-white text-[10px] font-mono">&gt; +1.2 °C (Heatwave)</span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
