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
import { useVersionInfoStore } from "../store/versionInfoStore.ts";
import { useUiFeedback } from "../store/uiFeedbackStore.ts";

const props = defineProps<{
  showRegisterLink?: boolean;
  useRedirect?: boolean;
}>();
const emit = defineEmits(["loginOk", "loginFailed"]);

const password = ref<string>();
const username = ref<string>();
const untilMidnight = ref<boolean>();
const showPassword = ref<boolean>(false);

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const { setError, setSuccess } = useUiFeedback();
const versionInfoStore = useVersionInfoStore();

const onLogin = async () => {
  login(username.value!, password.value!, untilMidnight.value!)
    .then(async () => {
      await userStore.update();
      if (props.useRedirect) {
        let redirect = (route.query.redirect as string) || "/";
        if (redirect == "/login") {
          redirect = "/";
        }
        await router.push(redirect);
      }
      versionInfoStore.update();
      setSuccess("Login erfolgreich");
      emit("loginOk");
    })
    .catch(() => {
      setError(
        "Der Login ist leider fehlgeschlagen. Bitte gib das richtige Passwort ein oder korrigiere gegebenenfalls vorher den Anmeldenamen.",
      );
      emit("loginFailed");
    });
};

onMounted(() => {
  if (userStore.currentUser) {
    username.value = userStore.currentUser?.name;
  }
});
</script>

<template>
  <v-card class="ma-2">
    <v-card-title>Login</v-card-title>
    <slot></slot>
    <v-card-subtitle v-if="props.showRegisterLink">
      Noch kein Login?
      <router-link to="/register">Hier Registrieren</router-link>
    </v-card-subtitle>
    <v-card-text class="pb-0">
      <v-text-field
        v-model="username"
        label="Anmeldename"
        placeholder="LW23042"
        @keyup.enter="onLogin"
      ></v-text-field>
      <v-text-field
        label="Passwort"
        :type="showPassword ? 'text' : 'password'"
        v-model="password"
        @keyup.enter="onLogin"
      >
        <template #append-inner>
          <v-icon
            :icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
            @click="showPassword = !showPassword"
            tabindex="-1"
            style="cursor: pointer"
          />
        </template>
      </v-text-field>
      <v-checkbox
        label="Heute angemeldet bleiben"
        v-model="untilMidnight"
        hide-details
        density="compact"
      />
    </v-card-text>
    <v-card-actions class="justify-center">
      <v-btn class="text-white" @click="onLogin" variant="elevated">
        Login
      </v-btn>
      <slot name="actions"></slot>
    </v-card-actions>
    <v-card-text>
      <v-card-subtitle class="text-center">
        Passwort vergessen?
        <router-link to="/requestpassword">Passwort zurücksetzen</router-link>
      </v-card-subtitle>
    </v-card-text>
  </v-card>
</template>
