<template>
    <v-layout>
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
        <v-flex xs12 sm6 offset-sm3>
            <v-card class="mx-auto" v-if="log.id">
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
                    <v-sparkline auto-draw :value="kWChartValues" :gradient="['#1feaea', '#ffd200', '#f72047']"
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
                        </v-timeline-item>
                        <v-timeline-item class="mb-1">
                            <v-flex>
                                <div class="cadivtion" style="color: black">{{ logDate }}</div>
                            </v-flex>
                        </v-timeline-item>
                        <v-timeline-item class="mb-3" small color="accent">
                            <v-layout justify-space-between>
                                <v-flex xs-7>
                                    <v-chip class="white--text ml-0" color="accent" label small>Start</v-chip>
                                    {{ startSOC }}
                                    <div class="caption" v-if="startCEC && startCED">{{ startCEC }} kWh (CEC) / <br> {{ startCED }} kWh (CED)</div>
                                </v-flex>
                                <v-flex xs-5 text-xs-right>{{ startTime }}</v-flex><br><br>
                            </v-layout>
                        </v-timeline-item>
                        <v-timeline-item small color="primary">
                            <v-layout justify-space-between>
                                <v-flex xs-7>
                                    <v-chip class="white--text ml-0" color="primary" label small>End</v-chip>
                                    {{ endSOC }}
                                    <div class="caption" v-if="endCEC && endCED">{{ endCEC }} kWh (CEC) / <br> {{ endCED }} (CED)</div>
                                </v-flex>
                                <v-flex xs-5 text-xs-right>{{ endTime }}</v-flex>
                            </v-layout>
                        </v-timeline-item>
                    </v-timeline>
                </v-container>
                <v-container class="btn-container">
                    <v-btn small color="primary">Show Map</v-btn>
                    <v-btn small color="primary">Show Chart</v-btn>
                </v-container>
                <p class="caption text-xs-center font-weight-light font-italic btn-explain-text"
                    @click="showBtnExplaination = true">Why don't I see this immediately?</p>
            </v-card>
        </v-flex>
    </v-layout>
</template>

<script>
    export default {
        data: () => ({
            id: 0,
            saveBtnHighlight: false,
            originalTitle: '',
            log: {},
            showBtnExplaination: false
        }),
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
                const powers = this.log.stats.filter((stat) => stat.dc_battery_power != null).map((stat) => stat
                    .dc_battery_power);

                return Math.abs(parseFloat((powers.reduce((a, b) => a + b, 0) / powers.length) || 0).toFixed(2));
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


                return avgValues;

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
</style>

<style>
    .kw-chart-sheet svg {
        overflow: visible !important;
    }
    .kw-chart-sheet svg g {
        font-size: 12px !important;
    }
</style>