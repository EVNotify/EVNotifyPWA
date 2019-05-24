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
                                    :error-messages="akeyError" required></v-text-field>
                                <v-text-field prepend-icon="lock" name="password" label="Password" type="password"
                                    v-model="password" required :error-messages="unknownError || passwordError">
                                </v-text-field>
                            </v-card-text>
                            <v-card-actions>
                                <v-spacer></v-spacer>
                                <v-btn color="primary" type="submit">Login</v-btn>
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
            unknownError: ''
        }),
        methods: {
            login() {
                const self = this;

                self.akeyError = self.passwordError = self.unknownError = '';
                self.$root.EVNotify.login(self.akey, self.password, (err, token) => {
                    if (!err && token) {
                        storage.setValue('user', {
                            akey: self.akey,
                            token: token
                        });
                        self.$root.EVNotify.getSettings((err, settings) => {
                            if (!err && token) {
                                storage.setValue('settings', settings);
                                self.$router.push('/');
                            } else self.unknownError = 'Unknown error';
                        });
                    } else {
                        if (err === 1300) self.akeyError = 'Malformed AKey format';
                        else if (err === 1700) self.akeyError = 'Unknown user';
                        else if (err === 1800) self.passwordError = 'Wrong password';
                        else self.unknownError = 'Unknown error';
                    }
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