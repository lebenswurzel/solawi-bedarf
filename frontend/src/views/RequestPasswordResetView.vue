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
import { ref } from "vue";
import { requestPasswordReset } from "../requests/user.ts";
import { storeToRefs } from "pinia";
import { useTextContentStore } from "../store/textContentStore.js";

const textContentStore = useTextContentStore();
const { organizationInfo } = storeToRefs(textContentStore);

const valid = ref(false);
const loading = ref(false);
const success = ref<boolean>();
const username = ref("");

const submit = async () => {
  if (!valid.value) return;
  try {
    loading.value = true;
    await requestPasswordReset({ username: username.value });
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
    <v-form
      v-if="success === undefined"
      v-model="valid"
      @submit.prevent
      @submit="submit"
    >
      <v-card class="ma-2">
        <v-card-title>Passwort zurücksetzen</v-card-title>
        <v-card-subtitle>
          <router-link to="/login">Zurück zur Anmeldung</router-link>
        </v-card-subtitle>
        <v-card-text>
          <p class="mb-3">
            Bitte gib deinen Benutzernamen ein. Wir senden dir anschließend eine
            E-Mail mit weiteren Anweisungen zum Zurücksetzen des Passworts.
          </p>
          <v-text-field
            v-model="username"
            label="Benutzername"
            autocomplete="username"
          />
        </v-card-text>
        <v-card-actions class="justify-center">
          <v-btn
            class="text-white"
            :loading="loading"
            type="submit"
            variant="elevated"
          >
            Link anfordern
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-form>

    <div style="display: flex; justify-content: center" v-else>
      <div style="max-width: 400px">
        <v-card class="ma-2" v-if="success">
          <v-card-title class="text-center"> E-Mail gesendet </v-card-title>
          <v-card-item class="justify-center">
            <v-icon color="success" icon="mdi-check-bold" size="x-large" />
          </v-card-item>
          <v-card-text class="text-center">
            Falls der eingegebene Benutzername existiert, wurde eine E-Mail mit
            einem Link zum Zurücksetzen des Passworts verschickt. Bitte prüfe
            auch Deinen Spam-Ordner.
          </v-card-text>
        </v-card>
        <v-card class="ma-2" v-else>
          <v-card-title class="text-center">
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
