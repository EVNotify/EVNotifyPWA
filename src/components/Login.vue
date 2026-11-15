<template>
    <v-content class="login-form-content">
        <v-container fluid fill-height>
            <v-layout align-center justify-center>
                <v-flex xs12 sm8 md4>
                    <v-form @submit.prevent="login">
                        <v-card class="elevation-12">
                            <v-toolbar>
                                <v-toolbar-title>Login</v-toolbar-title>
                            </v-toolbar>
                            <v-card-text>
                                <v-text-field prepend-icon="person" name="akey" label="AKey" type="text" v-model="akey"
                                    autocomplete="username"
                                    :disabled="loggingIn" :error-messages="akeyError" required></v-text-field>
                                <v-text-field prepend-icon="lock" name="password" label="Password" type="password"
                                    v-model="password" :disabled="loggingIn" required autocomplete="off"
                                    :error-messages="unknownError || passwordError">
                                </v-text-field>
                                <v-select :items="versions" label="Version" v-model="version" :disabled="loggingIn" required></v-select>
                            </v-card-text>
                            <v-card-actions>
                                <v-spacer></v-spacer>
                                <v-btn color="primary" type="submit" :disabled="loggingIn" :loading="loggingIn">Login</v-btn>
                            </v-card-actions>
                        </v-card>
                    </v-form>
                </v-flex>
            </v-layout>
        </v-container>
    </v-content>
</template>

<script>
    import storage from '../utils/storage';

    export default {
        data: () => ({
            bottomNav: 'Dashboard',
            akey: '',
            akeyError: '',
            password: '',
            passwordError: '',
            unknownError: '',
            loggingIn: false,
            version: 'V2',
            versions: ['V2', 'V3']
        }),
        created() {
            const user = storage.getValue('user', {});
            this.version = (user && user.apiVersion) ? user.apiVersion : 'V2';
        },
        methods: {
            login() {
                if (this.loggingIn) return;
                const client = this.$root.EVNotify;
                const previous = { version: client.version, akey: client.akey, token: client.token };
                const restore = () => {
                    client.setVersion(previous.version);
                    client.akey = previous.akey;
                    client.token = previous.token;
                    this.loggingIn = false;
                };
                this.loggingIn = true;
                this.akeyError = this.passwordError = this.unknownError = '';
                client.setVersion(this.version);
                client.login(this.akey, this.password, (err, token) => {
                    if (err || !token) {
                        restore();
                        if (err === 1300) this.akeyError = 'Malformed AKey format';
                        else if (err === 1700) this.akeyError = 'Unknown user';
                        else if (err === 1800) this.passwordError = 'Wrong password';
                        else this.unknownError = err ? String(err) : 'Unknown error';
                        return;
                    }
                    client.getSettings((settingsErr, settings) => {
                        if (settingsErr || !settings) {
                            restore();
                            this.unknownError = settingsErr ? String(settingsErr) : 'Could not load settings';
                            return;
                        }
                        storage.setValue('user', { akey: this.akey, token, apiVersion: this.version });
                        storage.setValue('settings', settings);
                        this.loggingIn = false;
                        this.$router.push('/');
                    });
                });
            }
        }
    }
</script>

<style scoped>
    .login-form-content {
        width: 100%;
        padding-bottom: 144px !important;
    }
</style>
