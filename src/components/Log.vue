<template>
    <v-layout justify-center>
        <v-dialog v-model="showBtnExplaination" max-width="290" persistent scrollable>
            <v-card>
                <v-card-title class="headline">Why?</v-card-title>
                <v-card-text>
                    Besides the fact, that pre-rendering all the data in the page, even when not required, is not good
                    for
                    performance,
                    displaying the map costs also real money for me as a developer.
                    Developing <b>EVNotify</b> costs of course a <b>lot of money</b>, so even when I'm doing this in my
                    free time and
                    providing
                    the services to you for free, it is highly appreciated, if you donate. This helps a lot.
                    Thank you.<br><br>
                    <a href="https://github.com/EVNotify/EVNotify/wiki/Donation">Read more, how you can help</a>
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn color="green darken-1" flat @click="showBtnExplaination = false">Close</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
        <v-flex xs12 sm12 md6>
            <p v-if="loading">Loading log…</p>
            <v-alert v-if="loadError" type="error" :value="true">{{ loadError }}
                <v-btn flat :disabled="loading || busy || historyLoading" @click="loadLog">Retry</v-btn>
            </v-alert>
            <v-alert v-if="actionError" type="error" :value="true">{{ actionError }}</v-alert>
            <v-card class="mx-auto" v-if="log.id" v-show="!showChart && !showMap">
                <v-alert v-if="log.historyError" type="info" :value="true">{{ log.historyError }}
                    <v-btn flat :disabled="loading || busy || historyLoading" :loading="historyLoading" @click="retryHistory">Retry history</v-btn>
                </v-alert>
                <v-card-title>
                    <v-icon class="mr-5" size="64" @click="$router.push('/logs')">chevron_left</v-icon>
                    <v-btn v-if="$root.EVNotify.version === 'V3'" flat color="error" :disabled="busy" @click="removeLog">Delete log</v-btn>
                    <v-layout column align-start class="average-container-text">
                        <div class="caption grey--text text-uppercase">Average</div>
                        <div>
                            <span class="display-2 font-weight-black">{{ formatNumber(avgKW) }}</span>
                            <strong>kW</strong>
                        </div>
                    </v-layout>
                </v-card-title>
                <v-sheet color="transparent" class="kw-chart-sheet">
                    <v-sparkline :value="kWChartValues" :gradient="['#1feaea', '#ffd200', '#f72047']"
                        stroke-linecap="round" smooth>
                        <template v-slot:label="item">{{ item.value }}</template>
                    </v-sparkline>
                </v-sheet>
                <v-container>
                    <v-timeline dense clipped>
                        <v-timeline-item fill-dot class="white--text mb-2" color="indigo" large>
                            <template v-slot:icon>
                                <v-icon color="white" v-if="log.charge">ev_station</v-icon>
                                <v-icon color="white" v-else>drive_eta</v-icon>
                            </template>
                            <v-text-field hide-details flat label="Log title" solo v-model="log.title" @input="detectChange()">
                                <template v-slot:append>
                                    <v-btn class="mx-0" :disabled="busy || !saveBtnHighlight" @click="save()" :color="btnHighlightColor">Save</v-btn>
                                </template>
                            </v-text-field>
                            <div class="total-time">Duration: {{ totalTime }}h</div>
                        </v-timeline-item>
                        <v-timeline-item class="mb-1">
                            <v-flex>
                                <div class="cadivtion">{{ logDate }}</div>
                                <div v-if="chargedEnergy != null || dischargedEnergy != null || startCEC != null || startCED != null">
                                    <div class="caption" v-if="log.charge">charged: {{ formatNumber(chargedEnergy) }} kWh {{ startODO != null ? ' - ' + startODO + ' km (ODO)' : '' }}</div>
                                    <div class="caption" v-else>consumed: {{ formatNumber(dischargedEnergy)}} kWh<br>recuperated: {{ formatNumber(chargedEnergy) }} kWh</div>
                                </div>
                                <div class="caption" v-if="!log.charge">Ø {{ formatNumber(consumption) }} kWh/100km | Ø {{ formatNumber(avgSpeed, 2) }} km/h | {{ formatNumber(distance, 2) }} km driven</div>
                            </v-flex>
                        </v-timeline-item>
                        <v-timeline-item class="mb-3" small color="accent">
                            <v-layout justify-space-between>
                                <v-flex xs-7>
                                    <v-chip class="white--text ml-0" color="accent" label small>Start</v-chip>
                                    {{ startSOC }} {{ !log.charge && startODO != null ? ' - ' + startODO + ' km (ODO)' : '' }}
                                    <div class="caption" v-if="startCEC != null || startCED != null">{{ formatNumber(startCEC) }} kWh (CEC) / <br> {{ formatNumber(startCED) }} kWh (CED)</div>
                                </v-flex>
                                <v-flex xs-5 text-xs-right>{{ startTime }}</v-flex>
                            </v-layout>
                        </v-timeline-item>
                        <v-timeline-item small color="primary" class="last-timeline-item">
                            <v-layout justify-space-between>
                                <v-flex xs-7>
                                    <v-chip class="white--text ml-0" color="primary" label small>{{ log.status === 'running' ? 'Current' : 'End' }}</v-chip>
                                    {{ endSOC }} {{ !log.charge && endODO != null ? ' - ' + endODO + ' km (ODO)' : '' }}
                                    <div class="caption" v-if="endCEC != null || endCED != null">{{ formatNumber(endCEC) }} kWh (CEC) / <br> {{ formatNumber(endCED) }} kWh (CED)</div>
                                </v-flex>
                                <v-flex xs-5 text-xs-right>{{ endTime }}</v-flex>
                            </v-layout>
                        </v-timeline-item>
                    </v-timeline>
                </v-container>
                <v-container class="btn-container">
                    <v-btn small color="primary" @click="showMap = true" :disabled="!validCoords">Show Map</v-btn>
                    <v-btn small color="primary" @click="showChart = true">Show Chart</v-btn>
                </v-container>
                <p class="caption text-xs-center font-weight-light font-italic btn-explain-text"
                    @click="showBtnExplaination = true">Why don't I see this immediately?</p>
            </v-card>
            <v-card v-show="showChart">
                <v-container class="btn-container">
                    <v-btn small color="primary" @click="showChart = false">Show summary</v-btn>
                </v-container>
                <chart-line ref="chart"></chart-line>
            </v-card>
            <v-card v-show="showMap">
                <v-container class="btn-container">
                    <v-btn class="primary" @click="showMap = false">Show summary</v-btn>
                </v-container>
                <div>
                    <div id="map" ref="map"></div>
                </div>
            </v-card>
        </v-flex>
    </v-layout>
</template>

<script>
    import { Line } from 'vue-chartjs';
    import logUtils from '../utils/log';

    export default {
        data: () => ({
            id: 0,
            saveBtnHighlight: false,
            originalTitle: '',
            loadError: '',
            actionError: '',
            loading: false,
            historyLoading: false,
            busy: false,
            disposed: false,
            logMap: null,
            mapOverlays: [],
            log: {},
            showMap: false,
            showChart: false,
            validCoords: false,
            showBtnExplaination: false
        }),
        components: {
            'chart-line': Line
        },
        methods: {
            loadLog() {
                if (this.disposed || this.loading || this.busy || this.historyLoading) return;
                this.loading = true;
                this.loadError = '';
                this.$root.EVNotify.getLog(this.id, (err, log) => {
                    if (this.disposed) return;
                    this.loading = false;
                    if (err || !log) {
                        this.loadError = 'Could not load log (' + (err || 'Invalid response') + ').';
                        return;
                    }
                    this.log = log;
                    this.originalTitle = log.title;
                    this.saveBtnHighlight = false;
                    this.refreshVisualizations();
                });
            },
            retryHistory() {
                if (this.disposed || this.loading || this.busy || this.historyLoading || !this.log.id || !this.log.historyError) return;
                this.historyLoading = true;
                this.$root.EVNotify.getLogHistory(this.id, (err, stats) => {
                    if (this.disposed) return;
                    this.historyLoading = false;
                    if (err) {
                        this.log.historyError = 'Log history is unavailable (' + err + ').';
                        return;
                    }
                    this.log = Object.assign({}, this.log, { stats, historyError: null });
                    this.refreshVisualizations();
                });
            },
            refreshVisualizations() {
                this.$nextTick(() => {
                    if (this.disposed) return;
                    if (this.$refs.chart) this.$refs.chart.renderChart(this.chartData, {
                        scales: { xAxes: [{ ticks: { autoSkip: true, maxTicksLimit: 15 } }] }
                    });
                    this.renderMap();
                });
            },
            clearMap() {
                this.mapOverlays.forEach(overlay => overlay.setMap(null));
                this.mapOverlays = [];
                if (this.logMap && window.google && window.google.maps && window.google.maps.event) {
                    window.google.maps.event.clearInstanceListeners(this.logMap);
                }
                this.logMap = null;
                this.validCoords = false;
            },
            renderMap() {
                this.clearMap();
                const data = this.mapData;
                if (!this.$refs.map || !data.length || !window.google || !window.google.maps) return;
                try {
                    const maps = window.google.maps;
                    const bounds = new maps.LatLngBounds();
                    data.forEach(point => bounds.extend(point));
                    this.logMap = new maps.Map(this.$refs.map, { zoom: 10, center: bounds.getCenter() });
                    const line = new maps.Polyline({ path: data, geodesic: true, strokeColor: '#FF0000', strokeOpacity: 1, strokeWeight: 2 });
                    line.setMap(this.logMap);
                    this.mapOverlays.push(line);
                    const start = new maps.Marker({ position: data[0], label: 'S', map: this.logMap });
                    const end = new maps.Marker({ position: data[data.length - 1], label: 'E', map: this.logMap });
                    this.mapOverlays.push(start, end);
                    const startInfo = new maps.InfoWindow({ content: `Start point from ${this.startTime}` });
                    const endInfo = new maps.InfoWindow({ content: `End point from ${this.endTime}` });
                    start.addListener('click', () => { endInfo.close(); startInfo.open(this.logMap, start); });
                    end.addListener('click', () => { startInfo.close(); endInfo.open(this.logMap, end); });
                    this.validCoords = true;
                } catch (err) {
                    this.clearMap();
                    this.actionError = 'The log map could not be loaded. The summary and chart remain available.';
                }
            },
            detectChange() {
                this.saveBtnHighlight = this.originalTitle !== this.log.title;
            },
            displayTime(unix) {
                return logUtils.timestamp(unix) ? this.$root.MomentJS(unix * 1000).format('HH:mm:ss') : '–';
            },
            getSOCFromStats(type) { return logUtils.soc(this.log, type); },
            getValueFromStats(field, type) { return logUtils.value(this.log, field, type); },
            formatNumber(value, digits = 1) { return Number.isFinite(value) ? value.toFixed(digits) : '–'; },
            formatSOC(value) { return Number.isFinite(value) ? value + '%' : '–'; },
            save() {
                if (this.busy) return;
                this.busy = true;
                this.actionError = '';
                const title = this.log.title;
                const log = { ...this.log };
                delete log.stats;
                this.$root.EVNotify.updateLog(log, err => {
                    this.busy = false;
                    if (err) this.actionError = 'Could not save log (' + err + ').';
                    else {
                        this.originalTitle = title;
                        this.detectChange();
                    }
                });
            },
            removeLog() {
                if (this.busy || !window.confirm('Delete this log permanently?')) return;
                this.busy = true;
                this.actionError = '';
                this.$root.EVNotify.deleteLog(this.id, err => {
                    this.busy = false;
                    if (err) this.actionError = 'Could not delete log (' + err + ').';
                    else this.$router.push('/logs');
                });
            }
        },
        computed: {
            btnHighlightColor() {
                return this.saveBtnHighlight ? 'primary' : 'light';
            },
            startTime() {
                return this.displayTime(this.log.start);
            },
            endTime() {
                return logUtils.running(this.log) ? 'Ongoing' : logUtils.timestamp(this.log.end) ? this.displayTime(this.log.end) : '–';
            },
            totalTime() { return logUtils.duration(this.log); },
            logDate() {
                return logUtils.timestamp(this.log.start) ? this.$root.MomentJS(this.log.start * 1000).format('MMMM Do YYYY') : 'Date unavailable';
            },
            startSOC() {
                return this.formatSOC(this.log.start_soc != null ? this.log.start_soc : this.getSOCFromStats('start'));
            },
            endSOC() {
                const soc = logUtils.running(this.log) && this.log.current_soc != null ? this.log.current_soc : this.log.end_soc;
                return this.formatSOC(soc != null ? soc : this.getSOCFromStats('end'));
            },
            startODO() {
                return this.log.start_odo != null ? this.log.start_odo : this.getValueFromStats('odo', 'start');
            },
            endODO() {
                return this.log.end_odo != null ? this.log.end_odo : this.getValueFromStats('odo', 'end');
            },
            startCEC() {
                return this.log.start_cec != null ? this.log.start_cec : this.getValueFromStats('cumulative_energy_charged', 'start');
            },
            endCEC() {
                return this.log.end_cec != null ? this.log.end_cec : this.getValueFromStats('cumulative_energy_charged', 'end');
            },
            startCED() {
                return this.log.start_ced != null ? this.log.start_ced : this.getValueFromStats('cumulative_energy_discharged', 'start');
            },
            endCED() {
                return this.log.end_ced != null ? this.log.end_ced : this.getValueFromStats('cumulative_energy_discharged', 'end');
            },
            avgKW() {
                if (this.log.average_kw != null) return this.log.average_kw;
                const powers = (this.log.stats || []).map(stat => stat.dc_battery_power).filter(Number.isFinite);
                return powers.length ? Math.abs(powers.reduce((a, b) => a + b, 0) / powers.length) : null;
            },
            avgSpeed() {
                if (this.log.average_speed != null) return this.log.average_speed;
                const speeds = (this.log.stats || []).map(stat => stat.gps_speed).filter(Number.isFinite);
                return speeds.length ? Math.abs(speeds.reduce((a, b) => a + b, 0) / speeds.length * 3.6) : null;
            },
            distance() {
                if (this.log.distance != null) return this.log.distance;
                const end = logUtils.effectiveEnd(this.log);
                return end && this.log.start && end >= this.log.start && Number.isFinite(this.avgSpeed) ? Number((this.avgSpeed * ((end - this.log.start) / 3600)).toFixed(2)) : null;
            },
            chargedEnergy() {
                if (Number.isFinite(this.log.recharged_kwh)) return this.log.recharged_kwh;
                return [this.endCEC, this.startCEC].every(Number.isFinite) ? this.endCEC - this.startCEC : null;
            },
            dischargedEnergy() {
                if (Number.isFinite(this.log.discharged_kwh)) return this.log.discharged_kwh;
                return [this.endCED, this.startCED].every(Number.isFinite) ? this.endCED - this.startCED : null;
            },
            consumption() {
                return this.distance > 0 && [this.chargedEnergy, this.dischargedEnergy].every(Number.isFinite) ?
                    (this.dischargedEnergy - this.chargedEnergy) / this.distance * 100 : null;
            },
            kWChartValues() {
                const samples = logUtils.stats(this.log).filter(stat => Number.isFinite(stat.dc_battery_power));
                if (!samples.length) return [];
                const start = logUtils.timestamp(this.log.start) || samples[0].timestamp;
                const end = logUtils.effectiveEnd(this.log) || start;
                const width = Math.max((end - start) / 7, 1);
                const bins = [];
                samples.forEach(stat => {
                    const index = Math.max(0, Math.min(6, Math.floor((stat.timestamp - start) / width)));
                    if (!bins[index]) bins[index] = [];
                    bins[index].push(stat.dc_battery_power);
                });
                return bins.filter(Boolean).map(bin => Number(Math.abs(bin.reduce((sum, power) => sum + power, 0) / bin.length).toFixed(2)));
            },
            chartData() {
                const self = this;
                const stats = logUtils.stats(self.log);
                const dataObj = {
                    labels: stats.map((stat) => self.$root.MomentJS(stat.timestamp * 1000).format('HH:mm:ss')),
                    datasets: []
                };
                const values = [{
                    label: 'SOC Display',
                    key: 'soc_display',
                    color: 'blue'
                }, {
                    label: 'SOC BMS',
                    key: 'soc_bms',
                    color: 'cyan'
                }, {
                    label: 'DC Battery Power',
                    key: 'dc_battery_power',
                    color: 'darkgreen'
                }, {
                    label: 'Battery temperature (Min)',
                    key: 'battery_min_temperature',
                    color: 'yellow'
                }, {
                    label: 'Battery temperature (Max)',
                    key: 'battery_max_temperature',
                    color: 'red'
                }, {
                    label: 'Battery temperature (Inlet)',
                    key: 'battery_inlet_temperature',
                    color: 'orange'
                }, {
                    label: 'Speed (GPS)',
                    key: 'gps_speed',
                    color: 'purple'
                }];

                values.forEach((obj) => {
                    dataObj.datasets.push({
                        label: obj.label,
                        data: stats.map((stat) => obj.key === 'gps_speed' ? (stat[obj.key] != null ? stat[obj.key] * 3.6 : null) : stat[obj.key]),
                        borderWidth: 0,
                        lineTension: 0,
                        fill: false,
                        spanGaps: true,
                        pointBorderWidth: 1,
                        pointStyle: 'line',
                        borderJoinStyle: 'round',
                        backgroundColor: obj.color,
                        borderColor: obj.color
                    })
                });
                return dataObj;
            },
            mapData() {
                const self = this;
                const stats = logUtils.stats(self.log);

                return stats.filter((stat) => Number.isFinite(stat.latitude) && Math.abs(stat.latitude) <= 90 && Number.isFinite(stat.longitude) && Math.abs(stat.longitude) <= 180).map((stat) => ({
                    lat: stat.latitude,
                    lng: stat.longitude
                }));
            }
        },
        created() {
            this.id = this.$route.query.id;
        },
        mounted() { this.loadLog(); },
        beforeDestroy() { this.disposed = true; this.clearMap(); }
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

    .average-container-text {
        width: calc(100% - 112px);
    }

    .btn-container {
        text-align: center;
        padding-top: 0;
        padding-bottom: 0;
    }

    .btn-explain-text {
        text-decoration: underline;
    }

    .kw-chart-sheet {
        padding-left: 16px;
        padding-right: 16px;
    }

    .v-timeline-item.last-timeline-item {
        padding-bottom: 0;
    }

    #map {
        width: 100%;
        height: 500px;
    }

    .total-time {
        padding: 0 12px;
        color: rgba(0,0,0,0.87);
    }
    .theme--dark .total-time {
        color:white;
    }
    .cadivtion {
        color:black;
    }
    .theme--dark .cadivtion {
        color:white;
    }
</style>

<style>
    .kw-chart-sheet svg {
        overflow: visible !important;
    }
    .kw-chart-sheet svg g {
        font-size: 12px !important;
    }
    #map .gm-style-iw-d {
        color: #000;
    }
</style>
