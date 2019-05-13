<template>
  <v-layout v-if="loggedIn">
    <Settings />
    <BottomNavigation />
  </v-layout>
</template>

<script>
  import BottomNavigation from '../components/BottomNavigation';
  import Settings from '../components/Settings';
  import Storage from '../utils/storage';

  export default {
    data: () => ({
      loggedIn: false
    }),
    components: {
      BottomNavigation,
      Settings
    },
    created() {
      if (!Storage.getValue('user')) return this.$router.push('/login');
      this.loggedIn = true;
    }
  }
</script>