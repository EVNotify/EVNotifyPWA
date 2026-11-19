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
  assert.strictEqual(view.listError, '');
}

for (const olderFirst of [true, false]) {
  const { view, pending } = deferredListPage();
  view.load();
  view.load();
  const older = () => pending[0]('Stale failure');
  const latest = () => pending[1](null, { data: [currentTrip] });
  if (olderFirst) {
    older();
    assert.strictEqual(view.listError, '', 'stale failures must not change the current error');
    assert.strictEqual(view.loading, true, 'stale failures must not finish the latest refresh');
    latest();
  } else {
    latest();
    older();
  }
  assert.strictEqual(view.trips.length, 1);
  assert.strictEqual(view.trips[0].code, currentTrip.code);
  assert.strictEqual(view.listError, '', 'stale failures must not overwrite the latest success');
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
  assert(view.listError.includes('Latest failure'));
  assert.strictEqual(view.loading, false);
}

for (const actionError of ['Could not create trip (Denied).', 'Could not delete trip (Denied).']) {
  const { view, pending } = deferredListPage();
  view.trips = [currentTrip];
  view.load();
  pending[0]('Offline');
  assert(view.listError.includes('Offline'));
  assert.strictEqual(view.trips[0], currentTrip, 'failed refreshes preserve existing trips');
  view.error = actionError;
  view.busy = true;
  view.retryLoad();
  assert.strictEqual(pending.length, 1, 'retry must wait for create/delete actions');
  view.busy = false;
  view.retryLoad();
  assert.strictEqual(view.listError, '', 'retry clears the previous list error');
  assert.strictEqual(view.loading, true);
  view.retryLoad();
  assert.strictEqual(pending.length, 2, 'repeated retries must not overlap');
  pending[1]('Still offline');
  assert(view.listError.includes('Still offline'));
  assert.strictEqual(view.loading, false);
  assert.strictEqual(view.trips[0], currentTrip);
  view.retryLoad();
  pending[2](null, { data: [] });
  assert.strictEqual(view.listError, '', 'successful retry clears the list error');
  assert.strictEqual(view.loading, false);
  assert.strictEqual(view.trips.length, 0);
  assert.strictEqual(view.error, actionError, 'list recovery must preserve action errors');
}

// Check the rendered recovery controls and empty state without mounting a DOM.
const Vue = require('vue');
const compiler = require('vue-template-compiler');
const template = compiler.parseComponent(source).template.content;
const rendered = new Vue(Object.assign({
  data: context.component.data,
  methods: context.component.methods
}, compiler.compileToFunctions(template)));
const findNode = (node, predicate) => predicate(node) ? node :
  (node.children || []).map(child => findNode(child, predicate)).find(Boolean);
const retryButton = () => findNode(rendered._render(), node => node.tag === 'v-btn' &&
  (node.children || []).some(child => child.text === 'Retry loading trips'));
const emptyMessage = () => findNode(rendered._render(), node => node.text === 'No trips yet.');
let retryCallback;
rendered.$root.EVNotify = { getTrips: cb => { retryCallback = cb; } };
rendered.loading = false;
rendered.listError = 'Offline';
assert.strictEqual(emptyMessage(), undefined, 'a failed load must not claim the list is empty');
assert.strictEqual(retryButton().data.attrs.disabled, false);
rendered.busy = true;
assert.strictEqual(retryButton().data.attrs.disabled, true);
rendered.busy = false;
rendered.loading = true;
assert.strictEqual(retryButton().data.attrs.disabled, true);
rendered.loading = false;
retryButton().data.on.click();
assert.strictEqual(rendered.loading, true, 'the retry button must load the list');
assert.strictEqual(retryButton(), undefined, 'the previous error is hidden during retry');
assert.strictEqual(emptyMessage(), undefined);
retryCallback(null, { data: [] });
assert(emptyMessage(), 'an empty successful response shows the empty state');
rendered.$destroy();

console.log('Trip management tests passed');
