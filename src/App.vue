<template>
  <v-app :dark=darkMode>
    <Header />
    <v-content>
      <transition name="fade">
        <router-view></router-view>
      </transition>
    </v-content>
  </v-app>
</template>

<script>
  import { EventBus } from './utils/event';
  import Header from './components/Header';
  import Storage from './utils/storage';

  export default {
    name: 'App',
    data: () => ({
      darkMode: false
    }),
    components: {
      Header
    },
    mounted() {
      this.darkMode = Storage.getValue('darkMode', false);
      EventBus.$on('darkMode', (useDarkMode) => this.darkMode = useDarkMode || false);
    }
  }
</script>