// Page 3: Sampled ~1 km Grid Spatial Explorer (with WCAG 2.1 Accessibility & Keyboard Focus)
// client/src/pages/SpatialExplorer.tsx

import React, { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafletTooltip } from 'react-leaflet';
import {
  Grid,
  Trees,
  Flame,
  Layers,
  Building,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { MetricCard } from '../components/MetricCard';
import { INITIAL_CITIES, generateMockGridPixels } from '../lib/mockData';
import { fetchSpatialGrid } from '../lib/api';
import type { GridPixelRecord } from '../types';

export const SpatialExplorer: React.FC = () => {
  const [selectedCity, setSelectedCity] = useState<string>('Delhi');
  const [displayMetric, setDisplayMetric] = useState<'uhi' | 'lst' | 'ndvi' | 'ndbi' | 'population_density'>('uhi');
  const [gridPixels, setGridPixels] = useState<GridPixelRecord[]>(() =>
    generateMockGridPixels('Delhi')
  );
  const [activePixel, setActivePixel] = useState<GridPixelRecord | null>(null);

  const cityMetadata = useMemo(() => {
    return (
      INITIAL_CITIES.find(
        (c) => c.city.toLowerCase() === selectedCity.toLowerCase()
      ) ?? INITIAL_CITIES[0]
    );
  }, [selectedCity]);

  // Load grid pixels from API if available or mock fallback
  useEffect(() => {
    fetchSpatialGrid(selectedCity, { limit: 350 })
      .then((records) => {
        if (records && records.length > 0) {
          setGridPixels(records);
        } else {
          setGridPixels(generateMockGridPixels(selectedCity));
        }
      })
      .catch(() => {
        setGridPixels(generateMockGridPixels(selectedCity));
      });
  }, [selectedCity]);

  // Color scale helper according to selected metric (contrast & colorblind checked)
  const getMetricColor = (pixel: GridPixelRecord, metric: string) => {
    if (metric === 'uhi') {
      const uhi = pixel.uhi;
      if (uhi >= 3.5) return '#7f1d1d'; // deep red
      if (uhi >= 2.5) return '#c2410c'; // rust orange
      if (uhi >= 1.5) return '#b45309'; // warm amber
      if (uhi >= 0.5) return '#4d7c0f'; // deep olive green
      return '#0369a1'; // cool blue
    }
    if (metric === 'lst') {
      const lst = pixel.lst;
      if (lst >= 35) return '#7f1d1d';
      if (lst >= 32) return '#b91c1c';
      if (lst >= 29) return '#c2410c';
      if (lst >= 26) return '#ca8a04';
      return '#15803d';
    }
    if (metric === 'ndvi') {
      const ndvi = pixel.ndvi;
      if (ndvi >= 0.55) return '#14532d'; // deep forest green
      if (ndvi >= 0.40) return '#15803d';
      if (ndvi >= 0.25) return '#65a30d';
      return '#94a3b8'; // concrete / low veg
    }
    if (metric === 'ndbi') {
      const ndbi = pixel.ndbi;
      if (ndbi >= 0.40) return '#701a75'; // deep purple/magenta
      if (ndbi >= 0.25) return '#c2410c';
      if (ndbi >= 0.10) return '#ea580c';
      return '#64748b';
    }
    // population density
    const pop = pixel.population_density;
    if (pop >= 20000) return '#4c1d95';
    if (pop >= 12000) return '#7e22ce';
    if (pop >= 6000) return '#a855f7';
    return '#cbd5e1';
  };

  // Hotspots vs Cool Parks Breakdown
  const spatialBreakdown = useMemo(() => {
    if (!gridPixels.length) return null;
    const sorted = [...gridPixels].sort((a, b) => b.uhi - a.uhi);
    const topCount = Math.max(2, Math.floor(sorted.length * 0.15));

    const hotspots = sorted.slice(0, topCount);
    const coolIslands = sorted.slice(-topCount);

    const avgHotUhi = hotspots.reduce((a, b) => a + b.uhi, 0) / hotspots.length;
    const avgCoolUhi = coolIslands.reduce((a, b) => a + b.uhi, 0) / coolIslands.length;

    const avgHotNdvi = hotspots.reduce((a, b) => a + b.ndvi, 0) / hotspots.length;
    const avgCoolNdvi = coolIslands.reduce((a, b) => a + b.ndvi, 0) / coolIslands.length;

    const avgHotNdbi = hotspots.reduce((a, b) => a + b.ndbi, 0) / hotspots.length;
    const avgCoolNdbi = coolIslands.reduce((a, b) => a + b.ndbi, 0) / coolIslands.length;

    return {
      hotspots,
      coolIslands,
      avgHotUhi: avgHotUhi.toFixed(2),
      avgCoolUhi: avgCoolUhi.toFixed(2),
      thermalDelta: (avgHotUhi - avgCoolUhi).toFixed(2),
      avgHotNdvi: avgHotNdvi.toFixed(2),
      avgCoolNdvi: avgCoolNdvi.toFixed(2),
      avgHotNdbi: avgHotNdbi.toFixed(2),
      avgCoolNdbi: avgCoolNdbi.toFixed(2),
    };
  }, [gridPixels]);

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Page 3 • Intra-Urban Microclimate"
        title="Sampled ~1 km Grid Spatial Explorer"
        subtitle="Fine-grained spatial resolution across urban fabric. Contrast concrete commercial hotspots against urban park cool islands."
        actions={
          <div className="flex items-center gap-2">
            <label htmlFor="spatial-city-select" className="text-xs text-stone-600 font-mono font-medium">Select Metro:</label>
            <select
              id="spatial-city-select"
              aria-label="Select city for spatial exploration"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
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

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" role="region" aria-label="Microclimate spatial metrics">
        <MetricCard
          title="Sampled Grid Cells"
          value={gridPixels.length}
          subtitle="~1 km spatial sampling grid"
          badge={{ text: 'SAMPLED ~1 KM', variant: 'neutral' }}
          icon={Grid}
        />
        <MetricCard
          title="Intra-Urban Thermal Range"
          value={`${spatialBreakdown?.thermalDelta ?? '4.2'} °C`}
          subtitle="Hotspot Core vs. Park Cool Island"
          badge={{ text: 'LOCAL SPREAD', variant: 'accent' }}
          icon={Flame}
        />
        <MetricCard
          title="Park Island Cooling"
          value={`+${spatialBreakdown?.avgCoolUhi ?? '0.8'} °C`}
          subtitle="High NDVI canopy buffer zones"
          badge={{ text: 'COOL BUFFER', variant: 'positive' }}
          icon={Trees}
        />
        <MetricCard
          title="Commercial Core Peak"
          value={`+${spatialBreakdown?.avgHotUhi ?? '4.8'} °C`}
          subtitle="High NDBI impervious concrete"
          badge={{ text: 'HOTSPOT CORE', variant: 'negative' }}
          icon={Building}
        />
      </div>

      {/* Main Interactive Spatial Map + Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Spatial Grid Map */}
        <section aria-labelledby="grid-map-heading" className="lg:col-span-2 bg-white rounded-lg border border-[#e9e8e4] p-4 shadow-xs flex flex-col">
          <h2 id="grid-map-heading" className="sr-only">Intra-urban Grid Spatial Heat Map</h2>

          {/* Layer Metric Selector Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-stone-200">
            <div className="flex items-center gap-2" role="group" aria-label="Select metric display layer">
              <Layers className="w-4 h-4 text-stone-500" aria-hidden="true" />
              <span className="text-xs font-mono font-medium text-stone-600">Active Metric:</span>
              <div className="flex flex-wrap gap-1">
                {[
                  { id: 'uhi', label: 'UHI Intensity (°C)' },
                  { id: 'lst', label: 'Land Surface Temp' },
                  { id: 'ndvi', label: 'Vegetation (NDVI)' },
                  { id: 'ndbi', label: 'Built Impervious (NDBI)' },
                  { id: 'population_density', label: 'Pop. Density' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setDisplayMetric(m.id as any)}
                    aria-pressed={displayMetric === m.id}
                    className={`px-2.5 py-1 text-xs rounded transition-colors focus-visible:outline-2 focus-visible:outline-stone-900 ${
                      displayMetric === m.id
                        ? 'bg-stone-900 text-stone-50 font-semibold'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-[11px] font-mono text-stone-500">
              {cityMetadata.city} Grid Center: {cityMetadata.latitude.toFixed(2)}°N, {cityMetadata.longitude.toFixed(2)}°E
            </span>
          </div>

          {/* Leaflet Map Centered on City */}
          <div
            tabIndex={0}
            role="application"
            aria-label={`Interactive map of ${cityMetadata.city} displaying sampled 1 kilometer spatial grid points. Click or select a point to inspect its indices.`}
            className="relative w-full h-[480px] rounded-md overflow-hidden border border-stone-200 focus-visible:outline-2 focus-visible:outline-stone-900"
          >
            <MapContainer
              key={selectedCity}
              center={[cityMetadata.latitude, cityMetadata.longitude]}
              zoom={11}
              scrollWheelZoom={true}
              className="dark-tiles"
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {gridPixels.map((pixel, i) => {
                const color = getMetricColor(pixel, displayMetric);
                const isSelected = activePixel && activePixel.latitude === pixel.latitude && activePixel.longitude === pixel.longitude;

                return (
                  <CircleMarker
                    key={i}
                    center={[pixel.latitude, pixel.longitude]}
                    radius={isSelected ? 13 : 9}
                    pathOptions={{
                      color: isSelected ? '#000000' : color,
                      weight: isSelected ? 3 : 1,
                      fillColor: color,
                      fillOpacity: 0.85,
                    }}
                    eventHandlers={{
                      click: () => setActivePixel(pixel),
                    }}
                  >
                    <LeafletTooltip direction="top" offset={[0, -6]} opacity={0.95}>
                      <div className="font-sans text-xs">
                        <div className="font-bold">
                          UHI: +{pixel.uhi} °C | LST: {pixel.lst} °C
                        </div>
                        <div className="text-[10px] text-stone-600 font-mono">
                          NDVI: {pixel.ndvi} • NDBI: {pixel.ndbi}
                        </div>
                      </div>
                    </LeafletTooltip>
                  </CircleMarker>
                );
              })}
            </MapContainer>

            {/* In-Map Metric Legend */}
            <div
              role="note"
              aria-label="Spatial metric scale"
              className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur-xs px-3 py-2.5 rounded border border-stone-300 shadow-xs text-xs space-y-1.5"
            >
              <span className="font-bold text-stone-900 text-[11px] uppercase tracking-wider block">
                {displayMetric.toUpperCase()} Scale
              </span>
              {displayMetric === 'uhi' && (
                <>
                  <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full bg-[#7f1d1d] border border-stone-400" aria-hidden="true"></span><span className="text-[10px] font-mono text-stone-700">&ge; 3.5 °C (Severe Hotspot)</span></div>
                  <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full bg-[#c2410c] border border-stone-400" aria-hidden="true"></span><span className="text-[10px] font-mono text-stone-700">2.5 – 3.5 °C (High)</span></div>
                  <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full bg-[#b45309] border border-stone-400" aria-hidden="true"></span><span className="text-[10px] font-mono text-stone-700">1.5 – 2.5 °C (Elevated)</span></div>
                  <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full bg-[#4d7c0f] border border-stone-400" aria-hidden="true"></span><span className="text-[10px] font-mono text-stone-700">0.5 – 1.5 °C (Moderate)</span></div>
                  <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full bg-[#0369a1] border border-stone-400" aria-hidden="true"></span><span className="text-[10px] font-mono text-stone-700">&lt; 0.5 °C (Cool Island)</span></div>
                </>
              )}
              {displayMetric === 'ndvi' && (
                <>
                  <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full bg-[#14532d] border border-stone-400" aria-hidden="true"></span><span className="text-[10px] font-mono text-stone-700">&ge; 0.55 (Dense Canopy)</span></div>
                  <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full bg-[#15803d] border border-stone-400" aria-hidden="true"></span><span className="text-[10px] font-mono text-stone-700">0.40 – 0.55 (Moderate Green)</span></div>
                  <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full bg-[#94a3b8] border border-stone-400" aria-hidden="true"></span><span className="text-[10px] font-mono text-stone-700">&lt; 0.25 (Impervious / Concrete)</span></div>
                </>
              )}
              {displayMetric === 'ndbi' && (
                <>
                  <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full bg-[#701a75] border border-stone-400" aria-hidden="true"></span><span className="text-[10px] font-mono text-stone-700">&ge; 0.40 (Dense Built-up)</span></div>
                  <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full bg-[#ea580c] border border-stone-400" aria-hidden="true"></span><span className="text-[10px] font-mono text-stone-700">0.10 – 0.25 (Suburban)</span></div>
                  <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full bg-[#64748b] border border-stone-400" aria-hidden="true"></span><span className="text-[10px] font-mono text-stone-700">&lt; 0.10 (Open / Vegetated)</span></div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Right Col: Hotspot vs Park Comparative Card & Active Inspector */}
        <div className="space-y-4">
          {/* Hotspot vs Cool Island Comparative Breakdown */}
          <div tabIndex={0} role="region" aria-labelledby="microclimate-heading" className="bg-white rounded-lg border border-[#e9e8e4] p-4.5 shadow-xs focus-visible:outline-2 focus-visible:outline-stone-900">
            <span className="text-[11px] font-mono uppercase tracking-wider text-stone-500 block mb-1 font-semibold">
              Microclimate Divergence
            </span>
            <h3 id="microclimate-heading" className="text-base font-bold text-stone-900 mb-3">
              Hotspots vs. Urban Park Islands
            </h3>

            <div className="space-y-3 text-xs">
              {/* Hotspot Row */}
              <div className="p-3 rounded bg-rose-50 border border-rose-300">
                <div className="flex items-center justify-between font-bold text-rose-950 mb-1">
                  <span className="flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-rose-700" aria-hidden="true" />
                    Commercial Concrete Core
                  </span>
                  <span className="font-mono text-sm">+{spatialBreakdown?.avgHotUhi} °C</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-rose-900 font-mono mt-2 pt-1 border-t border-rose-200">
                  <span>NDVI (Green): {spatialBreakdown?.avgHotNdvi}</span>
                  <span>NDBI (Built): {spatialBreakdown?.avgHotNdbi}</span>
                </div>
              </div>

              {/* Park Island Row */}
              <div className="p-3 rounded bg-emerald-50 border border-emerald-300">
                <div className="flex items-center justify-between font-bold text-emerald-950 mb-1">
                  <span className="flex items-center gap-1.5">
                    <Trees className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                    Urban Parks / Tree Canopy
                  </span>
                  <span className="font-mono text-sm">+{spatialBreakdown?.avgCoolUhi} °C</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-emerald-900 font-mono mt-2 pt-1 border-t border-emerald-200">
                  <span>NDVI (Green): {spatialBreakdown?.avgCoolNdvi}</span>
                  <span>NDBI (Built): {spatialBreakdown?.avgCoolNdbi}</span>
                </div>
              </div>

              {/* Differential KPI */}
              <div className="p-3 bg-stone-100 rounded border border-stone-300 text-center">
                <span className="text-[10px] font-mono text-stone-600 uppercase tracking-wide block font-semibold">
                  Intra-Urban Thermal Delta (ΔT)
                </span>
                <span className="text-xl font-bold font-mono text-stone-950">
                  {spatialBreakdown?.thermalDelta} °C
                </span>
                <p className="text-[11px] text-stone-700 mt-1">
                  Urban trees and parks reduce local thermal storage by up to {spatialBreakdown?.thermalDelta} °C compared to impervious masonry.
                </p>
              </div>
            </div>
          </div>

          {/* Active Clicked Pixel Inspector */}
          <div tabIndex={0} role="region" aria-labelledby="pixel-inspector-heading" className="bg-white rounded-lg border border-[#e9e8e4] p-4.5 shadow-xs focus-visible:outline-2 focus-visible:outline-stone-900">
            <span className="text-[11px] font-mono uppercase tracking-wider text-stone-500 block mb-1 font-semibold">
              Sampled Pixel Inspector
            </span>
            <h3 id="pixel-inspector-heading" className="sr-only">Detailed Pixel Inspection</h3>
            {activePixel ? (
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between font-mono font-bold text-stone-900 border-b pb-2">
                  <span>Coords: {activePixel.latitude}, {activePixel.longitude}</span>
                  <span className="text-amber-900">UHI: +{activePixel.uhi} °C</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div><span className="text-stone-500 block">LST Urban</span><span className="font-mono font-semibold text-stone-900">{activePixel.lst} °C</span></div>
                  <div><span className="text-stone-500 block">Pop. Density</span><span className="font-mono font-semibold text-stone-900">{activePixel.population_density.toLocaleString()} /km²</span></div>
                  <div><span className="text-stone-500 block">NDVI (Canopy)</span><span className="font-mono font-semibold text-emerald-800">{activePixel.ndvi}</span></div>
                  <div><span className="text-stone-500 block">NDBI (Impervious)</span><span className="font-mono font-semibold text-amber-900">{activePixel.ndbi}</span></div>
                  <div><span className="text-stone-500 block">NDWI (Moisture)</span><span className="font-mono font-semibold text-sky-800">{activePixel.ndwi}</span></div>
                  <div><span className="text-stone-500 block">Spatial Scale</span><span className="font-mono font-semibold text-stone-700">Sampled ~1 km</span></div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-stone-600 py-4 text-center">
                Click on any sampled grid circle on the map to inspect its local biophysical indices.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
