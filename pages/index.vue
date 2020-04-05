<template>
  <div class="relative h-full w-full">
    <div v-if="requestModal" class="z-10 fixed bottom-0 inset-x-0 px-4 pb-6 inset-0 p-0 flex items-center justify-center z-30">
      <transition name="fade">
        <div v-if="requestModal" class="fixed inset-0 transition-opacity">
          <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
      </transition>
      <transition name="fade">
        <div v-if="requestModal"  v-on-clickaway="closeRequestModal" class="bg-white rounded-lg px-4 pt-5 pb-4 overflow-hidden shadow-xl transform transition-all max-w-sm w-full sm:p-6">
          <div>
            <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <i class="fas fa-exclamation-triangle text-red-600"></i>
            </div>
            <div class="mt-3 text-center sm:mt-5">
              <h3 class="text-lg leading-6 font-medium text-gray-900">
                Are you sure you'd like to delete your account?
              </h3>
            </div>
          </div>
          <!-- <div v-if="$store.state.ERROR_TYPE === 'delete'" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-4" role="alert">
            <strong class="font-bold">Unable to delete your account</strong><br>
            <span class="block sm:inline">{{ $store.state.ERROR_MESSAGE }}</span>
            <span @click="clearErrors" class="absolute top-0 bottom-0 right-0 px-4 py-3">
              <i class="-ml-4 fas fa-times"></i>
            </span>
          </div> -->
          <div class="mt-5 sm:mt-6">
            <span class="flex w-full rounded-md shadow-sm">
              <button @click="deleteUser" type="button" :class="{ 'bg-red-300': deleteLoading, 'hover:bg-red-300': deleteLoading, 'pointer-events-none': deleteLoading, 'bg-red-600': !deleteLoading, 'hover:bg-red-500': !deleteLoading }" class="inline-flex justify-center w-full rounded-md border border-transparent px-4 py-2 text-base leading-6 font-medium text-white shadow-sm focus:outline-none focus:border-red-700 focus:shadow-outline-red transition ease-in-out duration-150 sm:text-sm sm:leading-5">
                <p v-if="!deleteLoading">Delete User</p>
                <svg v-else width="20" height="20" viewBox="0 0 105 105" xmlns="http://www.w3.org/2000/svg" fill="#fff">
                  <circle cx="12.5" cy="12.5" r="12.5">
                      <animate attributeName="fill-opacity"
                      begin="0s" dur="1s"
                      values="1;.2;1" calcMode="linear"
                      repeatCount="indefinite" />
                  </circle>
                  <circle cx="12.5" cy="52.5" r="12.5" fill-opacity=".5">
                      <animate attributeName="fill-opacity"
                      begin="100ms" dur="1s"
                      values="1;.2;1" calcMode="linear"
                      repeatCount="indefinite" />
                  </circle>
                  <circle cx="52.5" cy="12.5" r="12.5">
                      <animate attributeName="fill-opacity"
                      begin="300ms" dur="1s"
                      values="1;.2;1" calcMode="linear"
                      repeatCount="indefinite" />
                  </circle>
                  <circle cx="52.5" cy="52.5" r="12.5">
                      <animate attributeName="fill-opacity"
                      begin="600ms" dur="1s"
                      values="1;.2;1" calcMode="linear"
                      repeatCount="indefinite" />
                  </circle>
                  <circle cx="92.5" cy="12.5" r="12.5">
                      <animate attributeName="fill-opacity"
                      begin="800ms" dur="1s"
                      values="1;.2;1" calcMode="linear"
                      repeatCount="indefinite" />
                  </circle>
                  <circle cx="92.5" cy="52.5" r="12.5">
                      <animate attributeName="fill-opacity"
                      begin="400ms" dur="1s"
                      values="1;.2;1" calcMode="linear"
                      repeatCount="indefinite" />
                  </circle>
                  <circle cx="12.5" cy="92.5" r="12.5">
                      <animate attributeName="fill-opacity"
                      begin="700ms" dur="1s"
                      values="1;.2;1" calcMode="linear"
                      repeatCount="indefinite" />
                  </circle>
                  <circle cx="52.5" cy="92.5" r="12.5">
                      <animate attributeName="fill-opacity"
                      begin="500ms" dur="1s"
                      values="1;.2;1" calcMode="linear"
                      repeatCount="indefinite" />
                  </circle>
                  <circle cx="92.5" cy="92.5" r="12.5">
                      <animate attributeName="fill-opacity"
                      begin="200ms" dur="1s"
                      values="1;.2;1" calcMode="linear"
                      repeatCount="indefinite" />
                  </circle>
                </svg>
              </button>
            </span>
          </div>
        </div>
      </transition>
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
        <div class="max-w-5xl mx-auto mt-4 px-4 sm:px-6 md:px-8 h-full">
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
                          <tr @click="openRequest(index)" v-for="(request, index) in requests" :key="request.hash" :class="{'bg-white': index % 2 == 0, 'bg-gray-100': index & 2 !== 0}" class="hover:bg-gray-200 focus:outline-none focus:bg-gray-300">
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
      requestModal: false,
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
    },

    closeRequestModal() {
      this.requestModal = false;
    },

    openRequest(index) {
      this.requestModal = true;
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
