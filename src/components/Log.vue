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
            <v-card class="mx-auto" v-if="log.id" v-show="!showChart && !showMap">
                <v-card-title>
                    <v-icon class="mr-5" size="64" @click="$router.push('/logs')">chevron_left</v-icon>
                    <v-layout column align-start class="average-container-text">
                        <div class="caption grey--text text-uppercase">Average</div>
                        <div>
                            <span class="display-2 font-weight-black">{{ avgKW }}</span>
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
                                    <v-btn class="mx-0" :disabled="!saveBtnHighlight" @click="save()" :color="btnHighlightColor">Save</v-btn>
                                </template>
                            </v-text-field>
                            <div class="total-time">Duration: {{ totalTime }}h</div>
                        </v-timeline-item>
                        <v-timeline-item class="mb-1">
                            <v-flex>
                                <div class="cadivtion">{{ logDate }}</div>
                                <div v-if="startCEC || startCED">
                                    <div class="caption" v-if="log.charge">charged: {{ (endCEC - startCEC || 0).toFixed(1) }} kWh</div>
                                    <div class="caption" v-else>consumed: {{ (endCED - startCED || 0).toFixed(1)}} kWh<br>recuperated: {{ (endCEC - startCEC || 0).toFixed(1) }} kWh</div>
                                </div>
                                <div class="caption" v-if="!log.charge">Ø {{ avgSpeed }} km/h | {{ distance }} km driven</div>
                            </v-flex>
                        </v-timeline-item>
                        <v-timeline-item class="mb-3" small color="accent">
                            <v-layout justify-space-between>
                                <v-flex xs-7>
                                    <v-chip class="white--text ml-0" color="accent" label small>Start</v-chip>
                                    {{ startSOC }}
                                    <div class="caption" v-if="startCEC || startCED">{{ startCEC }} kWh (CEC) / <br> {{ startCED }} kWh (CED)</div>
                                </v-flex>
                                <v-flex xs-5 text-xs-right>{{ startTime }}</v-flex>
                            </v-layout>
                        </v-timeline-item>
                        <v-timeline-item small color="primary" class="last-timeline-item">
                            <v-layout justify-space-between>
                                <v-flex xs-7>
                                    <v-chip class="white--text ml-0" color="primary" label small>End</v-chip>
                                    {{ endSOC }}
                                    <div class="caption" v-if="endCEC || endCED">{{ endCEC }} kWh (CEC) / <br> {{ endCED }} kWh (CED)</div>
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

    export default {
        data: () => ({
            id: 0,
            saveBtnHighlight: false,
            originalTitle: '',
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
            detectChange() {
                this.saveBtnHighlight = this.originalTitle !== this.log.title;
            },
            displayTime(unix) {
                return this.$root.MomentJS(new Date(unix * 1000)).format('HH:mm:ss');
            },
            getSOCFromStats(type) {
                let soc = 0;
                const stats = this.log.stats;

                if (type === 'start') {
                    for (let idX = stats.length - 1; idX >= 0; idX--) {
                        const element = stats[idX];

                        if (element.soc_display || element.soc_bms) {
                            soc = element.soc_display || element.soc_bms;
                            break;
                        }
                    }
                } else if (type === 'end') {
                    for (let idX = 0; idX < stats.length; idX++) {
                        const element = stats[idX];

                        if (element.soc_display || element.soc_bms) {
                            soc = element.soc_display || element.soc_bms;
                            break;
                        }
                    }
                }
                return soc;
            },
            getCumulativeFromStats(cumulativeType, type) {
                let cumulative = 0;
                const stats = this.log.stats;

                if (type === 'start') {
                    for (let idX = stats.length - 1; idX >= 0; idX--) {
                        const element = stats[idX];

                        if (element[cumulativeType]) {
                            cumulative = element[cumulativeType];
                            break;
                        }
                    }
                } else if (type === 'end') {
                    for (let idX = 0; idX < stats.length; idX++) {
                        const element = stats[idX];

                        if (element[cumulativeType]) {
                            cumulative = element[cumulativeType];
                            break;
                        }
                    }
                }
                return cumulative;
            },
            save() {
                const self = this;
                const log = {...this.log};

                delete log.stats;

                self.$root.EVNotify.updateLog(log, (err) => {
                    if (!err) self.saveBtnHighlight = false; 
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
                return this.displayTime(this.log.end);
            },
            totalTime() {
                return this.$root.MomentJS.utc(this.$root.MomentJS(this.endTime, 'HH:mm:ss').diff(this.$root.MomentJS(this.startTime, 'HH:mm:ss'))).format("HH:mm:ss")
            },
            logDate() {
                return this.$root.MomentJS(new Date(this.log.start * 1000)).format('MMMM Do YYYY');
            },
            startSOC() {
                return this.getSOCFromStats('start') + '%';
            },
            endSOC() {
                return this.getSOCFromStats('end') + '%';
            },
            startCEC() {
                return this.getCumulativeFromStats('cumulative_energy_charged', 'start');
            },
            endCEC() {
                return this.getCumulativeFromStats('cumulative_energy_charged', 'end');
            },
            startCED() {
                return this.getCumulativeFromStats('cumulative_energy_discharged', 'start');
            },
            endCED() {
                return this.getCumulativeFromStats('cumulative_energy_discharged', 'end');
            },
            avgKW() {
                const powers = this.log.stats.filter((stat) => stat.dc_battery_power != null)
                    .map((stat) => stat.dc_battery_power);

                return Math.abs(parseFloat((powers.reduce((a, b) => a + b, 0) / powers.length) || 0).toFixed(2));
            },
            avgSpeed() {
                const speeds = this.log.stats.filter((stat) => stat.gps_speed != null)
                    .map((stat) => stat.gps_speed);

                return Math.abs((parseFloat((speeds.reduce((a, b) => a + b, 0) / speeds.length) || 0) * 3.6).toFixed(2));
            },
            distance() {
                return (this.avgSpeed * ((this.log.end - this.log.start) / 3600) || 0).toFixed(2);
            },
            kWChartValues() {
                const powers = this.log.stats.filter((stat) => stat.dc_battery_power != null).map((stat) => {
                    return {
                        value: stat.dc_battery_power,
                        timestamp: stat.timestamp
                    };
                });
                const duration = this.log.end - this.log.start;
                const part = parseInt(duration / 7);
                const values = {};
                const avgValues = [];
                let currentPart = 0;
                let currentTimestamp = this.log.end;
                
                powers.forEach((power) => {
                    if (power.timestamp >= currentTimestamp - part) {
                        if (!values[currentPart]) values[currentPart] = [];
                        values[currentPart].push(power.value);
                    } else {
                        currentPart++;
                        currentTimestamp -= part;
                    }
                });

                Object.keys(values).forEach((line) => {
                    avgValues.push(Math.abs(parseFloat((values[line].reduce((a, b) => a + b, 0) / values[line]
                        .length) || 0).toFixed(2)));
                });


                return avgValues.reverse();

            },
            chartData() {
                const self = this;
                const stats = [...self.log.stats].sort((a, b) => a.timestamp - b.timestamp);
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
                        data: stats.map((stat) => obj.key === 'gps_speed' ? stat[obj.key] * 3.6 || null : stat[obj.key]),
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
                const stats = [...self.log.stats].sort((a, b) => a.timestamp - b.timestamp);

                return stats.filter((stat) => stat.latitude != null && stat.longitude != null).map((stat) => ({
                    lat: stat.latitude,
                    lng: stat.longitude
                }));
            }
        },
        created() {
            this.id = this.$route.query.id;
        },
        mounted() {
            const self = this;

            this.$root.EVNotify.getLog(this.id, (err, log) => {
                if (!err && log) {
                    self.log = log;
                    self.originalTitle = log.title;
                    if (!self.$refs.chart) return;
                    setTimeout(() => {
                        self.$nextTick(() => {
                            self.$refs.chart.renderChart(self.chartData, {
                                scales: {
                                    xAxes: [{
                                        ticks: {
                                            autoSkip: true,
                                            maxTicksLimit: 15
                                        }
                                    }]   
                                }
                            });
                        });
                    });
                    if (!self.$refs.map) return;
                    setTimeout(() => {
                        self.$nextTick(() => {
                            const data = self.mapData;

                            if (!data.length) return self.validCoords = false;
                            self.validCoords = true;
                            // eslint-disable-next-line
                            const bounds = new google.maps.LatLngBounds();
                            
                            data.forEach((latLng) => bounds.extend(latLng));
                            
                            // eslint-disable-next-line
                            const map = new google.maps.Map(self.$refs.map, {
                                zoom: 10,
                                center: bounds.getCenter()
                            });

                            // eslint-disable-next-line
                            const polyline = new google.maps.Polyline({
                                path: self.mapData,
                                geodesic: true,
                                strokeColor: '#FF0000',
                                strokeOpacity: 1.0,
                                strokeWeight: 2
                            });

                            polyline.setMap(map);

                            // eslint-disable-next-line
                            const startMarker = new google.maps.Marker({
                                position: data[0],
                                label: 'S',
                                map
                            });

                            // eslint-disable-next-line
                            const startInfoWindow = new google.maps.InfoWindow({
                                content: `Start point from ${this.startTime}`
                            });

                            startMarker.addListener('click', () => {
                                endInfoWindow.close();
                                // eslint-disable-next-line
                                startInfoWindow.open(map, startMarker);
                            });

                            // eslint-disable-next-line
                            const endMarker = new google.maps.Marker({
                                position: data[data.length -1],
                                label: 'E',
                                map
                            });

                            // eslint-disable-next-line
                            const endInfoWindow = new google.maps.InfoWindow({
                                content: `End point from ${this.endTime}`
                            });

                            endMarker.addListener('click', () => {
                                startInfoWindow.close();
                                // eslint-disable-next-line
                                endInfoWindow.open(map, endMarker);
                            });
                        });
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