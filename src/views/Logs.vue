<template>
  <v-layout v-if="loggedIn">
    <Logs />
    <BottomNavigation />
  </v-layout>
</template>

<script>
  import BottomNavigation from '../components/BottomNavigation';
  import Logs from '../components/Logs';
  import storage from '../utils/storage';

  export default {
    data: () => ({
      loggedIn: false
    }),
    components: {
      BottomNavigation,
      Logs
    },
    created() {
      if (!storage.getValue('user')) return this.$router.push('/login');
      this.loggedIn = true;
    }
  }
</script>