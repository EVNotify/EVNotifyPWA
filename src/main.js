import Vue from 'vue';
import './plugins/vuetify';
import EVNotify from './plugins/evnotify';
import App from './App.vue';
import router from './router';
import storage from './utils/storage';
import './registerServiceWorker';

Vue.config.productionTip = false;

const user = storage.getValue('user', {});

new Vue({
  router,
  data: () => ({
    evnotify: new EVNotify(user.akey, user.token)
  }),
  render: h => h(App)
}).$mount('#app');