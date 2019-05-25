<template>
  <v-app>
    <Header />
    <v-content>
      <transition name="fade">
        <router-view></router-view>
      </transition>
    </v-content>
  </v-app>
</template>

<script>
  import Header from './components/Header';

  export default {
    name: 'App',
    components: {
      Header
    }
  }
</script>