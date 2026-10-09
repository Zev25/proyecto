import { createApp } from 'vue'
import { Quasar } from 'quasar'
import '@quasar/extras/material-icons/material-icons.css'
import 'quasar/src/css/index.sass'
import './style.css'
import App from './App.vue'

createApp(App)
	.use(Quasar, {
		config: {
			brand: {
				primary: '#255faa',
				secondary: '#d9e5f7',
				accent: '#f97316'
			}
		}
	})
	.mount('#app')
