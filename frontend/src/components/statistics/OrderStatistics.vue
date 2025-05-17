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
import { language } from "@lebenswurzel/solawi-bedarf-shared/src/lang/lang.ts";
import {
  Msrp,
  SavedOrder,
} from "@lebenswurzel/solawi-bedarf-shared/src/types.ts";
import { getOrder } from "../../requests/shop.ts";
import { useConfigStore } from "../../store/configStore.ts";
import { useUserStore } from "../../store/userStore.ts";
import { UserCategory } from "@lebenswurzel/solawi-bedarf-shared/src/enum.ts";
import { storeToRefs } from "pinia";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import DistributionPlot, {
  DistributionData,
  DistributionDataItem,
} from "./DistributionPlot.vue";
import SeasonText from "../styled/SeasonText.vue";
import {
  calculateOrderValidMonths,
  getMsrp,
} from "@lebenswurzel/solawi-bedarf-shared/src/msrp.ts";
import { useBIStore } from "../../store/biStore.ts";
import { useVersionInfoStore } from "../../store/versionInfoStore.ts";

const t = language.pages.statistics;
const userStore = useUserStore();
const configStore = useConfigStore();
const { depots } = storeToRefs(configStore);
const biStore = useBIStore();
const versionInfoStore = useVersionInfoStore();

interface OrderExt extends SavedOrder {
  userName: string;
  depotName: string;
  msrp: Msrp;
}

const orders = ref<OrderExt[]>([]);
const processedOrders = ref<number>(0);
const isProcessing = ref(false);
const search = ref<string>("");

const headers = [
  { title: "Benutzer", key: "userName" },
  { title: "Monatsbeitrag", key: "offer" },
  {
    title: "Orientierungswert",
    key: "msrp",
    sortRaw(a: OrderExt, b: OrderExt) {
      return a.offer / a.msrp.monthly.total - b.offer / b.msrp.monthly.total;
    },
  },
  { title: "Angelegt", key: "createdAt" },
  { title: "Aktualisiert", key: "updatedAt" },
  { title: "Gültig ab", key: "validFrom" },
  { title: "Kategorie", key: "category" },
  { title: "Depot", key: "depotName" },
  { title: "ID", key: "id" },
];

const isEmpty = (obj: SavedOrder): boolean => {
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
    const order = await getOrder(
      u.value,
      configStore.activeConfigId,
      false,
      true,
    );
    processedOrders.value++;
    if (isEmpty(order)) {
      return undefined;
    }
    const depot = depots.value.filter((d) => d.id == order.depotId);
    if (!order.orderItems) {
      console.log(order);
    }
    return {
      ...order,
      msrp: getMsrp(
        order.category,
        order.orderItems,
        biStore.productsById,
        calculateOrderValidMonths(
          order.validFrom,
          configStore.config?.validTo,
          versionInfoStore.versionInfo?.serverTimeZone,
        ),
      ),
      userName: u.title,
      depotName: depot.length ? depot[0].name : "unbekannt",
    };
  });

  orders.value = (await Promise.all(allOrders)).filter((o) => !!o);
  isProcessing.value = false;
});

const relevantOrders = computed(() => {
  return orders.value.filter((o) => o.offer > 0);
});

const categoriesDistribution = computed((): DistributionData => {
  const items = relevantOrders.value.reduce(
    (acc, cur) => {
      return acc.map((c) => {
        if (c.label == cur.category) {
          return { ...c, value: c.value + 1 };
        } else {
          return c;
        }
      });
    },
    [
      { label: UserCategory.CAT100, value: 0 },
      { label: UserCategory.CAT115, value: 0 },
      { label: UserCategory.CAT130, value: 0 },
    ],
  );
  return {
    items: items.map((i) => ({
      ...i,
      label:
        language.app.options.orderUserCategories[i.label].title +
        ` (${i.label})`,
    })),
  };
});

const offerRanges = computed(
  (): { data: DistributionData; offersSum: number; offersMean: number } => {
    const items = relevantOrders.value.reduce(
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
        { offerMin: 1, offerMax: 50, count: 0 },
        { offerMin: 50, offerMax: 100, count: 0 },
        { offerMin: 100, offerMax: 150, count: 0 },
        { offerMin: 150, offerMax: 200, count: 0 },
        { offerMin: 200, offerMax: 250, count: 0 },
        { offerMin: 250, offerMax: 500, count: 0 },
        { offerMin: 500, offerMax: 1000, count: 0 },
      ],
    );
    return {
      data: {
        items: items.map((i) => ({
          label: `${i.offerMin} € ≤ x < ${i.offerMax} €`,
          value: i.count,
        })),
      },
      offersSum: relevantOrders.value.reduce((acc, cur) => acc + cur.offer, 0),
      offersMean:
        relevantOrders.value.reduce((acc, cur) => acc + cur.offer, 0) /
        relevantOrders.value.length,
    };
  },
);

const depotDistribution = computed((): DistributionData => {
  return {
    items: relevantOrders.value
      .reduce(
        (acc, order) => {
          return acc.map((c) => {
            if (c.label == order.depotName) {
              return { ...c, value: c.value + 1 };
            } else {
              return c;
            }
          });
        },
        depots.value.map((d) => ({
          label: d.name,
          value: 0,
        })),
      )
      .sort((a, b) => (a.label < b.label ? -1 : 1)),
  };
});

// A reusable helper function that computes a distribution from orders
function computeDistribution(
  orders: SavedOrder[],
  dateSelector: (order: SavedOrder) => Date | string | undefined,
): DistributionData {
  // Helper to create a label from a date
  const makeLabel = (date: Date | string | undefined): string => {
    const month = date ? new Date(date).getMonth() : 0;
    const kw = date ? format(new Date(date), "ww") : "?"; // ensure date is a Date object
    let year = date ? new Date(date).getFullYear() : 2000;
    // Adjust for week 01 at end of year
    if (kw === "01" && month === 11) {
      year += 1;
    }
    return `${year} KW${kw}`;
  };

  // Create and reduce the items array
  const items: DistributionDataItem[] = orders
    .map((order) => ({
      label: makeLabel(dateSelector(order)),
      value: 1,
    }))
    .reduce((acc, cur) => {
      // Find if there's already an item with the same label
      const foundIndex = acc.findIndex((a) => a.label === cur.label);
      if (foundIndex !== -1) {
        // Update the existing item
        acc[foundIndex] = {
          ...acc[foundIndex],
          value: acc[foundIndex].value + 1,
        };
      } else {
        // Add new item
        acc.push(cur);
      }
      return acc;
    }, [] as DistributionDataItem[])
    .sort((a, b) => (a.label < b.label ? -1 : 1));

  return { items };
}

// For createdAt distribution
const createdAtDistribution = computed(
  (): DistributionData =>
    computeDistribution(relevantOrders.value, (order) => order.createdAt),
);

// For updatedAt distribution
const updatedAtDistribution = computed(
  (): DistributionData =>
    computeDistribution(relevantOrders.value, (order) => order.updatedAt),
);

const overallContribution = computed(() => {
  return relevantOrders.value.reduce(
    (acc, o) => ({
      total: o.msrp.monthly.total + acc.total,
      selfgrown: o.msrp.monthly.selfgrown + acc.selfgrown,
      cooperation: o.msrp.monthly.cooperation + acc.cooperation,
      offer: o.offer + acc.offer,
    }),
    {
      total: 0,
      selfgrown: 0,
      cooperation: 0,
      offer: 0,
    },
  );
});
</script>

<template>
  <v-card-title style="white-space: normal">
    {{ t.ordersCard.title }} <SeasonText />
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
      <v-data-table :items="relevantOrders" :headers="headers" :search="search">
        <template v-slot:item.offer="{ item }">
          {{ item.offer }} €

          <v-tooltip
            :text="item.offerReason"
            open-on-click
            v-if="item.offerReason"
          >
            <template v-slot:activator="{ props }">
              <v-icon v-bind="props">mdi-information-outline</v-icon>
            </template>
          </v-tooltip>
        </template>
        <template v-slot:item.msrp="{ item }">
          {{ item.msrp.monthly.total }} € =
          <span class="opacity-70">
            <v-icon style="font-size: 0.7rem">mdi-sprout-outline</v-icon
            >{{ item.msrp.monthly.selfgrown }} € +

            <v-icon style="font-size: 0.7rem">mdi-truck-delivery-outline</v-icon
            >{{ item.msrp.monthly.cooperation }} €
          </span>
          <br />
          <span class="text-bold">
            {{ item.offer >= item.msrp.monthly.total ? "+" : "-" }}
            {{
              Math.abs(
                Math.round(
                  (1000 * item.offer) / item.msrp.monthly.total - 1000,
                ) / 10,
              )
            }}%
          </span>
        </template>
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
          <v-tooltip
            :text="item.categoryReason"
            open-on-click
            v-if="item.categoryReason"
          >
            <template v-slot:activator="{ props }">
              <v-icon v-bind="props">mdi-information-outline</v-icon>
            </template>
          </v-tooltip>
        </template>
        <template v-slot:item.id="{ item }">
          {{ item.id }}
          <v-btn
            icon="mdi-eye"
            variant="plain"
            :to="{ path: `/shop/${item.userId}` }"
          ></v-btn>
        </template>
      </v-data-table>
      <div class="text-h6">Zusammenfassung</div>
      <v-container fluid>
        <v-row>
          <v-col cols="12" lg="6">
            <div class="text-subtitle-1">Beiträge (Summe)</div>
            <v-table>
              <thead>
                <tr>
                  <th>Monatsbeiträge</th>
                  <th>Orientierungswerte</th>
                  <th>Differenz</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{{ overallContribution.offer }} €</td>
                  <td>{{ overallContribution.total }} €</td>
                  <td color="success">
                    {{
                      overallContribution.offer > overallContribution.total
                        ? "+"
                        : ""
                    }}
                    {{ overallContribution.offer - overallContribution.total }}
                    €
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-col>
        </v-row>
      </v-container>

      <v-container fluid>
        <v-row>
          <v-col cols="12" sm="6" lg="4">
            <div class="text-subtitle-1">Mitgliedschaftsmodell</div>
            <DistributionPlot :distribution-data="categoriesDistribution" />
          </v-col>

          <v-col cols="12" sm="6" lg="4">
            <div class="text-subtitle-1">Monatsbeitrag</div>
            <div class="text-subtitle-2 opacity-60">
              Summe: {{ offerRanges.offersSum }} €
            </div>
            <div class="text-subtitle-2 opacity-60">
              Durchschnitt: {{ offerRanges.offersMean.toFixed(0) }} €
            </div>
            <DistributionPlot :distribution-data="offerRanges.data" />
          </v-col>
          <v-col cols="12" sm="6" lg="4">
            <div class="text-subtitle-1">Depot-Belegung</div>
            <DistributionPlot :distribution-data="depotDistribution" />
          </v-col>
          <v-col cols="12" sm="6" lg="4">
            <div class="text-subtitle-1">
              Erstmaliges Anlegen der Bedarfsanmeldung
            </div>
            <div class="text-subtitle-2 opacity-60">
              Kalenderwoche in der erstmalig eine Bedarfsanmeldung angelegt
              wurde
            </div>
            <DistributionPlot :distribution-data="createdAtDistribution" />
          </v-col>
          <v-col cols="12" sm="6" lg="4">
            <div class="text-subtitle-1">
              Letztmalige Aktualisierung der Bedarfsanmeldung
            </div>
            <div class="text-subtitle-2 opacity-60">
              Kalenderwoche in der zuletzt die Bedarfsanmeldung aktualisiert
              wurde
            </div>
            <DistributionPlot :distribution-data="updatedAtDistribution" />
          </v-col>
        </v-row>
      </v-container>
    </template>
  </v-card-text>
</template>
