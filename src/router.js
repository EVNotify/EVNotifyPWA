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
      path: '/login',
      name: 'login',
      component: () => import(/* webpackChunkName: "login" */ './views/Login.vue')
    },
    {
      path: '/logs',
      name: 'logs',
      component: () => import(/* webpackChunkName: "logs" */ './views/Logs.vue')
    },
    {
      path: '/log',
      name: 'log',
      component: () => import(/* webpackChunkName: "log" */ './views/Log.vue')
    },
    {
      path: '/robots',
      name: 'robots',
      component: () => import(/* webpackChunkName: "robots" */ './views/Robots.vue')
    },
    {
      path: '/catlender',
      name: 'catlender',
      component: () => import(/* webpackChunkName: "catlender" */ './views/Catlender.vue')
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import(/* webpackChunkName: "settings" */ './views/Settings.vue')
    }
  ]
});