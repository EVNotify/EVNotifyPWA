<template>
    <v-layout>
        <v-bottom-nav :active.sync="bottomNav" :value="true" fixed color="transparent">
            <v-btn flat color="teal" value="Dashboard">
                <span>Dashboard</span>
                <v-icon>dashboard</v-icon>
            </v-btn>
            <v-btn flat color="teal" value="Logs">
                <span>Logs</span>
                <v-icon>list</v-icon>
            </v-btn>
            <v-btn flat color="teal" value="Stations">
                <span>Stations</span>
                <v-icon>ev_station</v-icon>
            </v-btn>
            <v-btn flat color="teal" value="Settings">
                <span>Settings</span>
                <v-icon>settings</v-icon>
            </v-btn>
        </v-bottom-nav>
    </v-layout>
</template>

<script>
    export default {
        data: () => ({
            bottomNav: 'Dashboard'
        })
    }
</script>

<style>
.v-bottom-nav {
    background-color: white !important;
}
</style>
