<template>
    <v-layout>
        <Catlender />
        <BottomNavigation />
    </v-layout>
</template>

<script>
    import BottomNavigation from '../components/BottomNavigation';
    import Catlender from '../components/Catlender';
    import Storage from '../utils/storage';

    export default {
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