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
import { ref, computed } from "vue";
import { useRoute } from "vue-router";
import { resetPassword } from "../requests/user.ts";
import { useTextContentStore } from "../store/textContentStore.js";
import { storeToRefs } from "pinia";

const route = useRoute();

const textContentStore = useTextContentStore();
const { organizationInfo } = storeToRefs(textContentStore);

const valid = ref(false);
const loading = ref(false);
const success = ref<boolean>();

const password = ref("");
const passwordRepeat = ref("");
const showPassword = ref(false);
const showPasswordRepeat = ref(false);

const token = computed(() => (route.query.token as string) || "");

const passwordRules = [
  (v: string) => !!v || "Bitte Passwort eingeben",
  (v: string) => v.length >= 8 || "Mindestens 8 Zeichen",
];
const repeatRules = [
  (v: string) => !!v || "Bitte Passwort wiederholen",
  (v: string) => v === password.value || "Passwörter stimmen nicht überein",
];

const submit = async () => {
  if (!valid.value) return;
  try {
    loading.value = true;
    await resetPassword({ token: token.value, password: password.value });
    success.value = true;
  } catch (e) {
    console.error(e);
    success.value = false;
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="mx-auto" style="max-width: 600px">
    <v-card class="ma-2" v-if="success === undefined">
      <v-card-title>Neues Passwort setzen</v-card-title>
      <v-card-subtitle>
        <router-link to="/login">Zurück zur Anmeldung</router-link>
      </v-card-subtitle>
      <v-alert v-if="!token" type="warning" variant="tonal" class="mx-4 mt-2">
        Es wurde kein Token in der URL gefunden. Bitte verwende den Link aus der
        E-Mail oder fordere einen neuen Link an.
      </v-alert>
      <v-form v-else v-model="valid" @submit.prevent @submit="submit">
        <v-card-text>
          <v-text-field
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            label="Neues Passwort"
            autocomplete="new-password"
            :rules="passwordRules"
            :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
            @click:append-inner="showPassword = !showPassword"
          />
          <v-text-field
            v-model="passwordRepeat"
            :type="showPasswordRepeat ? 'text' : 'password'"
            label="Passwort wiederholen"
            autocomplete="new-password"
            :rules="repeatRules"
            :append-inner-icon="showPasswordRepeat ? 'mdi-eye-off' : 'mdi-eye'"
            @click:append-inner="showPasswordRepeat = !showPasswordRepeat"
          />
        </v-card-text>
        <v-card-actions class="justify-center">
          <v-btn
            class="text-white"
            :disabled="!token"
            :loading="loading"
            type="submit"
            variant="elevated"
          >
            Passwort setzen
          </v-btn>
        </v-card-actions>
      </v-form>
    </v-card>

    <div style="display: flex; justify-content: center" v-else>
      <div style="max-width: 400px">
        <v-card class="ma-2" v-if="success">
          <v-card-title class="text-center" style="white-space: normal">
            Passwort erfolgreich geändert
          </v-card-title>
          <v-card-item class="justify-center">
            <v-icon color="success" icon="mdi-check-bold" size="x-large" />
          </v-card-item>
          <v-card-text class="text-center">
            Du kannst Dich jetzt mit Deinem neuen Passwort
            <router-link to="/login">anmelden</router-link>.
          </v-card-text>
        </v-card>
        <v-card class="ma-2" v-else>
          <v-card-title class="text-center" style="white-space: normal">
            Ups, da ist etwas schief gegangen!
          </v-card-title>
          <v-card-item class="justify-center">
            <v-icon
              color="error"
              icon="mdi-alert-circle-outline"
              size="x-large"
            />
          </v-card-item>
          <v-card-text class="text-center">
            Bitte versuche es später erneut. Wenn dieser Fehler wiederholt
            auftritt, wende Dich bitte an
            {{ organizationInfo.address.email }}. Danke für Dein Verständnis.
          </v-card-text>
        </v-card>
      </div>
    </div>
  </div>
</template>
