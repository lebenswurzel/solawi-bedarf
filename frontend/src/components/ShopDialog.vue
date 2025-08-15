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
import { computed, onMounted, ref, watchEffect } from "vue";
import { language } from "@lebenswurzel/solawi-bedarf-shared/src/lang/lang.ts";
import { interpolate } from "@lebenswurzel/solawi-bedarf-shared/src/lang/template.ts";
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
} from "@lebenswurzel/solawi-bedarf-shared/src/validation/reason.ts";
import SeasonText from "./styled/SeasonText.vue";
import { useUiFeedback } from "../store/uiFeedbackStore.ts";
import { UserCategory } from "@lebenswurzel/solawi-bedarf-shared/src/enum.ts";
import { UserWithOrders } from "@lebenswurzel/solawi-bedarf-shared/src/types.ts";
import { useTextContentStore } from "../store/textContentStore.ts";
import MsrpDisplay from "./shop/MsrpDisplay.vue";

const props = defineProps<{ open: boolean; requestUser?: UserWithOrders }>();
const emit = defineEmits(["close"]);
const t = language.pages.shop.dialog;

const configStore = useConfigStore();
const orderStore = useOrderStore();
const biStore = useBIStore();
const uiFeedback = useUiFeedback();
const textContentStore = useTextContentStore();

const { depots, activeConfigId, config } = storeToRefs(configStore);
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
  validTo,
} = storeToRefs(orderStore);
const { organizationInfo } = storeToRefs(textContentStore);

const confirmGTC = ref(false);
const confirmContribution = ref(false);
const openFAQ = ref(false);
const loading = ref(false);
const model = ref<string>();
const showDepotNote = ref(false);

const sendConfirmationEmail = ref(false);

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
          d.capacity - (capacityByDepotId.value[d.id]?.reserved ?? 0);
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

watchEffect(() => {
  if (
    alternateDepotId.value &&
    !depotOptions.value
      .map((d) => d.value)
      .includes(alternateDepotId.value || -1)
  ) {
    // unset alternate depot in case the currently selected depot is not available (because it's full)
    alternateDepotId.value = null;
  }
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
  needsOfferReason(modelInt.value, msrp.value.monthly.total),
);

const offerReasonHint = computed(
  () =>
    !isOfferReasonValid(
      modelInt.value,
      msrp.value.monthly.total,
      offerReason.value,
    ),
);

const needsHigherOffer = computed(
  () => !isOfferValid(modelInt.value, msrp.value.monthly.total),
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
    categoryReasonHint.value ||
    (requireConfirmContribution.value && !confirmContribution.value)
  );
});

const requireConfirmContribution = computed(() => {
  return category.value != UserCategory.CAT130;
});

watch(offer, () => {
  model.value = offer.value.toString() || "0";
});
watchEffect(() => {
  sendConfirmationEmail.value = props.requestUser?.emailEnabled || false;
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
  model.value = offer.value.toString() || "0";
  emit("close");
};

const onSave = () => {
  loading.value = true;
  saveOrder({
    userId: props.requestUser?.id!,
    orderItems: orderItems.value,
    offer: parseInt(model.value || "0"),
    depotId: depotId.value.actual!,
    alternateDepotId: alternateDepotId.value,
    category: category.value,
    offerReason: offerReason.value,
    categoryReason: categoryReason.value,
    confirmGTC: confirmGTC.value,
    validFrom: validFrom.value,
    validTo: validTo.value,
    requisitionConfigId: activeConfigId.value,
    sendConfirmationEmail: sendConfirmationEmail.value,
  })
    .then(async () => {
      await biStore.update(activeConfigId.value, props.requestUser?.id);
      props.requestUser?.id &&
        (await orderStore.update(props.requestUser.id, activeConfigId.value));
      loading.value = false;
      uiFeedback.setSuccess(language.app.uiFeedback.saving.success);
      emit("close");
    })
    .catch((e: Error) => {
      uiFeedback.setError(language.app.uiFeedback.saving.failed, e);
      loading.value = false;
    });
};
</script>

<template>
  <v-dialog :model-value="open" @update:model-value="onClose">
    <v-card>
      <v-card-title>
        <span class="text-h5">Bedarfsanmeldung für <SeasonText /></span>
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
          <div class="text-body-2" v-html="t.alert.text"></div>
        </v-alert>
        <MsrpDisplay
          :offer="orderStore.offer"
          :hide-offer="true"
          class="mb-5"
        />
        <v-text-field
          class="mb-5"
          :model-value="model"
          @update:model-value="onUpdate"
          @update:focused="onBlur"
          type="number"
          :hint="
            needsHigherOffer
              ? interpolate(t.offer.hint, {
                  msrp: Math.ceil(minOffer(msrp.monthly.total)).toString(),
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
        <v-alert class="mb-5" color="info" density="compact" variant="outlined">
          {{ t.depotNote.title }}
          <v-btn
            variant="text"
            color="info"
            v-if="!showDepotNote"
            @click="showDepotNote = true"
            >{{ t.depotNote.show }}</v-btn
          >
          <v-expand-transition>
            <div v-if="showDepotNote">
              <p
                class="text-body-2"
                v-for="paragraph in t.depotNote.paragraphs"
              >
                {{
                  interpolate(paragraph, {
                    email: organizationInfo.address.email,
                    forumContact: organizationInfo.address.forumContact,
                  })
                }}
              </p>
            </div>
          </v-expand-transition>
        </v-alert>
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
        <v-checkbox
          v-model="confirmGTC"
          :label="
            interpolate(t.confirm.label, {
              season: config?.name ?? 'SAISON?',
              solawiName: organizationInfo.address.name,
            })
          "
          hide-details
        />
        <div class="mt-3" v-if="requireConfirmContribution">
          {{
            interpolate(t.confirmContribution.title, {
              model:
                categoryOptions.find((co) => co.value == category)?.title ||
                "???",
            })
          }}
        </div>
        <v-checkbox
          v-model="confirmContribution"
          :label="t.confirmContribution.label"
          v-if="requireConfirmContribution"
          hide-details
        />
        <v-switch
          v-model="sendConfirmationEmail"
          :label="`${t.sendConfirmationEmail.title}`"
          :color="sendConfirmationEmail ? 'primary' : 'secondary'"
          :disabled="!props.requestUser?.emailEnabled"
          hide-details
        ></v-switch>
        <v-alert
          color="warning"
          variant="outlined"
          density="compact"
          class="text-body-2"
          v-if="!props.requestUser?.emailEnabled"
          >{{ t.sendConfirmationEmail.notAvailable }}</v-alert
        >
      </v-card-text>
      <v-card-actions
        class="d-flex flex-wrap flex-sm-row flex-column justify-center"
      >
        <v-btn
          class="text-error my-1 order-3 order-sm-1"
          @click="onClose"
          variant="outlined"
        >
          {{ language.app.actions.cancel }}
        </v-btn>
        <v-btn
          class="text-white my-1 order-2 order-sm-2"
          @click="() => (openFAQ = true)"
          variant="elevated"
        >
          {{ t.action.faq }}
        </v-btn>
        <v-btn
          class="text-white bg-success my-1 order-1 order-sm-3"
          @click="onSave"
          :disabled="!!disableSubmit"
          :loading="loading"
          variant="elevated"
        >
          {{ language.app.actions.save }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  <FAQDialog :open="openFAQ" @close="() => (openFAQ = false)" />
</template>
