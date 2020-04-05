<template>
  <div class="relative h-full w-full">
    <div v-if="requestModal" class="absolute left-0 top-0 h-full w-full bg-white-op-50 flex justify-center z-20">
      <div class="flex items-center justify-center h-screen w-full">
        <div class="flex items-center min-w-2/3 max-w-2/3" style="height: 600px; max-height: 800px;">
          <div v-on-clickaway="closeRequestModal" class="relative w-full mx-4 md:mx-0 bg-white box-shadow-xs rounded-lg text-black">
              <button v-on:click="requestModal = false" class="absolute right-0 top-0 text-gray-600 text-lg m-4 hover:text-gray-900">
                  <i class="fa fa-times" aria-hidden="true"></i>
              </button>
              <p class="text-left p-5 mr-4 font-semibold text-xl md:text-2xl">{{ modalRequest.request.method }} {{ '/' + modalRequest.request.url.replace(proxyURI, '') }}</p>
              <div class="overflow-auto m-4" style="max-height: 600px">
                <p class="text-left px-5 pb-2 font-semibold text-lg md:text-xl">Request:</p>
                <div class="align-middle inline-block max-w-full overflow-auto">
                  <table>
                    <tbody>
                      <tr class="bg-white">
                        <td class="px-5 py-1 whitespace-no-wrap text-left text-base md:text-lg">
                          Method:
                        </td>
                        <td class="px-5 py-1 whitespace-no-wrap text-left text-base md:text-lg">
                          <code class="bg-gray-300 p-1 font-sans font-base text-base md:text-lg">{{ modalRequest.request.method }}</code>
                        </td>
                      </tr>
                      <tr class="bg-white">
                        <td class="px-5 py-1 whitespace-no-wrap text-left text-base md:text-lg">
                          URL:
                        </td>
                        <td class="px-5 py-1 whitespace-no-wrap text-left text-base md:text-lg">
                          <code class="bg-gray-300 p-1 font-sans font-base text-base md:text-lg">{{ '/' + modalRequest.request.url.replace(proxyURI, '') }}</code>
                        </td>
                      </tr>
                      <tr class="bg-white">
                        <td class="px-5 py-1 whitespace-no-wrap text-left text-base md:text-lg">
                          HTTP Version:
                        </td>
                        <td class="px-5 py-1 whitespace-no-wrap text-left text-base md:text-lg">
                          <code class="bg-gray-300 p-1 font-sans font-base text-base md:text-lg">{{ modalRequest.request.httpVersion }}</code>
                        </td>
                      </tr>
                      <tr class="bg-white">
                        <td class="px-5 py-1 whitespace-no-wrap text-left font-semibold text-base md:text-lg">
                          Headers:
                        </td>
                        <td v-if="modalRequest.request.headers" class="px-5 py-1 whitespace-no-wrap text-left text-base md:text-lg">
                        </td>
                        <td v-else class="px-5 py-1 whitespace-no-wrap text-left text-base md:text-lg">
                          <code class="bg-gray-300 p-1 font-sans font-base text-base md:text-lg">NO HEADERS</code>
                        </td>
                      </tr>
                      <tr v-for="(item, key) in modalRequest.request.headers" :key="key" class="bg-white">
                        <td class="px-5 py-1 whitespace-no-wrap text-left text-base md:text-lg">
                          {{ key }}:
                        </td>
                        <td class="px-5 py-1 whitespace-no-wrap text-left text-base md:text-lg">
                          <code class="bg-gray-300 p-1 font-sans font-base text-base md:text-lg">{{ item }}</code>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p class="text-left px-5 pt-2 font-semibold text-base md:text-lg">
                  Body:
                  <prism language="shell-session" class="max-w-full max-h-1/2 overflow-auto mb-4">{{ modalRequest.request.body || 'EMPTY BODY' }}</prism>
                </p>
                <p class="text-left px-5 pb-2 font-semibold text-lg md:text-xl">Response:</p>
                <div v-if="modalResponse" class="align-middle inline-block max-w-full overflow-auto">
                  <table>
                    <tbody>
                      <tr class="bg-white">
                        <td class="px-5 py-1 whitespace-no-wrap text-left text-base md:text-lg">
                          Status:
                        </td>
                        <td class="px-5 py-1 whitespace-no-wrap text-left text-base md:text-lg">
                          <code class="bg-gray-300 p-1 font-sans font-base text-base md:text-lg">{{ modalResponse.status }}</code>
                        </td>
                      </tr>
                      <tr class="bg-white">
                        <td class="px-5 py-1 whitespace-no-wrap text-left text-base md:text-lg">
                          HTTP Version:
                        </td>
                        <td class="px-5 py-1 whitespace-no-wrap text-left text-base md:text-lg">
                          <code class="bg-gray-300 p-1 font-sans font-base text-base md:text-lg">{{ modalResponse.httpVersion }}</code>
                        </td>
                      </tr>
                      <tr class="bg-white">
                        <td class="px-5 py-1 whitespace-no-wrap text-left font-semibold text-base md:text-lg">
                          Headers:
                        </td>
                        <td v-if="modalResponse.headers" class="px-5 py-1 whitespace-no-wrap text-left text-base md:text-lg">
                        </td>
                        <td v-else class="px-5 py-1 whitespace-no-wrap text-left text-base md:text-lg">
                          <code class="bg-gray-300 p-1 font-sans font-base text-base md:text-lg">NO HEADERS</code>
                        </td>
                      </tr>
                      <tr v-for="(item, key) in modalResponse.headers" :key="key" class="bg-white">
                        <td class="px-5 py-1 whitespace-no-wrap text-left text-base md:text-lg">
                          {{ key }}:
                        </td>
                        <td class="px-5 py-1 whitespace-no-wrap text-left text-base md:text-lg">
                          <code class="bg-gray-300 p-1 font-sans font-base text-base md:text-lg">{{ item }}</code>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p v-if="modalResponse" class="text-left px-5 pt-2 font-semibold text-base md:text-lg">
                  Body:
                  <prism language="shell-session" class="max-w-full max-h-1/2 overflow-auto">{{ modalResponse.body || 'EMPTY BODY' }}</prism>
                </p>
                <p v-else class="text-left px-5 font-semibold text-base md:text-lg">
                  <prism language="shell-session" class="max-w-full max-h-1/2 overflow-auto">NO RESPONSE</prism>
                </p>
              </div>
          </div>
        </div>
      </div>
    </div> 
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
        <div class="max-w-3xl mx-auto mt-4 px-4 sm:px-6 md:px-8 h-full">
          <transition name="fade">
            <div class="flex flex-col h-full">
              <div v-if="requests.length < 1 || responses.length < 1" class="flex-grow">
                <p class="text-2xl font-semibold text-black mb-2">No Recorded Requests (yet)</p>
                <p class="text-lg font-base text-black pb-2">
                  To capture and display requests please visit <a class="underline text-blue-500 hover:text-blue-700" :href="ingressURI" >{{ingressURI}}</a>
                </p>
              </div>
              <div v-else class="flex-grow">
                <p class="text-2xl font-semibold text-black mb-4">Viewing Recorded Requests <font class="font-base text-lg">(Refreshing every {{ refresh }} seconds)</p>
                <div class="flex-none w-auto flex flex-col my-4">
                  <div class="-my-2 py-2 overflow-x-auto sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
                    <div class="align-middle inline-block min-w-full border overflow-hidden rounded-lg border-b border-gray-200">
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
                          <tr @click="openRequest(request)" v-for="(request, index) in requests" :key="request.hash" :class="{'bg-white': index % 2 == 0, 'bg-gray-100': index & 2 !== 0}" class="hover:bg-gray-200 focus:outline-none focus:bg-gray-300">
                            <td class="px-6 py-4 whitespace-no-wrap text-sm leading-5 font-medium text-gray-900">
                              {{ request.request.method }}
                            </td>
                            <td class="px-6 py-4 whitespace-no-wrap text-sm leading-5 text-gray-500">
                              {{ '/' + request.request.url.replace(proxyURI, '') }} 
                            </td>
                            <td v-if="responses[request.hash]" class="px-6 py-4 whitespace-no-wrap text-sm leading-5 text-gray-500">
                              {{ responses[request.hash].status }}
                            </td>
                            <td v-else class="px-6 py-4 whitespace-no-wrap text-sm leading-5 text-gray-500">
                              - - -
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
      responses: {},
      refresh: 3,
      ingressURI: '',
      proxyURI: '',
      modalRequest: '',
      modalResponse: '',
      requestModal: false,
    }
  },
  methods: {
    async fetchInfo() {
      const infoResponse = await axios.get('/api/info');
      this.ingressURI = infoResponse.data.ingress;
      this.proxyURI = infoResponse.data.proxy;
    },
    async fetchData() {
      console.log("Refreshing data");
      const requestResponse = await axios.get('/api/requests');
      const responseResponse = await axios.get('/api/responses');

      this.requests = requestResponse.data.requests;
      this.responses = responseResponse.data.responses;
    },
    async refreshData() {
      var self = this;
      await this.fetchData();
      await new Promise(resolve => setTimeout(resolve, self.refresh * 1000));
      await this.refreshData();
    },
    closeRequestModal() {
      this.requestModal = false;
    },
    async openRequest(request) {
      window.scrollTo(0, 0);
      this.requestModal = true;
      this.modalRequest = request;
      this.modalResponse   = this.responses[request.hash] || null;
    }
  },
  async beforeMount() {
    await this.fetchInfo();
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
td {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>
