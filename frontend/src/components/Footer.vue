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
import { appConfig } from "@lebenswurzel/solawi-bedarf-shared/src/config.ts";
import { language } from "@lebenswurzel/solawi-bedarf-shared/src/lang/lang.ts";
import { buildInfo } from "@lebenswurzel/solawi-bedarf-shared/src/buildInfo.ts";

const imprint = ref(false);
const privacyNotice = ref(false);
</script>

<template>
  <v-footer
    app
    absolute
    elevation="2"
    class="text-center d-flex flex-column pb-5"
  >
    <v-container>
      <v-row justify="center" no-gutters>
        <v-col class="text-center" cols="12">
          <v-btn size="small" variant="text" @click="imprint = true">
            {{ language.app.footer.imprint }}
          </v-btn>
          <v-btn size="small" variant="text" @click="privacyNotice = true">
            {{ language.app.footer.privacyNotice }}
          </v-btn>
        </v-col>
      </v-row>
      <v-row justify="center" dense>
        <v-col class="text-center smaller" sm="6" cols="12">
          Version:
          <a
            :href="`${appConfig.meta.sourceCodeUrl}/tree/${buildInfo.git.tag || buildInfo.git.branch}`"
            target="_blank"
            >{{ buildInfo.git.tag || buildInfo.git.branch }}</a
          >,
          <a
            :href="`${appConfig.meta.sourceCodeUrl}/commit/${buildInfo.git.hashShort}`"
            target="_blank"
            >{{ buildInfo.git.hashShort }}</a
          >,
          {{ buildInfo.buildDate }}
        </v-col>
        <v-col class="text-center smaller" sm="6" cols="12">
          {{ language.app.footer.licensedUnder }} &mdash;
          <a :href="appConfig.meta.sourceCodeUrl" target="_blank">{{
            language.app.footer.sourceCode
          }}</a>
        </v-col>
      </v-row>
    </v-container>
  </v-footer>
  <ImprintDialog :open="imprint" @close="imprint = false" />
  <PrivacyNoticeDialog :open="privacyNotice" @close="privacyNotice = false" />
</template>

<style scoped>
.smaller {
  font-size: 0.7rem;
}
footer a {
  color: #6750a4;
}
</style>
