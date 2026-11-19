<template>
  <v-layout justify-center>
    <v-flex xs12 sm10 md6>
      <v-card class="ma-3 mb-5">
        <v-card-title class="headline">V3 Premium</v-card-title>
        <v-card-text>
          <v-alert v-if="error" type="error" :value="true">{{ error }}</v-alert>
          <v-alert v-if="statusError" type="error" :value="true">{{ statusError }}
            <v-btn flat :disabled="loading || busy" @click="load">Retry status</v-btn>
          </v-alert>
          <p v-if="loading">Loading premium status…</p>
          <p v-else-if="statusKnown">{{ premiumUntil ? 'Premium until ' + formattedExpiry : 'No active premium access.' }}</p>
          <v-text-field v-model.trim="voucher" label="Voucher code"></v-text-field>
          <v-btn :disabled="loading || busy || !voucher" color="primary" @click="redeem">Redeem voucher</v-btn>
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
  data: () => ({ loading: false, busy: false, error: '', statusError: '', statusKnown: false, premiumUntil: null, voucher: '' }),
  computed: {
    formattedExpiry() { return this.premiumUntil ? new Date(this.premiumUntil).toLocaleString() : ''; }
  },
  created() {
    if (!Storage.getValue('user')) return this.$router.push('/login');
    if (this.$root.EVNotify.version !== 'V3') return this.$router.push('/');
    this.load();
  },
  methods: {
    load() {
      if (this.loading || this.busy) return;
      this.loading = true;
      this.statusKnown = false;
      this.$root.EVNotify.getPremium((err, res) => {
        this.loading = false;
        this.statusError = err ? 'Could not load premium status (' + err + ').' : '';
        this.statusKnown = !err;
        if (!err) this.premiumUntil = res && res.data ? res.data.premiumUntil : null;
      });
    },
    redeem() {
      if (this.loading || this.busy || !this.voucher) return;
      this.busy = true;
      this.error = '';
      this.$root.EVNotify.redeemVoucher(this.voucher, (err, res) => {
        this.busy = false;
        if (err) this.error = 'Redemption failed (' + err + ').';
        else {
          this.premiumUntil = res && res.data ? res.data.premiumUntil : null;
          this.statusKnown = true;
          this.statusError = '';
          this.voucher = '';
        }
      });
    }
  }
};
</script>
