<!--
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
-->
<script setup lang="ts">
import { onMounted } from "vue";
import { useRoute } from "vue-router";
import AppBar from "./components/AppBar.vue";
import AppBarForRegister from "./components/AppBarForRegister.vue";
import FooterVue from "./components/Footer.vue";
import { useTextContentStore } from "./store/textContentStore";
import UiFeedbackDisplay from "./components/UiFeedbackDisplay.vue";
import { useConfigStore } from "./store/configStore";
import StatusIndicator from "./components/StatusIndicator.vue";

const route = useRoute();
const configStore = useConfigStore();
const textContentStore = useTextContentStore();

onMounted(async () => {
  await textContentStore.update();
  await configStore.update();
});
</script>

<template>
  <v-app>
    <AppBarForRegister v-if="route.fullPath == '/register'" />
    <AppBar v-else />
    <v-main>
      <StatusIndicator />
      <RouterView />
    </v-main>
    <FooterVue />
    <UiFeedbackDisplay />
  </v-app>
</template>
