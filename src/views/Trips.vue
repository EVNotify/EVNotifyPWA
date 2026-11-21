<template>
  <v-layout justify-center>
    <v-flex xs12 sm10 md8>
      <v-card class="ma-3 mb-5">
        <v-card-title class="headline">V3 Trips</v-card-title>
        <v-card-text>
          <v-alert v-if="error" type="error" :value="true">{{ error }}</v-alert>
          <v-alert v-if="createdTrip" type="success" :value="true">
            Trip created. Share code: <strong>{{ createdTrip.code }}</strong>
          </v-alert>

          <h3>Create a trip</h3>
          <v-text-field v-model.trim="form.name" label="Name (optional)"></v-text-field>
          <v-text-field v-model="form.startDate" type="datetime-local" label="Start date"></v-text-field>
          <v-text-field v-model="form.endDate" type="datetime-local" label="End date"></v-text-field>
          <v-select v-model="form.type" :items="types" label="Share"></v-select>
          <v-switch v-model="form.locationEnabled" label="Share location"></v-switch>
          <v-switch v-model="form.accessibleAfterEnd" label="Keep trip accessible after it ends"></v-switch>
          <v-btn color="primary" :disabled="busy" @click="create">Create trip</v-btn>

          <v-divider class="my-3"></v-divider>
          <h3>My trips</h3>
          <v-alert v-if="listError" type="error" :value="true">{{ listError }}
            <v-btn flat :disabled="loading || busy" @click="retryLoad">Retry loading trips</v-btn>
          </v-alert>
          <p v-if="loading">Loading trips…</p>
          <p v-else-if="!listError && !trips.length">No trips yet.</p>
          <v-card v-for="trip in trips" :key="trip.code" class="my-3">
            <v-card-title>{{ trip.name || trip.code }}</v-card-title>
            <v-card-text>
              {{ formatDate(trip.start) }} – {{ formatDate(trip.end) }}<br>
              Share code: <strong>{{ trip.code }}</strong>
            </v-card-text>
            <v-card-actions>
              <v-btn flat color="primary" :href="tripUrl(trip.code)" target="_blank" rel="noopener noreferrer">Open</v-btn>
              <v-btn flat @click="copyCode(trip.code)">Copy code</v-btn>
              <v-spacer></v-spacer>
              <v-btn flat color="error" :disabled="busy" @click="remove(trip)">Delete</v-btn>
            </v-card-actions>
          </v-card>
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
    loading: true,
    listRequestGeneration: 0,
    busy: false,
    error: '',
    listError: '',
    trips: [],
    createdTrip: null,
    form: { name: '', startDate: '', endDate: '', type: 'chargeAndDrive', locationEnabled: false, accessibleAfterEnd: false },
    types: [
      { text: 'Charges and drives', value: 'chargeAndDrive' },
      { text: 'Charges only', value: 'chargeOnly' },
      { text: 'Drives only', value: 'driveOnly' }
    ]
  }),
  created() {
    if (!Storage.getValue('user')) return this.$router.push('/login');
    if (this.$root.EVNotify.version !== 'V3') return this.$router.push('/');
    this.load();
  },
  methods: {
    formatDate(value) { return value ? new Date(value).toLocaleString() : 'Unknown date'; },
    tripUrl(code) { return 'https://trip.evnotify.de/?code=' + encodeURIComponent(code); },
    retryLoad() {
      if (this.loading || this.busy) return;
      this.load();
    },
    load() {
      const generation = ++this.listRequestGeneration;
      this.loading = true;
      this.listError = '';
      this.$root.EVNotify.getTrips((err, res) => {
        if (generation !== this.listRequestGeneration) return;
        this.loading = false;
        if (err) { this.listError = 'Could not load trips (' + err + ').'; return; }
        this.listError = '';
        const trips = res && Array.isArray(res.data) ? res.data.slice() : [];
        if (this.createdTrip && !trips.some(trip => trip.code === this.createdTrip.code)) trips.push(this.createdTrip);
        this.trips = trips.sort((a, b) => new Date(b.start) - new Date(a.start));
      });
    },
    create() {
      const start = new Date(this.form.startDate);
      const end = new Date(this.form.endDate);
      if (!isFinite(start.getTime()) || !isFinite(end.getTime()) || start <= new Date() || end <= start || end - start > 24 * 60 * 60 * 1000) {
        this.error = 'Choose a future start and an end after it, no more than 24 hours later.';
        return;
      }
      this.error = '';
      this.busy = true;
      this.$root.EVNotify.createTrip(Object.assign({}, this.form, { startDate: start.toISOString(), endDate: end.toISOString() }), (err, res) => {
        this.busy = false;
        if (err) { this.error = 'Could not create trip (' + err + ').'; return; }
        if (!res || !res.data || !res.data.code) { this.error = 'Trip created, but the server did not return its code. Refresh the list.'; this.load(); return; }
        this.createdTrip = res.data;
        this.load();
      });
    },
    copyCode(code) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).catch(() => window.prompt('Copy trip code:', code));
      } else window.prompt('Copy trip code:', code);
    },
    remove(trip) {
      if (!window.confirm('Delete this trip permanently?')) return;
      this.error = '';
      this.busy = true;
      this.$root.EVNotify.deleteTrip(trip.code, (err) => {
        this.busy = false;
        if (err) { this.error = 'Could not delete trip (' + err + ').'; return; }
        if (this.createdTrip && this.createdTrip.code === trip.code) this.createdTrip = null;
        this.trips = this.trips.filter(item => item.code !== trip.code);
        this.load();
      });
    }
  }
};
</script>
