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
import { getErrorLog } from "../requests/errorLog";
import { GetErrorLogResponse } from "../../../shared/src/types";
import { useUiFeedback } from "../store/uiFeedbackStore";
import { prettyDate } from "../../../shared/src/util/dateHelper";

const errorLogs = ref<GetErrorLogResponse>([]);
const loading = ref(false);
const search = ref("");
const { setError } = useUiFeedback();

const headers = [
  {
    title: "Zeitpunkt",
    key: "createdAt",
    align: "start" as const,
    sortable: true,
  },
  {
    title: "URL",
    key: "url",
    align: "start" as const,
    sortable: true,
  },
  {
    title: "Status",
    key: "status",
    align: "center" as const,
    sortable: true,
  },
  {
    title: "Fehler",
    key: "error",
    align: "start" as const,
    sortable: false,
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
  {
    title: "Benutzer ID",
    key: "userId",
    align: "center" as const,
    sortable: true,
  },
];

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
      <v-container fluid>
        <v-row no-gutters>
          <v-col cols="12" class="d-flex align-center">
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
                  <strong>{{ item.error.name }}</strong>
                  <div>{{ item.error.message }}</div>
                  <div v-if="item.error.stack" class="stack-trace">
                    <pre>{{ item.error.stack.join("\n") }}</pre>
                  </div>
                </div>
              </template>
              <template v-slot:item.requestBody="{ item }">
                <pre v-if="item.requestBody">{{
                  JSON.stringify(item.requestBody, null, 2)
                }}</pre>
              </template>
              <template v-slot:item.requestQuery="{ item }">
                <pre v-if="item.requestQuery">{{
                  JSON.stringify(item.requestQuery, null, 2)
                }}</pre>
              </template>
            </v-data-table>
          </v-col>
        </v-row>
      </v-container>
    </v-card-text>
    <v-card-actions>
      <v-btn @click="refresh" :loading="loading" prepend-icon="mdi-refresh">
        Aktualisieren
      </v-btn>
    </v-card-actions>
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
  font-size: 0.8em;
  max-height: 200px;
  overflow-y: auto;
}

pre {
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow-y: auto;
  font-size: 0.8em;
  margin: 0;
}
</style>
