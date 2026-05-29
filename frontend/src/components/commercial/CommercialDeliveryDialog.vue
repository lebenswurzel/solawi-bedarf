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
import { addDays, setHours, setMinutes, setSeconds } from "date-fns";
import { storeToRefs } from "pinia";
import { computed, ref, watchEffect } from "vue";
import { language } from "@lebenswurzel/solawi-bedarf-shared/src/lang/lang.ts";
import {
  CommercialDeliveryFullInformation,
  CommercialUser,
  EditCommercialDelivery,
  EditCommercialDeliveryItem,
  OptionalId,
  ProductsById,
} from "@lebenswurzel/solawi-bedarf-shared/src/types.ts";
import { dateToString, stringToDate } from "../../lib/convert.ts";
import {
  createCommercialInvoice,
  deleteCommercialDelivery,
  getCommercialDeliveries,
  getCommercialUsers,
  saveCommercialDelivery,
} from "../../requests/commercial.ts";
import { useProductStore } from "../../store/productStore.ts";
import { useTextContentStore } from "../../store/textContentStore.ts";
import { useUiFeedback } from "../../store/uiFeedbackStore.ts";
import CommercialDeliveryItem from "./CommercialDeliveryItem.vue";
import { useConfigStore } from "../../store/configStore.ts";
import {
  formatCentsAsEuro,
  getDeliveryTotals,
} from "@lebenswurzel/solawi-bedarf-shared/src/commercial/pricing.ts";
import { createCommercialDeliveryNotePdf } from "../../lib/commercial/deliveryNotePdf.ts";
import { createCommercialInvoicePdf } from "../../lib/commercial/invoicePdf.ts";
import { Unit } from "@lebenswurzel/solawi-bedarf-shared/src/enum.ts";

const t = language.pages.commercial;

const { open, editDeliveryId } = defineProps<{
  open: boolean;
  editDeliveryId: number | undefined;
}>();
const emit = defineEmits<{ (e: "close"): void }>();

const defaultEditDelivery: EditCommercialDelivery = {
  deliveryDate: addDays(setHours(setMinutes(setSeconds(new Date(), 0), 0), 12), 0),
  customerUserId: -1,
  description: null,
  active: true,
  items: [],
};

const editDelivery = ref<EditCommercialDelivery & OptionalId>({
  ...defaultEditDelivery,
});
const savedDelivery = ref<CommercialDeliveryFullInformation | undefined>();
const commercialUsers = ref<CommercialUser[]>([]);
const loading = ref(false);

const { setError, setSuccess } = useUiFeedback();
const productStore = useProductStore();
const configStore = useConfigStore();
const textContentStore = useTextContentStore();
const { productCategories } = storeToRefs(productStore);
const { activeConfigId } = storeToRefs(configStore);
const { organizationInfo, pdfTexts } = storeToRefs(textContentStore);

const products = computed(() =>
  productCategories.value.flatMap((c) =>
    c.products
      .filter((p) => p.active)
      .map((p) => ({ ...p, productCategoryType: c.typ })),
  ),
);

const productsById = computed((): ProductsById =>
  Object.fromEntries(products.value.map((p) => [p.id, p])),
);

const customerOptions = computed(() =>
  commercialUsers.value.map((u) => ({
    title: u.commercialProfile
      ? `${u.commercialProfile.companyName} (${u.name})`
      : u.name,
    value: u.id,
  })),
);

const invoiceLocked = computed(() => !!savedDelivery.value?.invoice);

const totals = computed(() =>
  getDeliveryTotals(
    editDelivery.value.items.filter(
      (i): i is EditCommercialDeliveryItem & { productId: number; unit: Unit } =>
        !!i.productId && !!i.unit,
    ),
  ),
);

const loadDelivery = async () => {
  loading.value = true;
  if (activeConfigId.value !== -1) {
    await productStore.update(activeConfigId.value);
  }
  await textContentStore.update();
  commercialUsers.value = (await getCommercialUsers()).users;
  if (editDeliveryId) {
    const result = await getCommercialDeliveries(editDeliveryId, true);
    const delivery = result.deliveries[0];
    if (delivery) {
      savedDelivery.value = delivery;
      editDelivery.value = {
        id: delivery.id,
        deliveryDate: new Date(delivery.deliveryDate),
        customerUserId: delivery.customerUserId,
        description: delivery.description,
        active: delivery.active,
        updatedAt: delivery.updatedAt,
        items: delivery.items.map((item) => ({
          ...item,
          showItem: true,
        })),
      };
    }
  } else {
    savedDelivery.value = undefined;
    editDelivery.value = {
      ...defaultEditDelivery,
      items: [],
    };
    if (commercialUsers.value.length > 0) {
      editDelivery.value.customerUserId = commercialUsers.value[0].id;
    }
  }
  loading.value = false;
};

watchEffect(() => {
  if (open) {
    loadDelivery();
  }
});

const onAddItem = () => {
  editDelivery.value.items.push({
    showItem: true,
    isNew: true,
    quantity: 1,
    conversionFrom: 1,
    conversionTo: 1,
    unitPriceCents: 0,
    vatRate: 7,
    isBio: true,
    description: null,
  });
};

const onSave = async () => {
  loading.value = true;
  try {
    const items = editDelivery.value.items
      .filter((item) => item.productId && item.unit)
      .map((item) => ({
        productId: item.productId!,
        quantity: item.quantity,
        unit: item.unit!,
        conversionFrom: item.conversionFrom,
        conversionTo: item.conversionTo,
        unitPriceCents: item.unitPriceCents,
        vatRate: item.vatRate,
        isBio: item.isBio,
        description: item.description,
      }));
    const saved = await saveCommercialDelivery({
      id: editDelivery.value.id,
      deliveryDate: editDelivery.value.deliveryDate,
      customerUserId: editDelivery.value.customerUserId,
      description: editDelivery.value.description,
      active: editDelivery.value.active,
      updatedAt: editDelivery.value.updatedAt,
      items,
    });
    savedDelivery.value = saved;
    editDelivery.value.id = saved.id;
    editDelivery.value.updatedAt = saved.updatedAt;
    setSuccess("Lieferung gespeichert");
  } catch (error) {
    setError("Speichern fehlgeschlagen", error as Error);
  } finally {
    loading.value = false;
  }
};

const onDelete = async () => {
  if (!savedDelivery.value?.id) {
    return;
  }
  loading.value = true;
  try {
    await deleteCommercialDelivery(savedDelivery.value.id);
    setSuccess("Lieferung gelöscht");
    emit("close");
  } catch (error) {
    setError("Löschen fehlgeschlagen", error as Error);
  } finally {
    loading.value = false;
  }
};

const getCustomer = () =>
  commercialUsers.value.find((u) => u.id === editDelivery.value.customerUserId);

const ensureSaved = async (): Promise<CommercialDeliveryFullInformation | undefined> => {
  if (!savedDelivery.value?.id) {
    await onSave();
  }
  return savedDelivery.value;
};

const onDeliveryNotePdf = async () => {
  const delivery = await ensureSaved();
  if (!delivery) {
    return;
  }
  const customer = getCustomer();
  if (!customer?.commercialProfile) {
    setError("Kundenprofil fehlt", new Error("missing profile"));
    return;
  }
  createCommercialDeliveryNotePdf(
    delivery,
    customer.commercialProfile,
    productsById.value,
    organizationInfo.value,
    pdfTexts.value.deliveryNoteHeader,
    pdfTexts.value.deliveryNoteFooter,
  );
};

const onInvoicePdf = async () => {
  const delivery = await ensureSaved();
  if (!delivery?.id) {
    return;
  }
  loading.value = true;
  try {
    const result = await createCommercialInvoice(delivery.id);
    savedDelivery.value = result.delivery;
    const customer = getCustomer();
    if (!customer?.commercialProfile) {
      throw new Error("Kundenprofil fehlt");
    }
    createCommercialInvoicePdf(
      result.delivery,
      result.invoice,
      customer.commercialProfile,
      productsById.value,
      organizationInfo.value,
      pdfTexts.value.invoiceFooter,
    );
  } catch (error) {
    setError("Rechnung fehlgeschlagen", error as Error);
  } finally {
    loading.value = false;
  }
};

const onClose = () => emit("close");
</script>

<template>
  <v-dialog :model-value="open" @update:model-value="onClose" max-width="1200">
    <v-card :loading="loading">
      <v-card-title>{{ t.dialog.title }}</v-card-title>
      <v-card-text>
        <v-alert v-if="invoiceLocked" type="info" class="mb-4">
          {{ t.dialog.invoiceLocked }}
          <span v-if="savedDelivery?.invoice">
            ({{ savedDelivery.invoice.invoiceNumber }})
          </span>
        </v-alert>
        <v-row>
          <v-col cols="12" md="4">
            <v-text-field
              :label="t.dialog.deliveryDate"
              type="datetime-local"
              :model-value="dateToString(editDelivery.deliveryDate as Date)"
              @update:model-value="
                (val: string) =>
                  (editDelivery.deliveryDate =
                    stringToDate(val) || editDelivery.deliveryDate)
              "
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              :label="t.dialog.customer"
              :items="customerOptions"
              v-model="editDelivery.customerUserId"
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-switch
              v-model="editDelivery.active"
              :label="t.dialog.active"
              color="primary"
            />
          </v-col>
          <v-col cols="12">
            <v-text-field
              :label="t.dialog.description"
              v-model="editDelivery.description"
              clearable
            />
          </v-col>
        </v-row>
        <v-divider class="my-4" />
        <CommercialDeliveryItem
          v-for="(item, index) in editDelivery.items"
          :key="index"
          :item="item"
          :products="products"
          :locked="invoiceLocked"
        />
        <v-btn
          v-if="!invoiceLocked"
          class="mt-2"
          variant="outlined"
          @click="onAddItem"
        >
          {{ language.pages.commercial.action.createDelivery }}
        </v-btn>
        <v-row class="mt-4">
          <v-col cols="12" md="4">
            <v-text-field
              :label="t.dialog.totals"
              :model-value="formatCentsAsEuro(totals.grossCents)"
              readonly
            />
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-actions>
        <v-btn @click="onClose">{{ language.app.actions.close }}</v-btn>
        <v-btn
          v-if="savedDelivery?.id && !invoiceLocked"
          color="error"
          variant="outlined"
          @click="onDelete"
        >
          {{ language.app.actions.delete }}
        </v-btn>
        <v-spacer />
        <v-btn variant="outlined" @click="onDeliveryNotePdf">
          {{ t.dialog.deliveryNote }}
        </v-btn>
        <v-btn variant="outlined" @click="onInvoicePdf">
          {{ t.dialog.invoice }}
        </v-btn>
        <v-btn :loading="loading" @click="onSave">
          {{ language.app.actions.save }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
