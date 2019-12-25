<template>
    <v-layout>
        <Robots />
        <BottomNavigation />
    </v-layout>
</template>

<script>
    import BottomNavigation from '../components/BottomNavigation';
    import Robots from '../components/Robots';
    import storage from '../utils/storage';

    export default {
        data: () => ({
            loggedIn: false
        }),
        components: {
            BottomNavigation,
            Robots
        },
        created() {
            if (!storage.getValue('user')) return this.$router.push('/login');
            this.loggedIn = true;
        }
    }
</script>