const assert = require('assert');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const { load, instance } = require('./helpers');

const logUtils = load('src/utils/log.js').default;
const general = load('src/utils/general.js').default;
const vehicles = load('src/utils/vehicles.js').default;
const originalCars = load('src/utils/cars.js').default;
const samples = [
  { timestamp: 100, soc_display: 0, soc_bms: 5, odo: 0, cumulative_energy_charged: 0, dc_battery_power: 0 },
  { timestamp: 200, soc_display: 80, odo: 10, cumulative_energy_charged: 12, dc_battery_power: 30 }
];

for (const stats of [samples, samples.slice().reverse()]) {
  const log = { stats };
  assert.strictEqual(logUtils.soc(log, 'start'), 0);
  assert.strictEqual(logUtils.soc(log, 'end'), 80);
  assert.strictEqual(logUtils.value(log, 'odo', 'start'), 0);
  assert.strictEqual(logUtils.value(log, 'odo', 'end'), 10);
  assert.strictEqual(logUtils.value(log, 'missing', 'end'), null);
}
assert.strictEqual(logUtils.effectiveEnd({ start: 100, end: null, updated_at: 170, stats: samples }), 200);
assert.strictEqual(logUtils.duration({ start: 1700000000, end: 1700093661 }), '26:01:01');
assert.strictEqual(logUtils.duration({ start: 200, end: 100 }), '–');
assert.strictEqual(logUtils.timestamp(null), null);
assert.strictEqual(logUtils.timestamp('bad'), null);
assert.strictEqual(logUtils.timestamp('2026-11-15T00:00:00Z'), 1794700800);
assert(logUtils.dates({ start: 1794700800, end: null, status: 'running' }, moment).endsWith('Ongoing'));
assert(logUtils.dates({ start: 1794700800, end: null, status: 'finished' }, moment).endsWith('End unavailable'));
assert.strictEqual(logUtils.dates({}, moment), 'Date unavailable');

assert.strictEqual(vehicles.length, 18);
assert.strictEqual(new Set(vehicles.map(car => car.value)).size, 18);
for (const car of vehicles) {
  assert.strictEqual(general.capacity(car.value, 75), 75);
  assert.strictEqual(general.range(car.value, 15, 75), 500);
  assert.strictEqual(general.chargeDecimalTime(car.value, 0, 50, 25, 75), 3);
}
for (const [car, data] of Object.entries(originalCars)) assert.strictEqual(general.capacity(car), data.CAPACITY);
assert.strictEqual(general.capacity('new-model'), null);
assert.strictEqual(general.range('IONIQ_5', 15), null);
assert.strictEqual(general.range('IONIQ_5', 0, 75), null);
assert.strictEqual(general.chargeDecimalTime('IONIQ_5', 20, 20, 0, 75), null);
assert.strictEqual(general.chargeTime('IONIQ_5', 20, 20, 0, 'timeleft', 75), '–');
assert.strictEqual(general.chargeTime('IONIQ_5', 0, 50, 25, 'timeleft', 75), '3:00');
assert.strictEqual(general.chargeTime('IONIQ_BEV', 50, 50, 0, 'timeleft'), '0:17');

const emptyStorage = { getValue: (_, fallback) => fallback, setValue: (_, value) => value };
const overrides = { '../utils/storage': emptyStorage, '../components/BottomNavigation': {}, 'vue-chartjs': { Line: {} } };
const Log = load('src/components/Log.vue', overrides, { window: { confirm: () => true } }).default;
const detail = instance(Log, { $root: { MomentJS: moment }, $refs: {}, $nextTick: cb => cb() });
detail.log = { start: 100, end: 200, stats: samples, start_soc: 0, start_odo: 0, start_cec: 0 };
assert.strictEqual(detail.startSOC, '0%');
assert.strictEqual(detail.endSOC, '80%');
assert.strictEqual(detail.startODO, 0);
assert.strictEqual(detail.startCEC, 0);
assert.strictEqual(detail.chargedEnergy, 12);
assert.deepStrictEqual(detail.kWChartValues, [0, 30]);
detail.log = { start: 100, end: 100, stats: [samples[0]] };
assert.deepStrictEqual(detail.kWChartValues, [0]);
detail.log = { start: 100, end: null, status: 'running', updated_at: 200, stats: [] };
assert.strictEqual(detail.endTime, 'Ongoing');
assert.strictEqual(detail.totalTime, '00:01:40');
assert.deepStrictEqual(detail.kWChartValues, []);
assert.strictEqual(detail.avgKW, null);
assert.strictEqual(detail.avgSpeed, null);
assert.strictEqual(detail.distance, null);
assert.strictEqual(detail.chargedEnergy, null);
assert.strictEqual(detail.consumption, null);

// Summary totals take precedence, including zero; legacy counters remain a fallback.
for (const total of [0, 5]) {
  detail.log = { recharged_kwh: total, discharged_kwh: total, start_cec: 10, end_cec: 22, start_ced: 20, end_ced: 40, distance: 100 };
  assert.strictEqual(detail.chargedEnergy, total);
  assert.strictEqual(detail.dischargedEnergy, total);
  assert.strictEqual(detail.consumption, 0);
}
for (const total of [undefined, null, NaN, Infinity, '5']) {
  detail.log = { recharged_kwh: total, discharged_kwh: total, start_cec: 10, end_cec: 22, start_ced: 20, end_ced: 40, distance: 100 };
  assert.strictEqual(detail.chargedEnergy, 12);
  assert.strictEqual(detail.dischargedEnergy, 20);
  assert.strictEqual(detail.consumption, 8);
  delete detail.log.end_cec;
  delete detail.log.end_ced;
  assert.strictEqual(detail.chargedEnergy, null);
  assert.strictEqual(detail.dischargedEnergy, null);
  assert.strictEqual(detail.consumption, null);
}
detail.log = { recharged_kwh: 5, discharged_kwh: 20, distance: 0 };
assert.strictEqual(detail.consumption, null);

detail.log = { status: 'running', current_soc: 67, stats: [], historyError: 'Offline' };
assert.strictEqual(detail.endSOC, '67%', 'running summary must use current SOC when history is unavailable');
detail.log.current_soc = 0;
assert.strictEqual(detail.endSOC, '0%');
detail.log.current_soc = null;
detail.log.stats = samples;
assert.strictEqual(detail.endSOC, '80%', 'missing current SOC must fall back to history');
detail.log = { status: 'finished', current_soc: 67, end_soc: 0, stats: samples };
assert.strictEqual(detail.endSOC, '0%', 'finished logs must use end SOC instead of current SOC');
delete detail.log.end_soc;
assert.strictEqual(detail.endSOC, '80%', 'finished logs without end SOC must fall back to history');

let saveCallback, deleteCallback, saveCalls = 0, deleteCalls = 0;
const routes = [];
detail.$router = { push: route => routes.push(route) };
detail.$root.EVNotify = {
  updateLog(log, cb) { saveCalls++; saveCallback = cb; },
  deleteLog(id, cb) { deleteCalls++; deleteCallback = cb; }
};
detail.log = { title: 'Edited', stats: [] };
detail.originalTitle = 'Original';
detail.detectChange();
detail.save(); detail.save();
assert.strictEqual(saveCalls, 1);
saveCallback('Denied');
assert(detail.actionError.includes('Denied'));
assert.strictEqual(detail.log.title, 'Edited');
assert.strictEqual(detail.saveBtnHighlight, true);
detail.save(); saveCallback(null);
assert.strictEqual(detail.saveBtnHighlight, false);
detail.removeLog(); detail.removeLog();
assert.strictEqual(deleteCalls, 1);
deleteCallback('Denied');
assert(detail.actionError.includes('Denied'));
assert.deepStrictEqual(routes, []);
detail.removeLog(); deleteCallback(null);
assert.deepStrictEqual(routes, ['/logs']);
detail.$root.EVNotify.getLog = (_, cb) => cb('Offline');
detail.loadLog();
assert.strictEqual(detail.loading, false);
assert(detail.loadError.includes('Offline'));
detail.$root.EVNotify.getLog = (_, cb) => cb(null, { id: '1', title: 'Loaded', stats: [] });
detail.loadLog();
assert.strictEqual(detail.loadError, '');
assert.strictEqual(detail.originalTitle, 'Loaded');

// A history-only retry must preserve summary edits and update the chart/map.
let historyCallback, historyCalls = 0, mapRenders = 0;
const charts = [];
const historyDetail = instance(Log, {
  $root: { MomentJS: moment, EVNotify: {
    getLog: (_, cb) => cb(null, { id: 'history-log', title: 'Original', start: 100, end: 200, stats: [], historyError: 'Offline' }),
    getLogHistory(id, cb) { assert.strictEqual(id, 'history-log'); historyCalls++; historyCallback = cb; }
  } },
  $refs: { chart: { renderChart: data => charts.push(data) } },
  $nextTick: cb => cb()
});
historyDetail.id = 'history-log';
historyDetail.renderMap = () => { mapRenders++; };
historyDetail.loadLog();
historyDetail.log.title = 'Unsaved title';
historyDetail.detectChange();
historyDetail.loading = true; historyDetail.retryHistory();
historyDetail.loading = false; historyDetail.busy = true; historyDetail.retryHistory();
historyDetail.busy = false;
assert.strictEqual(historyCalls, 0, 'retry is disabled during loading or log actions');
historyDetail.retryHistory(); historyDetail.retryHistory(); historyDetail.loadLog();
assert.strictEqual(historyCalls, 1, 'only one history request may be pending');
assert.strictEqual(historyDetail.historyLoading, true);
historyCallback('Offline', null);
assert.strictEqual(historyDetail.historyLoading, false);
assert(historyDetail.log.historyError.includes('Offline'));
assert.strictEqual(historyDetail.log.title, 'Unsaved title');
assert.strictEqual(historyDetail.originalTitle, 'Original');
assert.strictEqual(historyDetail.saveBtnHighlight, true);
assert.strictEqual(mapRenders, 1, 'failed retry must leave existing visualizations alone');
historyDetail.retryHistory();
const historySamples = samples.map((stat, index) => Object.assign({}, stat, { latitude: 51 + index, longitude: 7 + index }));
historyCallback(null, historySamples);
assert.strictEqual(historyDetail.historyLoading, false);
assert.strictEqual(historyDetail.log.historyError, null);
assert.strictEqual(historyDetail.log.title, 'Unsaved title');
assert.strictEqual(historyDetail.originalTitle, 'Original');
assert.strictEqual(historyDetail.saveBtnHighlight, true);
assert.strictEqual(historyDetail.log.start, 100);
assert.strictEqual(historyDetail.log.end, 200);
assert.strictEqual(charts.length, 2);
assert.deepStrictEqual(charts[1].datasets[0].data, [0, 80]);
assert.strictEqual(mapRenders, 2);
assert.deepStrictEqual(historyDetail.mapData, [{ lat: 51, lng: 7 }, { lat: 52, lng: 8 }]);
historyDetail.retryHistory();
assert.strictEqual(historyCalls, 2, 'successful history has no further retry');
historyDetail.log.historyError = 'Premium required';
historyDetail.retryHistory(); historyCallback('Premium required', null);
assert(historyDetail.log.historyError.includes('Premium required'));
historyDetail.retryHistory();
const beforeDestroyLog = historyDetail.log;
Log.beforeDestroy.call(historyDetail);
historyCallback(null, []);
assert.strictEqual(historyDetail.log, beforeDestroyLog, 'late history callbacks must not update the destroyed view');
assert.strictEqual(charts.length, 2);
historyDetail.retryHistory();
assert.strictEqual(historyCalls, 4, 'destroyed views cannot start retries');

const Logs = load('src/components/Logs.vue').default;
const list = instance(Logs, { $root: { MomentJS: moment } });
for (const failingType of [0, 1]) {
  list.$root.EVNotify = { version: 'V2', getLogs: (type, cb) => cb(type === failingType ? 'Offline' : null, []) };
  list.loadLogs();
  assert.strictEqual(list.loading, false);
  assert(list.loadError.includes('Offline'));
}
const running = { id: 'running', status: 'running', start: 1794700800, end: null };
const finished = { id: 'finished', start: 1794690000, end: 1794690200 };
const v2LogFilters = [];
list.$root.EVNotify = { version: 'V2', getLogs: (type, cb) => {
  v2LogFilters.push(type);
  cb(null, type ? [finished] : [running]);
} };
list.loadLogs();
assert.deepStrictEqual(v2LogFilters, [0, 1]);
assert.strictEqual(list.loaded, true);
assert.strictEqual(list.loadError, '');
assert.strictEqual(Object.values(list.logs)[0][0].id, 'running');
assert(!Object.keys(list.logs).some(key => key.endsWith('_1970')));
assert(list.convertSubHeader('10_2026').includes('November'));
assert(list.convertDates(running.start, null, 'running').endsWith('Ongoing'));
assert(list.setSubtitle({ start_soc: 0, end_soc: 20 }).startsWith('0%'));

// V3 must include unknown logs, using one unfiltered request rather than two filtered lists.
const v3List = instance(Logs, { $root: { MomentJS: moment } });
const logTime = (month, day) => Date.UTC(2026, month, day, 12) / 1000;
const unknownLog = { id: 'unknown-log', type: 'unknown', status: 'finished', start: logTime(10, 16), end: logTime(10, 16) + 60 };
const v3LogRecords = [
  { id: 'drive', type: 'drive', status: 'finished', start: logTime(10, 15), end: logTime(10, 15) + 60 },
  unknownLog,
  { id: 'charge', type: 'charge', charge: true, status: 'finished', start: logTime(10, 17), end: logTime(10, 17) + 60 },
  { id: 'running-unknown', type: 'unknown', status: 'running', start: logTime(10, 14), end: null },
  { id: 'october', type: 'drive', status: 'finished', start: logTime(9, 15), end: logTime(9, 15) + 60 }
];
const loadV3Logs = (err, records) => {
  const filters = [];
  v3List.$root.EVNotify = { version: 'V3', getLogs: (filter, cb) => {
    filters.push(filter);
    assert.strictEqual(v3List.loading, true);
    cb(err, records);
  } };
  v3List.loadLogs();
  assert.deepStrictEqual(filters, [null]);
  assert.strictEqual(v3List.loading, false);
};
const listedV3Logs = () => Object.keys(v3List.logs).reduce((records, key) => records.concat(v3List.logs[key]), []);
loadV3Logs(null, [unknownLog]);
assert.strictEqual(v3List.loaded, true);
assert.deepStrictEqual(listedV3Logs(), [unknownLog], 'an unknown-only account must not appear empty');
loadV3Logs(null, v3LogRecords);
assert.deepStrictEqual(v3List.logs['10_2026'].map(log => log.id), ['running-unknown', 'charge', 'unknown-log', 'drive']);
assert.deepStrictEqual(v3List.logs['9_2026'].map(log => log.id), ['october']);
assert.strictEqual(listedV3Logs().length, v3LogRecords.length);
assert.strictEqual(new Set(listedV3Logs().map(log => log.id)).size, v3LogRecords.length);
for (const response of [null, {}, 'invalid']) {
  loadV3Logs(null, response);
  assert.strictEqual(v3List.loaded, false);
  assert(v3List.loadError.includes('Invalid response'));
}
loadV3Logs('Offline', null);
assert.strictEqual(v3List.loaded, false);
assert(v3List.loadError.includes('Offline'));
loadV3Logs(null, [unknownLog]);
assert.strictEqual(v3List.loaded, true);
assert.strictEqual(v3List.loadError, '');
assert.deepStrictEqual(listedV3Logs(), [unknownLog]);
loadV3Logs(null, []);
assert.strictEqual(v3List.loaded, true);
assert.strictEqual(v3List.loadError, '');
assert.deepStrictEqual(v3List.logs, {});

const memory = { settings: { soc: 10, email: 'stale@example.com' }, user: { akey: 'ABC123', token: 'token' } };
const storage = { getValue: (key, fallback) => memory[key] === undefined ? fallback : memory[key], setValue: (key, value) => (memory[key] = value) };
const events = [];
const bus = { $emit: name => events.push(name), $on() {}, $off() {} };
const Settings = load('src/components/Settings.vue', { '../utils/storage': storage, '../utils/event': { EventBus: bus } }).default;
const settings = instance(Settings, { $root: { EVNotify: { version: 'V3' } } });
const element = id => settings.settings.reduce((elements, group) => elements.concat(group.elements), []).find(item => item.id === id);
settings.$root.EVNotify.getSettings = cb => cb(null, { soc: 35, email: 'fresh@example.com', capacity: 75, car: 'IONIQ_5', consumption: 15 });
settings.loadSettings();
assert.strictEqual(element('soc').value, 35);
assert.strictEqual(element('email').value, 'fresh@example.com');
element('email').value = '';
let patch;
settings.$root.EVNotify.setSettings = (value, cb) => { patch = value; cb('Denied'); };
settings.saveSettings();
assert(settings.settingsError.includes('Denied'));
assert.strictEqual(element('email').value, '');
assert.strictEqual(memory.settings.email, 'fresh@example.com');
assert.strictEqual(events.includes('unsave'), false);
let canonical = { soc: 35, email: null, capacity: 75, car: 'IONIQ_5', consumption: 15 };
settings.$root.EVNotify.setSettings = (value, cb) => {
  patch = value;
  settings.$root.EVNotify.getSettings = callback => callback(null, canonical);
  cb(null);
};
settings.saveSettings();
assert.strictEqual(patch.email, '');
assert.strictEqual(memory.settings.email, null);
assert.strictEqual(element('email').value, '');
assert(events.includes('unsave'));
assert.strictEqual(settings.saving, false);
element('capacity').value = '-1';
settings.saveSettings();
assert(settings.settingsError.includes('positive battery capacity'));
element('capacity').value = '';
assert.strictEqual(settings.retrieveSettings().capacity, null);
settings.$root.EVNotify.version = 'V2';
assert.strictEqual(settings.retrieveSettings().capacity, undefined);
assert.strictEqual(element('car').values.some(car => car.value === 'IONIQ_5'), false);

// Login switches the live client and persistence together; failed login restores the prior session.
const Login = load('src/components/Login.vue', { '../utils/storage': storage }).default;
const client = {
  version: 'V2', akey: 'old', token: 'old-token',
  setVersion(version) { this.version = version; },
  login(akey, password, cb) { this.akey = akey; this.token = 'new-token'; cb(null, this.token); },
  getSettings(cb) { cb(null, canonical); }
};
const login = instance(Login, { $root: { EVNotify: client }, $router: { push: route => routes.push(route) } });
login.akey = 'ABC123'; login.password = 'password'; login.version = 'V3'; login.login();
assert.strictEqual(client.version, 'V3');
assert.strictEqual(memory.user.apiVersion, 'V3');
assert.strictEqual(memory.settings, canonical);
client.login = function(akey, password, cb) { this.akey = null; this.token = null; cb('Invalid credentials'); };
login.version = 'V2'; login.login();
assert.strictEqual(client.version, 'V3');
assert.strictEqual(client.akey, 'ABC123');
assert.strictEqual(client.token, 'new-token');
assert.strictEqual(memory.user.apiVersion, 'V3');
assert(login.unknownError.includes('Invalid credentials'));
client.login = function(akey, password, cb) { this.akey = akey; this.token = 'temporary'; cb(null, this.token); };
client.getSettings = cb => cb('Settings offline');
login.login();
assert.strictEqual(client.version, 'V3');
assert.strictEqual(client.token, 'new-token');
assert.strictEqual(memory.user.token, 'new-token', 'settings failure must not persist a partial login');
assert(login.unknownError.includes('Settings offline'));
assert.strictEqual(login.loggingIn, false);
let pendingLogin, loginCalls = 0;
client.login = (akey, password, cb) => { loginCalls++; pendingLogin = cb; };
login.login(); login.login();
assert.strictEqual(loginCalls, 1, 'prevent overlapping backend switches');
pendingLogin('Offline');
assert.strictEqual(login.loggingIn, false);

const Dashboard = load('src/components/Dashboard.vue', overrides).default;
const dashboard = instance(Dashboard, { $root: { EVNotify: { version: 'V3' }, MomentJS: moment } });
dashboard.settings = { car: 'IONIQ_5', capacity: 75, consumption: 15 };
dashboard.syncData.soc_display = 0;
dashboard.syncData.soc_bms = 10;
assert.strictEqual(dashboard.totalRange, 500);
assert.strictEqual(dashboard.currentRange, 0);
dashboard.syncData.soc_display = null;
assert.strictEqual(dashboard.displaySOC, 10);
assert.strictEqual(dashboard.currentRange, 50);
dashboard.settings.consumptionUnit = 'Wh';
assert.strictEqual(dashboard.totalRange, null, 'unsupported units must not produce kWh-based estimates');
assert.strictEqual(dashboard.currentRange, null);
assert.strictEqual(dashboard.rangePerMinute, '–');
dashboard.settings.consumptionUnit = 'kWh';
assert.strictEqual(dashboard.totalRange, 500);
dashboard.settings.consumptionUnit = 'unknown';
assert.strictEqual(dashboard.totalRange, null);
dashboard.$root.EVNotify.version = 'V2';
dashboard.settings.car = 'IONIQ_BEV';
assert.strictEqual(dashboard.totalRange, 186, 'V3 units must not change V2 estimates');
dashboard.$root.EVNotify.version = 'V3';
dashboard.settings.car = 'IONIQ_5';
delete dashboard.settings.consumptionUnit;
dashboard.settings.capacity = null;
assert.strictEqual(dashboard.totalRange, null);
assert.strictEqual(dashboard.rangePerMinute, '–');

// Exercise real login/rollback and dashboard callbacks with requests still in flight.
const inFlight = [];
class ControlledXHR {
  constructor() { inFlight.push(this); }
  open() {}
  setRequestHeader() {}
  send() {}
  respond(status, data) {
    this.status = status; this.readyState = 4; this.responseText = JSON.stringify(data);
    this.onreadystatechange();
  }
}
const Client = load('src/plugins/evnotify.js', {}, { XMLHttpRequest: ControlledXHR }).default;

// A failed history request must not hide the energy totals from a V3 summary.
const energyClient = new Client('ABC123', 'token', 'V3');
const energyPage = instance(Log);
energyClient.getLog('energy-log', (err, log) => {
  assert.strictEqual(err, null);
  energyPage.log = log;
});
inFlight.shift().respond(200, {
  id: 'energy-log', type: 'drive', status: 'running', startDate: '2026-01-01T00:00:00Z',
  rechargedKWh: 5, dischargedKWh: 20, distance: 100
});
inFlight.shift().respond(503, { message: 'Temporary history failure' });
assert(energyPage.log.historyError.includes('Temporary history failure'));
assert.strictEqual(energyPage.chargedEnergy, 5);
assert.strictEqual(energyPage.dischargedEnergy, 20);
assert.strictEqual(energyPage.consumption, 15);

// V3 uploads km/h; shared log views expect history in m/s and summaries in km/h.
for (const speed of [50, 0, null, undefined]) {
  const speedClient = new Client('ABC123', 'token', 'V3');
  const speedPage = instance(Log, { $root: { MomentJS: moment } });
  speedClient.getLog('speed-log', (err, log) => {
    assert.strictEqual(err, null);
    speedPage.log = log;
  });
  const startDate = '2026-01-01T00:00:00Z';
  inFlight.shift().respond(200, {
    id: 'speed-log', type: 'drive', startDate, endDate: '2026-01-01T01:00:00Z', averageSpeed: speed
  });
  inFlight.shift().respond(200, [{ timestamp: startDate, speed }]);
  const expected = speed == null ? null : speed;
  assert.strictEqual(speedPage.avgSpeed, expected, 'V3 summary must retain km/h');
  assert.deepStrictEqual(speedPage.chartData.datasets.find(dataset => dataset.label === 'Speed (GPS)').data, [expected]);
  delete speedPage.log.average_speed;
  assert.strictEqual(speedPage.avgSpeed, expected, 'history fallback must convert V3 speed only once');
  assert.strictEqual(speedPage.distance, expected, 'one-hour fallback distance must match the speed in km/h');
}
const v2SpeedClient = new Client('ABC123', 'token', 'V2');
const v2SpeedPage = instance(Log, { $root: { MomentJS: moment } });
v2SpeedClient.getLog('v2-speed-log', (err, log) => {
  assert.strictEqual(err, null);
  v2SpeedPage.log = log;
});
inFlight.shift().respond(200, { id: 'v2-speed-log', stats: [{ timestamp: 1767225600, gps_speed: 10 }] });
assert.strictEqual(v2SpeedPage.avgSpeed, 36, 'V2 history remains in m/s');
assert.deepStrictEqual(v2SpeedPage.chartData.datasets.find(dataset => dataset.label === 'Speed (GPS)').data, [36]);

const freshnessClient = new Client('ABC123', 'token', 'V3');
const freshnessPage = instance(Dashboard, { $root: { EVNotify: freshnessClient, MomentJS: moment } });
const receivedAt = new Date().toISOString();
for (const sample of [
  { timestamp: new Date(Date.now() - 3600000).toISOString(), outdated: true },
  { timestamp: receivedAt, outdated: false },
  { timestamp: 'invalid', outdated: false },
  { timestamp: 'invalid', updatedAt: 'invalid', outdated: true }
]) {
  freshnessPage.fetchData();
  inFlight.shift().respond(200, Object.assign({ socDisplay: 10, updatedAt: receivedAt }, sample));
  assert.strictEqual(freshnessPage.dataOutdated(), sample.outdated, 'freshness must reflect when telemetry was measured');
}
for (const failedLogin of [false, true]) {
  const liveClient = new Client('ABC123', 'old-token', 'V3');
  const root = { EVNotify: liveClient, MomentJS: moment };
  const oldPage = instance(Dashboard, { $root: root });
  oldPage.fetchData();
  const oldRequest = inFlight.shift();
  const signIn = instance(Login, { $root: root, $router: { push() {} } });
  signIn.akey = 'DEF456'; signIn.password = 'password'; signIn.version = 'V3';
  signIn.login();
  inFlight.shift().respond(failedLogin ? 401 : 200, failedLogin ? { message: 'Denied' } : { token: 'new-token' });
  if (!failedLogin) inFlight.shift().respond(200, { car: 'IONIQ_BEV' });
  assert.strictEqual(signIn.loggingIn, false);
  assert.strictEqual(liveClient.akey, failedLogin ? 'ABC123' : 'DEF456');
  const newPage = instance(Dashboard, { $root: root });
  newPage.fetchData();
  const newRequest = inFlight.shift();
  oldRequest.respond(200, { socDisplay: 11, latitude: 51, longitude: 7 });
  assert.strictEqual(newPage.displaySOC, null, 'old responses cannot populate the current dashboard');
  assert.strictEqual(newPage.syncData.latitude, 0);
  newRequest.respond(200, { socDisplay: 99, latitude: 52, longitude: 13 });
  assert.strictEqual(newPage.displaySOC, 99);
  assert.strictEqual(newPage.syncData.latitude, 52);
  assert.strictEqual(newPage.syncData.longitude, 13);
  assert.strictEqual(inFlight.length, 0);
}

// Compile every Vue template, including new branches and disabled bindings.
const compiler = require('vue-template-compiler');
for (const dir of ['components', 'views']) {
  for (const file of fs.readdirSync(path.join(__dirname, '../src', dir)).filter(file => file.endsWith('.vue'))) {
    const source = fs.readFileSync(path.join(__dirname, '../src', dir, file), 'utf8');
    const descriptor = compiler.parseComponent(source);
    assert.deepStrictEqual(compiler.compile(descriptor.template.content).errors, [], file + ' template must compile');
  }
}

const Vue = require('vue');

// V3 snapshots cannot establish the age of individual location readings.
const findNode = (node, predicate) => predicate(node) ? node :
  (node.children || []).map(child => findNode(child, predicate)).find(Boolean);
const dashboardTemplate = compiler.parseComponent(fs.readFileSync(path.join(__dirname, '../src/components/Dashboard.vue'), 'utf8')).template.content;
const locationParent = new Vue({ data: { EVNotify: { version: 'V3' }, MomentJS: moment } });
const locationView = new Vue(Object.assign({}, Dashboard, compiler.compileToFunctions(dashboardTemplate), { parent: locationParent }));
locationView.syncData.last_location = 1767225600;
locationView.syncData.latitude = 52;
locationView.syncData.longitude = 13;
const infoWindows = [];
const maps = [];
const previousGoogle = global.google;
global.google = { maps: {
  Map: class { constructor() { maps.push(this); } },
  InfoWindow: class { constructor(options) { infoWindows.push(options); } },
  Marker: class { addListener() {} }
} };
try {
  const locationPage = instance(Dashboard, { $root: locationParent, $refs: { map: {} }, showMap: true });
  locationPage.syncData = locationView.syncData;
  for (const version of ['V3', 'V2', 'V3']) {
    locationParent.EVNotify.version = version;
    const tree = locationView._render();
    const timestamp = findNode(tree, node => node.data && node.data.staticClass === 'caption last-location-timestamp');
    assert.strictEqual(!!timestamp, version === 'V2', 'only V2 may display the location timestamp');
    if (timestamp) assert(timestamp.children.some(child => child.text.includes(locationView.lastLocationTimestamp)));
    const mapLink = findNode(tree, node => node.tag === 'v-list-tile' && node.data && node.data.class && node.data.class['last-tile']);
    assert(mapLink && mapLink.data.on.click, 'location map must remain accessible in both versions');
    locationPage.showLastPosition();
    assert.strictEqual(infoWindows[infoWindows.length - 1].content,
      version === 'V3' ? 'Last known location' : `Last location from ${locationPage.lastLocationTimestamp}`);
  }
  assert.strictEqual(maps.length, 3, 'hiding the timestamp must not prevent map creation');
} finally {
  if (previousGoogle === undefined) delete global.google;
  else global.google = previousGoogle;
  locationView.$destroy(); locationParent.$destroy();
}

// Redemption must wait for the initial status response, including on failures.
const Premium = load('src/views/Premium.vue', Object.assign({}, overrides, {
  '../utils/storage': { getValue: () => ({ akey: 'ABC123' }) }
})).default;
const premiumTemplate = compiler.parseComponent(fs.readFileSync(path.join(__dirname, '../src/views/Premium.vue'), 'utf8')).template.content;
const premiumStatus = view => findNode(view._render(), node => node.tag === 'p' &&
  (node.children || []).some(child => child.text && /Premium until |No active premium access\./.test(child.text)));
const premiumRetry = view => findNode(view._render(), node => node.tag === 'v-btn' &&
  (node.children || []).some(child => child.text === 'Retry status'));
for (const statusError of [null, 'Offline']) {
  let finishStatus, finishRedemption, redemptions = 0, statusRequests = 0;
  const premiumParent = new Vue({ data: { EVNotify: {
    version: 'V3',
    getPremium(cb) { statusRequests++; finishStatus = cb; },
    redeemVoucher(code, cb) { assert.strictEqual(code, 'VOUCHER'); redemptions++; finishRedemption = cb; }
  } } });
  const premiumView = new Vue(Object.assign({}, Premium, compiler.compileToFunctions(premiumTemplate), { parent: premiumParent }));
  const redeemButton = () => findNode(premiumView._render(), node => node.tag === 'v-btn' &&
    (node.children || []).some(child => child.text === 'Redeem voucher'));
  premiumView.voucher = 'VOUCHER';
  assert.strictEqual(premiumStatus(premiumView), undefined);
  assert.strictEqual(redeemButton().data.attrs.disabled, true, 'redemption must be disabled while status is loading');
  premiumView.redeem();
  assert.strictEqual(redemptions, 0, 'the method must also reject redemption while loading');
  finishStatus(statusError, statusError ? null : { data: { premiumUntil: null } });
  assert.strictEqual(premiumView.loading, false);
  assert.strictEqual(redeemButton().data.attrs.disabled, false, 'status errors must not prevent redemption');
  assert.strictEqual(!!premiumStatus(premiumView), !statusError, 'failed status lookups must not claim inactive Premium');
  if (statusError) assert(premiumView.statusError.includes(statusError));
  redeemButton().data.on.click();
  premiumView.redeem();
  premiumView.load();
  assert.strictEqual(statusRequests, 1, 'status requests must wait for redemption');
  if (statusError) assert.strictEqual(premiumRetry(premiumView).data.attrs.disabled, true);
  assert.strictEqual(redemptions, 1, 'only one redemption may be pending');
  assert.strictEqual(redeemButton().data.attrs.disabled, true);
  finishRedemption('Invalid voucher');
  assert(premiumView.error.includes('Invalid voucher'));
  assert.strictEqual(!!premiumStatus(premiumView), !statusError, 'voucher errors must preserve known status');
  if (statusError) assert(premiumView.statusError.includes(statusError), 'lookup and voucher errors are independent');
  assert.strictEqual(premiumView.voucher, 'VOUCHER', 'failed redemption must preserve the voucher for retry');
  assert.strictEqual(redeemButton().data.attrs.disabled, false);
  premiumView.redeem();
  const expiry = '2026-12-31T23:00:00Z';
  finishRedemption(null, { data: { premiumUntil: expiry } });
  assert.strictEqual(premiumView.premiumUntil, expiry);
  assert.strictEqual(premiumView.statusKnown, true, 'successful redemption establishes Premium status');
  assert.strictEqual(premiumView.statusError, '');
  assert(premiumStatus(premiumView));
  assert.strictEqual(premiumRetry(premiumView), undefined);
  assert.strictEqual(premiumView.error, '');
  assert.strictEqual(premiumView.busy, false);
  assert.strictEqual(premiumView.voucher, '');
  assert.strictEqual(redeemButton().data.attrs.disabled, true, 'empty vouchers must not be redeemable');
  premiumView.redeem();
  assert.strictEqual(redemptions, 2);
  premiumView.voucher = 'VOUCHER';
  premiumView.redeem();
  finishRedemption('Invalid voucher');
  assert.strictEqual(premiumView.premiumUntil, expiry);
  assert(premiumStatus(premiumView), 'voucher failure must not hide previously known active Premium');
  premiumView.$destroy(); premiumParent.$destroy();
}

// Retry the lookup through the rendered button, recovering to either status.
for (const premiumUntil of [null, '2026-12-31T23:00:00Z']) {
  let finishStatus, statusRequests = 0, redemptions = 0;
  const retryParent = new Vue({ data: { EVNotify: {
    version: 'V3',
    getPremium(cb) { statusRequests++; finishStatus = cb; },
    redeemVoucher() { redemptions++; }
  } } });
  const retryView = new Vue(Object.assign({}, Premium, compiler.compileToFunctions(premiumTemplate), { parent: retryParent }));
  finishStatus('Offline');
  assert.strictEqual(premiumStatus(retryView), undefined);
  const retry = premiumRetry(retryView);
  assert(retry, 'failed lookups must expose a retry action');
  retry.data.on.click();
  retry.data.on.click();
  assert.strictEqual(statusRequests, 2, 'repeated clicks must not overlap lookups');
  assert.strictEqual(premiumRetry(retryView).data.attrs.disabled, true);
  retryView.voucher = 'VOUCHER';
  retryView.redeem();
  assert.strictEqual(redemptions, 0, 'redemption must wait for a retry');
  finishStatus('Still offline');
  assert(retryView.statusError.includes('Still offline'));
  assert.strictEqual(premiumStatus(retryView), undefined);
  assert.strictEqual(premiumRetry(retryView).data.attrs.disabled, false);
  premiumRetry(retryView).data.on.click();
  finishStatus(null, { data: { premiumUntil } });
  assert.strictEqual(retryView.statusError, '');
  assert.strictEqual(retryView.premiumUntil, premiumUntil);
  const status = premiumStatus(retryView);
  assert(status && status.children.some(child => child.text.includes(premiumUntil ? 'Premium until ' : 'No active premium access.')));
  assert.strictEqual(premiumRetry(retryView), undefined);
  retryView.load();
  finishStatus('Offline again');
  assert.strictEqual(premiumStatus(retryView), undefined, 'a failed refresh must not display stale status');
  retryView.$destroy(); retryParent.$destroy();
}

// Render the actual retry button and invoke its click handler without a browser.
const template = compiler.parseComponent(fs.readFileSync(path.join(__dirname, '../src/components/Log.vue'), 'utf8')).template.content;
const render = compiler.compileToFunctions(template);
let finishHistory;
const parent = new Vue({ data: { EVNotify: { version: 'V3', getLogHistory: (_, cb) => { finishHistory = cb; } }, MomentJS: moment } });
const view = new Vue(Object.assign({}, Log, render, { parent, beforeCreate() { this.$route = { query: { id: 'history-log' } }; } }));
view.log = { id: 'history-log', title: 'Edited', stats: [], historyError: 'Offline' };
const findRetry = node => {
  if (node.tag === 'v-btn' && (node.children || []).some(child => child.text === 'Retry history')) return node;
  return (node.children || []).map(findRetry).find(Boolean);
};
const retry = findRetry(view._render());
assert(retry, 'history failures must expose a retry action');
assert.strictEqual(retry.data.attrs.disabled, false);
retry.data.on.click();
assert.strictEqual(findRetry(view._render()).data.attrs.disabled, true);
finishHistory(null, []);
assert.strictEqual(findRetry(view._render()), undefined, 'successful retry removes the warning and button');
assert.strictEqual(view.log.title, 'Edited');
for (const charge of [false, true]) {
  view.log = { id: 'energy-log', charge, recharged_kwh: 5, discharged_kwh: 20, distance: 100, stats: [] };
  const energySummary = findNode(view._render(), node => node.tag === 'div' &&
    (node.children || []).some(child => child.text && child.text.includes(charge ? 'charged: 5.0 kWh' : 'consumed: 20.0 kWh')));
  assert(energySummary, 'summary totals must render without cumulative start/end readings');
}
view.$destroy(); parent.$destroy();

// Check the rendered Telegram links for both subscription states and API versions.
const settingsTemplate = compiler.parseComponent(fs.readFileSync(path.join(__dirname, '../src/components/Settings.vue'), 'utf8')).template.content;
const telegramParent = new Vue({ data: { EVNotify: { version: 'V2' } } });
const telegramView = new Vue(Object.assign({}, Settings, compiler.compileToFunctions(settingsTemplate), { parent: telegramParent }));
const findTelegramLink = node => {
  if (node.tag === 'a' && node.data && node.data.attrs && /^https:\/\/t\.me\//.test(node.data.attrs.href)) return node;
  return (node.children || []).map(findTelegramLink).find(Boolean);
};
for (const version of ['V2', 'V3', 'V2']) {
  telegramParent.EVNotify.version = version;
  for (const telegram of [null, 12345]) {
    telegramView.localSettings = { telegram };
    const link = findTelegramLink(telegramView._render());
    assert(link, 'both Telegram dialog branches must render a bot link');
    assert.strictEqual(link.data.attrs.href, version === 'V3' ? 'https://t.me/EVNotify3Bot' : 'https://t.me/evnotify2bot');
  }
}
telegramView.$destroy(); telegramParent.$destroy();

// Exercise the control selected by the actual Settings template, including its
// Vuetify value watcher and input event. Script-only mocks miss slider clamping.
async function testConsumptionControl() {
  Vue.use(require('vuetify'));
  let stored = { car: 'IONIQ_5', capacity: 75, consumption: 180, consumptionUnit: 'Wh', soc: 30, email: 'old@example.com' };
  let saved, writes = 0;
  const settingsParent = new Vue({ data: { EVNotify: {
    version: 'V3',
    getSettings(cb) { cb(null, Object.assign({}, stored)); },
    setSettings(value, cb) { writes++; saved = value; stored = Object.assign({}, stored, value); cb(null); }
  } } });
  const settingsTemplate = compiler.parseComponent(fs.readFileSync(path.join(__dirname, '../src/components/Settings.vue'), 'utf8')).template.content;
  const form = new Vue(Object.assign({}, Settings, compiler.compileToFunctions(settingsTemplate), { parent: settingsParent }));
  const findConsumption = node => {
    const options = node.componentOptions;
    if (options && options.propsData && options.propsData.label === 'Consumption') return node;
    return (options && options.children || node.children || []).map(findConsumption).find(Boolean);
  };
  let control = findConsumption(form._render());
  assert.strictEqual(control.componentOptions.Ctor.options.name, 'v-text-field', 'V3 consumption must not use a clamping slider');
  assert.strictEqual(control.componentOptions.propsData.type, 'number');
  assert.strictEqual(control.data.attrs.step, 'any');
  assert.strictEqual(control.data.attrs.max, undefined);
  const input = new control.componentOptions.Ctor({
    parent: form, propsData: control.componentOptions.propsData, _parentListeners: control.componentOptions.listeners
  });
  form.loadSettings();
  await Vue.nextTick();
  control = findConsumption(form._render());
  input.value = control.componentOptions.propsData.value;
  await Vue.nextTick();
  assert.strictEqual(input.internalValue, 180);
  assert.strictEqual(form.retrieveSettings().consumption, 180);
  assert.strictEqual(control.componentOptions.propsData.hint, 'Wh');
  const consumption = form.settings.reduce((all, group) => all.concat(group.elements), []).find(item => item.id === 'consumption');
  const email = form.settings.reduce((all, group) => all.concat(group.elements), []).find(item => item.id === 'email');
  email.value = 'changed@example.com';
  form.saveSettings();
  assert.strictEqual(saved.email, 'changed@example.com');
  assert.strictEqual(saved.consumption, 180, 'saving an unrelated setting must preserve consumption');
  assert.strictEqual(saved.consumptionUnit, 'Wh');
  for (const unit of ['kWh', 'Wh']) {
    stored.consumptionUnit = unit;
    form.loadSettings();
    assert.strictEqual(form.consumptionHint, unit === 'kWh' ? 'kWh/100km' : 'Wh');
    for (const value of [5, 35, '180.125']) {
      input.$emit('input', value);
      form.saveSettings();
      assert.strictEqual(saved.consumption, Number(value));
      assert.strictEqual(saved.consumptionUnit, unit);
    }
  }
  const writesBeforeInvalidEdits = writes;
  for (const value of ['0', '-1', 'invalid', 'Infinity', ' ']) {
    input.$emit('input', value);
    form.saveSettings();
    assert(form.settingsError.includes('positive consumption'));
    assert.strictEqual(writes, writesBeforeInvalidEdits, 'invalid edits must not write settings');
    assert.strictEqual(consumption.value, value, 'failed validation must preserve the edit');
  }
  form.localSettings = {};
  assert.strictEqual(form.consumptionHint, 'kWh/100km', 'legacy settings default to kWh/100km');
  settingsParent.EVNotify.version = 'V2';
  control = findConsumption(form._render());
  assert.strictEqual(control.componentOptions.Ctor.options.name, 'v-slider');
  assert.strictEqual(control.componentOptions.propsData.min, 8);
  assert.strictEqual(control.componentOptions.propsData.max, 30);
  input.$destroy(); form.$destroy(); settingsParent.$destroy();
}

testConsumptionControl().then(() => {
  console.log('PWA log, settings, vehicle, login, and template regression tests passed');
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
