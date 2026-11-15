const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '../src/views/Trips.vue'), 'utf8');
const script = source.match(/<script>([\s\S]*?)<\/script>/)[1]
  .replace(/^import .*;\s*$/gm, '')
  .replace('export default', 'this.component =');
const context = { BottomNavigation: {}, Storage: {}, Date, isFinite, encodeURIComponent, window: { confirm: () => true } };
vm.runInNewContext(script, context);

const page = Object.assign(context.component.data(), context.component.methods);
const calls = [];
const start = new Date(Date.now() + 60 * 60 * 1000);
const end = new Date(start.getTime() + 60 * 60 * 1000);
page.form.startDate = start.toISOString();
page.form.endDate = end.toISOString();
page.$root = { EVNotify: {
  createTrip(trip, callback) {
    calls.push('create');
    assert.strictEqual(trip.startDate, start.toISOString());
    callback(null, { data: { code: 'A B', name: 'New trip', start: trip.startDate, end: trip.endDate } });
  },
  getTrips(callback) { calls.push('list'); callback(null, { data: [] }); },
  deleteTrip(code, callback) { calls.push('delete'); assert.strictEqual(code, 'A B'); callback(null, {}); }
} };

page.create();
assert.deepStrictEqual(calls, ['create', 'list']);
assert.strictEqual(page.createdTrip.code, 'A B');
assert.strictEqual(page.trips[0].code, 'A B', 'creation response remains visible when the server list omits it');
assert.strictEqual(page.tripUrl('A B'), 'https://trip.evnotify.de/?code=A%20B');

page.remove(page.trips[0]);
assert.deepStrictEqual(calls, ['create', 'list', 'delete', 'list']);
assert.strictEqual(page.createdTrip, null);
assert.strictEqual(page.trips.length, 0);

page.form.startDate = new Date(Date.now() - 60 * 60 * 1000).toISOString();
page.create();
assert.strictEqual(calls.length, 4, 'invalid dates must not send a request');

console.log('Trip management tests passed');
