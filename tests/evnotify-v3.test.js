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
client.updateLog({ id: 'log-1', title: 'New', charge: true }, () => {});
take('PATCH', 'logs/ABC123/log-1', { title: 'New', type: 'charge' }).respond(200, {});
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
assert.strictEqual(result[0].average_speed, 36);
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

console.log('V2/V3 API client tests passed');
