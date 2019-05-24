<template>
  <v-app>
    <v-toolbar app absolute>
      <v-toolbar-title class="headline">
        <span>EVNotify </span>
        <span class="font-weight-light hidden-xs-only">Webinterface</span>
      </v-toolbar-title>
    </v-toolbar>
    <v-content>
      <transition name="fade">
        <router-view></router-view>
      </transition>
    </v-content>
  </v-app>
</template>

<script>
  export default {
    name: 'App'
  }
</script>