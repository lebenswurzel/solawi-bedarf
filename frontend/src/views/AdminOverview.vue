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

const loading = ref(false);

const configStore = useConfigStore();
const uiFeedbackStore = useUiFeedback();
const textContentStore = useTextContentStore();
const { organizationInfo } = storeToRefs(textContentStore);

const onClick = async () => {
  loading.value = true;
  try {
    const overview = await getOverview(configStore.activeConfigId);
    const productCategories = await getProductCategory(
      configStore.activeConfigId,
    );
    const csv = generateOverviewCsv(overview, productCategories);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "uebersicht.csv";
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
    zip.download("depots.zip");
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
    zip.download("users.zip");
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
    <v-card-title> Übersicht</v-card-title>
    <v-card-text>
      Bei Click auf "Übersicht herunterladen" wird eine aktuelle Übersicht der
      Bedarfsanmeldung als csv heruntergeladen und generiert. Das kann eine
      Weile dauern und sollte mit Rücksicht auf die Nutzer nicht zur
      Hauptnutzungszeit erfolgen.
    </v-card-text>
    <v-card-actions>
      <v-btn @click="onClick" :loading="loading">Übersicht herunterladen</v-btn>
    </v-card-actions>
  </v-card>
  <v-card class="ma-2">
    <v-card-title> Download Depot pdf</v-card-title>
    <v-card-text>
      Bei Click auf "Übersicht herunterladen" wird eine aktuelle Übersicht der
      Bedarfsanmeldung je Depot als pdf heruntergeladen und generiert. Das kann
      eine Weile dauern und sollte mit Rücksicht auf die Nutzer nicht zur
      Hauptnutzungszeit erfolgen.
    </v-card-text>
    <v-card-actions>
      <v-btn @click="onDepotPdfClick" :loading="loading"
        >Übersicht herunterladen
      </v-btn>
    </v-card-actions>
  </v-card>
  <v-card class="ma-2">
    <v-card-title> Download Ernteteiler pdf</v-card-title>
    <v-card-text>
      Bei Click auf "Übersicht herunterladen" wird eine aktuelle Übersicht der
      Bedarfsanmeldung je Ernteteiler als pdf heruntergeladen und generiert. Das
      kann eine Weile dauern und sollte mit Rücksicht auf die Nutzer nicht zur
      Hauptnutzungszeit erfolgen.
    </v-card-text>
    <v-card-actions>
      <v-btn @click="onUserPdfClick" :loading="loading"
        >Übersicht herunterladen
      </v-btn>
    </v-card-actions>
  </v-card>
</template>
