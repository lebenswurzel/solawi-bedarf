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
import { appConfig } from "../../../../shared/src/config";
import { buildInfo } from "../../../../shared/src/buildInfo";

declare const navigator: Navigator;

const errorLogs = ref<GetErrorLogResponse>([]);
const loading = ref(false);
const search = ref("");
const showExtendedInfo = ref(false);
const { setError } = useUiFeedback();
const showDialog = ref(false);
const selectedError = ref<GetErrorLogResponse[0] | null>(null);
const timeFilter = ref<"lastHour" | "today" | "yesterday" | "thisWeek" | "all">(
  "all",
);

const filteredErrorLogs = computed(() => {
  if (timeFilter.value === "all") return errorLogs.value;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - today.getDay());
  const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

  return errorLogs.value.filter((log) => {
    const logDate = new Date(log.createdAt);
    switch (timeFilter.value) {
      case "lastHour":
        return logDate >= lastHour;
      case "today":
        return logDate >= today;
      case "yesterday":
        return logDate >= yesterday && logDate < today;
      case "thisWeek":
        return logDate >= weekStart;
      default:
        return true;
    }
  });
});

const openErrorDialog = (error: GetErrorLogResponse[0]) => {
  selectedError.value = error;
  showDialog.value = true;
};

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

const formatStackLine = (line: string): string => {
  const match = line.match(/\(\/(backend\/src\/.+?):(\d+):(\d+)\)$/);
  if (!match) return line;

  const [_, file, lineNumber] = match;
  const url = `${appConfig.meta.sourceCodeUrl}/blob/${buildInfo.git.tag || buildInfo.git.branch}/${file}#L${lineNumber}`;
  return `<a href="${url}" target="_blank" rel="noopener noreferrer">${line}</a>`;
};

const formatStack = (stack: string[]): string => {
  return stack.map(formatStackLine).join("\n");
};

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
          <v-col cols="12">
            <v-btn-toggle
              v-model="timeFilter"
              mandatory
              density="compact"
              class="me-4"
            >
              <v-btn value="all">Alle</v-btn>
              <v-btn value="lastHour">Letzte Stunde</v-btn>
              <v-btn value="today">Heute</v-btn>
              <v-btn value="yesterday">Gestern</v-btn>
              <v-btn value="thisWeek">Diese Woche</v-btn>
            </v-btn-toggle>
          </v-col>
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
              :items="filteredErrorLogs"
              :search="search"
              density="compact"
              :loading="loading"
            >
              <template v-slot:item.createdAt="{ item }">
                <v-btn
                  icon="mdi-information"
                  variant="text"
                  density="compact"
                  class="ms-2"
                  @click="openErrorDialog(item)"
                />
                <br />
                {{ prettyDate(item.createdAt) }}
              </template>
              <template v-slot:item.error="{ item }">
                <div class="error-message">
                  <div class="d-flex align-center">
                    <strong>{{ item.error.name }}</strong>
                  </div>
                  <div>{{ item.error.message }}</div>
                  <div v-if="item.error.stack" class="stack-trace">
                    <pre v-html="formatStack(item.error.stack)"></pre>
                  </div>
                </div>
              </template>
              <template v-slot:item.requestBody="{ item }">
                <div v-if="item.requestBody" class="d-flex align-start">
                  <pre>{{ JSON.stringify(item.requestBody, null, 2) }}</pre>
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

    <v-dialog v-model="showDialog" max-width="1200px">
      <v-card v-if="selectedError">
        <v-card-title class="text-h5">
          Fehlerdetails
          <v-btn
            icon="mdi-close"
            variant="text"
            class="float-right"
            @click="showDialog = false"
          />
        </v-card-title>
        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="12" sm="4">
                <v-list-item>
                  <v-list-item-title>Zeitpunkt</v-list-item-title>
                  <v-list-item-subtitle>{{
                    prettyDate(selectedError.createdAt)
                  }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>URL</v-list-item-title>
                  <v-list-item-subtitle>{{
                    selectedError.url
                  }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>Status</v-list-item-title>
                  <v-list-item-subtitle>{{
                    selectedError.status
                  }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item v-if="selectedError.userId">
                  <v-list-item-title>Benutzer ID</v-list-item-title>
                  <v-list-item-subtitle>{{
                    selectedError.userId
                  }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item v-if="selectedError.userName">
                  <v-list-item-title>Benutzer Name</v-list-item-title>
                  <v-list-item-subtitle>{{
                    selectedError.userName
                  }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item v-if="selectedError.userAgent">
                  <v-list-item-title>User Agent</v-list-item-title>
                  <v-list-item-subtitle>{{
                    selectedError.userAgent
                  }}</v-list-item-subtitle>
                </v-list-item>
              </v-col>
              <v-col cols="12" sm="8">
                <v-list-item>
                  <v-list-item-title
                    >Fehler

                    <v-btn
                      icon="mdi-content-copy"
                      size="small"
                      variant="text"
                      density="compact"
                      class="ms-2"
                      @click="
                        safeCopyToClipboard(
                          selectedError.error.stack
                            ? '\n' + selectedError.error.stack.join('\n')
                            : '',
                        )
                      "
                    />
                  </v-list-item-title>
                  <v-list-item-subtitle class="error-name">{{
                    selectedError.error.name
                  }}</v-list-item-subtitle>
                  <v-list-item-subtitle>{{
                    selectedError.error.message
                  }}</v-list-item-subtitle>
                  <v-list-item-subtitle
                    v-if="selectedError.error.stack"
                    class="stack-trace"
                  >
                    <pre v-html="formatStack(selectedError.error.stack)"></pre>
                  </v-list-item-subtitle>
                </v-list-item>
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12">
                <v-expansion-panels multiple>
                  <v-expansion-panel v-if="selectedError.requestBody">
                    <v-expansion-panel-title
                      >Request Body
                    </v-expansion-panel-title>
                    <v-expansion-panel-text>
                      <v-btn
                        icon="mdi-content-copy"
                        size="small"
                        variant="text"
                        density="compact"
                        class="ms-2"
                        @click="
                          safeCopyToClipboard(
                            JSON.stringify(selectedError.requestBody, null, 2),
                          )
                        "
                      />
                      <pre>{{
                        JSON.stringify(selectedError.requestBody, null, 2)
                      }}</pre>
                    </v-expansion-panel-text>
                  </v-expansion-panel>
                  <v-expansion-panel v-if="selectedError.requestQuery">
                    <v-expansion-panel-title
                      >Request Query</v-expansion-panel-title
                    >
                    <v-expansion-panel-text>
                      <pre>{{
                        JSON.stringify(selectedError.requestQuery, null, 2)
                      }}</pre>
                    </v-expansion-panel-text>
                  </v-expansion-panel>
                  <v-expansion-panel v-if="selectedError.requestHeaders">
                    <v-expansion-panel-title
                      >Request Headers</v-expansion-panel-title
                    >
                    <v-expansion-panel-text>
                      <v-btn
                        icon="mdi-content-copy"
                        size="small"
                        variant="text"
                        density="compact"
                        class="ms-2"
                        @click="
                          safeCopyToClipboard(
                            JSON.stringify(
                              selectedError.requestHeaders,
                              null,
                              2,
                            ),
                          )
                        "
                      />
                      <pre>{{
                        JSON.stringify(selectedError.requestHeaders, null, 2)
                      }}</pre>
                    </v-expansion-panel-text>
                  </v-expansion-panel>
                </v-expansion-panels>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" @click="showDialog = false">Schließen</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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

.error-name {
  color: rgb(var(--v-theme-error));
  font-weight: bold;
}

.stack-trace a {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}

.stack-trace a:hover {
  text-decoration: underline;
}
</style>
