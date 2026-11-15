// ============================================================
// URBAN HEAT ISLAND PROJECT - GLOBAL MONTHLY DATA EXTRACTION V2
// 42 Cities (24 India + 18 International) | Selectable years 2016-2025
//
// Training:   2016-2023
// Validation: 2024
// Testing:    2025
//
// Spatial method:
// Urban = 0-10 km from city centre
// Rural = 10-20 km from city centre
//
// Main datasets:
// Landsat 8/9 Collection 2 Level 2 - LST and spectral indices
// GHSL P2023A - population count / density
// ERA5-Land Monthly Aggregated - weather, precipitation and snow
// JRC Global Surface Water v1.4 - permanent-water screening
// CHIRPS Daily - optional rainfall cross-check (limited latitude coverage)
//
// IMPORTANT:
// 1. Edit YEARS_TO_EXPORT below to choose any combination of years.
// 2. One script run creates one separate CSV export task per selected year.
// 3. Each yearly CSV contains 42 * 12 = 504 city-month rows.
// 4. You can export one year, several years, or all ten years together.
// 5. Earth Engine creates separate Tasks; start them from the Tasks tab.
// 6. LST is land-surface temperature, NOT 2-m air temperature.
// 7. UHI = mean urban LST - mean rural-ring LST.
// 8. climate_group is a broad, approximate climate regime label,
//    not a pixel-level or formal Köppen classification.
// ============================================================


// ------------------------------------------------------------
// 1. CONFIGURATION
// ------------------------------------------------------------

var START_YEAR = 2016;
var END_YEAR = 2025;

// Choose the years to export by editing this array.
// Examples:
//   [2016]                         -> one year
//   [2016, 2017, 2018]             -> three years
//   [2016, 2017, 2018, 2019, 2020,
//    2021, 2022, 2023, 2024, 2025] -> all ten years
//
// Each selected year becomes a separate Google Drive CSV task.
var YEARS_TO_EXPORT = [
  2016, 2017, 2018, 2019, 2020,
  2021, 2022, 2023, 2024, 2025
];

var URBAN_RADIUS = 10000;       // metres from city centre
var RURAL_OUTER_RADIUS = 20000; // metres from city centre

var DRIVE_FOLDER = 'UHI_Project_Global';

// Mask only frequently observed/permanent surface water.
// JRC GSW is a static 1984-2021 water-history product.
var WATER_OCCURRENCE_THRESHOLD = 90;


// ------------------------------------------------------------
// 2. SELECTED CITIES - 42 TOTAL
// Format: [City, Longitude, Latitude, Broad climate group]
// Coordinates are approximate city-centre locations.
//
// Climate groups are broad, manually assigned regimes.
// They are intended for stratified analysis, not as precise
// city-wide Köppen-Geiger classifications.
// ------------------------------------------------------------

var cityData = [

  // ---------------- INDIA: 24 CITIES ----------------

  // Hot desert / semi-arid
  ['Ahmedabad', 72.5714, 23.0225, 'Hot_Desert_SemiArid'],
  ['Jaipur', 75.7873, 26.9124, 'Hot_Desert_SemiArid'],
  ['Jodhpur', 73.0243, 26.2389, 'Hot_Desert_SemiArid'],
  ['Gandhinagar', 72.6369, 23.2156, 'Hot_Desert_SemiArid'],
  ['Hyderabad', 78.4867, 17.3850, 'Hot_SemiArid'],
  ['Delhi', 77.1025, 28.7041, 'Hot_SemiArid'],
  ['Indore', 75.8577, 22.7196, 'Hot_SemiArid'],
  ['Udaipur', 73.7125, 24.5854, 'Hot_SemiArid'],

  // Tropical monsoon / coastal
  ['Mumbai', 72.8777, 19.0760, 'Tropical_Monsoon'],
  ['Chennai', 80.2707, 13.0827, 'Tropical_Monsoon'],
  ['Kochi', 76.2673, 9.9312, 'Tropical_Monsoon'],
  ['Mangaluru', 74.8560, 12.9141, 'Tropical_Monsoon'],
  ['Kolkata', 88.3639, 22.5726, 'Tropical_Monsoon'],
  ['Bhubaneswar', 85.8245, 20.2961, 'Tropical_Monsoon'],

  // Tropical savanna / upland
  ['Bengaluru', 77.5946, 12.9716, 'Tropical_Savanna_Upland'],
  ['Pune', 73.8567, 18.5204, 'Tropical_Savanna_Upland'],
  ['Mysuru', 76.6394, 12.2958, 'Tropical_Savanna_Upland'],
  ['Nagpur', 79.0882, 21.1458, 'Tropical_Savanna_Upland'],
  ['Bhopal', 77.4126, 23.2599, 'Tropical_Savanna_Upland'],

  // Humid subtropical / monsoon-influenced north and east
  ['Lucknow', 80.9462, 26.8467, 'Humid_Subtropical'],
  ['Kanpur', 80.3319, 26.4499, 'Humid_Subtropical'],
  ['Patna', 85.1376, 25.5941, 'Humid_Subtropical'],
  ['Guwahati', 91.7362, 26.1445, 'Humid_Subtropical'],
  ['Siliguri', 88.3953, 26.7271, 'Humid_Subtropical'],

  // ---------------- INTERNATIONAL: 18 CITIES ----------------

  // Hot desert
  ['Cairo', 31.2357, 30.0444, 'Hot_Desert'],
  ['Riyadh', 46.6753, 24.7136, 'Hot_Desert'],

  // Mediterranean
  ['Madrid', -3.7038, 40.4168, 'Mediterranean'],
  ['Los Angeles', -118.2437, 34.0522, 'Mediterranean'],

  // Temperate oceanic
  ['London', -0.1276, 51.5072, 'Temperate_Oceanic'],

  // Continental / cold-winter cities
  ['Beijing', 116.4074, 39.9042, 'Continental_Monsoon'],
  ['New York', -74.0060, 40.7128, 'Continental'],
  ['Seoul', 126.9780, 37.5665, 'Continental_Monsoon'],
  ['Sapporo', 141.3545, 43.0618, 'Cold_Continental_Snow'],
  ['Budapest', 19.0402, 47.4979, 'Continental'],
  ['Helsinki', 24.9384, 60.1699, 'Cold_Continental_Snow'],
  ['Montreal', -73.5673, 45.5019, 'Cold_Continental_Snow'],

  // Humid subtropical
  ['Tokyo', 139.6917, 35.6895, 'Humid_Subtropical'],
  ['Sao Paulo', -46.6333, -23.5505, 'Humid_Subtropical'],
  ['Sydney', 151.2093, -33.8688, 'Humid_Subtropical'],

  // Tropical / highland
  ['Mexico City', -99.1332, 19.4326, 'Subtropical_Highland'],
  ['Nairobi', 36.8219, -1.2921, 'Tropical_Highland'],
  ['Dhaka', 90.4125, 23.8103, 'Tropical_Monsoon']
];


// ------------------------------------------------------------
// 3. CREATE CITY FEATURES AND URBAN / RURAL GEOMETRIES
// ------------------------------------------------------------

var cities = ee.FeatureCollection(
  cityData.map(function (c) {
    var point = ee.Geometry.Point([c[1], c[2]]);
    var urban = point.buffer(URBAN_RADIUS);

    return ee.Feature(urban, {
      city: c[0],
      longitude: c[1],
      latitude: c[2],
      climate_group: c[3]
    });
  })
);

print('Number of selected cities (expected 42):', cities.size());
print('Selected cities:', cities);


// ------------------------------------------------------------
// 4. LANDSAT 8 AND 9 - COLLECTION 2 LEVEL 2
// ------------------------------------------------------------

var landsat8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2');
var landsat9 = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2');

var landsat = landsat8.merge(landsat9);


// Cloud masking and scale-factor conversion.
// QA_PIXEL bits 0-4 remove fill, dilated cloud, cirrus,
// cloud and cloud shadow. Bit 5 (snow) is deliberately NOT
// masked: snow-covered land observations must remain usable.

function prepareLandsat(image) {
  var qa = image.select('QA_PIXEL');

  var cloudMask = qa.bitwiseAnd(parseInt('11111', 2)).eq(0);
  var saturationMask = image.select('QA_RADSAT').eq(0);

  var optical = image.select(
    ['SR_B3', 'SR_B4', 'SR_B5', 'SR_B6'],
    ['Green', 'Red', 'NIR', 'SWIR1']
  ).multiply(0.0000275).add(-0.2);

  var thermal = image.select('ST_B10')
    .multiply(0.00341802)
    .add(149.0)
    .subtract(273.15)
    .rename('LST');

  return optical.addBands(thermal)
    .updateMask(cloudMask)
    .updateMask(saturationMask)
    .copyProperties(image, ['system:time_start']);
}


// ------------------------------------------------------------
// 5. PERMANENT WATER SCREENING
// ------------------------------------------------------------

// Static global water occurrence map (1984-2021).
// This masks frequently observed water pixels so coastal city
// rural rings are less likely to include ocean / large lakes.
// It is not a perfect dynamic shoreline mask.

var waterOccurrence = ee.Image(
  'JRC/GSW1_4/GlobalSurfaceWater'
).select('occurrence');

var landMask = waterOccurrence
  .unmask(0)
  .lt(WATER_OCCURRENCE_THRESHOLD);


// ------------------------------------------------------------
// 6. POPULATION DATA - GHSL P2023A
// ------------------------------------------------------------

// GHSL P2023A provides 100 m population-count grids at
// five-year epochs from 1975 to 2030, including projections
// for 2025 and 2030.

function getPopulation(year) {
  var epoch = 1975 + Math.round((year - 1975) / 5) * 5;

  var image = ee.Image(
    'JRC/GHSL/P2023A/GHS_POP/' + epoch
  );

  // A 100 m pixel represents approximately 0.01 km2.
  // Convert inhabitants per cell to inhabitants per km2.
  var density = image.select('population_count')
    .divide(0.01)
    .rename('Population_Density');

  return density.set('population_epoch', epoch);
}


// ------------------------------------------------------------
// 7. WEATHER DATA - ERA5-LAND MONTHLY AGGREGATED
// ------------------------------------------------------------

var era5 = ee.ImageCollection(
  'ECMWF/ERA5_LAND/MONTHLY_AGGR'
);


function getWeather(year, month) {
  var start = ee.Date.fromYMD(year, month, 1);

  var image = ee.Image(
    era5.filterDate(start, start.advance(1, 'month')).first()
  );

  // Monthly mean 2 m air temperature: Kelvin -> Celsius.
  var temp = image.select('temperature_2m')
    .subtract(273.15)
    .rename('Air_Temperature');

  var dew = image.select('dewpoint_temperature_2m')
    .subtract(273.15);

  // Approximate RH from monthly mean temperature and dew point.
  var rh = dew.expression(
    '100 * exp((17.625 * Td) / (243.04 + Td)) / ' +
    'exp((17.625 * T) / (243.04 + T))',
    {
      Td: dew,
      T: temp
    }
  ).clamp(0, 100).rename('Relative_Humidity_Approx');

  var u = image.select('u_component_of_wind_10m');
  var v = image.select('v_component_of_wind_10m');

  var wind = u.pow(2).add(v.pow(2))
    .sqrt()
    .rename('Wind_Speed');

  // Accumulated water-equivalent depth, metres -> millimetres.
  // Total precipitation includes liquid AND frozen precipitation.
  var totalPrecip = image.select('total_precipitation_sum')
    .multiply(1000)
    .rename('ERA5_Total_Precipitation_mm');

  // Snowfall is a component of total precipitation.
  var snowfall = image.select('snowfall_sum')
    .multiply(1000)
    .rename('ERA5_Snowfall_mm');

  // Approximate non-snow precipitation. This is a derived
  // estimate, not a separately observed ERA5 rainfall band.
  var rainfallApprox = totalPrecip.subtract(snowfall)
    .max(0)
    .rename('ERA5_Rainfall_Approx_mm');

  // Monthly mean snow-cover fraction (0 to 1).
  var snowCover = image.select('snow_cover')
    .rename('ERA5_Snow_Cover_Fraction');

  // Monthly mean snow depth, metres.
  var snowDepth = image.select('snow_depth')
    .rename('ERA5_Snow_Depth_m');

  // Monthly accumulated surface solar radiation: J/m2 -> MJ/m2.
  var solar = image.select('surface_solar_radiation_downwards_sum')
    .divide(1e6)
    .rename('Solar_Radiation_MJ_m2');

  return ee.Image.cat([
    temp,
    rh,
    wind,
    totalPrecip,
    snowfall,
    rainfallApprox,
    snowCover,
    snowDepth,
    solar
  ]);
}


// ------------------------------------------------------------
// 8. CHIRPS MONTHLY RAINFALL - OPTIONAL CROSS-CHECK
// ------------------------------------------------------------

// CHIRPS is a rainfall product, not a snowfall product.
// Its latitude coverage is approximately 50 degrees S to 50
// degrees N. Expect missing/null values for cities such as
// Helsinki and London. ERA5-Land is the consistent global
// precipitation source for this project.

var chirps = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY');


// ------------------------------------------------------------
// 9. HELPER: SAFE MEAN REDUCTION
// ------------------------------------------------------------

function getMean(image, bandName, geometry, scale) {
  return image.select(bandName).reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: geometry,
    scale: scale,
    maxPixels: 1e10,
    bestEffort: true,
    tileScale: 4
  }).get(bandName);
}


// ------------------------------------------------------------
// 10. GENERATE MONTHLY DATA FOR ONE CITY
// ------------------------------------------------------------

function generateMonthlyData(year, month, city) {
  var start = ee.Date.fromYMD(year, month, 1);
  var end = start.advance(1, 'month');

  var urbanGeometry = city.geometry();

  // city.geometry() is already a 10 km radius urban buffer.
  // Buffering it by another 10 km creates a 20 km outer radius.
  // Subtracting the urban geometry leaves the 10-20 km rural ring.
  var ruralGeometry = urbanGeometry
    .buffer(RURAL_OUTER_RADIUS - URBAN_RADIUS)
    .difference(urbanGeometry);

  // Landsat scenes intersecting the 20 km study area.
  var landsatMonthly = landsat
    .filterDate(start, end)
    .filterBounds(urbanGeometry.buffer(
      RURAL_OUTER_RADIUS - URBAN_RADIUS
    ))
    .filter(ee.Filter.eq('PROCESSING_LEVEL', 'L2SP'))
    .map(prepareLandsat);

  // Fully masked fallback keeps band names stable when no
  // usable Landsat scenes exist for a city-month.
  var emptyLandsat = ee.Image.constant([0, 0, 0, 0, 0])
    .rename(['Green', 'Red', 'NIR', 'SWIR1', 'LST'])
    .updateMask(ee.Image.constant(0));

  var landsatWithFallback = landsatMonthly.merge(
    ee.ImageCollection([emptyLandsat])
  );

  // Monthly median composite, with permanent-water pixels masked.
  var composite = landsatWithFallback
    .median()
    .updateMask(landMask);

  // Spectral indices.
  var ndvi = composite.normalizedDifference(
    ['NIR', 'Red']
  ).rename('NDVI');

  var ndwi = composite.normalizedDifference(
    ['Green', 'NIR']
  ).rename('NDWI');

  var ndbi = composite.normalizedDifference(
    ['SWIR1', 'NIR']
  ).rename('NDBI');

  var lst = composite.select('LST');

  // Urban and rural mean LST, using the same land-screened
  // monthly Landsat composite.
  var urbanLST = getMean(lst, 'LST', urbanGeometry, 1000);
  var ruralLST = getMean(lst, 'LST', ruralGeometry, 1000);

  var uhi = ee.Algorithms.If(
    ee.Algorithms.IsEqual(urbanLST, null),
    null,
    ee.Algorithms.If(
      ee.Algorithms.IsEqual(ruralLST, null),
      null,
      ee.Number(urbanLST).subtract(ee.Number(ruralLST))
    )
  );

  // Urban mean satellite features.
  var satelliteFeatures = ee.Image.cat([
    lst,
    ndvi,
    ndwi,
    ndbi
  ]);

  var urbanStats = satelliteFeatures.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: urbanGeometry,
    scale: 1000,
    maxPixels: 1e10,
    bestEffort: true,
    tileScale: 4
  });

  // Valid pixel counts help identify months with poor coverage.
  var urbanPixelCount = lst.reduceRegion({
    reducer: ee.Reducer.count(),
    geometry: urbanGeometry,
    scale: 1000,
    maxPixels: 1e10,
    bestEffort: true,
    tileScale: 4
  }).get('LST');

  var ruralPixelCount = lst.reduceRegion({
    reducer: ee.Reducer.count(),
    geometry: ruralGeometry,
    scale: 1000,
    maxPixels: 1e10,
    bestEffort: true,
    tileScale: 4
  }).get('LST');

  // Mean number of valid Landsat observations per pixel.
  var observationCount = landsatWithFallback
    .select('LST')
    .count()
    .updateMask(landMask)
    .reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: urbanGeometry,
      scale: 1000,
      maxPixels: 1e10,
      bestEffort: true,
      tileScale: 4
    }).get('LST');

  // Population density.
  var population = getPopulation(year);

  var populationMean = getMean(
    population,
    'Population_Density',
    urbanGeometry,
    100
  );

  // ERA5-Land weather and snow features.
  var weather = getWeather(year, month);

  var weatherStats = weather.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: urbanGeometry,
    scale: 11132,
    maxPixels: 1e10,
    bestEffort: true,
    tileScale: 4
  });

  // CHIRPS monthly rainfall total (mm). This will be null
  // where the CHIRPS product has no valid spatial coverage.
  var monthlyCHIRPS = chirps
    .filterDate(start, end)
    .sum()
    .rename('CHIRPS_Rainfall_mm');

  var chirpsRainfall = monthlyCHIRPS.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: urbanGeometry,
    scale: 5566,
    maxPixels: 1e10,
    bestEffort: true,
    tileScale: 4
  }).get('CHIRPS_Rainfall_mm');

  // Construct one city-month row.
  return ee.Feature(null, {
    city: city.get('city'),
    climate_group: city.get('climate_group'),

    longitude: city.get('longitude'),
    latitude: city.get('latitude'),

    year: year,
    month: month,

    split: year <= 2023 ? 'training' :
      year === 2024 ? 'validation' : 'testing',

    // Satellite-derived surface temperature and UHI.
    LST: urbanStats.get('LST'),
    Rural_LST: ruralLST,
    UHI: uhi,

    NDVI: urbanStats.get('NDVI'),
    NDWI: urbanStats.get('NDWI'),
    NDBI: urbanStats.get('NDBI'),

    // Coverage diagnostics.
    Urban_Valid_LST_Pixel_Count: urbanPixelCount,
    Rural_Valid_LST_Pixel_Count: ruralPixelCount,
    Mean_Landsat_Observations_Per_Pixel: observationCount,

    // Population.
    Population_Density: populationMean,
    Population_Epoch: 1975 +
      Math.round((year - 1975) / 5) * 5,

    // ERA5-Land climate variables.
    Air_Temperature: weatherStats.get('Air_Temperature'),
    Relative_Humidity_Approx:
      weatherStats.get('Relative_Humidity_Approx'),
    Wind_Speed: weatherStats.get('Wind_Speed'),

    ERA5_Total_Precipitation_mm:
      weatherStats.get('ERA5_Total_Precipitation_mm'),
    ERA5_Snowfall_mm:
      weatherStats.get('ERA5_Snowfall_mm'),
    ERA5_Rainfall_Approx_mm:
      weatherStats.get('ERA5_Rainfall_Approx_mm'),

    ERA5_Snow_Cover_Fraction:
      weatherStats.get('ERA5_Snow_Cover_Fraction'),
    ERA5_Snow_Depth_m:
      weatherStats.get('ERA5_Snow_Depth_m'),

    Solar_Radiation_MJ_m2:
      weatherStats.get('Solar_Radiation_MJ_m2'),

    // Optional rainfall cross-check; not available at all latitudes.
    CHIRPS_Rainfall_mm: chirpsRainfall
  });
}


// ------------------------------------------------------------
// 11. GENERATE MONTHLY DATA AND EXPORT SELECTED YEARS
// ------------------------------------------------------------

// Remove duplicate years while preserving the requested order.
var uniqueYears = YEARS_TO_EXPORT.filter(function (year, index, array) {
  return array.indexOf(year) === index;
});

// Validate the complete selection before creating export tasks.
uniqueYears.forEach(function (year) {
  if (year < START_YEAR || year > END_YEAR ||
    Math.floor(year) !== year) {
    throw new Error(
      'Invalid year in YEARS_TO_EXPORT: ' + year +
      '. Select whole years from ' + START_YEAR + ' to ' + END_YEAR + '.'
    );
  }
});

if (uniqueYears.length === 0) {
  throw new Error('YEARS_TO_EXPORT is empty. Add at least one year.');
}

print('------------------------------------------');
print('GLOBAL UHI DATA EXTRACTION');
print('Selected export years:', uniqueYears);
print('Number of cities:', cities.size());
print('Expected rows per year:', 42 * 12);
print('Number of yearly exports:', uniqueYears.length);
print('Total expected rows across selected years:',
  uniqueYears.length * 42 * 12);
print('------------------------------------------');

// Create one separate export task for every year in the array.
// This avoids combining all years into one large task and makes
// it easier to rerun only a failed/missing year later.
uniqueYears.forEach(function (exportYear) {
  var monthlyFeatures = [];

  for (var month = 1; month <= 12; month++) {
    var monthFeatures = cities.map(function (city) {
      return generateMonthlyData(exportYear, month, city);
    });

    monthlyFeatures.push(monthFeatures);
  }

  var finalCollection = ee.FeatureCollection(monthlyFeatures)
    .flatten();

  print('Export year:', exportYear);
  print('Expected rows for ' + exportYear + ':', 42 * 12);
  print('Actual rows for ' + exportYear + ':', finalCollection.size());
  print('Preview for ' + exportYear + ':', finalCollection.limit(3));

  Export.table.toDrive({
    collection: finalCollection,
    description: 'UHI_42_Cities_' + exportYear,
    folder: DRIVE_FOLDER,
    fileNamePrefix: 'UHI_42_Cities_' + exportYear,
    fileFormat: 'CSV'
  });
});


// ============================================================
// END OF SCRIPT
// ============================================================
