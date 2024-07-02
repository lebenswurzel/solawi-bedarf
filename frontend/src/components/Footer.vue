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
import ImprintDialog from "./ImprintDialog.vue";
import PrivacyNoticeDialog from "./PrivacyNoticeDialog.vue";
import { appConfig } from "../../../shared/src/config";
import { language } from "../lang/lang";

const imprint = ref(false);
const privacyNotice = ref(false);
</script>

<template>
  <v-footer app absolute elevation="2" class="text-center d-flex flex-column">
    <v-row justify="center" no-gutters>
      <v-btn size="small" variant="text" @click="imprint = true">
        {{ language.app.footer.imprint }}
      </v-btn>
      <v-btn size="small" variant="text" @click="privacyNotice = true">
        {{ language.app.footer.privacyNotice }}
      </v-btn>
      <v-col class="text-center mt-4 smaller" cols="12">
        {{ language.app.footer.licensedUnder }} &mdash;
        <a :href="appConfig.meta.sourceCodeUrl" target="_blank">{{
          language.app.footer.sourceCode
        }}</a>
      </v-col>
    </v-row>
  </v-footer>
  <ImprintDialog :open="imprint" @close="imprint = false" />
  <PrivacyNoticeDialog :open="privacyNotice" @close="privacyNotice = false" />
</template>

<style scoped>
.smaller {
  font-size: 0.875rem;
}
footer a {
  color: #6750a4;
}
</style>
