<template>
  <div>
    <div class="h-full">
      <div class="max-w-screen-2xl mx-auto px-4 overflow-hidden sm:px-6 lg:px-8">
        <nav class="-mx-5 -my-2 flex flex-wrap justify-center">
          <!-- <div class="px-5 py-2">
            <a href="https://blog.loopholelabs.io" class="text-base leading-6 text-gray-500 hover:text-gray-900">
              blog
            </a>
          </div> -->
          <a href="https://loopholelabs.io" alt="Loophole Labs">
            <div class="w-48 h-16">
              <img class="w-full h-full" src="~/assets/images/loopholelabs.svg" />
            </div>
          </a>
        </nav>
        <div class="mt-4 flex justify-center">
          <a href="https://github.com/loophole-labs/" class="text-2xl text-gray-400 hover:text-gray-500">
            <span class="sr-only">GitHub</span>
            <i class="fab fa-github"></i>
          </a>
          <a href="mailto:lynk@loopholelabs.io" class="ml-6 text-2xl text-gray-400 hover:text-gray-500">
            <span class="sr-only">Email</span>
            <i class="far fa-envelope-open"></i>
          </a>
          <a href="https://loophole-labs-inc.hellonext.co/b/parasite-feedback" class="ml-6 text-2xl text-gray-400 hover:text-gray-500">
            <span class="sr-only">Feedback</span>
            <i class="fas fa-comments"></i>
          </a>
        </div>
        <div class="mt-4 mb-4">
          <p class="text-center text-base leading-6 text-gray-400">
            &copy; 2020 Loophole Labs Inc. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'foot',
  components: {

  },
  data () {
    return {

    }
  }
  
}
</script>

<style>
</style>