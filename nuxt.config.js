
export default {
  mode: 'spa',
  head: {
    title: 'Parasite',
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: 'Parasite is a standalone proxy server which allows you to intercept, record, and replay incoming HTTP and raw TCP traffic. It provides an optional web interface and API for managing the incoming requests and replaying them on demand. It is also provided as an optional NPM package.' }
    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
    ]
  },
  loading: { color: '#fff' },
  css: [
    '@fortawesome/fontawesome-free/css/all.min.css',
    'prismjs/themes/prism-okaidia.css'
  ],
  plugins: [
    { src: '~/plugins/prism.js', ssr: false }
  ],
  buildModules: [
    '@nuxtjs/tailwindcss'
  ],
  build: {
    babel: {
      configFile: "./babel.config.js"
    },
  },
  purgeCSS: {
    mode: 'postcss',
    whitelist: ["html", "body"],
    whitelistPatternsChildren: [/^token/, /^pre/, /^code/],
  }
}