/*
This file is part of the SoLawi Bedarf app

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/
import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";

import "@mdi/font/css/materialdesignicons.css";
import "vuetify/styles";
import "./styles/animation.css";
import "./styles/global.css";
import { createVuetify } from "vuetify";
import { md3 } from "vuetify/blueprints";
import { router } from "./routes";
import { LMap, LTileLayer, LMarker, LPopup } from "@vue-leaflet/vue-leaflet";
import "leaflet/dist/leaflet.css";

const vuetify = createVuetify({
  blueprint: md3,
  theme: {
    defaultTheme: localStorage.getItem("theme-color") || "light",
  },
});

const pinia = createPinia();
const app = createApp(App);

app.use(vuetify);
app.use(pinia);
app.use(router);

// Register Leaflet components
app.component("LMap", LMap);
app.component("LTileLayer", LTileLayer);
app.component("LMarker", LMarker);
app.component("LPopup", LPopup);

app.mount("#app");
