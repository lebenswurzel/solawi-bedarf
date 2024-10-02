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
import { onMounted, provide, ref, watch } from "vue";
import { language } from "../lang/lang.ts";
import { interpolate } from "../lang/template";
import ShopItem from "../components/ShopItem.vue";
import { useProductStore } from "../store/productStore.ts";
import { useUserStore } from "../store/userStore.ts";
import ShopDialog from "../components/ShopDialog.vue";
import { useOrderStore } from "../store/orderStore.ts";
import FAQDialog from "../components/FAQDialog.vue";
import { useBIStore } from "../store/biStore";
import { storeToRefs } from "pinia";
import { useConfigStore } from "../store/configStore.ts";

const t = language.pages.shop;

const configStore = useConfigStore();
const productStore = useProductStore();
const userStore = useUserStore();
const orderStore = useOrderStore();
const biStore = useBIStore();

const { depot, msrp, submit } = storeToRefs(biStore);
const { userId } = storeToRefs(userStore);
const { productCategories } = storeToRefs(productStore);

const open = ref(false);
const faqOpen = ref(false);
const requestUserId = ref<number | undefined>(userStore.userId);

provide("requestUserId", requestUserId);

watch(userId, async () => {
  requestUserId.value = userId.value;
});

watch(requestUserId, async () => {
  requestUserId.value && (await orderStore.update(requestUserId.value));
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

const refresh = async () => {
  biStore.update();
  productStore.update(configStore.activeConfigId);
  if (requestUserId.value) {
    orderStore.update(requestUserId.value);
  }
};
onMounted(refresh);
configStore.$subscribe(refresh);
</script>

<template>
  <v-card class="ma-4">
    <v-card-title v-if="userStore.userOptions.length > 1">
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
      {{ t.cards.header.explaination }}
      <a
        style="color: #6750a4; cursor: pointer"
        @click="() => (faqOpen = true)"
      >
        <u>{{ t.cards.header.faq }}</u
        >.
      </a>
    </v-card-text>
  </v-card>

  <v-card class="ma-4">
    <v-card-title>{{ t.cards.products.title }}</v-card-title>
    <v-card-subtitle class="text-wrap">
      {{
        interpolate(t.cards.products.msrp, {
          msrp: msrp.toString(),
        })
      }}
      <v-tooltip :text="t.cards.products.msrpTooltip">
        <template v-slot:activator="{ props }">
          <v-icon v-bind="props">mdi-information-outline</v-icon>
        </template>
      </v-tooltip>
      <br />
      {{
        interpolate(t.cards.products.offer, {
          offer: orderStore.offer.toString(),
        })
      }}
    </v-card-subtitle>
    <v-card-text>
      <v-expansion-panels class="pa-0">
        <v-expansion-panel v-for="category in productCategories" class="px-0">
          <v-expansion-panel-title>{{ category.name }}</v-expansion-panel-title>
          <v-expansion-panel-text
            v-for="product in category.products"
            class="px-0"
          >
            <ShopItem
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
          @click="requestUserId && orderStore.update(requestUserId)"
          class="text-error"
          variant="outlined"
        >
          {{ language.app.actions.cancel }}
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
  <ShopDialog :open="open" @close="onClose" />
  <FAQDialog :open="faqOpen" @close="onFaqClose" />
</template>
