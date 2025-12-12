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
import { saveApplicant } from "../requests/applicant.js";
import {
  emailRules,
  telephoneRules,
  postalcodeRules,
  commentRules,
  gdprRules,
  passwordRules,
  passwordVerifyRules,
  firstnameRules,
  lastnameRules,
  streetRules,
  cityRules,
} from "../lib/validation";
import { Address } from "@lebenswurzel/solawi-bedarf-shared/src/types.ts";
import { useTextContentStore } from "../store/textContentStore.js";
import { storeToRefs } from "pinia";
import InfoCard from "../components/status/InfoCard.vue";

const textContentStore = useTextContentStore();
const { organizationInfo } = storeToRefs(textContentStore);

const valid = ref(false);
const confirmGDPR = ref(false);
const address = ref<Address>({
  firstname: "",
  lastname: "",
  email: "",
  phone: "",
  street: "",
  postalcode: "",
  city: "",
});
const password = ref("");
const passwordVerify = ref("");
const comment = ref("");
const loading = ref(false);
const success = ref<boolean>();

const click = async () => {
  if (valid.value) {
    try {
      loading.value = true;
      await saveApplicant({
        confirmGDPR: confirmGDPR.value,
        password: password.value,
        comment: comment.value,
        address: address.value,
      });
      loading.value = false;
      success.value = true;
    } catch {
      loading.value = false;
      success.value = false;
    }
  }
};
</script>

<template>
  <v-card class="ma-2" v-if="success === undefined">
    <v-card-title>Registrierung</v-card-title>
    <v-card-subtitle>
      Du hast schon einen Login?
      <router-link to="/login">Hier einloggen</router-link>
    </v-card-subtitle>
    <v-form v-model="valid" @submit.prevent @submit="click">
      <v-card-text>
        <p>
          Wenn Du Dich für die Bedarfsanmeldung registrierst, ist das
          <strong>keine</strong> verbindliche Anmeldung Deines Bedarfs. Du
          kannst Dich registrieren, um zu schauen, ob das Gemüse und die anderen
          Nahrungsmittel zu Dir passen. Erst die von Dir mit Ablauf der
          Anmeldefrist gespeicherten Nahrungsmittel und -mengen sind
          verbindlich.
        </p>
        <v-container class="pl-0 pr-0">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="address.firstname"
                :rules="firstnameRules"
                label="Vorname"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="address.lastname"
                :rules="lastnameRules"
                label="Nachname"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="password"
                :rules="passwordRules"
                type="password"
                label="Passwort"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="passwordVerify"
                :rules="passwordVerifyRules(password)"
                type="password"
                label="Passwort bestätigen"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="address.email"
                type="email"
                :rules="emailRules"
                label="E-Mail-Adresse"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="address.phone"
                type="tel"
                :rules="telephoneRules"
                label="Telefonnummer"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="address.street"
                :rules="streetRules"
                label="Straße und Nr."
              />
            </v-col>
            <v-col cols="12" md="2" sm="4">
              <v-text-field
                v-model="address.postalcode"
                :rules="postalcodeRules"
                label="PLZ"
              />
            </v-col>
            <v-col cols="12" md="4" sm="8">
              <v-text-field
                v-model="address.city"
                :rules="cityRules"
                label="Ort"
              />
            </v-col>
            <v-col cols="12" md="12">
              <v-textarea
                v-model="comment"
                :rules="commentRules"
                label="Wie bist Du zur Solawi gekommen?"
                placeholder="Website des LebensWurzel e.V., Facebook, Instagram, Newsletter, Flyer, Bio-Erlebnistage, Empfehlung?"
              />
            </v-col>
            <v-col cols="12" md="12">
              <v-checkbox
                v-model="confirmGDPR"
                :rules="gdprRules"
                label="Ich habe die Datenschutzerklärung gelesen und stimme der Verarbeitung meiner Daten zu."
                required
              ></v-checkbox>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>
      <v-card-actions class="justify-center">
        <v-btn
          class="text-white"
          :loading="loading"
          type="submit"
          variant="elevated"
        >
          Registrieren
        </v-btn>
      </v-card-actions>
    </v-form>
  </v-card>
  <div v-else>
    <InfoCard v-if="success" type="success" title="Registrierung erfolgreich">
      Vielen Dank, dass Du Dich registriert hast. Du erhältst in Kürze eine
      E-Mail mit Deinem Anmeldenamen. Für die Anmeldung brauchst Du außerdem das
      soeben festgelegte Passwort. Bitte nicht vergessen! Du kannst das
      Browser-Fenster jetzt schließen.
    </InfoCard>
    <InfoCard v-else type="error" linkTo="/">
      Bitte registriere Dich noch einmal zu einem späteren Zeitpunkt. Wenn
      dieser Fehler wiederholt auftritt, wende Dich bitte an
      {{ organizationInfo.address.email }}. Danke für Dein Verständnis.
    </InfoCard>
  </div>
</template>
