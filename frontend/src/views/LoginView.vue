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
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { login } from "../requests/login.ts";
import { useUserStore } from "../store/userStore.ts";
import { useConfigStore } from "../store/configStore.ts";
import { useProductStore } from "../store/productStore.ts";
import { useOrderStore } from "../store/orderStore.ts";
const password = ref<string>();
const username = ref<string>();
const untilMidnight = ref<boolean>();

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const configStore = useConfigStore();
const productStore = useProductStore();
const orderStore = useOrderStore();

const error = ref<string>();

const click = async () => {
  login(username.value!, password.value!, untilMidnight.value!)
    .then(async () => {
      await userStore.update();
      let redirect = (route.query.redirect as string) || "/";
      if (redirect == "/login") {
        redirect = "/";
      }
      await router.push(redirect);
    })
    .catch(() => {
      error.value =
        "Der Login ist leider fehlgeschlagen. Bitte gib das richtige Passwort ein oder korrigiere gegebenenfalls vorher den Anmeldenamen.";
    });
};

onMounted(() => {
  userStore.clear();
  orderStore.clear();
  productStore.clear();
  configStore.clear();
});
</script>

<template>
  <v-card class="ma-4">
    <v-card-title>Login</v-card-title>
    <v-card-subtitle>
      Noch kein Login?
      <router-link to="/register">Hier Registrieren</router-link>
    </v-card-subtitle>
    <v-card-text>
      <v-text-field
        v-model="username"
        label="Anmeldename"
        placeholder="LW23042"
      ></v-text-field>
      <v-text-field label="Passwort" type="password" v-model="password" />
      <v-checkbox label="Heute angemeldet bleiben" v-model="untilMidnight" />
    </v-card-text>
    <v-card-actions class="justify-center">
      <v-btn class="text-white" @click="click" variant="elevated">
        Login
      </v-btn>
    </v-card-actions>
  </v-card>

  <v-snackbar
    color="red"
    :model-value="!!error"
    @update:model-value="() => (error = undefined)"
  >
    {{ error }}
  </v-snackbar>
</template>
