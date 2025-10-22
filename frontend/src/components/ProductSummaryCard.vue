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
import { computed } from "@vue/reactivity";
import { language } from "@lebenswurzel/solawi-bedarf-shared/src/lang/lang.ts";
import { UserCategory } from "@lebenswurzel/solawi-bedarf-shared/src/enum.ts";
import {
  NewProduct,
  Product,
} from "@lebenswurzel/solawi-bedarf-shared/src/types.ts";
import { adjustMsrp } from "@lebenswurzel/solawi-bedarf-shared/src/msrp";
import { getLangUnit } from "@lebenswurzel/solawi-bedarf-shared/src/util/unitHelper";
import { appConfig } from "@lebenswurzel/solawi-bedarf-shared/src/config";

const props = defineProps<{
  product: NewProduct | Product;
}>();

const baseUnit = computed(() => {
  return getLangUnit(props.product.unit, true);
});

// Calculate orientation values for all contribution models
const orientationValues = computed(() => {
  const msrp = props.product.msrp || 0;

  const values: {
    [key in UserCategory]: {
      amount: number;
      factor: number;
    };
  } = {
    [UserCategory.CAT100]: {
      amount: 0,
      factor: 0,
    },
    [UserCategory.CAT115]: {
      amount: 0,
      factor: 0,
    },
    [UserCategory.CAT130]: {
      amount: 0,
      factor: 0,
    },
  };

  // Calculate monthly orientation value for each category
  Object.values(UserCategory).forEach((category) => {
    values[category].amount = Math.round(adjustMsrp(msrp, category, 1));
    values[category].factor = Math.round(
      appConfig.msrp[category].relative * 100,
    );
  });

  return values;
});

// Contribution model labels - using direct access to avoid TypeScript issues
const getContributionLabel = (category: UserCategory) => {
  return language.app.options.orderUserCategories[category]?.title || category;
};
</script>

<template>
  <v-card-text class="pt-0">
    <v-card variant="outlined" class="pa-4">
      <!-- Name und Beschreibung -->
      <v-row>
        <v-col cols="12">
          <div class="text-body-1">
            <strong>{{ product.name || "Nicht angegeben" }}</strong>
            <v-chip
              size="small"
              v-if="!product.active"
              :color="product.active ? 'success' : 'warning'"
              >{{
                language.app.options.active[product.active ? "true" : "false"]
              }}</v-chip
            >
          </div>
          <div class="text-body-2 text-medium-emphasis">
            {{ product.description || "Keine Beschreibung" }}
          </div>
        </v-col>
      </v-row>

      <!-- Orientierungswerte -->
      <v-row class="mb-1" dense>
        <v-col cols="12">
          <div class="text-subtitle-1 font-weight-medium mb-2">
            Orientierungswerte (je {{ baseUnit }})
          </div>
          <v-row>
            <v-col
              cols="12"
              sm="4"
              v-for="category in Object.values(UserCategory)"
              :key="category"
            >
              <v-card variant="tonal" class="pa-3">
                <div class="text-caption text-medium-emphasis mb-1">
                  {{ getContributionLabel(category) }}
                </div>
                <div class="text-h6">
                  {{ orientationValues[category].amount }}
                  {{ language.app.units.ct }}
                  <span class="opacity-50">
                    ({{ orientationValues[category].factor }}%)
                  </span>
                </div>
              </v-card>
            </v-col>
          </v-row>
        </v-col>
      </v-row>

      <!-- Verteilhäufigkeit und Gesamtmenge -->
      <v-row>
        <v-col cols="12" sm="6">
          <div class="text-subtitle-1 font-weight-medium mb-1">
            Verteilhäufigkeit
          </div>
          <div class="text-body-1">
            {{ product.frequency || 0 }} Mal pro Jahr
          </div>
        </v-col>
        <v-col cols="12" sm="6">
          <div class="text-subtitle-1 font-weight-medium mb-1">Gesamtmenge</div>
          <div class="text-body-1">
            {{ product.quantity || 0 }} {{ baseUnit }}
          </div>
        </v-col>
      </v-row>
    </v-card>
  </v-card-text>
</template>
