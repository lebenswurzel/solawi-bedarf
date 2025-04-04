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
import { onMounted, ref, computed } from "vue";
import { getErrorLog } from "../../requests/errorLog";
import { GetErrorLogResponse } from "../../../../shared/src/types";
import { useUiFeedback } from "../../store/uiFeedbackStore";
import { prettyDate } from "../../../../shared/src/util/dateHelper";
import { safeCopyToClipboard } from "../../lib/utils";

declare const navigator: Navigator;

const errorLogs = ref<GetErrorLogResponse>([]);
const loading = ref(false);
const search = ref("");
const showExtendedInfo = ref(false);
const { setError } = useUiFeedback();

const baseHeaders = [
  {
    title: "Zeitpunkt",
    key: "createdAt",
    align: "start" as const,
    sortable: true,
    width: "150",
  },
  {
    title: "URL",
    key: "url",
    align: "start" as const,
    sortable: true,
    width: "150",
  },
  {
    title: "Status",
    key: "status",
    align: "center" as const,
    sortable: true,
    width: "100",
  },
  {
    title: "Fehler",
    key: "error",
    align: "start" as const,
    sortable: false,
    width: "300",
  },
  {
    title: "Request Body",
    key: "requestBody",
    align: "start" as const,
    sortable: false,
  },
  {
    title: "Request Query",
    key: "requestQuery",
    align: "start" as const,
    sortable: false,
  },
];

const extendedHeaders = [
  {
    title: "Benutzer ID",
    key: "userId",
    align: "center" as const,
    sortable: true,
    width: "150",
  },
  {
    title: "Request Headers",
    key: "requestHeaders",
    align: "start" as const,
    sortable: false,
  },
  {
    title: "User Agent",
    key: "userAgent",
    align: "start" as const,
    sortable: true,
    width: "200",
  },
  {
    title: "Benutzer Name",
    key: "userName",
    align: "start" as const,
    sortable: true,
    width: "150",
  },
];

const headers = computed(() =>
  showExtendedInfo.value ? [...baseHeaders, ...extendedHeaders] : baseHeaders,
);

const refresh = async () => {
  loading.value = true;
  try {
    errorLogs.value = await getErrorLog();
  } catch (e) {
    setError("Fehler beim Laden der Fehlerprotokolle", e as Error);
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  await refresh();
});
</script>

<template>
  <v-card class="ma-2">
    <v-card-title>Fehlerprotokoll</v-card-title>
    <v-card-text>
      <v-card-actions>
        <v-btn @click="refresh" :loading="loading" prepend-icon="mdi-refresh">
          Aktualisieren
        </v-btn>
      </v-card-actions>
      <v-container fluid>
        <v-row no-gutters>
          <v-col cols="12" sm="4" class="d-flex align-center pa-2">
            <v-text-field
              prepend-inner-icon="mdi-magnify"
              v-model="search"
              variant="outlined"
              density="compact"
              label="Suche im Fehlerprotokoll"
              single-line
              clearable
              hint="Volltextsuche in allen Spalten"
            />
          </v-col>
          <v-spacer />
          <v-col cols="12" sm="4" class="d-flex align-center pa-2">
            <v-switch
              v-model="showExtendedInfo"
              label="Erweiterte Informationen anzeigen"
              density="compact"
              hide-details
            />
          </v-col>
        </v-row>
        <v-row no-gutters>
          <v-col cols="12">
            <v-data-table
              :headers="headers"
              :items="errorLogs"
              :search="search"
              density="compact"
              :loading="loading"
            >
              <template v-slot:item.createdAt="{ item }">
                {{ prettyDate(item.createdAt) }}
              </template>
              <template v-slot:item.error="{ item }">
                <div class="error-message">
                  <div class="d-flex align-center">
                    <strong>{{ item.error.name }}</strong>
                    <v-btn
                      icon="mdi-content-copy"
                      size="small"
                      variant="text"
                      density="compact"
                      class="ms-2"
                      @click="
                        safeCopyToClipboard(
                          item.error.name +
                            '\n' +
                            item.error.message +
                            (item.error.stack
                              ? '\n' + item.error.stack.join('\n')
                              : ''),
                        )
                      "
                    />
                  </div>
                  <div>{{ item.error.message }}</div>
                  <div v-if="item.error.stack" class="stack-trace">
                    <pre>{{ item.error.stack.join("\n") }}</pre>
                  </div>
                </div>
              </template>
              <template v-slot:item.requestBody="{ item }">
                <div v-if="item.requestBody" class="d-flex align-start">
                  <pre>{{ JSON.stringify(item.requestBody, null, 2) }}</pre>
                  <v-btn
                    icon="mdi-content-copy"
                    size="small"
                    variant="text"
                    density="compact"
                    class="ms-2"
                    @click="
                      safeCopyToClipboard(
                        JSON.stringify(item.requestBody, null, 2),
                      )
                    "
                  />
                </div>
              </template>
              <template v-slot:item.requestQuery="{ item }">
                <pre v-if="item.requestQuery">{{
                  JSON.stringify(item.requestQuery, null, 2)
                }}</pre>
              </template>
              <template v-slot:item.requestHeaders="{ item }">
                <pre v-if="item.requestHeaders">{{
                  JSON.stringify(item.requestHeaders, null, 2)
                }}</pre>
              </template>
            </v-data-table>
          </v-col>
        </v-row>
      </v-container>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.error-message {
  max-width: 400px;
  white-space: normal;
  word-break: break-word;
}

.stack-trace {
  margin-top: 8px;
  max-height: 200px;
}

pre {
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow-y: auto;
  font-size: 0.6em;
  margin: 0;
}
</style>
