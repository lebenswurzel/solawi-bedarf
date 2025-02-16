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
import { getOverview } from "../requests/overview";
import { getProductCategory } from "../requests/productCategory";
import {
  generateDepotData,
  generateOverviewCsv,
  generateUserData,
} from "../../../shared/src/pdf/overviewPdfs.ts";
import { sanitizeFileName } from "../../../shared/src/util/fileHelper";
import { useConfigStore } from "../store/configStore.ts";
import { useUiFeedback } from "../store/uiFeedbackStore.ts";
import { Zip } from "../../../shared/src/pdf/zip.ts";
import { createDefaultPdf } from "../../../shared/src/pdf/pdf.ts";
import { useTextContentStore } from "../store/textContentStore.ts";
import { storeToRefs } from "pinia";
import { formatDateForFilename } from "../../../shared/src/util/dateHelper.ts";
import { language } from "../../../shared/src/lang/lang.ts";

const loading = ref(false);

const configStore = useConfigStore();
const uiFeedbackStore = useUiFeedback();
const textContentStore = useTextContentStore();
const { organizationInfo } = storeToRefs(textContentStore);

const orderOveriewWithApplicant = ref(false);
const orderOveriewWithProductCategoryId = ref(true);
const orderOverviewSeasons = computed(() =>
  configStore.availableConfigs.map((c) => ({
    title: c.name,
    value: c.id,
  })),
);
const orderOverviewSelectedSeasons = ref<number[]>([
  configStore.activeConfigId,
]);

const onClick = async () => {
  loading.value = true;
  try {
    const configIds = orderOverviewSelectedSeasons.value;
    const overview = await Promise.all(
      configIds.map(
        async (configId) =>
          await getOverview(configId, orderOveriewWithApplicant.value),
      ),
    ).then((os) => os.flat());

    const productCategories = await Promise.all(
      configIds.map(async (configId) => await getProductCategory(configId)),
    ).then((pcs) => pcs.flat());
    const csv = generateOverviewCsv(
      overview,
      productCategories,
      orderOveriewWithApplicant.value,
      orderOveriewWithProductCategoryId.value,
    );
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    const filename = `uebersicht ${formatDateForFilename(new Date())}.csv`;
    a.href = url;
    a.download = sanitizeFileName(filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (e) {
    uiFeedbackStore.setError("" + e);
    throw e;
  } finally {
    loading.value = false;
  }
};

const onDepotPdfClick = async () => {
  loading.value = true;
  try {
    const overview = await getOverview(configStore.activeConfigId);
    const productCategories = await getProductCategory(
      configStore.activeConfigId,
    );
    const dataByDepotAndProductCategory = generateDepotData(
      overview,
      productCategories,
      configStore.config?.name ?? "SAISON?",
    );
    const zip = new Zip();
    for (const pdfSpec of dataByDepotAndProductCategory) {
      await zip.addPdf(
        createDefaultPdf(pdfSpec, organizationInfo.value),
        `${sanitizeFileName(pdfSpec.receiver)}.pdf`,
      );
    }

    const filename = `depots ${formatDateForFilename(new Date())}.zip`;
    zip.download(filename);
  } catch (e) {
    uiFeedbackStore.setError("" + e);
    throw e;
  } finally {
    loading.value = false;
  }
};

const onUserPdfClick = async () => {
  loading.value = true;
  try {
    const overview = await getOverview(configStore.activeConfigId);
    const productCategories = await getProductCategory(
      configStore.activeConfigId,
    );
    const dataByUserAndProductCategory = generateUserData(
      overview,
      productCategories,
      configStore.config?.name ?? "SAISON?",
    );
    const zip = new Zip();
    for (const pdf of dataByUserAndProductCategory) {
      await zip.addPdf(
        createDefaultPdf(pdf, organizationInfo.value),
        `${sanitizeFileName(pdf.receiver)}.pdf`,
      );
    }
    const filename = `users ${formatDateForFilename(new Date())}.zip`;
    zip.download(filename);
  } catch (e) {
    uiFeedbackStore.setError("" + e);
    throw e;
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <v-card class="ma-2">
    <v-card-title>Bestellübersicht als CSV</v-card-title>
    <v-card-text class="pb-0">
      Bei Klick auf "Übersicht herunterladen" wird eine aktuelle Übersicht der
      Bedarfsanmeldungen heruntergeladen und als CSV exportiert. Die
      Nachfolgenden Optionen beeinflussen den Datenumfang und die Formatierung.
      <v-row>
        <v-col cols="12" md="4">
          <v-checkbox
            v-model="orderOveriewWithApplicant"
            label="Inklusive Kontaktinformationen"
            density="compact"
            persistent-hint
            :hint="
              orderOveriewWithApplicant
                ? 'Name, E-Mail und Telefonnummer der Ernteteiler werden in der CSV ausgegeben.'
                : 'Es ist nur die LW-Nummer der Ernteteiler enthalten.'
            "
          ></v-checkbox>
        </v-col>
        <v-col cols="12" md="4">
          <v-checkbox
            v-model="orderOveriewWithProductCategoryId"
            label="Inklusive Produktkategorien-IDs"
            :hint="
              orderOveriewWithProductCategoryId
                ? 'Dem Produktnamen wird der Produktkategorie-ID vorangestellt um potentielle Namensdopplungen zu vermeiden.'
                : 'Achtung: Falls der selbe Produktname in mehreren Kategorien vorkommt, wird dieser in der CSV nicht eindeutig zugeordnet.'
            "
            density="compact"
            persistent-hint
          ></v-checkbox>
        </v-col>
        <v-col cols="12" md="4">
          <v-select
            :items="orderOverviewSeasons"
            v-model="orderOverviewSelectedSeasons"
            label="Saison(s)"
            chips
            multiple
            persistent-hint
          ></v-select>
        </v-col>
      </v-row>
    </v-card-text>
    <v-card-actions>
      <v-btn
        @click="onClick"
        :loading="loading"
        :disabled="orderOverviewSelectedSeasons.length === 0"
        >Bedarfsanmeldungs-CSV herunterladen</v-btn
      >
    </v-card-actions>
  </v-card>
  <v-card class="ma-2">
    <v-card-title>Depot-Übersichten als PDFs</v-card-title>
    <v-card-text>
      Bei Klick auf "Übersicht herunterladen" wird eine aktuelle Übersicht der
      Bedarfsanmeldung je Depot als PDF heruntergeladen und generiert.
    </v-card-text>
    <v-card-actions>
      <v-btn @click="onDepotPdfClick" :loading="loading"
        >Depot-PDFs herunterladen
      </v-btn>
    </v-card-actions>
  </v-card>
  <v-card class="ma-2">
    <v-card-title>Bedarsanmeldungen je Ernteteiler als PDFs</v-card-title>
    <v-card-text>
      Bei Klick auf "Übersicht herunterladen" wird eine aktuelle Übersicht der
      Bedarfsanmeldung je Ernteteiler als PDF heruntergeladen und generiert.
    </v-card-text>
    <v-card-actions>
      <v-btn @click="onUserPdfClick" :loading="loading"
        >Nutzer-PDFs herunterladen
      </v-btn>
    </v-card-actions>
  </v-card>
  <v-alert
    class="ma-2"
    type="warning"
    variant="outlined"
    :title="language.app.hints.note"
  >
    Das Zusammenstellen der Daten kann eine Weile dauern und sollte mit
    Rücksicht auf die Nutzer nicht zur Hauptnutzungszeit erfolgen.
  </v-alert>
</template>
