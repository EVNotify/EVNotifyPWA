<template>
  <v-layout v-if="loggedIn">
    <Logs />
    <BottomNavigation />
  </v-layout>
</template>

<script>
  import BottomNavigation from '../components/BottomNavigation';
  import Logs from '../components/Logs';
  import Storage from '../utils/storage';

  export default {
    data: () => ({
      loggedIn: false
    }),
    components: {
      BottomNavigation,
      Logs
    },
    created() {
      if (!Storage.getValue('user')) return this.$router.push('/login');
      this.loggedIn = true;
    }
  }
</script>