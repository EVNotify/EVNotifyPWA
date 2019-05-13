import Vue from 'vue';
import MomentJS from 'moment';
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
    EVNotify: new EVNotify(user.akey, user.token),
    MomentJS: MomentJS 
  }),
  render: h => h(App)
}).$mount('#app');

console.log('%cStop!', 'color: red; font-size: 60px; font-weight: bold;');
console.log('%cIf someone told you to copy and paste some code here, do not trust them. This can be malicious code that steals your data!', 'color: orange; font-size: 30px; font-weight: bold;');