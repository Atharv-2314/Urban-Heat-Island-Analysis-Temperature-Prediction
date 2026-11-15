
// ============================================================
// UHI PROJECT - GRID-LEVEL EXTRACTION
// ONE CITY | ALL YEARS (2016-2025) | MONTHLY
//
// One row = one sampled 1 km grid cell per month.
// Exports one CSV per year.
// Total cities available: 42 (24 Indian + 18 international)
// ============================================================


// ------------------------------------------------------------
// 1. CONFIGURATION
// ------------------------------------------------------------

var CITY_NAME = 'Mangaluru';  // Change city here

var START_YEAR = 2016;
var END_YEAR = 2025;

var URBAN_RADIUS = 10000;
var RURAL_RADIUS = 20000;
var SCALE = 1000;

var DRIVE_FOLDER = 'UHI_Pixel_Data';


// ------------------------------------------------------------
// 2. CITY CENTRES - 42 CITIES
// Format: [City, Longitude, Latitude, Climate_Group]
// ------------------------------------------------------------

var cityData = [

  // -------------------- INDIA (24) --------------------

  ['Ahmedabad', 72.5714, 23.0225, 'Arid_SemiArid'],
  ['Jaipur', 75.7873, 26.9125, 'Arid_SemiArid'],
  ['Jodhpur', 73.0243, 26.2389, 'Arid_SemiArid'],
  ['Gandhinagar', 72.6369, 23.2156, 'Arid_SemiArid'],

  ['Mumbai', 72.8777, 19.0760, 'Coastal'],
  ['Chennai', 80.2707, 13.0827, 'Coastal'],
  ['Kochi', 76.2673, 9.9312, 'Coastal'],
  ['Mangaluru', 74.8560, 12.9141, 'Coastal'],

  ['Bengaluru', 77.5946, 12.9716, 'Plateau'],
  ['Hyderabad', 78.4867, 17.3850, 'Plateau'],
  ['Pune', 73.8567, 18.5204, 'Plateau'],
  ['Mysuru', 76.6394, 12.2958, 'Plateau'],

  ['Delhi', 77.1025, 28.7041, 'IndoGangetic'],
  ['Lucknow', 80.9462, 26.8467, 'IndoGangetic'],
  ['Kanpur', 80.3319, 26.4499, 'IndoGangetic'],
  ['Patna', 85.1376, 25.5941, 'IndoGangetic'],

  ['Kolkata', 88.3639, 22.5726, 'Eastern'],
  ['Bhubaneswar', 85.8245, 20.2961, 'Eastern'],
  ['Guwahati', 91.7362, 26.1445, 'Eastern'],
  ['Siliguri', 88.3953, 26.7271, 'Eastern'],

  ['Nagpur', 79.0882, 21.1458, 'Central'],
  ['Indore', 75.8577, 22.7196, 'Central'],
  ['Bhopal', 77.4126, 23.2599, 'Central'],
  ['Udaipur', 73.7125, 24.5854, 'Central'],


  // -------------------- INTERNATIONAL (18) --------------------

  ['Cairo', 31.2357, 30.0444, 'Arid_SemiArid'],
  ['Riyadh', 46.6753, 24.7136, 'Arid_SemiArid'],

  ['Madrid', -3.7038, 40.4168, 'Mediterranean'],
  ['London', -0.1276, 51.5072, 'Temperate_Oceanic'],

  ['Beijing', 116.4074, 39.9042, 'Temperate_Continental'],
  ['Tokyo', 139.6917, 35.6895, 'Humid_Subtropical'],

  ['New York', -74.0060, 40.7128, 'Humid_Continental'],
  ['Los Angeles', -118.2437, 34.0522, 'Mediterranean'],

  ['Mexico City', -99.1332, 19.4326, 'Subtropical_Highland'],
  ['Sao Paulo', -46.6333, -23.5505, 'Humid_Subtropical'],

  ['Nairobi', 36.8219, -1.2921, 'Tropical_Highland'],
  ['Sydney', 151.2093, -33.8688, 'Temperate_Oceanic'],

  ['Seoul', 126.9780, 37.5665, 'Humid_Continental'],
  ['Dhaka', 90.4125, 23.8103, 'Tropical_Monsoon'],

  ['Sapporo', 141.3545, 43.0618, 'Humid_Continental'],
  ['Budapest', 19.0402, 47.4979, 'Temperate_Continental'],

  ['Helsinki', 24.9384, 60.1699, 'Cold_Continental'],
  ['Montreal', -73.5673, 45.5019, 'Cold_Continental']

];


// ------------------------------------------------------------
// 3. SELECT CITY
// ------------------------------------------------------------

var selected = cityData.filter(function (c) {
  return c[0] === CITY_NAME;
});

if (selected.length === 0) {
  throw new Error('City not found: ' + CITY_NAME);
}

var city = selected[0];

var point = ee.Geometry.Point([city[1], city[2]]);

var urbanGeometry = point.buffer(URBAN_RADIUS);

var ruralGeometry = point.buffer(RURAL_RADIUS)
  .difference(urbanGeometry);

Map.centerObject(urbanGeometry, 10);

Map.addLayer(
  urbanGeometry,
  { color: 'red' },
  'Urban area'
);

Map.addLayer(
  ruralGeometry,
  { color: 'blue' },
  'Reference ring'
);


// ------------------------------------------------------------
// 4. LANDSAT 8/9
// ------------------------------------------------------------

var landsat = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .merge(ee.ImageCollection('LANDSAT/LC09/C02/T1_L2'));

function prepareLandsat(image) {

  var qa = image.select('QA_PIXEL');

  var qaMask = qa.bitwiseAnd(parseInt('111111', 2)).eq(0);

  var saturationMask = image.select('QA_RADSAT').eq(0);

  var optical = image.select(
    ['SR_B3', 'SR_B4', 'SR_B5', 'SR_B6'],
    ['Green', 'Red', 'NIR', 'SWIR1']
  ).multiply(0.0000275).add(-0.2);

  var thermal = image.select('ST_B10')
    .multiply(0.00341802)
    .add(149)
    .subtract(273.15)
    .rename('LST');

  return optical.addBands(thermal)
    .updateMask(qaMask)
    .updateMask(saturationMask);
}


// ------------------------------------------------------------
// 5. POPULATION
// ------------------------------------------------------------

function getPopulation(year) {

  var epoch = 1975 + Math.round((year - 1975) / 5) * 5;

  var image = ee.Image(
    'JRC/GHSL/P2023A/GHS_POP/' + epoch
  );

  return image.select('population_count')
    .divide(0.01)
    .rename('Population_Density');
}


// ------------------------------------------------------------
// 6. WEATHER
// ------------------------------------------------------------

var era5 = ee.ImageCollection('ECMWF/ERA5_LAND/MONTHLY_AGGR');

function getWeather(start, end) {

  var image = ee.Image(era5.filterDate(start, end).first());

  var temp = image.select('temperature_2m')
    .subtract(273.15)
    .rename('Air_Temperature');

  var dew = image.select('dewpoint_temperature_2m')
    .subtract(273.15);

  var rh = dew.expression(
    '100 * exp((17.625 * Td) / (243.04 + Td)) / ' +
    'exp((17.625 * T) / (243.04 + T))',
    {
      Td: dew,
      T: temp
    }
  ).clamp(0, 100).rename('Relative_Humidity');

  var u = image.select('u_component_of_wind_10m');

  var v = image.select('v_component_of_wind_10m');

  var wind = u.pow(2).add(v.pow(2))
    .sqrt().rename('Wind_Speed');

  var rainfall = image.select('total_precipitation_sum')
    .multiply(1000).rename('ERA5_Rainfall');

  var solar = image.select(
    'surface_solar_radiation_downwards_sum'
  ).divide(1e6).rename('Solar_Radiation');

  return ee.Image.cat([
    temp,
    rh,
    wind,
    rainfall,
    solar
  ]);
}


// ------------------------------------------------------------
// 7. PROCESS ONE MONTH
// ------------------------------------------------------------

function processMonth(year, month) {

  var start = ee.Date.fromYMD(year, month, 1);

  var end = start.advance(1, 'month');

  var monthlyLandsat = landsat
    .filterDate(start, end)
    .filterBounds(point.buffer(RURAL_RADIUS))
    .filter(ee.Filter.eq('PROCESSING_LEVEL', 'L2SP'))
    .map(prepareLandsat);

  var emptyLandsat = ee.Image.constant([0, 0, 0, 0, 0])
    .rename(['Green', 'Red', 'NIR', 'SWIR1', 'LST'])
    .updateMask(ee.Image.constant(0));

  var monthlyLandsatWithFallback = monthlyLandsat.merge(
    ee.ImageCollection([emptyLandsat])
  );

  var composite = monthlyLandsatWithFallback.median();

  var lst = composite.select('LST');

  var ndvi = composite.normalizedDifference(
    ['NIR', 'Red']
  ).rename('NDVI');

  var ndwi = composite.normalizedDifference(
    ['Green', 'NIR']
  ).rename('NDWI');

  var ndbi = composite.normalizedDifference(
    ['SWIR1', 'NIR']
  ).rename('NDBI');


  // Rural reference LST for this month

  var ruralLST = lst.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: ruralGeometry,
    scale: SCALE,
    maxPixels: 1e9,
    tileScale: 4
  }).get('LST');


  // Local UHI = grid-cell LST - rural reference LST

  var ruralLSTMissing = ee.Algorithms.IsEqual(
    ruralLST,
    null
  );

  var ruralLSTValue = ee.Number(ee.Algorithms.If(
    ruralLSTMissing,
    0,
    ruralLST
  ));

  var uhi = lst.subtract(ruralLSTValue)
    .updateMask(ee.Image.constant(ee.Number(
      ee.Algorithms.If(
        ruralLSTMissing,
        0,
        1
      )
    )))
    .rename('UHI');


  // Population and weather

  var population = getPopulation(year);

  var weather = getWeather(start, end);


  // Landsat observation count

  var observationCount = monthlyLandsatWithFallback
    .select('LST')
    .count()
    .rename('Landsat_Observation_Count');


  // Combine all variables

  var image = ee.Image.cat([
    lst,
    uhi,
    ndvi,
    ndwi,
    ndbi,
    population,
    weather,
    observationCount
  ]);


  // Sample 1 km grid cells

  var samples = image.sample({
    region: urbanGeometry,
    scale: SCALE,
    geometries: true,
    tileScale: 4,
    dropNulls: true
  });


  // Add metadata

  return samples.map(function (feature) {

    return feature.set({

      City: CITY_NAME,

      Climate_Group: city[3],

      Year: year,

      Month: month,

      Population_Epoch:
        1975 + Math.round((year - 1975) / 5) * 5,

      Split: year <= 2023 ? 'training' :
        year === 2024 ? 'validation' : 'testing'

    });

  });

}


// ------------------------------------------------------------
// 8. CREATE ONE EXPORT FOR EACH YEAR
// ------------------------------------------------------------

for (var year = START_YEAR; year <= END_YEAR; year++) {

  var monthlyCollections = [];

  for (var month = 1; month <= 12; month++) {

    monthlyCollections.push(
      processMonth(year, month)
    );

  }

  var yearlyCollection = ee.FeatureCollection(
    monthlyCollections
  ).flatten();


  Export.table.toDrive({

    collection: yearlyCollection,

    description: 'UHI_Grid_' + CITY_NAME + '_' + year,

    folder: DRIVE_FOLDER,

    fileNamePrefix: 'UHI_Grid_' + CITY_NAME + '_' + year,

    fileFormat: 'CSV'

  });

}


// ------------------------------------------------------------
// 9. STATUS
// ------------------------------------------------------------

print('Export tasks created for:', CITY_NAME);

print('Years:', START_YEAR, 'to', END_YEAR);

print('Total cities available:', cityData.length);

print('Selected climate group:', city[3]);
