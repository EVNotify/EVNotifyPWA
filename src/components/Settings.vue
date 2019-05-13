<template>
    <v-layout>
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
                                :hint="element.hint" :persistent-hint="true"
                                :value="element.value" @click:prepend="element.showPassword = !element.showPassword">
                            </v-text-field>
                            <v-btn v-else-if="element.type === 'button'" block large :color="element.color" @click="callDynamicFunction(element.action)">{{ element.title }}</v-btn>
                        </v-list-tile-content>
                    </v-list-tile>
                </v-list-group>
            </v-list>
        </v-flex>
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
                    action: 'changePW'
                },{
                    title: 'Reset token',
                    type: 'button',
                    color: 'warning',
                    action: 'resetToken'
                }]
            }]
        }),
        methods: {
            callDynamicFunction(name) {
                this[name]();
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