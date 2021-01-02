<template>
    <v-layout justify-center>
        <v-flex xs12 sm12 md6>
            <!-- Payment Dialog -->
            <keep-alive>
                <v-dialog v-model="showPaymentDialog" persistent max-width="290">
                    <v-card>
                        <v-card-title class="headline">Open the door</v-card-title>
                        <v-card-text v-if="!bought">
                            Open the door of the advent calendar now to support the development of EVNotify.
                            <div id="paypal-button-container" ref="paypal-button-container"></div>
                        </v-card-text>
                        <v-card-text v-else>
                            <v-alert type="success" :value="bought">
                                Payment succeeded! Wohoo! Thanks! Collect them all!
                            </v-alert>
                        </v-card-text>
                        <v-card-actions>
                            <v-spacer></v-spacer>
                            <v-btn color="green darken-1" flat @click="showPaymentDialog = false; bought = false">Close</v-btn>
                        </v-card-actions>
                    </v-card>
                </v-dialog>
            </keep-alive>
            <!-- Wisdom Dialog -->
            <v-dialog v-model="showWisdomDialog" persistent max-width="290">
                <v-card>
                    <v-card-title class="headline">{{ new Date(currentCat.release_date * 1000).getDate() }}</v-card-title>
                    <v-card-text>
                        <v-img :src="catPIC(currentCat.id)" aspect-ratio="1" class="grey lighten-2"></v-img>
                        <p class="caption text-xs-center">{{currentCat.quote}}</p>
                    </v-card-text>
                    <v-card-actions>
                        <v-spacer></v-spacer>
                        <v-btn color="green darken-1" flat @click="showWisdomDialog = false">Close</v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>
            <!-- Content -->
            <v-card v-if="!showUnlocked">
                <v-img :src="christmasCatIMG" max-height="200" :contain="true"></v-img>
                <v-card-title primary-title>
                    <div>
                        <p class="caption font-weight-thin text-xs-right" style="float: right">Meow and ho-ho-ho
                        </p>
                        <div class="headline">Advent ca(t)lendar</div>
                        <v-btn color="success" outline block v-if="hasAllCats" @click="showUnlocked=true">You've unlocked all! Click me!</v-btn>
                        <span><i class="font-weight-light">Everyone needs a cute kitten, right?</i><br>Yes, it's true. Even the <a href="#" @click="$router.push('/robots')">Robots</a> of EVNotify.<br>
                        Developing EVNotify not only costs a lot of time, but also money. For a limited time you now have the possibility to support the development.<br>
                        With cute cats! How it works? From 1st to 24th of December you can open a new door every day.<br>
                        If you buy it on the correct date, you can buy it for 1€, otherwise if you missed it, for 2.49€.<br>
                        <b>Can you collect them all?</b><br>
                        <b><i>If you open them, they have to tell you something..</i></b><br>
                        <i>Cats lovingly delivered by Robohash.org</i></span>
                    </div>
                </v-card-title>
                <v-card-text>
                    <v-flex xs12 class="cats-list">
                        <v-card>
                            <v-container grid-list-sm fluid>
                                <v-layout row wrap>
                                    <v-flex v-for="cat in cats" :key="cat.id" xs4 d-flex>
                                        <v-card flat tile class="d-flex cat-door" @click="hasRequiredCat(cat) && cat.bought ? showCat(cat) : ''">
                                            <v-layout fill-height align-center justify-center ma-0 v-if="!cat.bought">
                                                <h1>{{ new Date(cat.release_date * 1000).getDate() }}</h1>
                                            </v-layout>
                                            <v-img :src="catPIC(cat.id)" aspect-ratio="1" class="grey lighten-2" v-else>
                                            </v-img>
                                        </v-card>
                                    </v-flex>
                                </v-layout>
                            </v-container>
                        </v-card>
                    </v-flex>
                </v-card-text>
            </v-card>
            <v-card v-else>
                <v-img :src="christmasUnlockedIMG" max-height="300" :contain="true"></v-img>
                <v-card-title primary-title>
                    <div class="headline">Merry Christmas!</div>
                    <span style="padding-bottom: 56px;">
                        2020 was a hard year for everyone. Let's hope things get better very soon.
                        Stay healthy. Stay happy.
                        Thank you for all of your support.
                        You made EVNotify possible.
                        Very soon a complete new app version will be available.
                        A lot of work still ahead, but together we can make it.
                        Merry christmas and thanks!
                    </span>
                </v-card-title>
            </v-card>
        </v-flex>
    </v-layout>
</template>

<script>
    export default {
        data: () => ({
            currentCat: {},
            bought: false,
            showPaymentDialog: false,
            showWisdomDialog: false,
            showUnlocked: false,
            cats: []
        }),
        computed: {
            christmasCatIMG() {
                return require('../assets/christmas_cat.svg');
            },
            christmasUnlockedIMG() {
                return require('../assets/christmas_car.png');
            },
            hasAllCats() {
                return this.cats.filter((cat) => cat.tag === 'christmas_2020' && cat.bought).length === 24;
            }
        },
        methods: {
            getCats() {
                const self = this;

                self.$root.EVNotify.getCats('christmas_2020', (err, cats) => {
                    if (!err && Array.isArray(cats)) self.cats = cats;
                });
            },
            catPIC(id) {
                return `https://robohash.org/${id}?set=set4`;
            },
            hasRequiredCat(currentCat) {
                if (currentCat.required_cat) {
                    return this.cats.some((cat) => cat.bought && cat.id === currentCat.required_cat);
                }
                return true;
            },
            showCat(cat) {
                this.showWisdomDialog = true;
                this.currentCat = cat;
            },
            buyCat(cat) {
                const self = this;

                self.showPaymentDialog = true;
                self.currentCat = cat;
                self.$refs['paypal-button-container'].innerHTML = '';
                
                const currentDate = new Date(new Date().toISOString().substring(0, 10)) / 1000;
                const priceToUse = cat.release_date === currentDate ? cat.release_price : cat.follow_up_price;

                window.paypal.Buttons({
                    createOrder: (data, actions) => {
                        // Set up the transaction
                        return actions.order.create({
                            purchase_units: [{
                                amount: {
                                    value: priceToUse
                                },
                                description: 'EVNotify Cat'
                            }]
                        });
                    },
                    onApprove: (data, actions) => {
                        // Capture the funds from the transaction
                        return actions.order.capture().then(() => {
                            self.$root.EVNotify.buyCat(self.currentCat.id, data.orderID, (err) => {
                                if (err) return console.error(err);
                                self.bought = true;
                                self.getCats();
                            });
                        });
                    }
                }).render('#paypal-button-container');
            }
        },
        mounted() {
            this.getCats();
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
    .cats-list {
        padding-bottom: 56px;
    }
    .cat-door {
        height: auto;
        min-height: 94px;
        width: 100%;
        border: 1px dotted;
    }

    @media (min-width: 768px) {
        .cat-door {
            height: 300px;
        }
    }
</style>
