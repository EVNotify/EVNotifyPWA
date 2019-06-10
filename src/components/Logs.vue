<template>
    <v-layout>
        <v-flex xs12 sm6 offset-sm3>
            <v-card>
                <v-list two-line subheader>
                    <div v-for="(month, index) in logs" :key="index">
                        <v-subheader inset>{{ convertSubHeader(index) }}</v-subheader>
                        <v-list-tile v-for="log in logs[index]" :key="log.id" avatar>
                            <v-list-tile-avatar>
                                <v-icon class="teal lighten-1 white--text">{{ convertIcon(log.charge) }}</v-icon>
                            </v-list-tile-avatar>
                            <v-list-tile-content>
                                <v-list-tile-title>{{ log.title }}</v-list-tile-title>
                                <v-list-tile-sub-title>{{ convertDates(log.start, log.end) }}</v-list-tile-sub-title>
                            </v-list-tile-content>
                            <v-list-tile-action>
                                <v-btn icon ripple>
                                    <v-icon color="grey lighten-1">info</v-icon>
                                </v-btn>
                            </v-list-tile-action>
                        </v-list-tile>
                        <v-divider inset></v-divider>
                    </div>
                </v-list>
            </v-card>
        </v-flex>
    </v-layout>
</template>

<script>
    export default {
        data: () => ({
            logs: {}
        }),
        methods: {
            convertSubHeader(date) {
                return this.$root.MomentJS(date.split('_').reverse()).format('MMMM YYYY');
            },
            convertIcon(charge) {
                return charge ? 'ev_station' : 'directions_car';
            },
            convertDates(start, end) {
                start = new Date(start * 1000);
                end = new Date(end * 1000);

                return `${this.$root.MomentJS(end).format('MMMM Do YYYY')} ${this.$root.MomentJS(start).format('HH:mm')}-${this.$root.MomentJS(end).format('HH:mm')}`
            }
        },
        mounted() {
            var self = this;

            self.$root.EVNotify.getLogs(0, (err, driveLogs) => {
                if (!err && driveLogs) {
                    self.$root.EVNotify.getLogs(1, (err, chargeLogs) => {
                        if (!err && chargeLogs) {
                            const combinedLogs = chargeLogs.concat(driveLogs)
                                .sort((a, b) => b.end - a.end);
                            const logs = {};

                            combinedLogs.forEach((log) => {
                                const date = new Date(log.end * 1000);
                                const index = `${date.getMonth()}_${date.getFullYear()}`;

                                if (!logs[index]) logs[index] = [];
                                logs[index].push(log);
                            });
                            self.logs = logs;
                        }
                    });
                }
            });
        }
    }
</script>

<style scoped>
    .layout {
        width: 100%;
    }
    .v-card {
        padding-bottom: 56px;
    }
</style>