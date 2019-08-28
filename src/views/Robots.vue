<template>
    <v-layout>
        <Robots />
        <BottomNavigation />
    </v-layout>
</template>

<script>
    import BottomNavigation from '../components/BottomNavigation';
    import Robots from '../components/Robots';
    import Storage from '../utils/storage';

    export default {
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