<template>
    <v-layout>
        <v-dialog v-model="showBtnExplaination" max-width="290" persistent scrollable>
            <v-card>
                <v-card-title class="headline">Why?</v-card-title>
                <v-card-text>
                    Besides the fact, that pre-rendering all the data in the page, even when not required, is not good for
                    performance,
                    displaying the map costs also real money for me as a developer.
                    Developing <b>EVNotify</b> costs of course a <b>lot of money</b>, so even when I'm doing this in my free time and
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
                    <v-icon class="mr-5" size="64">chevron_left</v-icon>
                    <v-layout column align-start class="average-container-text">
                        <div class="caption grey--text text-uppercase">Average</div>
                        <div>
                            <span class="display-2 font-weight-black" v-text="42.51"></span>
                            <strong>kW</strong>
                        </div>
                    </v-layout>
                </v-card-title>
                <v-sheet color="transparent">
                    <v-sparkline auto-draw :value="[30, 35.5, 41, 45, 41.5, 46, 47]"
                        :gradient="['#1feaea', '#ffd200', '#f72047']" stroke-linecap="round" smooth>
                        <template v-slot:label="item">{{ item.value }}kW</template>
                    </v-sparkline>
                </v-sheet>
                <v-container>
                    <v-timeline dense clipped>
                        <v-timeline-item fill-dot class="white--text mb-3" color="indigo" large>
                            <template v-slot:icon>
                                <v-icon color="white">ev_station</v-icon>
                            </template>
                            <v-text-field hide-details flat label="Log title" solo v-model="log.title">
                                <template v-slot:append>
                                    <v-btn class="mx-0" depressed>Save</v-btn>
                                </template>
                            </v-text-field>
                        </v-timeline-item>
                        <v-timeline-item class="mb-3" small color="accent">
                            <v-layout justify-space-between>
                                <v-flex xs-7>
                                    <v-chip class="white--text ml-0" color="accent" label small>Start</v-chip>
                                    {{ startSOC }}
                                </v-flex>
                                <v-flex xs-5 text-xs-right>{{ startTime }}</v-flex>
                            </v-layout>
                        </v-timeline-item>
                        <v-timeline-item class="mb-3" small color="primary">
                            <v-layout justify-space-between>
                                <v-flex xs-7>
                                    <v-chip class="white--text ml-0" color="primary" label small>End</v-chip>
                                    {{ endSOC }}
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
            log: {},
            showBtnExplaination: false
        }),
        methods: {
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
            }
        },
        computed: {
            startTime() {
                return this.displayTime(this.log.start);
            },
            endTime() {
                return this.displayTime(this.log.end);
            },
            startSOC() {
                return this.getSOCFromStats('start') + '%';
            },
            endSOC() {
                return this.getSOCFromStats('end') + '%';
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
</style>