<template>
    <v-layout>
        <v-bottom-nav :value="true" fixed color="transparent" class="v-bottom-nav">
            <div>
                <img src="../../public/img/icons/apple-touch-icon.png"/>
            </div>
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
    .v-bottom-nav img {
        width:56px;
    }
</style>
