import Vue from "vue";
import Prism from "vue-prism-component";

import "prismjs";

import 'prismjs/themes/prism-okaidia.css'

import "prismjs/components/prism-shell-session.min";
import "prismjs/components/prism-bash.min";

import "prismjs/plugins/autolinker/prism-autolinker.min";
import "prismjs/plugins/autolinker/prism-autolinker.css";

Vue.component("prism", Prism);