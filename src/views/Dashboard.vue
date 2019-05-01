<template>
  <v-layout>
    <Dashboard />
    <BottomNavigation />
  </v-layout>

</template>

<script>
  import BottomNavigation from '../components/BottomNavigation';
  import Dashboard from '../components/Dashboard';

  export default {
    components: {
      BottomNavigation,
      Dashboard
    }
  }
</script>