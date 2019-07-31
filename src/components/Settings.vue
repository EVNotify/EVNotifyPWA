<template>
    <v-layout justify-center>
        <v-dialog v-model="changePasswordDialog" persistent max-width="290">
            <v-card>
                <v-card-title class="headline">Change password</v-card-title>
                <v-card-text>
                    You are about to change your current password.
                    Please enter your current password and confirm the new password.
                    Do you want to proceed?
                    <v-container grid-list-md>
                        <v-layout wrap>
                            <v-flex xs12 sm6 md4>
                                <v-flex xs12>
                                    <v-text-field label="Current Password*" type="password" required v-model="password">
                                    </v-text-field>
                                </v-flex>
                            </v-flex>
                            <v-flex xs12 sm6 md4>
                                <v-flex xs12>
                                    <v-text-field label="New Password*" type="password" required v-model="newPassword">
                                    </v-text-field>
                                </v-flex>
                            </v-flex>
                            <v-flex xs12 sm6 md4>
                                <v-flex xs12>
                                    <v-text-field label="Retype password*" type="password" required
                                        :error-messages="errorMessage" v-model="newPassword2"></v-text-field>
                                </v-flex>
                            </v-flex>
                        </v-layout>
                    </v-container>
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn color="teal" flat
                        @click="changePasswordDialog = false; password = newPassword = newPassword2 = ''">No
                    </v-btn>
                    <v-btn color="warning" flat @click="changePassword()">Yes</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
        <v-dialog v-model="resetTokenDialog" persistent max-width="290">
            <v-card>
                <v-card-title class="headline">Reset token</v-card-title>
                <v-card-text>
                    <strong>Warning!</strong>
                    Resetting your token disconnects every app and service.
                    Please enter your current password to proceed.
                    Your old token will become invalid. Do you still want to reset?
                    <v-container grid-list-md>
                        <v-layout wrap>
                            <v-flex xs12 sm6 md4>
                                <v-flex xs12>
                                    <v-text-field label="Password*" type="password" required
                                        :error-messages="errorMessage" v-model="password"></v-text-field>
                                </v-flex>
                            </v-flex>
                        </v-layout>
                    </v-container>
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn color="teal" flat @click="resetTokenDialog = false; password = ''">No</v-btn>
                    <v-btn color="warning" flat @click="resetToken()">Yes</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
        <v-dialog v-model="telegramDialog" persistent max-width="290">
            <v-card>
                <v-card-title class="headline">Telegram integration</v-card-title>
                <v-card-text v-if="localSettings.telegram">
                    You have linked your account with <a href="https://t.me/evnotify2bot">Telegram</a>.
                    In order to remove the integration, simply enter <b><i>/unsubscribe</i></b> within bot.
                </v-card-text>
                <v-card-text v-else>
                    In order to be informed about the state of charge and to query it via Telegram,
                    the account must be linked.
                    Enter the token (<b>{{ token }}</b>) - never share it with people you do not trust.
                    You can copy the token and write it to the bot after typing <b><i>/subscribe</i></b>.
                    Just as well, you can also unsubscribe with <b><i>/unsubscribe</i></b> with telegram.
                    Open the bot <a href="https://t.me/evnotify2bot">here</a>.
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn color="teal" flat @click="telegramDialog = false">Close</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
        <v-dialog v-model="abrpDialog" persistent max-width="290">
            <v-card>
                <v-card-title class="headline">ABRP integration</v-card-title>
                <v-card-text v-if="localSettings.abrp">
                    You have linked your account with <a href="https://abetterrouteplanner.com">A better route planner</a>.
                </v-card-text>
                <v-card-text v-else>
                    In order to automatically share your realtime data with "A better route planner" (short: ABRP),
                    you need to give EVNotify permission, to share your data with ABRP.
                    Keep in mind, that you share data with a third-party.
                    EVNotify does not have control about your data, once shared with others.
                    Please refer to their <a href="https://iternio.com/index.php/integrity-policy/">Privacy policy</a>.
                    With granting permissions, you automatically accept these guidelines.
                    Would you like to integrate ABRP with EVNotify?
                </v-card-text>
                <v-card-actions v-if="localSettings.abrp">
                    <v-spacer></v-spacer>
                    <v-btn color="teal" flat @click="abrpDialog = false">Close</v-btn>
                </v-card-actions>
                <v-card-actions v-else>
                    <v-spacer></v-spacer>
                    <v-btn color="teal" flat @click="abrpDialog = false">Deny</v-btn>
                    <v-btn color="warning" flat @click="abrpDialog = false; integrateABRP()">Grant</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
        <v-flex xs12 sm12 md6>
            <v-form>
                <v-list>
                    <v-list-group v-for="setting in settings" :key="setting.title" v-model="setting.active"
                        :prepend-icon="setting.icon" no-action>
                        <template v-slot:activator>
                            <v-list-tile>
                                <v-list-tile-content>
                                    <v-list-tile-title>{{ setting.title }}</v-list-tile-title>
                                </v-list-tile-content>
                            </v-list-tile>
                        </template>
                        <v-list-tile v-for="element in setting.elements" :key="element.title">
                            <v-list-tile-content>
                                <v-list-tile-title v-if="element.type === 'text'">{{ element.title }}
                                </v-list-tile-title>
                                <v-text-field v-else-if="element.type === 'password'"
                                    :prepend-icon="element.showPassword ? 'visibility_off' : 'visibility'"
                                    :label="element.title" :type="element.showPassword ? 'text' : 'password'" readonly
                                    :hint="element.hint" :persistent-hint="true" :value="element.value"
                                    @click:prepend="element.showPassword = !element.showPassword"
                                    @change="showSaveIcon()">
                                </v-text-field>
                                <v-btn v-else-if="element.type === 'button'" :flat="!!element.flat" :block="!element.flat" large :color="element.color"
                                    @click="element.href ? '' : callDynamicFunction(element.action)" :href="element.href">{{ element.title }}
                                </v-btn>
                                <v-select v-else-if="element.type === 'select'" :items="element.values"
                                    :value="element.value" :label="element.title"
                                    @change="element.value = $event; showSaveIcon()">
                                </v-select>
                                <v-slider v-else-if="element.type === 'slider'" thumb-label="always" :min="element.min"
                                    persistent-hint :hint="element.hint" :label="element.title" :max="element.max"
                                    :value="element.value" :step="element.step"
                                    @input="element.value = $event; showSaveIcon()">
                                </v-slider>
                                <v-text-field v-else-if="element.type === 'textfield'" :label="element.title"
                                    @input="element.value = $event; showSaveIcon()" :value="element.value">
                                </v-text-field>
                                <v-switch v-else-if="element.type === 'switch'" :label="element.title"
                                    @change="element.value = $event; showSaveIcon()" :value="element.value"
                                    :hint="element.hint" :persistent-hint="true">
                                </v-switch>
                            </v-list-tile-content>
                        </v-list-tile>
                    </v-list-group>
                </v-list>
            </v-form>
        </v-flex>
        <v-snackbar v-model="showSnackbar" :color="snackbarType" top>{{ snackbarMessage }}</v-snackbar>
    </v-layout>
</template>

<script>
    import {
        EventBus
    } from '../utils/event';
    import Storage from '../utils/storage';

    export default {
        data: () => ({
            settings: [{
                title: 'Credentials',
                icon: 'account_circle',
                elements: [{
                    title: `AKey: ${Storage.getValue('user', {}).akey}`,
                    type: 'text'
                }, {
                    title: 'Token',
                    value: Storage.getValue('user', {}).token,
                    showPassword: false,
                    hint: 'It is like a password. Do not share this with people you do not trust!',
                    type: 'password'
                }, {
                    title: 'Change password',
                    type: 'button',
                    color: 'primary',
                    action: 'showChangePasswordDialog'
                }, {
                    title: 'Reset token',
                    type: 'button',
                    color: 'warning',
                    action: 'showResetTokenDialog'
                }, {
                    title: 'Logout',
                    type: 'button',
                    color: 'white',
                    action: 'logout'
                }]
            }, {
                title: 'Car',
                icon: 'directions_car',
                elements: [{
                    id: 'car',
                    value: '',
                    title: 'Car selection',
                    type: 'select',
                    values: [{
                        text: 'Hyundai IONIQ Electric',
                        value: 'IONIQ_BEV'
                    }, {
                        text: 'Hyundai IONIQ Hybrid',
                        value: 'IONIQ_HEV'
                    }, {
                        text: 'Hyundai IONIQ PlugIn-Hybrid',
                        value: 'IONIQ_PHEV'
                    }, {
                        text: 'Kia Soul EV',
                        value: 'SOUL_EV'
                    }, {
                        text: 'Kia Niro EV',
                        value: 'NIRO_EV'
                    }, {
                        text: 'Hyundai Kona EV',
                        value: 'KONA_EV'
                    }, {
                        text: 'Opel Ampera E',
                        value: 'AMPERA_E'
                    }, {
                        text: 'Chevrolet Bolt',
                        value: 'BOLT_EV'
                    }, {
                        text: 'Renault Zoe Q210',
                        value: 'ZOE_Q210'
                    }]
                }, {
                    id: 'consumption',
                    value: '',
                    title: 'Consumption',
                    hint: 'kWh/100km',
                    type: 'slider',
                    step: 0.1,
                    min: 8,
                    max: 30
                }]
            }, {
                title: 'Notifications',
                icon: 'notifications_active',
                elements: [{
                    id: 'soc',
                    value: '',
                    title: 'SOC Threshold',
                    hint: 'When to send out notification',
                    type: 'slider',
                    step: 1,
                    min: 10,
                    max: 100
                }, {
                    id: 'email',
                    value: '',
                    title: 'Mail address',
                    type: 'textfield'
                }, {
                    title: 'Telegram integration',
                    type: 'button',
                    color: 'primary',
                    action: 'showTelegramDialog'
                }, {
                    id: 'push',
                    value: '',
                    title: 'Push Notifications',
                    hint: 'Push for EVNotify mobile app, not web',
                    type: 'switch'
                }]
            }, {
                title: 'Integrations',
                icon: 'people',
                elements: [{
                    title: 'A better Route Planner',
                    type: 'button',
                    color: 'primary',
                    action: 'showABRPDialog'
                }]
            }, {
                title: 'Privacy',
                icon: 'security',
                elements: [{
                    title: 'Data protection',
                    type: 'button',
                    href: 'https://evnotify.de/datenschutz',
                    flat: true
                }]
            }],
            token: Storage.getValue('user', {}).token,
            localSettings: {},
            showSnackbar: false,
            snackbarMessage: '',
            snackbarType: 'info',
            errorMessage: '',
            resetTokenDialog: false,
            changePasswordDialog: false,
            telegramDialog: false,
            abrpDialog: false,
            password: '',
            newPassword: '',
            newPassword2: ''
        }),
        methods: {
            callDynamicFunction(name) {
                this[name]();
            },
            showSaveIcon() {
                EventBus.$emit('save');
            },
            showResetTokenDialog() {
                this.resetTokenDialog = true;
            },
            showChangePasswordDialog() {
                this.changePasswordDialog = true;
            },
            showTelegramDialog() {
                this.telegramDialog = true;
            },
            showABRPDialog() {
                this.loadSettings(() => {
                    this.abrpDialog = true;
                });
            },
            logout() {
                Storage.removeValue('user');
                this.$router.push('/login');
            },
            retrieveSettings() {
                const settings = {};

                this.settings.forEach((setting) => {
                    setting.elements.filter((element) => element.id).map((element) => ({
                        key: element.id,
                        value: element.value
                    })).forEach((obj) => settings[obj.key] = obj.value);
                });
                return settings;
            },
            loadSettings(callback) {
                const self = this;
                const localSettings = Storage.getValue('settings', {});

                const displaySettings = (settings) => {
                    Object.keys(settings).forEach((key) => {
                        this.settings.forEach((setting) => {
                            const current = setting.elements.filter((element) => element.id === key)[0];

                            if (current) current.value = localSettings[key];
                        });
                    });
                };

                self.$root.EVNotify.getSettings((err, serverSettings) => {
                    if (!err && serverSettings) {
                        displaySettings((self.localSettings = Storage.setValue('settings', serverSettings)));
                    } else {
                        displaySettings((self.localSettings = Storage.getValue('settings', {})));
                    }
                    if (typeof callback === 'function') callback(err, serverSettings);
                });
            },
            saveSettings() {
                const self = this;
                const settings = self.retrieveSettings();

                self.$root.EVNotify.getSettings((err, serverSettings) => {
                    if (!err && serverSettings) {
                        Object.keys(settings).forEach((setting) => {
                            serverSettings[setting] = settings[setting];
                        });
                        self.$root.EVNotify.setSettings(serverSettings, (err) => {
                            if (!err) {
                                this.localSettings = serverSettings;
                                Storage.setValue('settings', serverSettings);
                                EventBus.$emit('unsave');
                                // TODO
                            } else {
                                // TODO
                            }
                        });
                    } else {
                        // TODO
                    }
                });
            },
            changePassword() {
                var self = this;

                if (self.password.length < 6 || self.newPassword.length < 6 || self.newPassword2.length < 6) {
                    return self.errorMessage = 'Password must be at least 6 characters.';
                }
                if (self.newPassword !== self.newPassword2) {
                    return self.errorMessage = 'Passwords do not match.';
                }

                self.$root.EVNotify.changePW(self.password, self.newPassword, (err) => {
                    console.log(err);
                    self.password = self.newPassword = self.newPassword2 = '';
                    self.changePasswordDialog = false;
                    self.showSnackbar = true;
                    if (!err) {
                        self.snackbarType = 'success';
                        self.snackbarMessage = 'Password changed';
                    } else {
                        self.snackbarType = 'error';
                        self.snackbarMessage = 'Password could not be changed';
                    }
                });
            },
            resetToken() {
                var self = this;

                if (self.password.length < 6) return self.errorMessage = 'Password must be at least 6 characters.';

                self.$root.EVNotify.renewToken(self.password, (err, token) => {
                    self.password = '';
                    self.resetTokenDialog = false;
                    self.showSnackbar = true;
                    if (!err && token) {
                        const user = Storage.getValue('user', {});

                        user.token = token;
                        Storage.setValue('user', user);
                        self.snackbarType = 'success';
                        self.snackbarMessage = 'Token changed';
                        self.settings[0].elements[1].value = token;
                    } else {
                        self.snackbarType = 'error';
                        self.snackbarMessage = 'Token could not be changed';
                    }
                });
            },
            integrateABRP() {
                const user = Storage.getValue('user', {});

                window.open(`https://abetterrouteplanner.com/oauth/auth?client_id=8&redirect_uri=https://app.evnotify.de/integrations/abrp/auth/${user.akey}/${user.token}`, '_blank');
            }
        },
        mounted() {
            this.loadSettings();
            EventBus.$on('saved', () => this.saveSettings());
        },
        beforeDestroy() {
            EventBus.$emit('unsave');
        }
    }
</script>

<style scoped>
    .layout {
        width: 100%;
    }
</style>

<style>
    .v-list__tile {
        min-height: 48px;
        height: auto;
    }

    .v-list__tile__content {
        overflow: unset;
    }

    .v-input--slider {
        width: calc(100% - 25px);
    }
</style>