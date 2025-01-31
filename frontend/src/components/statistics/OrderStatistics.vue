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
import { computed, onMounted, ref } from "vue";
import { language } from "../../../../shared/src/lang/lang.ts";
import { Order } from "../../../../shared/src/types.ts";
import { getOrder } from "../../requests/shop.ts";
import { useConfigStore } from "../../store/configStore.ts";
import { useUserStore } from "../../store/userStore.ts";
import { UserCategory } from "../../../../shared/src/enum.ts";
import { storeToRefs } from "pinia";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const t = language.pages.statistics;
const userStore = useUserStore();
const configStore = useConfigStore();
const { depots } = storeToRefs(configStore);

interface OrderExt extends Order {
  userName: string;
  depotName: string;
}

const orders = ref<OrderExt[]>([]);
const processedOrders = ref<number>(0);
const isProcessing = ref(false);
const search = ref<string>("");

const headers = [
  { title: "Benutzer", key: "userName" },
  { title: "Monatsbeitrag", key: "offer" },
  { title: "Angelegt", key: "createdAt" },
  { title: "Aktualisiert", key: "updatedAt" },
  { title: "Gültig ab", key: "validFrom" },
  { title: "Kategorie", key: "category" },
  { title: "Depot", key: "depot" },
  { title: "ID", key: "id" },
];

const isEmpty = (obj: Order): boolean => {
  return obj && Object.keys(obj).length === 0;
};

const prettyDate = (date?: Date | string | null): string => {
  if (date) {
    return format(date, "PPp", { locale: de });
  }
  return "nie";
};

onMounted(async () => {
  processedOrders.value = 0;
  isProcessing.value = true;

  const allOrders = userStore.userOptions.map(async (u) => {
    const order = await getOrder(u.value, configStore.activeConfigId);
    processedOrders.value++;
    if (isEmpty(order)) {
      return undefined;
    }
    const depot = depots.value.filter((d) => d.id == order.depotId);
    return {
      ...order,
      userName: u.title,
      depotName: depot.length ? depot[0].name : "unbekannt",
    };
  });

  orders.value = (await Promise.all(allOrders)).filter((o) => !!o);
  isProcessing.value = false;
});

const categoryCounts = computed(() => {
  return orders.value.reduce(
    (acc, cur) => {
      return acc.map((c) => {
        if (c.title == cur.category) {
          return { ...c, count: c.count + 1 };
        } else {
          return c;
        }
      });
    },
    [
      { title: UserCategory.CAT100, count: 0 },
      { title: UserCategory.CAT115, count: 0 },
      { title: UserCategory.CAT130, count: 0 },
    ],
  );
});

const offerRanges = computed(() => {
  return orders.value.reduce(
    (acc, cur) => {
      return acc.map((c) => {
        if (cur.offer >= c.offerMin && cur.offer < c.offerMax) {
          return { ...c, count: c.count + 1 };
        } else {
          return c;
        }
      });
    },
    [
      { offerMin: 0, offerMax: 50, count: 0 },
      { offerMin: 50, offerMax: 100, count: 0 },
      { offerMin: 100, offerMax: 150, count: 0 },
      { offerMin: 150, offerMax: 200, count: 0 },
      { offerMin: 200, offerMax: 250, count: 0 },
      { offerMin: 250, offerMax: 500, count: 0 },
      { offerMin: 500, offerMax: 1000, count: 0 },
    ],
  );
});
const depotDistribution = computed(() => {
  return orders.value
    .reduce(
      (acc, order) => {
        return acc.map((c) => {
          if (c.depotName == order.depotName) {
            return { ...c, count: c.count + 1 };
          } else {
            return c;
          }
        });
      },
      depots.value.map((d) => ({
        depotName: d.name,
        count: 0,
      })),
    )
    .sort((a, b) => (a.depotName < b.depotName ? -1 : 1));
});
</script>

<template>
  <v-card-title style="white-space: normal">
    {{ t.ordersCard.title }}
  </v-card-title>
  <v-card-text>
    <p class="mb-4">
      {{ t.ordersCard.text }}
    </p>
    <v-progress-linear
      height="12"
      :max="userStore.userOptions.length"
      :model-value="processedOrders"
      v-if="isProcessing"
      color="primary"
    ></v-progress-linear>

    <template v-if="!isProcessing">
      <v-text-field
        prepend-inner-icon="mdi-magnify"
        v-model="search"
        variant="outlined"
        density="compact"
        label="Suche"
        single-line
        clearable
        hint="Volltextsuche in allen Spalten"
      />
      <v-data-table :items="orders" :headers="headers" :search="search">
        <template v-slot:item.createdAt="{ item }">
          {{ prettyDate(item.createdAt) }}
        </template>
        <template v-slot:item.updatedAt="{ item }">
          {{ prettyDate(item.updatedAt) }}
        </template>
        <template v-slot:item.validFrom="{ item }">
          {{ prettyDate(item.validFrom) }}
        </template>
        <template v-slot:item.category="{ item }">
          {{
            language.app.options.orderUserCategories[
              item.category as UserCategory
            ].title
          }}
        </template>
      </v-data-table>

      <div class="text-h6">{{ t.ordersCard.distributions }}</div>
      <v-container fluid>
        <v-row>
          <v-col cols="12" sm="6" lg="4">
            <v-table>
              <thead>
                <tr>
                  <th>Kategorie</th>
                  <th>Anzahl</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="catCount in categoryCounts">
                  <td>
                    {{
                      language.app.options.orderUserCategories[catCount.title]
                        .title
                    }}
                    ({{ catCount.title }})
                  </td>
                  <td>{{ catCount.count }}</td>
                </tr>
              </tbody>
            </v-table>
          </v-col>

          <v-col cols="12" sm="6" lg="4">
            <v-table>
              <thead>
                <tr>
                  <th>Monatsbeitrag</th>
                  <th>Anzahl</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="range in offerRanges">
                  <td>
                    {{ range.offerMin }} € &le; x &lt; {{ range.offerMax }} €
                  </td>
                  <td>{{ range.count }}</td>
                </tr>
              </tbody>
            </v-table>
          </v-col>
          <v-col cols="12" sm="6" lg="4">
            <v-table>
              <thead>
                <tr>
                  <th>Depot</th>
                  <th>Anzahl</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="depotCount in depotDistribution">
                  <td>
                    {{ depotCount.depotName }}
                  </td>
                  <td>{{ depotCount.count }}</td>
                </tr>
              </tbody>
            </v-table>
          </v-col>
        </v-row>
      </v-container>
    </template>
  </v-card-text>
</template>
