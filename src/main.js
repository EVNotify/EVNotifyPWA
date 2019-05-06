import Vue from 'vue';
import './plugins/vuetify';
import EVNotify from './plugins/evnotify';
import App from './App.vue';
import router from './router';
import './registerServiceWorker';

Vue.config.productionTip = false;

new Vue({
  router,
  data: () => ({
    evnotify: new EVNotify()
  }),
  render: h => h(App)
}).$mount('#app');