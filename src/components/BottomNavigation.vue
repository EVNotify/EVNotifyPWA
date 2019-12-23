<template>
    <v-bottom-nav :value="true" fixed color="transparent" :style="{backgroundColor}">
        <v-btn flat color="teal" value="Dashboard" to="/">
            <span>Dashboard</span>
            <v-icon>dashboard</v-icon>
        </v-btn>
        <v-btn flat color="teal" value="Logs" to="/logs">
            <span>Logs</span>
            <v-icon>list</v-icon>
        </v-btn>
        <v-btn flat disabled color="teal" value="Stations">
            <span>Stations</span>
            <v-icon>ev_station</v-icon>
        </v-btn>
        <v-btn flat color="teal" value="Settings" to="/settings">
            <span>Settings</span>
            <v-icon>settings</v-icon>
        </v-btn>
    </v-bottom-nav>
</template>

<script>
import { EventBus } from '../utils/event'
import Storage from '../utils/storage';
    export default {
        data: () => ({
            backgroundColor: (Storage.getValue('darkMode') ? '#212121' : 'white') + ' !important'
        }),
        mounted() {
            EventBus.$on('darkMode', (useDarkMode) => {
                this.backgroundColor = (useDarkMode ? '#212121' : 'white') + ' !important';
            });
        }
    }
</script>

<style>

/* iPhone XR Portrait*/
@media only screen
and (device-width : 375px)
and (device-height : 812px)
and (-webkit-device-pixel-ratio : 2)
and (orientation: portrait) {
    .v-item-group.v-bottom-nav--fixed {
        height:71px !important;
    }
}

/* iPhone X,XS Portrait*/
@media only screen
and (device-width : 375px)
and (device-height : 812px)
and (-webkit-device-pixel-ratio : 3)
and (orientation: portrait) {
    .v-item-group.v-bottom-nav--fixed {
        height:71px !important;
    }
}

/* iPhone XS Max Portrait*/
@media only screen
and (device-width : 414px)
and (device-height : 896px)
and (-webkit-device-pixel-ratio : 3)
and (orientation: portrait){
    .v-item-group.v-bottom-nav--fixed {
        height:71px !important;
    }
}

/* iPhone XR Landscape*/
@media only screen
and (device-width : 375px)
and (device-height : 812px)
and (-webkit-device-pixel-ratio : 2)
and (orientation: landscape) {
    .v-item-group.v-bottom-nav--fixed {
        height:71px !important;
    }
}

/* iPhone X,XS Landscape*/
@media only screen
and (device-width : 375px)
and (device-height : 812px)
and (-webkit-device-pixel-ratio : 3)
and (orientation: landscape) {
    .v-item-group.v-bottom-nav--fixed {
        height:71px !important;
    }
}

/* iPhone XS Max Landscape*/
@media only screen
and (device-width : 414px)
and (device-height : 896px)
and (-webkit-device-pixel-ratio : 3)
and (orientation: landscape){
    .v-item-group.v-bottom-nav--fixed {
        height:71px !important;
    }
}
</style>
