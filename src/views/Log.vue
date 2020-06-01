<template>
  <v-layout v-if="loggedIn">
    <Log />
    <BottomNavigation />
  </v-layout>
</template>

<script>
  import BottomNavigation from '../components/BottomNavigation';
  import Log from '../components/Log';
  import storage from '../utils/storage';

  export default {
    data: () => ({
      loggedIn: false
    }),
    components: {
      BottomNavigation,
      Log
    },
    created() {
      if (!storage.getValue('user')) return this.$router.push('/login');
      this.loggedIn = true;
    }
  }
</script>