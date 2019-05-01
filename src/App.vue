<template>
  <v-app>
    <v-toolbar app>
      <v-toolbar-title class="headline">
        <span>EVNotify </span>
        <span class="font-weight-light hidden-xs-only">Webinterface</span>
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn flat>
        <span class="mr-2">Logout</span>
      </v-btn>
    </v-toolbar>
    <v-content>
      <transition name="fade">
        <router-view></router-view>
      </transition>
    </v-content>


    <!-- <v-content>
      <Dashboard />
      <BottomNavigation />
    </v-content> -->
  </v-app>
</template>

<script>
  // import Dashboard from './components/Dashboard';
  // import BottomNavigation from './components/BottomNavigation';

  export default {
    name: 'App',
    components: {
      // BottomNavigation,
      // Dashboard
    },
    data() {
      return {
        //
      }
    }
  }
</script>