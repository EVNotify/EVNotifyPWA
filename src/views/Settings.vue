<template>
  <v-layout v-if="loggedIn">
    <Settings />
    <BottomNavigation />
  </v-layout>
</template>

<script>
  import BottomNavigation from '../components/BottomNavigation';
  import Settings from '../components/Settings';
  import storage from '../utils/storage';

  export default {
    data: () => ({
      loggedIn: false
    }),
    components: {
      BottomNavigation,
      Settings
    },
    created() {
      if (!storage.getValue('user')) return this.$router.push('/login');
      this.loggedIn = true;
    }
  }
</script>