<template>
  <v-app>
    <v-toolbar app>
      <v-toolbar-title class="headline">
        <span>EVNotify </span>
        <span class="font-weight-light hidden-xs-only">Webinterface</span>
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn flat v-if="loggedIn()" @click="logout()">
        <span class="mr-2">Logout</span>
      </v-btn>
    </v-toolbar>
    <v-content>
      <transition name="fade">
        <router-view></router-view>
      </transition>
    </v-content>
  </v-app>
</template>

<script>
  import Storage from './utils/storage';

  export default {
    name: 'App',
    methods: {
      loggedIn() {
        return this.$router.currentRoute.name !== 'login';
      },
      logout() {
        Storage.removeValue('user');
        this.$router.push('/login');
      }
    }
  }
</script>