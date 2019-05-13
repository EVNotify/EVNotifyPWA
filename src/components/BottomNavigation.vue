<template>
    <v-layout>
        <v-bottom-nav :value="true" fixed color="transparent">
            <v-btn flat color="teal" value="Dashboard" to="/">
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
            <v-btn flat color="teal" value="Settings" to="/settings">
                <span>Settings</span>
                <v-icon>settings</v-icon>
            </v-btn>
        </v-bottom-nav>
    </v-layout>
</template>

<script>
    export default {}
</script>

<style>
.v-bottom-nav {
    background-color: white !important;
}
</style>
