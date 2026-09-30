/* Default BMP catalog, roles, and inspection options. The catalog is editable in Settings. */
(function () {
  'use strict';

  const DEFAULT_CATALOG = [
    { code: 'SF',   name: 'Silt Fence',                     unit: 'LF',   rate: 0, cat: 'Perimeter' },
    { code: 'SSF',  name: 'Super Silt Fence (wire-backed)', unit: 'LF',   rate: 0, cat: 'Perimeter' },
    { code: 'WAT',  name: 'Straw Wattles',                  unit: 'LF',   rate: 0, cat: 'Perimeter' },
    { code: 'CFS',  name: 'Compost Filter Sock',            unit: 'LF',   rate: 0, cat: 'Perimeter' },
    { code: 'IP',   name: 'Inlet Protection',               unit: 'EA',   rate: 0, cat: 'Inlets' },
    { code: 'CIP',  name: 'Curb Inlet Protection',          unit: 'EA',   rate: 0, cat: 'Inlets' },
    { code: 'RCE',  name: 'Rock Construction Entrance',     unit: 'EA',   rate: 0, cat: 'Tracking' },
    { code: 'CD',   name: 'Rock Check Dam',                 unit: 'EA',   rate: 0, cat: 'Channels' },
    { code: 'ECB',  name: 'Erosion Control Blanket',        unit: 'SY',   rate: 0, cat: 'Stabilization' },
    { code: 'HYD',  name: 'Hydroseed / Hydromulch',         unit: 'SF',   rate: 0, cat: 'Stabilization' },
    { code: 'SEED', name: 'Seed & Straw Mulch',             unit: 'AC',   rate: 0, cat: 'Stabilization' },
    { code: 'RR',   name: 'Riprap',                         unit: 'TON',  rate: 0, cat: 'Channels' },
    { code: 'CWO',  name: 'Concrete Washout',               unit: 'EA',   rate: 0, cat: 'Site' },
    { code: 'ST',   name: 'Sediment Trap / Basin',          unit: 'EA',   rate: 0, cat: 'Site' },
    { code: 'TB',   name: 'Turbidity Curtain',              unit: 'LF',   rate: 0, cat: 'Water' },
    { code: 'TPF',  name: 'Tree Protection / Safety Fence', unit: 'LF',   rate: 0, cat: 'Site' },
    { code: 'DC',   name: 'Dust Control (water)',           unit: 'GAL',  rate: 0, cat: 'Site' },
    { code: 'SWEEP',name: 'Street Sweeping',                unit: 'HR',   rate: 0, cat: 'Tracking' },
    { code: 'SKIM', name: 'Basin Skimmer',                  unit: 'EA',   rate: 0, cat: 'Stormwater' },
    { code: 'DWB',  name: 'Dewatering Bag',                 unit: 'EA',   rate: 0, cat: 'Stormwater' },
    { code: 'POND', name: 'Pond / Basin Cleanout',          unit: 'CY',   rate: 0, cat: 'Stormwater' },
    { code: 'OUT',  name: 'Outlet Protection (riprap apron)', unit: 'EA', rate: 0, cat: 'Stormwater' },
    { code: 'INLC', name: 'Storm Inlet Cleaning',           unit: 'EA',   rate: 0, cat: 'Stormwater' },
    { code: 'LVL',  name: 'Level Spreader',                 unit: 'LF',   rate: 0, cat: 'Stormwater' },
    { code: 'MOW',  name: 'Mowing / Bush Hogging',          unit: 'AC',   rate: 0, cat: 'Mowing & Vegetation' },
    { code: 'TRIM', name: 'String Trimming',                unit: 'HR',   rate: 0, cat: 'Mowing & Vegetation' },
    { code: 'POND_MOW', name: 'Pond Bank Mowing',           unit: 'AC',   rate: 0, cat: 'Mowing & Vegetation' },
  ];

  /* Bump when DEFAULT_CATALOG gains items so saved catalogs pick them up once. */
  const CATALOG_VERSION = 2;

  const ROLES = ['Foreman', 'Owner', 'Manager', 'Office', 'Crew'];

  const REQUEST_SOURCES = ['GC', 'Inspector', 'Owner', 'Engineer', 'Internal'];

  const CONDITIONS = [
    { key: 'good',   label: 'Good',         short: 'OK' },
    { key: 'maint',  label: 'Needs maint.', short: 'Maint' },
    { key: 'failed', label: 'Failed',       short: 'Fail' },
    { key: 'na',     label: 'N/A',          short: 'N/A' },
  ];

  const STORMWATER_CATS = ['Stormwater', 'Inlets', 'Channels'];

  const TAGLINES = [
    'Keep the dirt on site.',
    'Silt happens. We stop it.',
    'Mud stays here.',
    'Fences up, stakes down.',
    'Every inch of rain counts.',
    'Green grass, clean water.',
    'Hold the line.',
  ];

  const WEATHER = ['Clear', 'Partly cloudy', 'Overcast', 'Light rain', 'Heavy rain', 'Windy', 'Snow', 'Freezing'];

  const UNITS = ['LF', 'EA', 'SY', 'SF', 'AC', 'TON', 'CY', 'GAL', 'HR', 'BAG', 'ROLL', 'LS'];

  window.Catalog = { DEFAULT_CATALOG, CATALOG_VERSION, STORMWATER_CATS, TAGLINES, ROLES, REQUEST_SOURCES, CONDITIONS, WEATHER, UNITS };
})();
