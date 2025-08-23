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
import { computed, onMounted, ref, watch } from "vue";
import { language } from "@lebenswurzel/solawi-bedarf-shared/src/lang/lang.ts";
import { interpolate } from "@lebenswurzel/solawi-bedarf-shared/src/lang/template.ts";
import ShopItem from "../components/ShopItem.vue";
import { useProductStore } from "../store/productStore.ts";
import { useUserStore } from "../store/userStore.ts";
import ShopDialog from "../components/ShopDialog.vue";
import { useOrderStore } from "../store/orderStore.ts";
import FAQDialog from "../components/FAQDialog.vue";
import { useBIStore } from "../store/biStore";
import { storeToRefs } from "pinia";
import { useConfigStore } from "../store/configStore.ts";
import SeasonText from "../components/styled/SeasonText.vue";
import { UserWithOrders } from "@lebenswurzel/solawi-bedarf-shared/src/types.ts";
import { useRoute } from "vue-router";
import { router } from "../routes.ts";
import SeasonStatusElement from "../components/season/SeasonStatusElement.vue";
import { getSeasonPhase } from "@lebenswurzel/solawi-bedarf-shared/src/util/configHelper.ts";
import MsrpDisplay from "../components/shop/MsrpDisplay.vue";

const t = language.pages.shop;

const configStore = useConfigStore();
const productStore = useProductStore();
const userStore = useUserStore();
const orderStore = useOrderStore();
const biStore = useBIStore();

const { depot, submit, msrpByOrderId } = storeToRefs(biStore);
const { userId } = storeToRefs(userStore);
const { productCategories } = storeToRefs(productStore);
const { activeConfigId, config } = storeToRefs(configStore);
const { allOrders, modificationOrderId } = storeToRefs(orderStore);

const open = ref(false);
const faqOpen = ref(false);
const requestUserId = ref<number | undefined>(userStore.userId);
const requestUser = ref<UserWithOrders | undefined>(userStore.currentUser);
const canAdministerOtherUsers = computed(() => {
  return userStore.userOptions.length > 1;
});

const route = useRoute();

watch(userId, async () => {
  const paramUserId = parseUserIdParam();
  requestUserId.value = paramUserId ?? userId.value;
});

watch(
  () => route.params.userId,
  async () => {
    const newValue = parseUserIdParam();
    if (newValue) {
      requestUserId.value = newValue;
    }
  },
);

watch([requestUserId, configStore], async () => {
  if (requestUserId.value) {
    if (requestUserId.value !== userStore.currentUser?.id) {
      router.push({ path: `/shop/${requestUserId.value}` });
    } else {
      router.push({ path: `/shop/` });
    }
  }
  await refresh(true);
  requestUser.value = userStore.users.find(
    (user) => user.id == requestUserId.value,
  );
});

const onClose = async () => {
  open.value = false;
};

const onFaqClose = async () => {
  faqOpen.value = false;
};

const onSave = () => {
  open.value = true;
};

const parseUserIdParam = (): number | undefined => {
  const value = route.params.userId;
  if (canAdministerOtherUsers.value) {
    if (typeof value === "string") {
      const converted = parseInt(value);
      if (!Number.isNaN(converted)) {
        return converted;
      }
    }
  }
};

const refresh = async (keepUserId?: boolean) => {
  const userIdParam = parseUserIdParam();
  if (userIdParam && !keepUserId) {
    requestUserId.value = userIdParam;
  }
  if (requestUserId.value && activeConfigId.value != -1) {
    await productStore.update(configStore.activeConfigId);
    await orderStore.update(requestUserId.value, activeConfigId.value);
    await biStore.update(
      configStore.activeConfigId,
      modificationOrderId.value,
      true,
    );
  }
};
onMounted(async () => {
  await refresh();
});

const orderPhase = computed(() => {
  const { orderPhase: orderPhaseValue } = getSeasonPhase(
    config.value!,
    new Date(),
    userStore.currentUser?.active || false,
  );
  return orderPhaseValue;
});
</script>

<template>
  <v-card class="ma-2">
    <v-card-title v-if="canAdministerOtherUsers">
      <v-select
        v-model="requestUserId"
        :items="userStore.userOptions"
      ></v-select>
    </v-card-title>
    <v-card-title v-else>
      {{ t.cards.header.hello }} {{ userStore.currentUser?.name }}
    </v-card-title>
    <v-card-subtitle v-if="depot" style="white-space: normal">
      {{ t.cards.header.depot }} <br /><br />
      {{ depot?.name }} <br />
      {{ depot?.address }} <br /><br />
      {{ t.cards.header.openingHours }} {{ depot?.openingHours }} <br />
      {{ depot?.comment }}
    </v-card-subtitle>
    <v-card-text>
      {{
        interpolate(t.cards.header.explaination, {
          season: config?.name || "KEINE SAISON",
        })
      }}
      <a
        style="color: #6750a4; cursor: pointer"
        @click="() => (faqOpen = true)"
      >
        <u>{{ t.cards.header.faq }}</u
        >.
      </a>
      <div
        class="pt-2"
        v-if="
          modificationOrderId &&
          msrpByOrderId[modificationOrderId] &&
          msrpByOrderId[modificationOrderId].months < 12
        "
      >
        {{ t.cards.header.orderDuringSeason }}
      </div>
      <SeasonStatusElement :phase="orderPhase" no-button class="mt-3" />
    </v-card-text>
  </v-card>

  <v-card class="ma-2">
    <v-card-title>{{ t.cards.products.title }} für <SeasonText /></v-card-title>
    <v-card-text v-if="allOrders.length > 0" class="pb-0">
      <!-- Debug info -->
      <div v-if="allOrders.length > 1" class="text-caption text-grey mb-2">
        {{ allOrders.length }} Bedarfsanmeldungen verfügbar
        <div v-for="order in allOrders" :key="order.id">
          {{ order.validFrom }} - {{ order.validTo }}
        </div>
      </div>
      <div
        v-else-if="allOrders.length === 1"
        class="text-caption text-grey mb-2"
      >
        1 Bedarfsanmeldung verfügbar
      </div>
    </v-card-text>
    <v-container fluid class="py-0">
      <v-row dense>
        <v-col cols="12" md="6" v-for="order in allOrders" :key="order.id">
          <v-card-text class="pa-1">
            <MsrpDisplay :order="order" />
          </v-card-text>
        </v-col>
      </v-row>
    </v-container>
    <v-card-text>
      <v-expansion-panels class="pa-0">
        <v-expansion-panel
          v-for="category in productCategories"
          class="px-0"
          :key="category.id"
        >
          <v-expansion-panel-title>{{ category.name }}</v-expansion-panel-title>
          <v-expansion-panel-text>
            <ShopItem
              v-for="product in category.products"
              class="px-0"
              :key="product.id"
              :user-id="userStore.currentUser!.id"
              :product-id="product.id"
            ></ShopItem>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-card-text>
    <v-card-actions class="justify-center">
      <v-card-actions>
        <v-btn
          @click="
            requestUserId && orderStore.update(requestUserId, activeConfigId)
          "
          class="text-error"
          variant="outlined"
        >
          {{ language.app.actions.restore }}
        </v-btn>
        <v-btn
          @click="onSave"
          class="text-white bg-success"
          variant="elevated"
          :disabled="!submit"
        >
          {{ language.app.actions.save }}
        </v-btn>
      </v-card-actions>
    </v-card-actions>
  </v-card>
  <ShopDialog :open="open" @close="onClose" :request-user="requestUser" />
  <FAQDialog :open="faqOpen" @close="onFaqClose" />
</template>
