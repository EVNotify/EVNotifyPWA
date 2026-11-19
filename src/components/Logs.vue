<template>
    <v-layout justify-center>
        <v-flex xs12 sm12 md6>
            <v-card>
                <v-alert v-if="loadError" type="error" :value="true">{{ loadError }}
                    <v-btn flat :disabled="loading" @click="loadLogs">Retry</v-btn>
                </v-alert>
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
                                <v-list-tile-sub-title>{{ convertDates(log.start, log.end, log.status) }}</v-list-tile-sub-title>
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
                <div v-else-if="!loadError">
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
    import logUtils from '../utils/log';

    export default {
        data: () => ({ logs: {}, loaded: false, loading: false, loadError: '' }),
        computed: {
            listImg() { return require('../assets/list.png'); }
        },
        methods: {
            convertSubHeader(date) {
                if (date === 'unknown') return 'Date unavailable';
                const [month, year] = date.split('_').map(Number);
                return this.$root.MomentJS([year, month]).format('MMMM YYYY');
            },
            convertIcon(charge) { return charge ? 'ev_station' : 'directions_car'; },
            convertDates(start, end, status) {
                return logUtils.dates({ start, end, status }, this.$root.MomentJS);
            },
            setSubtitle(log) {
                let text = '';
                if (log.start_soc != null && log.end_soc != null) text = `${log.start_soc}% -> ${log.end_soc}%`;
                if (!log.charge && log.distance > 0 && [log.start_cec, log.end_cec, log.start_ced, log.end_ced].every(Number.isFinite)) {
                    const consumption = ((log.end_ced - log.start_ced - (log.end_cec - log.start_cec)) / log.distance * 100).toFixed(1);
                    text += ` (Ø ${consumption} kWh/100km)`;
                } else if (log.charge && [log.start_cec, log.end_cec].every(Number.isFinite)) {
                    text += ` (${(log.end_cec - log.start_cec).toFixed(1)} kWh)`;
                }
                return text;
            },
            setActionText(log) {
                if (log.charge && log.average_kw != null) return `Ø ${log.average_kw} kW`;
                if (!log.charge && log.distance != null) return `~ ${log.distance} km`;
                return '';
            },
            loadLogs() {
                if (this.loading) return;
                this.loading = true;
                this.loaded = false;
                this.loadError = '';
                const fail = err => {
                    this.loading = false;
                    this.loadError = 'Could not load logs (' + err + ').';
                };
                const finish = (err, records) => {
                    if (err || !Array.isArray(records)) return fail(err || 'Invalid response');
                    const combined = records.slice().sort((a, b) =>
                        Number(logUtils.running(b)) - Number(logUtils.running(a)) || logUtils.date(b) - logUtils.date(a));
                    const logs = {};
                    combined.forEach(log => {
                        const time = logUtils.date(log);
                        const date = time ? new Date(time * 1000) : null;
                        const key = date ? `${date.getMonth()}_${date.getFullYear()}` : 'unknown';
                        if (!logs[key]) logs[key] = [];
                        logs[key].push(log);
                    });
                    this.logs = logs;
                    this.loaded = true;
                    this.loading = false;
                };
                const client = this.$root.EVNotify;
                if (client.version === 'V3') {
                    client.getLogs(null, finish);
                    return;
                }
                client.getLogs(0, (err, drives) => {
                    if (err || !Array.isArray(drives)) return fail(err || 'Invalid response');
                    client.getLogs(1, (chargeErr, charges) => {
                        if (chargeErr || !Array.isArray(charges)) return fail(chargeErr || 'Invalid response');
                        finish(null, charges.concat(drives));
                    });
                });
            }
        },
        mounted() { this.loadLogs(); }
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
