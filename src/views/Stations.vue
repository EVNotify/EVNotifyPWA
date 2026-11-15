<template>
  <v-layout justify-center>
    <v-flex xs12 sm11 md9>
      <v-card class="ma-3 mb-5">
        <v-card-title class="headline">V3 Stations and routes</v-card-title>
        <v-card-text>
          <v-alert v-if="error" type="error" :value="true">{{ error }}</v-alert>
          <p>Choose a point on the map for station search, or choose a start and end for a route.</p>
          <v-btn :disabled="!mapReady || busy || locating" @click="choose = 'point'">Choose search point</v-btn>
          <v-btn :disabled="!mapReady || busy || locating" @click="choose = 'start'">Choose route start</v-btn>
          <v-btn :disabled="!mapReady || busy || locating" @click="choose = 'end'">Choose route end</v-btn>
          <v-btn :disabled="!mapReady || busy || locating" @click="useCurrentLocation">Use current location</v-btn>
          <p>Map click sets: <strong>{{ choose }}</strong></p>
          <div ref="map" class="station-map"></div>
          <p>Search: {{ formatPoint(point) }} | Start: {{ formatPoint(start) }} | End: {{ formatPoint(end) }}</p>
          <v-text-field v-model.number="minKW" type="number" min="0" label="Minimum power (kW)"></v-text-field>
          <v-btn :disabled="!mapReady || busy || locating || !point" color="primary" @click="search">Find stations</v-btn>
          <v-btn :disabled="!mapReady || busy || locating || !point" @click="nearest">Nearest station</v-btn>
          <v-btn :disabled="!mapReady || busy || locating || !start || !end" color="primary" @click="plan">Plan route</v-btn>
          <p v-if="busy || locating">Loading…</p>
          <p v-else-if="searched && !error && !stations.length">No stations found.</p>
          <v-btn v-if="!mapReady" @click="initMap">Retry map</v-btn>
          <v-list v-if="stations.length">
            <v-list-tile v-for="station in stations" :key="station.uuid" @click="focusStation(station)">
              <v-list-tile-content>
                <v-list-tile-title>{{ station.location && (station.location.title || station.location.city) || station.uuid }}</v-list-tile-title>
                <v-list-tile-sub-title>{{ station.maxKW }} kW · {{ station.location && station.location.street }} {{ station.location && station.location.city }}</v-list-tile-sub-title>
              </v-list-tile-content>
            </v-list-tile>
          </v-list>
        </v-card-text>
      </v-card>
    </v-flex>
    <BottomNavigation />
  </v-layout>
</template>

<script>
import BottomNavigation from '../components/BottomNavigation';
import Storage from '../utils/storage';

export default {
  components: { BottomNavigation },
  data: () => ({
    map: null, mapReady: false, mapListener: null, markers: [], routeLine: null,
    choose: 'point', point: null, start: null, end: null, minKW: 50,
    stations: [], busy: false, locating: false, searched: false, error: '', disposed: false
  }),
  created() {
    if (!Storage.getValue('user')) return this.$router.push('/login');
    if (this.$root.EVNotify.version !== 'V3') return this.$router.push('/');
  },
  mounted() { this.initMap(); },
  beforeDestroy() {
    this.disposed = true;
    this.mapReady = false;
    if (this.mapListener && this.mapListener.remove) this.mapListener.remove();
    this.clearMarkers();
    if (this.routeLine) this.routeLine.setMap(null);
    if (this.map && window.google && window.google.maps && window.google.maps.event) {
      window.google.maps.event.clearInstanceListeners(this.map);
    }
    this.map = null;
    this.mapListener = null;
    this.routeLine = null;
  },
  methods: {
    initMap() {
      if (this.disposed || this.mapReady) return;
      if (!window.google || !window.google.maps) { this.error = 'Google Maps is unavailable.'; return; }
      try {
        this.map = new window.google.maps.Map(this.$refs.map, { center: { lat: 52.52, lng: 13.405 }, zoom: 6 });
        this.mapListener = this.map.addListener('click', event => {
          if (!this.mapReady || this.busy || this.locating || this.disposed) return;
          const point = { lat: event.latLng.lat(), lng: event.latLng.lng() };
          if (!this.validPoint(point)) { this.error = 'Choose valid coordinates.'; return; }
          this[this.choose] = point;
          this.error = '';
          this.drawSelection();
        });
        this.mapReady = true;
        this.error = '';
      } catch (err) {
        this.map = null;
        this.error = 'Google Maps could not be initialized. Retry when Maps is available.';
      }
    },
    validPoint(point) {
      return !!point && Number.isFinite(point.lat) && Math.abs(point.lat) <= 90 &&
        Number.isFinite(point.lng) && Math.abs(point.lng) <= 180;
    },
    formatPoint(point) { return this.validPoint(point) ? point.lat.toFixed(5) + ', ' + point.lng.toFixed(5) : 'not set'; },
    validPower() { return this.minKW !== '' && this.minKW != null && Number.isFinite(Number(this.minKW)) && Number(this.minKW) >= 0; },
    useCurrentLocation() {
      if (!this.mapReady || !this.map || this.disposed || this.locating || this.busy) return;
      if (!navigator.geolocation) { this.error = 'Location access is unavailable. Choose a point on the map.'; return; }
      const target = this.choose;
      this.locating = true;
      const fail = () => {
        if (this.disposed) return;
        this.locating = false;
        this.error = 'Location access failed or was denied. Choose a point on the map.';
      };
      try {
        navigator.geolocation.getCurrentPosition(position => {
          if (this.disposed) return;
          this.locating = false;
          if (!this.mapReady || !this.map) return;
          const point = { lat: position.coords.latitude, lng: position.coords.longitude };
          if (!this.validPoint(point)) { this.error = 'Location returned invalid coordinates.'; return; }
          this.error = '';
          this[target] = point;
          this.map.setCenter(point);
          this.map.setZoom(11);
          this.drawSelection();
        }, fail, { timeout: 15000 });
      } catch (err) { fail(); }
    },
    clearMarkers() {
      this.markers.forEach(marker => marker.setMap(null));
      this.markers = [];
    },
    drawSelection() {
      if (!this.mapReady || !this.map || this.disposed) return;
      this.clearMarkers();
      [['point', this.point], ['start', this.start], ['end', this.end]].forEach(([title, point]) => {
        if (this.validPoint(point)) this.markers.push(new window.google.maps.Marker({ map: this.map, position: point, title }));
      });
      this.stations.forEach(station => {
        const position = station.location && { lat: station.location.latitude, lng: station.location.longitude };
        if (this.validPoint(position)) this.markers.push(new window.google.maps.Marker({
          map: this.map, position, title: station.location.title || station.location.city || 'Station'
        }));
      });
    },
    focusStation(station) {
      const point = station.location && { lat: station.location.latitude, lng: station.location.longitude };
      if (this.mapReady && this.map && this.validPoint(point)) this.map.panTo(point);
    },
    finishStations(err, res, route) {
      if (this.disposed) return;
      this.busy = false;
      if (err) { this.error = 'Station request failed (' + err + ').'; return; }
      const data = res && res.data;
      this.stations = route ? (data && Array.isArray(data.stations) ? data.stations : []).map(item => item.station).filter(Boolean) :
        (Array.isArray(data) ? data : data ? [data] : []);
      this.searched = true;
      this.drawSelection();
    },
    ready(points) {
      if (this.disposed || this.busy || this.locating) return false;
      if (!this.mapReady || !this.map) { this.error = 'Google Maps is unavailable.'; return false; }
      if (!points.every(this.validPoint)) { this.error = 'Choose valid coordinates on the map.'; return false; }
      if (!this.validPower()) { this.error = 'Enter a valid minimum power.'; return false; }
      this.busy = true;
      this.error = '';
      return true;
    },
    search() {
      if (!this.ready([this.point])) return;
      this.$root.EVNotify.getStations(this.point, Number(this.minKW), (err, res) => this.finishStations(err, res, false));
    },
    nearest() {
      if (!this.ready([this.point])) return;
      this.$root.EVNotify.getNearestStation(this.point, Number(this.minKW), (err, res) => this.finishStations(err, res, false));
    },
    plan() {
      if (!this.ready([this.start, this.end])) return;
      this.$root.EVNotify.getRoute(this.start, this.end, (err, res) => {
        if (this.disposed) return;
        if (err) { this.busy = false; this.error = 'Route calculation failed (' + err + ').'; return; }
        const points = res && res.data && res.data.points;
        if (!Array.isArray(points) || !points.length || !points.every(this.validPoint)) {
          this.busy = false; this.error = 'No valid route was found.'; return;
        }
        if (!this.mapReady || !this.map) { this.busy = false; this.error = 'Google Maps is unavailable.'; return; }
        if (this.routeLine) this.routeLine.setMap(null);
        this.routeLine = new window.google.maps.Polyline({ map: this.map, path: points, strokeColor: '#1976D2' });
        const bounds = new window.google.maps.LatLngBounds();
        points.forEach(point => bounds.extend(point));
        this.map.fitBounds(bounds);
        this.$root.EVNotify.getRouteStations(this.start, this.end, Number(this.minKW), (stationErr, stationRes) => this.finishStations(stationErr, stationRes, true));
      });
    }
  }
};
</script>

<style scoped>
.station-map { width: 100%; height: 420px; }
</style>
