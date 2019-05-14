<template>
    <v-layout>
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
                                    <v-text-field label="Password*" type="password" required :error-messages="errorMessage" v-model="password"></v-text-field>
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
        <v-flex xs12 sm6 offset-sm3>
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
                            <v-list-tile-title v-if="element.type === 'text'">{{ element.title }}</v-list-tile-title>
                            <v-text-field v-else-if="element.type === 'password'"
                                :prepend-icon="element.showPassword ? 'visibility_off' : 'visibility'"
                                :label="element.title" :type="element.showPassword ? 'text' : 'password'" readonly
                                :hint="element.hint" :persistent-hint="true" :value="element.value"
                                @click:prepend="element.showPassword = !element.showPassword">
                            </v-text-field>
                            <v-btn v-else-if="element.type === 'button'" block large :color="element.color"
                                @click="callDynamicFunction(element.action)">{{ element.title }}</v-btn>
                        </v-list-tile-content>
                    </v-list-tile>
                </v-list-group>
            </v-list>
        </v-flex>
        <v-snackbar v-model="showSnackbar" :color="snackbarType" top>{{ snackbarMessage }}</v-snackbar>
    </v-layout>
</template>

<script>
    import storage from '../utils/storage';

    export default {
        data: () => ({
            settings: [{
                title: 'Credentials',
                icon: 'account_circle',
                elements: [{
                    title: `AKey: ${storage.getValue('user', {}).akey}`,
                    type: 'text'
                }, {
                    title: 'Token',
                    value: storage.getValue('user', {}).token,
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
                }]
            }],
            showSnackbar: false,
            snackbarMessage: '',
            snackbarType: 'info',
            errorMessage: '',
            resetTokenDialog: false,
            changePasswordDialog: false,
            password: ''
        }),
        methods: {
            callDynamicFunction(name) {
                this[name]();
            },
            showResetTokenDialog() {
                this.resetTokenDialog = true;
            },
            showChangePasswordDialog() {
                this.changePasswordDialog = true;
            },
            resetToken() {
                var self = this;

                if (self.password.length < 6) return self.errorMessage = 'Password must be at least 6 characters.';

                self.$root.EVNotify.renewToken(self.password, (err, token) => {
                    self.password = '';
                    self.resetTokenDialog = false;
                    self.showSnackbar = true;
                    if (!err && token) {
                        const user = storage.getValue('user', {});

                        user.token = token;
                        storage.setValue('user', user);
                        self.snackbarType = 'success';
                        self.snackbarMessage = 'Token changed';
                        self.settings[0].elements[1].value = token;
                    } else {
                        self.snackbarType = 'error';
                        self.snackbarMessage = 'Token could not be changed';
                    }
                });
            }
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
</style>