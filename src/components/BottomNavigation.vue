<template>
    <v-layout>
        <v-bottom-nav :active.sync="bottomNav" :value="true" absolute color="transparent">
            <v-btn flat color="teal" value="Dashboard">
                <span>Dashboard</span>
                <v-icon>dashboard</v-icon>
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