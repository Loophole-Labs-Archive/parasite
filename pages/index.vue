<template>
  <div class="relative h-full w-full">
      <nav class="bg-white shadow">
        <div class="max-w-7xl mx-auto px-2">
          <div class="flex justify-between h-16">
            <div class="flex px-2 lg:px-0">
              <nuxt-link to="/" class="flex-shrink-0 flex items-center">
                <img class="block h-8 sm:h-12 m-2 w-auto" src="~/assets/images/parasite.png" alt="Parasite" />
              </nuxt-link>
            </div>
            <div class="flex items-center justify-center p-1 w-auto border-2 border-transparent transition duration-150 ease-in-out">
              <a href="https://parasite.sh/docs">
                <p class="font-base text-sm sm:text-base m-1 sm:m-2 text-gray-700 rounded-full hover:text-gray-900 focus:outline-none focus:text-gray-900 focus:bg-gray-100">
                  Documentation
                </p>
              </a>
              <a href="https://loophole-labs-inc.hellonext.co/b/parasite-feedback">
                <p class="font-base text-sm sm:text-base m-1 sm:m-2 text-gray-700 rounded-full hover:text-gray-900 focus:outline-none focus:text-gray-900 focus:bg-gray-100">
                  Feedback
                </p>
              </a>
            </div>
          </div>
        </div>
      </nav>
      <div class="mt-px h-full border-b mb-4 flex overflow-hidden bg-white">
      <main class="flex-1 relative z-0 overflow-y-auto pt-2 pb-6 focus:outline-none md:py-6" tabindex="0">
        <div class="max-w-5xl mx-auto mt-4 px-4 sm:px-6 md:px-8 h-full">
          <transition name="fade">
            <div class="flex flex-col h-full">
              <div v-if="requests.length < 1 || responses.length !== requests.length" class="flex-grow">
                <p class="text-2xl font-semibold text-black mb-2">No Recorded Requests (yet)</p>
                <p class="text-lg font-base text-black pb-2">
                  To capture and display requests please visit <a class="underline text-blue-500 hover:text-blue-700" :href="ingressURI" >{{ingressURI}}</a>
                </p>
              </div>
              <div v-else class="flex-grow">
                <p class="text-2xl font-semibold text-black mb-4">Viewing Recorded Requests <font class="font-base text-lg">(Refreshing every {{ refresh }} seconds)</p>
                <div class="flex-none w-auto flex flex-col">
                  <div class="-my-2 py-2 overflow-x-auto sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
                    <div class="align-middle inline-block min-w-full shadow overflow-hidden sm:rounded-lg border-b border-gray-200">
                      <table class="min-w-full">
                        <thead>
                          <tr>
                            <th class="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                              Method
                            </th>
                            <th class="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                              URL
                            </th>
                            <th class="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="(request, index) in requests" :key="index" :class="{'bg-white': index % 2 == 0, 'bg-gray-100': index & 2 !== 0}">
                            <td class="px-6 py-4 whitespace-no-wrap text-sm leading-5 font-medium text-gray-900">
                              {{ request.method }}
                            </td>
                            <td class="px-6 py-4 whitespace-no-wrap text-sm leading-5 text-gray-500">
                              {{ '/' + request.url.replace(proxyURI, '') }} 
                            </td>
                            <td v-if="responses[index]" class="px-6 py-4 whitespace-no-wrap text-sm leading-5 text-gray-500">
                              {{ responses[index].status }}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </main>
    </div>
    <foot />
  </div>
</template>

<script>
import foot from '~/components/foot';

import { mixin as clickaway } from 'vue-clickaway';
import axios from 'axios';

export default {
  mixins: [ clickaway ],
  components: {
    foot
  },
  data () {
    return {
      requests: [],
      responses: [],
      refresh: 5,
      ingressURI: '',
      proxyURI: '',
      node: '$ node --version\nv12.0.0',
      npm: '$ npm --version\n6.9.0',
      unzip: '$ unzip lynk.zip',
      auth: '$ ./lynk auth -t LYNK_TOKEN -k LYNK_KEY',
      vue: '$ npx @vue/cli create --default hello-world',
      hello: '$ cd hello-world\n$ npm run serve',
      yarn: '$ cd hello-world\n$ yarn serve',
      lynk: '$ ./lynk 8080',
      help: '$ ./lynk help'
    }
  },
  methods: {
    scrollToTop() {
      window.scrollTo(0,0);
    },
    async fetchData() {
      console.log("Refreshing data");
      const requestResponse = await axios.get('/api/requests');
      const responseResponse = await axios.get('/api/responses');
      const infoResponse = await axios.get('/api/info');
      this.requests = requestResponse.data.requests;
      this.responses = responseResponse.data.responses;
      this.ingressURI = infoResponse.data.ingress;
      this.proxyURI = infoResponse.data.proxy;
    },
    async refreshData() {
      var self = this;
      await this.fetchData();
      await new Promise(resolve => setTimeout(resolve, self.refresh * 1000));
      await this.refreshData();
    }
  },
  async beforeMount() {
    await this.fetchData();
  },
  async mounted() {
    var self = this;
    this.$nextTick(async function () {
      await self.refreshData();
    });
  }
}
</script>

<style>
</style>
