const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const requests = [];
class FakeXHR {
  constructor() { this.headers = {}; requests.push(this); }
  open(method, url) { this.method = method; this.url = url; }
  setRequestHeader(name, value) { this.headers[name] = value; }
  send(body) { this.body = body; }
  respond(status, data) {
    this.status = status;
    this.readyState = 4;
    this.responseText = data == null ? '' : JSON.stringify(data);
    this.onreadystatechange();
  }
}

const source = fs.readFileSync(path.join(__dirname, '../src/plugins/evnotify.js'), 'utf8')
  .replace('export default function EVNotify', 'function EVNotify') + '\nthis.EVNotify = EVNotify;';
const context = { XMLHttpRequest: FakeXHR, Date, encodeURIComponent };
vm.runInNewContext(source, context);
const client = new context.EVNotify('ABC123', '12345678901234567890', 'V3');

function take(method, suffix, body, guest) {
  const request = requests.pop();
  assert(request, 'expected a request');
  assert.strictEqual(request.method, method);
  assert.strictEqual(request.url, 'https://api.evnotify.de/' + suffix);
  assert.strictEqual(request.headers.Authorization, guest ? undefined : 'ABC123 12345678901234567890');
  if (body !== undefined) assert.deepStrictEqual(JSON.parse(request.body), body);
  return request;
}

let result;
client.getKey((err, key) => { assert.strictEqual(err, null); result = key; });
take('GET', 'account/akey', undefined, true).respond(200, { akey: 'NEW123' });
assert.strictEqual(result, 'NEW123');

client.register('ABC123', 'password', (err, token) => { assert.strictEqual(err, null); result = token; });
take('POST', 'account', { akey: 'ABC123', password: 'password' }, true).respond(201, { token: 'new-token' });
assert.strictEqual(result, 'new-token');

client.login('ABC123', 'password', (err, token) => { assert.strictEqual(err, null); result = token; });
take('POST', 'account/ABC123/login', { password: 'password' }, true).respond(200, { token: '12345678901234567890' });
assert.strictEqual(result, '12345678901234567890');

client.changePW('old', 'new', () => {});
take('PATCH', 'account/ABC123/password', { password: 'old', newPassword: 'new' }).respond(200, {});
client.renewToken('password', (err, token) => { assert.strictEqual(err, null); result = token; });
take('PATCH', 'account/ABC123/token', { password: 'password' }).respond(200, { token: 'updated-token' });
assert.strictEqual(result, 'updated-token');
assert.strictEqual(client.token, 'updated-token');
client.token = '12345678901234567890';

client.getSettings((err, settings) => { assert.strictEqual(err, null); result = settings; });
take('GET', 'settings/ABC123').respond(200, { socThreshold: 30, car: 'IONIQ_BEV' });
assert.strictEqual(result.soc, 30);
client.setSettings({ soc: 35, car: 'IONIQ_BEV', push: true }, () => {});
take('PATCH', 'settings/ABC123', { socThreshold: 35, car: 'IONIQ_BEV' }).respond(200, {});

const sync = { updatedAt: '2026-01-01T00:00:00.000Z', timestamp: '2026-01-01T00:00:00.000Z', socBMS: 42, cec: 123, ced: 12, latitude: 52, longitude: 13 };
const syncResults = [];
client.getSOC((err, data) => { assert.strictEqual(err, null); syncResults.push(data); });
client.getExtended((err, data) => { assert.strictEqual(err, null); syncResults.push(data); });
client.getLocation((err, data) => { assert.strictEqual(err, null); syncResults.push(data); });
assert.strictEqual(requests.length, 1, 'last-sync reads should share one request');
take('GET', 'logs/ABC123/last-sync').respond(200, sync);
assert.strictEqual(syncResults.length, 3);
assert.strictEqual(syncResults[0].soc_bms, 42);
assert.strictEqual(syncResults[0].cumulative_energy_charged, 123);
assert.strictEqual(syncResults[0].last_location, 1767225600);
// Delayed uploads retain their observation time; malformed/missing times fall back.
const receivedAt = '2026-01-01T01:00:00.000Z';
const freshnessCases = [
  { timestamp: sync.timestamp, expected: 1767225600 },
  { timestamp: 1767225600, expected: 1767225600 },
  { timestamp: 1767225600000, expected: 1767225600 },
  { timestamp: '1767225600', expected: 1767225600 },
  { timestamp: undefined, expected: 1767229200 },
  { timestamp: null, expected: 1767229200 },
  { timestamp: '', expected: 1767229200 },
  { timestamp: 'invalid', expected: 1767229200 },
  { timestamp: 0, expected: 1767229200 },
  { timestamp: -1, expected: 1767229200 },
  { timestamp: '1969-01-01T00:00:00Z', expected: 1767229200 },
  { timestamp: 'invalid', updatedAt: 'invalid', expected: 0 }
];
for (const sample of freshnessCases) {
  const readings = [];
  ['getSOC', 'getExtended', 'getLocation'].forEach(method => client[method]((err, data) => {
    assert.strictEqual(err, null);
    readings.push(data);
  }));
  take('GET', 'logs/ABC123/last-sync').respond(200, Object.assign({}, sync, { updatedAt: receivedAt }, sample));
  assert.strictEqual(readings.length, 3);
  readings.forEach(data => ['last_soc', 'last_extended', 'last_location', 'timestamp'].forEach(field => {
    assert.strictEqual(data[field], sample.expected, field + ' must follow the valid observation time');
  }));
}
client.getLogHistory('log-1', (err, history) => { assert.strictEqual(err, null); result = history; });
take('GET', 'logs/ABC123/log-1/history').respond(200, [
  { timestamp: 'invalid', updatedAt: receivedAt, socDisplay: 50 },
  Object.assign({}, sync, { updatedAt: receivedAt })
]);
assert.strictEqual(result[0].timestamp, 1767229200);
assert.strictEqual(result[1].timestamp, 1767225600);
assert.strictEqual(result[1].last_soc, result[1].timestamp);
client.setSOC(50, 49, (err) => { assert.strictEqual(err, null); });
const socRequest = take('POST', 'logs/ABC123');
assert.strictEqual(JSON.parse(socRequest.body).socDisplay, 50);
assert.strictEqual(JSON.parse(socRequest.body).socBMS, 49);
socRequest.respond(204);

const log = { id: 'log-1', type: 'charge', title: 'Charge', startDate: '2026-01-01T00:00:00.000Z', endDate: '2026-01-01T01:00:00.000Z', startSOC: 20, endSOC: 80 };
client.getLogs(1, (err, logs) => { assert.strictEqual(err, null); result = logs; });
take('GET', 'logs/ABC123?type=charge').respond(200, [log]);
assert.strictEqual(result[0].charge, true);
assert.strictEqual(result[0].start_soc, 20);
client.getLog('log-1', (err, detail) => { assert.strictEqual(err, null); result = detail; });
take('GET', 'logs/ABC123/log-1').respond(200, log);
take('GET', 'logs/ABC123/log-1/history').respond(200, [sync]);
assert.strictEqual(result.stats[0].soc_bms, 42);
client.getLog('log-1', (err, detail) => { assert.strictEqual(err, null); result = detail; });
take('GET', 'logs/ABC123/log-1').respond(200, log);
take('GET', 'logs/ABC123/log-1/history').respond(403, { message: 'Premium required' });
assert.strictEqual(result.stats.length, 0);
assert(result.historyError.includes('Premium required'));
client.getLatestLog((err, latest) => { assert.strictEqual(err, null); result = latest; });
take('GET', 'logs/ABC123').respond(200, [log]);
assert.strictEqual(result.id, 'log-1');
for (const type of ['charge', 'drive', 'unknown']) {
  client.getLog('log-1', (err, detail) => { assert.strictEqual(err, null); result = detail; });
  take('GET', 'logs/ABC123/log-1').respond(200, Object.assign({}, log, { type }));
  take('GET', 'logs/ABC123/log-1/history').respond(200, []);
  assert.strictEqual(result.type, type);
  result.title = 'Edited ' + type;
  client.updateLog(result, () => {});
  take('PATCH', 'logs/ABC123/log-1', { title: result.title, type }).respond(200, {});
}
for (const charge of [true, false]) {
  client.updateLog({ id: 'log-1', title: 'New', charge }, () => {});
  take('PATCH', 'logs/ABC123/log-1', { title: 'New', type: charge ? 'charge' : 'drive' }).respond(200, {});
}
client.deleteLog('log-1', (err) => { assert.strictEqual(err, null); });
take('DELETE', 'logs/ABC123/log-1').respond(204);

client.getPremium(() => {});
take('GET', 'premium/ABC123').respond(200, { premiumUntil: null });
client.getPremium((err) => { result = err; });
take('GET', 'premium/ABC123').respond(403, { message: 'Premium required' });
assert.strictEqual(result, 'Premium required');
client.redeemVoucher('SAVE', () => {});
take('POST', 'premium/ABC123/redeem/voucher/SAVE').respond(200, {});
client.getTrips(() => {});
take('GET', 'trips/ABC123/list').respond(200, []);
client.createTrip({ name: 'Trip' }, () => {});
take('POST', 'trips/ABC123', { name: 'Trip' }).respond(201, { code: 'CODE' });
client.deleteTrip('CODE', () => {});
take('DELETE', 'trips/ABC123/CODE').respond(200, {});

const point = { lat: 52, lng: 13 };
client.getStations(point, 50, () => {});
take('GET', 'stations/ABC123?latitude=52&longitude=13&minKW=50').respond(200, []);
client.getNearestStation(point, 50, () => {});
take('GET', 'stations/ABC123/nearest?latitude=52&longitude=13&minKW=50').respond(200, {});
client.getRoute(point, point, () => {});
take('GET', 'stations/ABC123/calculate-route?startLatitude=52&startLongitude=13&endLatitude=52&endLongitude=13').respond(200, { points: [] });
client.getRouteStations(point, point, 50, () => {});
take('GET', 'stations/ABC123/plan-route?startLatitude=52&startLongitude=13&endLatitude=52&endLongitude=13&minKW=50').respond(200, { stations: [] });

const beforeUnsupported = requests.length;
client.getRobots((err) => { result = err; });
assert.strictEqual(result, 'This feature is unavailable with V3.');
assert.strictEqual(requests.length, beforeUnsupported);

const v2 = new context.EVNotify('ABC123', 'token', 'V2');
v2.getSettings(() => {});
const v2Request = requests.pop();
assert.strictEqual(v2Request.method, 'GET');
assert.strictEqual(v2Request.url, 'https://app.evnotify.de/settings?akey=ABC123&token=token');
assert.strictEqual(v2Request.headers.Authorization, undefined);

client.setSettings({ email: '  ', capacity: null, push: true }, () => {});
take('PATCH', 'settings/ABC123', { email: null, capacity: null }).respond(200, {});
client.setSettings({ soc: 35 }, () => {});
take('PATCH', 'settings/ABC123', { socThreshold: 35 }).respond(200, {});
v2.setSettings({ email: '' }, () => {});
assert.strictEqual(JSON.parse(requests.pop().body).settings.email, '', 'V2 clearing payload stays unchanged');

client.getLogs(0, (err, logs) => { assert.strictEqual(err, null); result = logs; });
take('GET', 'logs/ABC123?type=drive').respond(200, [{ id: 'live', status: 'running', startDate: log.startDate, updatedAt: log.endDate, averageSpeed: 10 }]);
assert.strictEqual(result[0].end, null);
assert.strictEqual(result[0].status, 'running');
assert.strictEqual(result[0].average_speed, 10, 'V3 summary speeds are already km/h');
assert.strictEqual(result[0].updated_at, 1767229200);
client.getLog('log-1', (err, detail) => { assert.strictEqual(err, null); result = detail; });
take('GET', 'logs/ABC123/log-1').respond(200, log);
take('GET', 'logs/ABC123/log-1/history').respond(200, [
  { timestamp: '2026-01-01T00:00:00Z', socDisplay: 0 },
  { timestamp: '2026-01-01T00:30:00Z', socDisplay: 50 }
]);
assert.strictEqual(result.stats[0].soc_display, 50, 'V3 history is normalized newest-first');
assert.strictEqual(result.stats[1].soc_display, 0);

let completed = 0;
client.getPremium(err => { assert(err, 'status zero must be a truthy failure'); completed++; });
const failed = take('GET', 'premium/ABC123');
failed.respond(0);
failed.onerror(new Error('Network error'));
failed.ontimeout();
failed.onabort();
assert.strictEqual(completed, 1, 'multiple XHR terminal events must invoke callback once');
client.getPremium(err => { assert.strictEqual(err, 'Request timed out'); completed++; });
take('GET', 'premium/ABC123').ontimeout();
assert.strictEqual(completed, 2);

// Outstanding telemetry belongs to the session that started it, in either response order.
const sessionChanges = {
  account: c => { c.setVersion('V3'); c.akey = 'DEF456'; c.token = 'other-token'; },
  relogin: c => c.setVersion('V3'),
  backend: c => { c.setVersion('V2'); c.setVersion('V3'); },
  rollback: c => {
    const previous = { akey: c.akey, token: c.token };
    c.setVersion('V3'); c.akey = null; c.token = null;
    c.setVersion('V3'); c.akey = previous.akey; c.token = previous.token;
  },
  akey: c => { c.akey = 'DEF456'; },
  token: c => { c.token = 'renewed-token'; },
  baseUrl: c => { c.baseUrl = 'https://other.example/'; }
};
for (const name of Object.keys(sessionChanges)) {
  for (const oldFirst of [true, false]) {
    const c = new context.EVNotify('ABC123', 'old-token', 'V3');
    const oldResults = [], newResults = [];
    const read = target => ['getSOC', 'getExtended', 'getLocation'].forEach(method => {
      c[method]((err, data) => target.push({ err, data }));
    });
    read(oldResults);
    assert.strictEqual(requests.length, 1, 'old session readers coalesce');
    const oldRequest = requests.pop();
    sessionChanges[name](c);
    read(newResults);
    assert.strictEqual(requests.length, 1, 'new session readers coalesce independently');
    const newRequest = requests.pop();
    const respondOld = () => oldRequest.respond(200, { socDisplay: 11, latitude: 51, longitude: 7 });
    const respondNew = () => newRequest.respond(200, { socDisplay: 99, latitude: 52, longitude: 13 });
    if (oldFirst) {
      respondOld();
      assert.strictEqual(newResults.length, 0, name + ': stale completion must not drain the new batch');
      // It must not clear the new batch either: another read still shares its request.
      c.getLocation((err, data) => newResults.push({ err, data }));
      assert.strictEqual(requests.length, 0, name + ': new batch must remain pending');
      respondNew();
    } else {
      respondNew();
      respondOld();
    }
    assert.strictEqual(oldResults.length, 3);
    oldResults.forEach(result => {
      assert.strictEqual(result.err, 'Session changed', name + ': invalidate old telemetry');
      assert.strictEqual(result.data, null);
    });
    assert.strictEqual(newResults.length, oldFirst ? 4 : 3);
    newResults.forEach(result => {
      assert.strictEqual(result.err, null);
      assert.strictEqual(result.data.soc_display, 99);
      assert.strictEqual(result.data.latitude, 52);
      assert.strictEqual(result.data.longitude, 13);
    });
  }
}

client.getLogHistory('log /1', (err, stats) => { assert.strictEqual(err, null); result = stats; });
take('GET', 'logs/ABC123/log%20%2F1/history').respond(200, [
  { timestamp: '2026-01-01T00:00:00Z', socDisplay: 0, latitude: 0, longitude: 0 },
  { timestamp: '2026-01-01T00:30:00Z', socBMS: 50, cec: 12 }, null
]);
assert.strictEqual(result.length, 2);
assert.strictEqual(result[0].soc_bms, 50);
assert.strictEqual(result[0].cumulative_energy_charged, 12);
assert.strictEqual(result[1].soc_display, 0);
assert.strictEqual(result[1].latitude, 0);
for (const status of [0, 403, 503]) {
  client.getLogHistory('log-1', (err, stats) => { assert(err); assert.strictEqual(stats, null); });
  take('GET', 'logs/ABC123/log-1/history').respond(status, { message: 'History unavailable' });
}
client.getLogHistory('log-1', (err, stats) => {
  assert.strictEqual(err, 'Invalid history response'); assert.strictEqual(stats, null);
});
take('GET', 'logs/ABC123/log-1/history').respond(200, {});
client.getLogHistory('log-1', (err, stats) => { assert.strictEqual(err, null); assert.strictEqual(stats.length, 0); });
take('GET', 'logs/ABC123/log-1/history').respond(200, []);
v2.getLogHistory('log-1', err => assert.strictEqual(err, 'This feature is unavailable with V3.'));
new context.EVNotify(null, null, 'V3').getLogHistory('log-1', err => assert.strictEqual(err, 401));
assert.strictEqual(requests.length, 0, 'unsupported/unauthenticated history reads must not send requests');

console.log('V2/V3 API client tests passed');
