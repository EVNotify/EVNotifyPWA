import Vue from 'vue';
import Router from 'vue-router';
import Dashboard from './views/Dashboard.vue';

Vue.use(Router);

export default new Router({
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: Dashboard
    },
    {
      path: '/logs',
      name: 'logs',
      component: () => import(/* webpackChunkName: "logs" */ './views/Logs.vue')
    }
  ]
});