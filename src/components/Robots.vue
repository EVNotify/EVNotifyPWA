<template>
    <v-layout justify-center>
        <v-flex xs12 sm12 md6>
            <!-- Payment Dialog -->
            <keep-alive>
                <v-dialog v-model="showDialog" persistent max-width="290">
                    <v-card>
                        <v-card-title class="headline">Buy a robot</v-card-title>
                        <v-card-text v-if="!bought">
                            Buy the robot now for only <strong>2.49€</strong> and help spreading the robot family.
                            <div id="paypal-button-container" ref="paypal-button-container"></div>
                        </v-card-text>
                        <v-card-text v-else>
                            <v-alert type="success" :value="bought">
                                Payment succeeded! Wohoo! Thanks! The robots feel stronger!
                            </v-alert>
                        </v-card-text>
                        <v-card-actions>
                            <v-spacer></v-spacer>
                            <v-btn color="green darken-1" flat @click="showDialog = false; bought = false">Cancel</v-btn>
                        </v-card-actions>
                    </v-card>
                </v-dialog>
            </keep-alive>
            <!-- Content -->
            <v-card>
                <v-img :src="aiIMG" max-height="200" :contain="true"></v-img>
                <v-card-title primary-title>
                    <div>
                        <p class="caption font-weight-thin text-xs-right" style="float: right">1111100010001001010001
                        </p>
                        <div class="headline">Collection</div>
                        <span><i class="font-weight-light">Did you know?</i><br>Besides the developer of EVNotify, a lot
                            of robots in the background needs to work very hard, in order to provide the services at any
                            time. To keep up all the services, more and more robots are needed over time. Can you help,
                            extending the collection? With that, you support the development of EVNotify and furthermore
                            you make a robot happy!</span>
                    </div>
                </v-card-title>
                <v-card-text>
                    <v-list double-line class="robots-list">
                        <v-list-tile avatar v-for="robot in robots" :key="robot.id">
                            <div v-if="!robot.bought" class="list-tile-container">
                                <v-list-tile-avatar>
                                    <v-icon>help</v-icon>
                                </v-list-tile-avatar>
                                <v-list-tile-content>
                                    <v-list-tile-title>Some robot</v-list-tile-title>
                                    <v-list-tile-sub-title>I can show my face</v-list-tile-sub-title>
                                </v-list-tile-content>
                                <v-list-tile-action>
                                    <v-icon @click="buyRobot(robot.id)">shopping_cart</v-icon>
                                </v-list-tile-action>
                            </div>
                            <div v-else class="list-tile-container">
                                <v-list-tile-avatar>
                                    <v-img :src="roboPIC(robot.id)" />
                                </v-list-tile-avatar>
                                <v-list-tile-content>
                                    <v-list-tile-title>{{ roboName(robot.id) }}</v-list-tile-title>
                                    <v-list-tile-sub-title>{{ robot.quote }}</v-list-tile-sub-title>
                                </v-list-tile-content>
                            </div>
                        </v-list-tile>
                    </v-list>
                </v-card-text>
            </v-card>
        </v-flex>
    </v-layout>
</template>

<script>
    export default {
        data: () => ({
            currentRobot: '',
            bought: false,
            showDialog: false,
            robots: []
        }),
        computed: {
            aiIMG() {
                return require('../assets/ai.svg');
            }
        },
        methods: {
            getRobots() {
                const self = this;

                self.$root.EVNotify.getRobots((err, robots) => {
                    if (!err && Array.isArray(robots)) self.robots = robots;
                });
            },
            roboPIC(id) {
                return `https://robohash.org/${id}`;
            },
            roboName(id) {
                return `Robot #${id.substr(0, 8)}`;
            },
            buyRobot(id) {
                const self = this;

                self.showDialog = true;
                self.currentRobot = id;
                self.$refs['paypal-button-container'].innerHTML = '';
                window.paypal.Buttons({
                    createOrder: (data, actions) => {
                        // Set up the transaction
                        return actions.order.create({
                            purchase_units: [{
                                amount: {
                                    value: '2.49'
                                }
                            }]
                        });
                    },
                    onApprove: (data, actions) => {
                        // Capture the funds from the transaction
                        return actions.order.capture().then(() => {
                            self.$root.EVNotify.buyRobot(self.currentRobot, data.orderID, (err) => {
                                if (err) return console.error(err);
                                self.bought = true;
                                self.getRobots();
                            });
                        });
                    }
                }).render('#paypal-button-container');
            }
        },
        mounted() {
            this.getRobots();
        }
    }
</script>

<style scoped>
    .list-tile-container {
        display: flex;
        width: 100%;
    }
    .v-list__tile__sub-title {
        white-space: unset;
    }
    .robots-list {
        padding-bottom: 56px;
    }
</style>