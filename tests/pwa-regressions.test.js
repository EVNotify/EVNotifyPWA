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
  list.$root.EVNotify = { getLogs: (type, cb) => cb(type === failingType ? 'Offline' : null, []) };
  list.loadLogs();
  assert.strictEqual(list.loading, false);
  assert(list.loadError.includes('Offline'));
}
const running = { id: 'running', status: 'running', start: 1794700800, end: null };
const finished = { id: 'finished', start: 1794690000, end: 1794690200 };
list.$root.EVNotify = { getLogs: (type, cb) => cb(null, type ? [finished] : [running]) };
list.loadLogs();
assert.strictEqual(list.loaded, true);
assert.strictEqual(list.loadError, '');
assert.strictEqual(Object.values(list.logs)[0][0].id, 'running');
assert(!Object.keys(list.logs).some(key => key.endsWith('_1970')));
assert(list.convertSubHeader('10_2026').includes('November'));
assert(list.convertDates(running.start, null, 'running').endsWith('Ongoing'));
assert(list.setSubtitle({ start_soc: 0, end_soc: 20 }).startsWith('0%'));

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

// Render the actual retry button and invoke its click handler without a browser.
const Vue = require('vue');
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
view.$destroy(); parent.$destroy();
console.log('PWA log, settings, vehicle, login, and template regression tests passed');
