<template>
    <v-layout>
        <v-alert v-if="isV3" type="info" :value="true">Cats are unavailable with V3.</v-alert>
        <Catlender v-else />
        <BottomNavigation />
    </v-layout>
</template>

<script>
    import BottomNavigation from '../components/BottomNavigation';
    import Catlender from '../components/Catlender';
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
            Catlender
        },
        created() {
            if (!Storage.getValue('user')) return this.$router.push('/login');
            this.loggedIn = true;
        }
    }
</script>
