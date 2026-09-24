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
  ];

  const ROLES = ['Foreman', 'Owner', 'Manager', 'Office', 'Crew'];

  const REQUEST_SOURCES = ['GC', 'Inspector', 'Owner', 'Engineer', 'Internal'];

  const CONDITIONS = [
    { key: 'good',   label: 'Good',         short: 'OK' },
    { key: 'maint',  label: 'Needs maint.', short: 'Maint' },
    { key: 'failed', label: 'Failed',       short: 'Fail' },
    { key: 'na',     label: 'N/A',          short: 'N/A' },
  ];

  const WEATHER = ['Clear', 'Partly cloudy', 'Overcast', 'Light rain', 'Heavy rain', 'Windy', 'Snow', 'Freezing'];

  const UNITS = ['LF', 'EA', 'SY', 'SF', 'AC', 'TON', 'CY', 'GAL', 'HR', 'BAG', 'ROLL', 'LS'];

  window.Catalog = { DEFAULT_CATALOG, ROLES, REQUEST_SOURCES, CONDITIONS, WEATHER, UNITS };
})();
