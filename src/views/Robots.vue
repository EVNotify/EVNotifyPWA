<template>
    <v-layout>
        <v-alert v-if="isV3" type="info" :value="true">Robots are unavailable with V3.</v-alert>
        <Robots v-else />
        <BottomNavigation />
    </v-layout>
</template>

<script>
    import BottomNavigation from '../components/BottomNavigation';
    import Robots from '../components/Robots';
    import Storage from '../utils/storage';

  export default {
    computed: {
      isV3() { return this.$root.EVNotify.version === 'V3'; }
    },
        data: () => ({
            loggedIn: false
        }),
        components: {
            BottomNavigation,
            Robots
        },
        created() {
            if (!Storage.getValue('user')) return this.$router.push('/login');
            this.loggedIn = true;
        }
    }
</script>
