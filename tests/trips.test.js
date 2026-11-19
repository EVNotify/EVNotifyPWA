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

function deferredListPage() {
  const pending = [];
  const view = Object.assign(context.component.data(), context.component.methods);
  view.$root = { EVNotify: {
    getTrips(callback) { pending.push(callback); },
    deleteTrip(code, callback) { callback(null); }
  } };
  return { view, pending };
}

const deletedTrip = { code: 'deleted', start: start.toISOString(), end: end.toISOString() };
const currentTrip = { code: 'current', start: start.toISOString(), end: end.toISOString() };

for (const olderFirst of [true, false]) {
  const { view, pending } = deferredListPage();
  view.trips = [deletedTrip];
  view.createdTrip = deletedTrip;
  view.load();
  view.remove(deletedTrip);
  assert.strictEqual(pending.length, 2, 'successful deletion must refresh the list');
  assert.strictEqual(view.createdTrip, null);
  assert.strictEqual(view.trips.length, 0);
  const older = () => pending[0](null, { data: [deletedTrip] });
  const latest = () => pending[1](null, { data: [] });
  if (olderFirst) {
    older();
    assert.strictEqual(view.trips.length, 0, 'an older response must not restore a deleted trip');
    assert.strictEqual(view.loading, true, 'an older response must not finish the latest refresh');
    latest();
  } else {
    latest();
    older();
  }
  assert.strictEqual(view.trips.length, 0, 'deleted trips must stay absent in either response order');
  assert.strictEqual(view.loading, false);
  assert.strictEqual(view.error, '');
}

for (const olderFirst of [true, false]) {
  const { view, pending } = deferredListPage();
  view.load();
  view.load();
  const older = () => pending[0]('Stale failure');
  const latest = () => pending[1](null, { data: [currentTrip] });
  if (olderFirst) {
    older();
    assert.strictEqual(view.error, '', 'stale failures must not change the current error');
    assert.strictEqual(view.loading, true, 'stale failures must not finish the latest refresh');
    latest();
  } else {
    latest();
    older();
  }
  assert.strictEqual(view.trips.length, 1);
  assert.strictEqual(view.trips[0].code, currentTrip.code);
  assert.strictEqual(view.error, '', 'stale failures must not overwrite the latest success');
  assert.strictEqual(view.loading, false);
}

for (const olderFirst of [true, false]) {
  const { view, pending } = deferredListPage();
  const initialTrips = view.trips;
  view.load();
  view.load();
  const older = () => pending[0](null, { data: [deletedTrip] });
  const latest = () => pending[1]('Latest failure');
  if (olderFirst) {
    older();
    assert.strictEqual(view.trips, initialTrips, 'stale successes must leave the current list unchanged');
    assert.strictEqual(view.loading, true);
    latest();
  } else {
    latest();
    older();
  }
  assert.strictEqual(view.trips, initialTrips, 'a failed latest refresh must not apply stale results');
  assert(view.error.includes('Latest failure'));
  assert.strictEqual(view.loading, false);
}

console.log('Trip management tests passed');
