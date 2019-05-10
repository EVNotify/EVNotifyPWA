<template>
  <div>
    <v-layout>
      <Login />
    </v-layout>
    <v-layout>
      <Footer />
    </v-layout>
  </div>
</template>

<script>
  import Login from '../components/Login';
  import Footer from '../components/Footer';

  export default {
    components: {
      Login,
      Footer
    }
  }
</script>