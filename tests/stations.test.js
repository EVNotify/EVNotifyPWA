const assert = require('assert');
const { load, instance } = require('./helpers');
const overrides = { '../components/BottomNavigation': {}, '../utils/storage': { getValue: () => ({}) } };
let success, denied, click;
const removed = [];
class Map {
  addListener(event, cb) { click = cb; return { remove: () => removed.push('listener') }; }
  setCenter(point) { this.center = point; }
  setZoom() {}
  fitBounds() {}
  panTo() {}
}
class Overlay {
  constructor(options) { this.options = options; }
  setMap(map) { if (!map) removed.push(this); }
}
class Bounds { extend() {} }
const window = {};
const navigator = { geolocation: { getCurrentPosition: (ok, fail) => { success = ok; denied = fail; } } };
const Component = load('src/views/Stations.vue', overrides, { window, navigator }).default;
const page = instance(Component, { $refs: { map: {} } });
page.initMap();
assert(page.error.includes('unavailable'));
page.useCurrentLocation();
assert.strictEqual(success, undefined, 'geolocation must not run without a map');
window.google = { maps: { Map: class { constructor() { throw Error('offline'); } } } };
page.initMap();
assert.strictEqual(page.mapReady, false);
assert(page.error.includes('initialized'));
window.google.maps = { Map, Marker: Overlay, Polyline: Overlay, LatLngBounds: Bounds, event: { clearInstanceListeners: () => removed.push('clear') } };
page.initMap();
assert.strictEqual(page.mapReady, true);
assert.strictEqual(page.error, '');
page.useCurrentLocation();
assert.strictEqual(page.locating, true);
success({ coords: { latitude: 52, longitude: 13 } });
assert.deepStrictEqual(page.point, { lat: 52, lng: 13 });
assert.strictEqual(page.locating, false);
assert.strictEqual(page.markers.length, 1);
page.useCurrentLocation(); denied();
assert(page.error.includes('denied'));
page.useCurrentLocation(); success({ coords: { latitude: NaN, longitude: 13 } });
assert(page.error.includes('invalid coordinates'));
click({ latLng: { lat: () => 0, lng: () => 0 } });
assert.deepStrictEqual(page.point, { lat: 0, lng: 0 });
assert.strictEqual(page.validPoint({ lat: 91, lng: 0 }), false);
assert.strictEqual(page.validPoint({ lat: 0, lng: Infinity }), false);
assert.strictEqual(page.validPoint(null), false);
let callback, calls = 0;
page.$root = { EVNotify: { getStations(point, power, cb) { calls++; callback = cb; } } };
page.minKW = '';
page.search();
assert.strictEqual(calls, 0);
assert(page.error.includes('minimum power'));
page.minKW = 0;
page.search(); page.search();
assert.strictEqual(calls, 1);
callback('Offline');
assert.strictEqual(page.busy, false);
assert(page.error.includes('Offline'));
page.search(); callback(null, { data: [] });
assert.strictEqual(page.error, '');
assert.strictEqual(page.searched, true);
assert.deepStrictEqual(page.stations, []);
page.search(); callback(null, { data: [{ uuid: 'bad', location: { latitude: NaN, longitude: 13 } }] });
assert.strictEqual(page.markers.length, 1, 'invalid station coordinates must not create markers');
page.start = { lat: 0, lng: 0 }; page.end = { lat: 1, lng: 1 };
page.$root.EVNotify.getRoute = (start, end, cb) => cb(null, { data: { points: [] } });
page.plan();
assert.strictEqual(page.busy, false);
assert(page.error.includes('No valid route'));
page.$root.EVNotify.getRoute = (start, end, cb) => cb('Premium required');
page.plan();
assert(page.error.includes('Premium required'));
page.$root.EVNotify.getRoute = (start, end, cb) => cb(null, { data: { points: [start, end] } });
page.$root.EVNotify.getRouteStations = (start, end, power, cb) => cb(null, { data: { stations: [{ station: { uuid: 'ok', location: { latitude: 0, longitude: 1 } } }] } });
page.plan();
assert.strictEqual(page.busy, false);
assert.strictEqual(page.stations[0].uuid, 'ok');
assert(page.routeLine);

const routeRequests = [];
const stationRequests = [];
page.start = { lat: 52, lng: 13 };
page.end = { lat: 53, lng: 14 };
page.minKW = 50;
page.$root.EVNotify.getRoute = (start, end, cb) => { routeRequests.push({ start, end }); callback = cb; };
page.$root.EVNotify.getRouteStations = (start, end, power, cb) => { stationRequests.push({ start, end, power }); callback = cb; };
page.plan();
page.plan();
assert.strictEqual(routeRequests.length, 1, 'overlapping route requests must be blocked');
callback(null, { data: { points: [page.start, page.end] } });
const calculatedLine = page.routeLine;
callback('Offline');
assert.strictEqual(page.busy, false);
assert(page.error.includes('Offline'));
page.plan();
assert.strictEqual(routeRequests.length, 1, 'station retries must not recalculate a successful route');
assert.strictEqual(stationRequests.length, 2);
assert.strictEqual(page.routeLine, calculatedLine);
callback(null, { data: { stations: [] } });
assert.strictEqual(page.error, '');
assert.strictEqual(page.busy, false);
page.minKW = 150;
page.plan();
assert.strictEqual(routeRequests.length, 1, 'changing minimum power must reuse the route');
assert.strictEqual(stationRequests[2].power, 150);
callback(null, { data: { stations: [] } });
page.end = { lat: 54, lng: 15 };
page.plan();
assert.strictEqual(routeRequests.length, 2, 'changing an endpoint must calculate a new route');
callback('Offline');
page.plan();
assert.strictEqual(routeRequests.length, 3, 'failed calculations must remain retryable');
// Keep the station query consistent with the route request even if inputs change while pending.
page.end.lat = 55;
page.minKW = 200;
callback(null, { data: { points: [routeRequests[2].start, routeRequests[2].end] } });
assert.deepStrictEqual(stationRequests[3], { start: { lat: 52, lng: 13 }, end: { lat: 54, lng: 15 }, power: 150 });
callback(null, { data: { stations: [] } });
page.end.lat = 54;
const previousStart = page.start;
page.start = page.end;
page.end = previousStart;
page.plan();
assert.strictEqual(routeRequests.length, 4, 'reversing a route must calculate its new direction');
callback(null, { data: { points: [page.start, page.end] } });
callback(null, { data: { stations: [] } });

page.useCurrentLocation();
const savedPoint = page.point;
const overlays = [...page.markers, page.routeLine];
Component.beforeDestroy.call(page);
success({ coords: { latitude: 45, longitude: 90 } });
assert.strictEqual(page.point, savedPoint, 'late callbacks must not update the destroyed view');
assert.strictEqual(page.map, null);
assert.strictEqual(page.mapReady, false);
assert.strictEqual(page.routeKey, null);
assert(removed.includes('listener'));
assert(removed.includes('clear'));
overlays.forEach(overlay => assert(removed.includes(overlay)));
assert.doesNotThrow(() => callback(null, { data: [] }));
console.log('Stations map, geolocation, request, and cleanup regression tests passed');
