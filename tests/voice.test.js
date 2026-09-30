/* Voice parser tests: node tests/voice.test.js */
const assert = require('assert');
const Voice = require('../js/voice.js');
global.window = {};
require('../js/catalog.js');
const catalog = window.Catalog.DEFAULT_CATALOG;
const ctx = { catalog, people: ['Marcus Reyes', 'Luis Ortega', 'Dante Hill'], me: 'Marcus Reyes' };
const q = (rows) => rows.map((r) => `${r.code}:${r.qty}`).sort();

let r = Voice.parse('Started at 7 this morning. Me, Luis and Dante all worked 9 hours. Installed 300 feet of silt fence along the north property line and put in 4 inlet protections on Oak Street. Repaired 60 feet of silt fence at the southeast corner. Used 120 stakes and 3 rolls of fabric. It was sunny, about 75 degrees. Knocked off at 3:30.', ctx);
assert.deepStrictEqual(r.crew.map((c) => `${c.name}:${c.hours}`), ['Marcus Reyes:9', 'Luis Ortega:9', 'Dante Hill:9']);
assert.deepStrictEqual(q(r.bmps), ['IP:4', 'SF:300']);
assert.strictEqual(r.bmps[0].where, 'along the north property line');
assert.deepStrictEqual(q(r.maint), ['SF:60']);
assert.strictEqual(r.maint[0].kind, 'Repair');
assert.deepStrictEqual(r.materials.map((m) => `${m.item}:${m.qty}:${m.unit}`).sort(), ['Silt fence fabric:3:ROLL', 'Wood stakes:120:EA']);
assert.strictEqual(r.weather, 'Clear');
assert.strictEqual(r.temp, '75');
assert.strictEqual(r.start, '07:00');
assert.strictEqual(r.end, '15:30');

r = Voice.parse('we got one point two inches of rain last night. cleaned out two inlets and fixed the construction entrance. luis worked eight and a half hours dante eight hours', ctx);
assert.strictEqual(r.rain, '1.2');
assert.deepStrictEqual(r.crew.map((c) => `${c.name}:${c.hours}`), ['Luis Ortega:8.5', 'Dante Hill:8']);
assert.deepStrictEqual(r.maint.map((m) => `${m.code}:${m.kind}:${m.qty}`), ['IP:Clean out:2', 'RCE:Repair:']);

r = Voice.parse('Bush hogged six and a half acres on phase one and the pond banks three acres. Everybody worked 10 hours. Installed 400 linear feet of straw wattles behind lots 20 through 26', ctx);
assert.deepStrictEqual(q(r.bmps), ['MOW:6.5', 'POND_MOW:3', 'WAT:400']);
assert.strictEqual(r.allHours, '10');

r = Voice.parse('ran twelve hundred fifty feet of super silt fence, set 2 check dams in the east ditch, laid 800 square yards of blanket, used 42 tons of rock and 10 bags of seed. cloudy.', ctx);
assert.deepStrictEqual(q(r.bmps), ['CD:2', 'ECB:800', 'SSF:1250']);
assert.deepStrictEqual(r.materials.map((m) => `${m.item}:${m.qty}:${m.unit}`).sort(), ['Rock:42:TON', 'Seed mix:10:BAG']);
assert.strictEqual(r.weather, 'Overcast');

r = Voice.parse('silt fence 350 feet on the west side, replaced 3 inlet protections, 1 construction entrance, removed 200 feet of silt fence at lot 4. I worked 8 hours.', ctx);
assert.deepStrictEqual(q(r.bmps), ['SF:350']);
assert.deepStrictEqual(r.maint.map((m) => `${m.code}:${m.kind}:${m.qty}`), ['IP:Replace:3', 'RCE:Replace:1', 'SF:Remove:200']);
assert.deepStrictEqual(r.crew, [{ name: 'Marcus Reyes', hours: '8' }]);

console.log('voice parser: all tests passed');
