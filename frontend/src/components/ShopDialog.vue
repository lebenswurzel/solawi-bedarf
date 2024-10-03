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
import { computed, inject, onMounted, ref, Ref } from "vue";
import { language } from "../lang/lang.ts";
import { interpolate } from "../lang/template.ts";
import { useConfigStore } from "../store/configStore.ts";
import { saveOrder } from "../requests/shop.ts";
import { useOrderStore } from "../store/orderStore.ts";
import { storeToRefs } from "pinia";
import { watch } from "vue";
import FAQDialog from "./FAQDialog.vue";
import { useBIStore } from "../store/biStore.ts";
import {
  isCategoryReasonValid,
  isOfferReasonValid,
  isOfferValid,
  needsCategoryReason,
  needsOfferReason,
  minOffer,
} from "../../../shared/src/validation/reason.ts";

defineProps(["open"]);
const emit = defineEmits(["close"]);
const p = language.pages.shop.cards.products;
const t = language.pages.shop.dialog;

const configStore = useConfigStore();
const orderStore = useOrderStore();
const biStore = useBIStore();

const { depots, activeConfigId } = storeToRefs(configStore);
const { depot, msrp, capacityByDepotId, increaseOnly } = storeToRefs(biStore);
const {
  offer,
  depotId,
  alternateDepotId,
  category,
  categoryReason,
  offerReason,
  orderItems,
  validFrom,
} = storeToRefs(orderStore);

const confirmGTC = ref(false);
const openFAQ = ref(false);
const loading = ref(false);
const error = ref<string>();
const model = ref<string>();

const requestUserId = inject<Ref<number>>("requestUserId") as Ref<number>;
const categoryOptions = computed(() => {
  return Object.entries(language.app.options.orderUserCategories).map(
    ([key, values]) => ({ value: key, ...values }),
  );
});

const depotOptions = computed(() => {
  return depots.value
    .filter((d) => {
      if (d.capacity === null) {
        return true;
      } else {
        let remainingCapacity =
          d.capacity - capacityByDepotId.value[d.id].reserved;
        if (depotId.value.saved && d.id == depotId.value.saved) {
          remainingCapacity += 1;
        }
        return remainingCapacity > 0;
      }
    })
    .map((d) => ({
      title: d.name,
      value: d.id,
      subtitle: `${d.address} | ${d.openingHours}`,
    }));
});

const modelInt = computed(() => {
  const tmp = parseInt(model.value || "0");
  if (isNaN(tmp)) {
    return 0;
  }
  return tmp;
});

const alternateDepot = computed(() => {
  return depots.value.find((d) => d.id == alternateDepotId.value);
});

const enableOfferReason = computed(() =>
  needsOfferReason(modelInt.value, msrp.value),
);

const offerReasonHint = computed(
  () => !isOfferReasonValid(modelInt.value, msrp.value, offerReason.value),
);

const needsHigherOffer = computed(
  () => !isOfferValid(modelInt.value, msrp.value),
);

const enableCategoryReason = computed(() =>
  needsCategoryReason(category.value),
);

const categoryReasonHint = computed(
  () => !isCategoryReasonValid(category.value, categoryReason.value),
);

const depotHint = computed(() => {
  return depot.value
    ? depotOptions.value.find((co) => co.value == depot.value!.id)?.subtitle
    : t.depot.hint;
});

const alternateDepotHint = computed(() => {
  return alternateDepot.value
    ? depotOptions.value.find((co) => co.value == alternateDepot.value!.id)
        ?.subtitle
    : t.alternateDepot.hint;
});

const disableSubmit = computed(() => {
  return (
    !confirmGTC.value ||
    !depotId.value ||
    needsHigherOffer.value ||
    offerReasonHint.value ||
    categoryReasonHint.value
  );
});

watch(offer, () => {
  model.value = offer.value.toString() || "0";
});
onMounted(() => {
  model.value = offer.value.toString() || "0";
});

const onDepotChanged = (val: number) => {
  depotId.value.actual = val;
};

const onAlternateDepotChanged = (val: number) => {
  alternateDepotId.value = val;
};

const clearAlternateDepot = () => {
  alternateDepotId.value = null;
};

const onUpdate = (value: string) => {
  const newOffer = parseInt(value || "0");
  if (increaseOnly.value) {
    model.value = Math.max(offer.value, newOffer).toString();
  } else {
    model.value = newOffer.toString();
  }
};

const onBlur = (blur: boolean) => {
  if (!blur) {
    const newOffer = parseInt(model.value || "0");
    if (increaseOnly.value) {
      model.value = Math.max(offer.value, newOffer).toString();
    }
  }
};

const onClose = async () => {
  requestUserId?.value &&
    (await orderStore.update(requestUserId?.value, activeConfigId.value));
  model.value = offer.value.toString() || "0";
  emit("close");
};

const onSave = () => {
  loading.value = true;
  saveOrder({
    userId: requestUserId?.value!,
    orderItems: orderItems.value,
    offer: parseInt(model.value || "0"),
    depotId: depotId.value.actual!,
    alternateDepotId: alternateDepotId.value,
    category: category.value,
    offerReason: offerReason.value,
    categoryReason: categoryReason.value,
    confirmGTC: confirmGTC.value,
    validFrom: validFrom.value,
    requisitionConfigId: activeConfigId.value,
  })
    .then(async () => {
      await biStore.update(activeConfigId.value);
      requestUserId?.value &&
        (await orderStore.update(requestUserId.value, activeConfigId.value));
      loading.value = false;
      emit("close");
    })
    .catch((e: Error) => {
      error.value = `${language.app.errors.general} [${e.message}]`;
      loading.value = false;
    });
};
</script>

<template>
  <v-dialog :model-value="open" @update:model-value="onClose">
    <v-card>
      <v-card-title>
        <span class="text-h5">Bedarfsanmeldung</span>
      </v-card-title>
      <v-card-text>
        <v-alert
          class="mb-5"
          closable
          color="info"
          density="compact"
          :title="t.alert.title"
          variant="outlined"
        >
          <div v-html="t.alert.text"></div>
        </v-alert>
        <div class="mb-5">
          {{
            interpolate(p.msrp, {
              msrp: msrp.toString(),
            })
          }}
          <v-tooltip :text="p.msrpTooltip">
            <template v-slot:activator="{ props }">
              <v-icon v-bind="props">mdi-information-outline</v-icon>
            </template>
          </v-tooltip>
        </div>
        <v-text-field
          class="mb-5"
          :model-value="model"
          @update:model-value="onUpdate"
          @update:focused="onBlur"
          type="number"
          :hint="
            needsHigherOffer
              ? interpolate(t.offer.hint, {
                  msrp: Math.ceil(minOffer(msrp)).toString(),
                })
              : undefined
          "
          :persistent-hint="needsHigherOffer"
          :label="t.offer.label"
        />
        <v-text-field
          class="mb-5"
          v-if="enableOfferReason"
          v-model="offerReason"
          :label="t.offerReason.label"
          :hint="offerReasonHint ? t.offerReason.hint : undefined"
          :persistent-hint="offerReasonHint"
        />
        <v-select
          class="mb-5"
          :model-value="depotId.actual"
          @update:model-value="onDepotChanged"
          :items="depotOptions"
          item-props
          :hint="depotHint"
          persistent-hint
          :label="t.depot.label"
        />
        <v-select
          class="mb-5"
          v-if="true"
          :model-value="alternateDepotId"
          clearable
          @update:model-value="onAlternateDepotChanged"
          @click:clear="clearAlternateDepot"
          :items="depotOptions"
          item-props
          :hint="alternateDepotHint"
          persistent-hint
          :label="t.alternateDepot.label"
        />
        <v-select
          class="mb-5"
          v-model="category"
          :items="categoryOptions"
          item-props
          :hint="categoryOptions.find((co) => co.value == category)?.subtitle"
          persistent-hint
          :label="t.category.label"
        >
        </v-select>
        <v-text-field
          class="mb-5"
          v-if="enableCategoryReason"
          v-model="categoryReason"
          :label="t.categoryReason.label"
          :hint="categoryReasonHint ? t.categoryReason.hint : undefined"
          :persistent-hint="categoryReasonHint"
        />
        <div class="mb-3">{{ t.confirm.title }}</div>
        <v-checkbox v-model="confirmGTC" :label="t.confirm.label" />
      </v-card-text>
      <v-card-actions class="justify-center">
        <v-btn class="text-error" @click="onClose" variant="outlined">
          {{ language.app.actions.cancel }}
        </v-btn>
        <v-btn
          class="text-white mx-1 mx-md-5"
          @click="() => (openFAQ = true)"
          style="margin-left: 0"
          variant="elevated"
        >
          {{ t.action.faq }}
        </v-btn>
        <v-btn
          class="text-white bg-success"
          @click="onSave"
          :disabled="!!disableSubmit"
          :loading="loading"
          style="margin-left: 0"
          variant="elevated"
        >
          {{ language.app.actions.save }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  <FAQDialog :open="openFAQ" @close="() => (openFAQ = false)" />
  <v-snackbar
    :model-value="!!error"
    color="red"
    @update:model-value="() => (error = undefined)"
  >
    {{ error }}
  </v-snackbar>
</template>
