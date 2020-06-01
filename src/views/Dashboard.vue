<template>
  <v-layout v-if="loggedIn">
    <Dashboard />
    <BottomNavigation />
  </v-layout>
</template>

<script>
  import BottomNavigation from '../components/BottomNavigation';
  import Dashboard from '../components/Dashboard';
  import storage from '../utils/storage';

  export default {
    data: () => ({
      loggedIn: false
    }),
    components: {
      BottomNavigation,
      Dashboard
    },
    created() {
      if (!storage.getValue('user')) return this.$router.push('/login');
      this.loggedIn = true;
    }
  }
</script>