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
import { computed, ref } from "vue";
import Papa from "papaparse";
import { pick } from "../../../../shared/src/util/utils";

type CsvRow<T extends string> = {
  [K in T]: string; // Identifier key with string value
} & {
  data: Record<string, string>; // All other columns
};

const emit = defineEmits<{
  <T extends string>(e: "confirm", data: CsvRow<T>[]): void;
}>();
const props = defineProps<{
  columns: string[];
  identifier: string;
}>();

const file = ref<File | null>(null);
const parsedData = ref<Array<Record<string, string>>>([]);

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (!target.files?.length) return;

  file.value = target.files[0];

  const reader = new FileReader();
  reader.onload = () => {
    if (reader.result) {
      parseCSV(reader.result.toString());
    }
  };
  reader.readAsText(file.value);
};

const clearFile = () => {
  file.value = null;
  parsedData.value = [];
};

const parseCSV = (csvText: string) => {
  Papa.parse(csvText, {
    delimiter: ";", // Adjust based on your CSV format
    header: true, // Treat first row as headers
    skipEmptyLines: true,
    complete: (result) => {
      parsedData.value = result.data as Record<string, string>[];
    },
  });
};

const filteredData = computed((): CsvRow<typeof props.identifier>[] => {
  return parsedData.value.map((row) => {
    return {
      [props.identifier]: row[props.identifier],
      data: pick(row, props.columns),
    } as CsvRow<typeof props.identifier>;
  });
});

const sendToBackend = async (data: any[]) => {
  emit("confirm", data);
};

const duplicatesCount = computed(() => {
  return (
    filteredData.value.length -
    new Set(filteredData.value.map((v) => v[props.identifier])).size
  );
});
</script>

<template>
  <v-container fluid>
    <v-row>
      <v-col>
        <p class="mb-2">
          Um Daten zu importieren, wähle eine CSV-Datei aus, die folgende mit
          Semikolon getrennte Spalten enthält:<br />
          Erforderliche Spalten: {{ props.identifier }}<br />
          Optionale Spalten: {{ props.columns.join(", ") }}
        </p>
        <p class="mb-2">
          Vor dem eigentlichen Import können die Daten in der Vorschau geprüft
          werden.
        </p>
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        <v-file-input
          label="Upload CSV File"
          @change="handleFileUpload"
          @click:clear="clearFile"
          clearable
          accept=".csv"
          variant="outlined"
          density="compact"
          hide-details
        ></v-file-input>
      </v-col>
      <v-col>
        <v-btn :disabled="!file" @click="sendToBackend(filteredData)">
          Importieren
        </v-btn>
      </v-col>
    </v-row>

    <v-divider class="my-4"></v-divider>
    <div class="text-h6 mb-2">Vorschau der zu importierenden Daten</div>
    <div v-if="duplicatesCount > 0" class="my-2">
      Es existieren {{ duplicatesCount }} uneindeutige Einträge
      (<v-icon>mdi-alert</v-icon>)
    </div>
    <v-table v-if="parsedData.length">
      <thead>
        <tr>
          <th>{{ props.identifier }}</th>
          <th
            v-for="(key, index) in Object.keys(filteredData[0].data)"
            :key="index"
          >
            {{ key }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in filteredData" :key="index">
          <td>
            <v-icon
              v-if="
                filteredData.filter((v) => v.name === row[props.identifier])
                  .length > 1
              "
              >mdi-alert</v-icon
            >
            {{ row[props.identifier] }}
          </td>
          <td v-for="(value, key) in row.data" :key="key">
            {{ value }}
          </td>
        </tr>
      </tbody>
    </v-table>
    <div v-else>(keine CSV-Datei geladen)</div>
  </v-container>
</template>
