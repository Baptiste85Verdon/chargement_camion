import { createApp } from 'vue'
import { createPinia } from 'pinia'

// Polices auto-hébergées (Fontsource) : seulement les graisses utilisées par les jetons.
import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/600.css'
import '@fontsource/ibm-plex-sans/700.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/600.css'

import './styles/jetons.css'
import './styles/base.css'

import App from './App.vue'
import { routeur } from './router'

createApp(App).use(createPinia()).use(routeur).mount('#app')
