<template>
    <v-layout justify-center>
        <v-flex xs12 sm12 md6>
            <v-card>
                <v-list three-line subheader v-if="loaded && Object.keys(logs).length">
                    <div v-for="(month, index) in logs" :key="index">
                        <v-subheader inset>{{ convertSubHeader(index) }}</v-subheader>
                        <v-list-tile v-for="log in logs[index]" :key="log.id" avatar @click="$router.push({name: 'log', query: {id: log.id}})">
                            <v-list-tile-avatar>
                                <v-icon class="teal lighten-1 white--text">{{ convertIcon(log.charge) }}</v-icon>
                            </v-list-tile-avatar>
                            <v-list-tile-content>
                                <v-list-tile-title>{{ log.title }}</v-list-tile-title>
                                <v-list-tile-sub-title>{{ setSubtitle(log) }}</v-list-tile-sub-title>
                                <v-list-tile-sub-title>{{ convertDates(log.start, log.end) }}</v-list-tile-sub-title>
                            </v-list-tile-content>
                            <v-list-tile-action>
                                <v-list-tile-action-text>{{ setActionText(log) }}</v-list-tile-action-text>
                                <v-btn icon ripple @click="$router.push({name: 'log', query: {id: log.id}})">
                                    <v-icon color="grey lighten-1">info</v-icon>
                                </v-btn>
                            </v-list-tile-action>
                        </v-list-tile>
                        <v-divider inset></v-divider>
                    </div>
                </v-list>
                <div v-else>
                    <v-img :src="listImg" class="empty-state-img"></v-img>
                    <p class="headline text-xs-center" v-if="!loaded">Loading logs. Please wait...</p>
                    <div v-else>
                        <p class="headline text-xs-center">No logs found</p>
                        <p class="subheading text-xs-center">Logs are automatically created, once you start monitoring your charges and drives. After finishing the monitoring, it will be processed on the server and generated to a log after a few minutes.</p>
                    </div>
                </div>
            </v-card>
        </v-flex>
    </v-layout>
</template>

<script>
    export default {
        data: () => ({
            logs: {},
            loaded: false
        }),
        computed: {
            listImg() {
                return require('../assets/list.png');
            }
        },
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
            },
            setSubtitle(log) {
                let text = '';

                if (log.start_soc && log.end_soc) {
                    text = `${log.start_soc}% -> ${log.end_soc}%`;
                }

                if (!log.charge && log.distance && log.start_cec && log.end_cec && log.start_ced && log.end_ced) {
                    const consumption = ((((log.end_ced - log.start_ced) - (log.end_cec - log.start_cec)) || 0) / log.distance * 100).toFixed(1);

                    text += ` (Ø ${consumption} kWh/100km)`;
                } else if (log.charge && log.start_cec && log.end_cec) {
                    const charged = (log.end_cec - log.start_cec || 0).toFixed(1);

                    text += ` (${charged} kWh)`;
                }
                
                return text;
            },
            setActionText(log) {
                if (log.charge && log.average_kw) {
                    return `Ø ${log.average_kw} kW`;
                } else if (!log.charge && log.distance) {
                    return `~ ${log.distance} km`;
                }

                return '';
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
                            self.loaded = true;
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
        min-height: 100vh;
    }
    .empty-state-img {
        max-height: 100px;
    }
</style>

<style>
    .empty-state-img .v-image__image {
        width: 100px;
        height: 100px;
        left: calc(50% - 50px);
        top: 10%;
    }
</style>
