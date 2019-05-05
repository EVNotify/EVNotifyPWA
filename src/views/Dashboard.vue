<template>
  <v-layout v-if="loggedIn">
    <Dashboard />
    <BottomNavigation />
  </v-layout>
</template>

<script>
  import BottomNavigation from '../components/BottomNavigation';
  import Dashboard from '../components/Dashboard';
  import Storage from '../utils/storage';

  export default {
    data: () => ({
      loggedIn: false
    }),
    components: {
      BottomNavigation,
      Dashboard
    },
    created() {
      if (!Storage.getValue('user')) return this.$router.push('/login');
      this.loggedIn = true;
    }
  }
</script>