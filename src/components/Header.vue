<template>
    <v-toolbar app absolute ref="header">
        <v-toolbar-title class="headline">
            <span>EVNotify </span>
            <span class="font-weight-light hidden-xs-only">Webinterface</span>
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-expand-transition>
            <div v-show="saved">
                <v-btn flat color="teal" class="save-btn" @click="emitSave()">
                    <v-icon>save</v-icon>
                </v-btn>
            </div>
        </v-expand-transition>

    </v-toolbar>
</template>

<script>
    import {
        EventBus
    } from '../utils/event';

    export default {
        data: () => ({
            saved: false
        }),
        methods: {
            emitSave() {
                EventBus.$emit('saved');
            }
        },
        mounted() {
            EventBus.$on('save', () => this.saved = true);
        }
    }
</script>

<style scoped>
    .save-btn {
        margin-right: 0;
        padding-right: 0;
    }
</style>

<style>
    .save-btn .v-btn__content {
        margin-left: 50px;
    }
</style>