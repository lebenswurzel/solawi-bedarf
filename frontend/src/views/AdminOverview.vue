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
} from "../lib/overview";
import { generatePdf } from "../lib/pdf/pdf";
import JSZip from "jszip";
import { language } from "../lang/lang";
import { sanitizeFileName } from "../../../shared/src/util/fileHelper";

const t = language.pages.overview;

const loading = ref(false);

const onClick = async () => {
  loading.value = true;
  const overview = await getOverview();
  const productCategories = await getProductCategory();
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
  loading.value = false;
};
const onDepotPdfClick = async () => {
  loading.value = true;
  const overview = await getOverview();
  const productCategories = await getProductCategory();
  const dataByDepotAndProductCategory = generateDepotData(
    overview,
    productCategories,
  );
  const zip = new JSZip();
  const depotKeys = Object.keys(dataByDepotAndProductCategory);
  for (let depotKey of depotKeys) {
    const dataByProductCategory = dataByDepotAndProductCategory[depotKey];
    const pdf = generatePdf(
      dataByProductCategory,
      depotKey,
      t.documents.depot.description,
    );
    const blob: Blob = await new Promise((resolve, _) => {
      pdf.getBlob((blob) => resolve(blob));
    });
    zip.file(`${sanitizeFileName(depotKey)}.pdf`, blob, { binary: true });
  }
  zip.generateAsync({ type: "blob" }).then((content) => {
    const blob = new Blob([content], { type: "zip" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "depots.zip";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    loading.value = false;
  });
};
const onUserPdfClick = async () => {
  loading.value = true;
  const overview = await getOverview();
  const productCategories = await getProductCategory();
  const dataByUserAndProductCategory = generateUserData(
    overview,
    productCategories,
  );
  const zip = new JSZip();
  const userKeys = Object.keys(dataByUserAndProductCategory);
  for (let userKey of userKeys) {
    const dataByProductCategory = dataByUserAndProductCategory[userKey];
    const pdf = generatePdf(
      dataByProductCategory,
      userKey,
      t.documents.user.description,
    );
    const blob: Blob = await new Promise((resolve, _) => {
      pdf.getBlob((blob) => resolve(blob));
    });
    zip.file(`${sanitizeFileName(userKey)}.pdf`, blob, { binary: true });
  }
  zip.generateAsync({ type: "blob" }).then((content) => {
    const blob = new Blob([content], { type: "zip" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users.zip";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    loading.value = false;
  });
};
</script>

<template>
  <v-card class="ma-4">
    <v-card-title> Übersicht </v-card-title>
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
  <v-card class="ma-4">
    <v-card-title> Download Depot pdf </v-card-title>
    <v-card-text>
      Bei Click auf "Übersicht herunterladen" wird eine aktuelle Übersicht der
      Bedarfsanmeldung je Depot als pdf heruntergeladen und generiert. Das kann
      eine Weile dauern und sollte mit Rücksicht auf die Nutzer nicht zur
      Hauptnutzungszeit erfolgen.
    </v-card-text>
    <v-card-actions>
      <v-btn @click="onDepotPdfClick" :loading="loading"
        >Übersicht herunterladen</v-btn
      >
    </v-card-actions>
  </v-card>
  <v-card class="ma-4">
    <v-card-title> Download Ernteteiler pdf </v-card-title>
    <v-card-text>
      Bei Click auf "Übersicht herunterladen" wird eine aktuelle Übersicht der
      Bedarfsanmeldung je Ernteteiler als pdf heruntergeladen und generiert. Das
      kann eine Weile dauern und sollte mit Rücksicht auf die Nutzer nicht zur
      Hauptnutzungszeit erfolgen.
    </v-card-text>
    <v-card-actions>
      <v-btn @click="onUserPdfClick" :loading="loading"
        >Übersicht herunterladen</v-btn
      >
    </v-card-actions>
  </v-card>
</template>
