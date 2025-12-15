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
import { computed, onMounted, watch } from "vue";
import { language } from "@lebenswurzel/solawi-bedarf-shared/src/lang/lang.ts";
import { OrderPaymentType } from "@lebenswurzel/solawi-bedarf-shared/src/enum.ts";
import {
  OrderPayment,
  OrganizationInfoFlat,
  SavedOrder,
  UserWithOrders,
} from "@lebenswurzel/solawi-bedarf-shared/src/types.ts";
import {
  getBankTransferMessage,
  getSepaUpdateMessage,
} from "@lebenswurzel/solawi-bedarf-shared/src/validation/requisition.ts";
import { validatePayment } from "@lebenswurzel/solawi-bedarf-shared/src/util/ibanHelper.ts";
import { useConfigStore } from "../../store/configStore";
import { storeToRefs } from "pinia";

const props = defineProps<{
  paymentInfo: OrderPayment;
  modificationOrder: SavedOrder;
  predecessorOrder?: SavedOrder;
  offer: number;
  organizationInfoFlat: OrganizationInfoFlat;
  requestUser: UserWithOrders;
}>();

const emit = defineEmits<{
  "update:paymentInfo": [paymentInfo: OrderPayment];
  "update:validationValid": [validationValid: boolean];
}>();

const t = language.pages.shop.dialog;

const configStore = useConfigStore();
const { config } = storeToRefs(configStore);

const updatePayment = (updates: {
  paymentRequired?: boolean;
  paymentType?: OrderPaymentType;
  amount?: number;
  bankDetails?: Partial<OrderPayment["bankDetails"]>;
}) => {
  const updatedPayment: OrderPayment = {
    ...props.paymentInfo,
    ...updates,
    paymentRequired:
      updates.paymentRequired ?? props.paymentInfo.paymentRequired,
    bankDetails: updates.bankDetails
      ? {
          ...props.paymentInfo.bankDetails,
          ...updates.bankDetails,
        }
      : props.paymentInfo.bankDetails,
  };

  emit("update:paymentInfo", updatedPayment);
};

const predecessorOffer = computed((): number => {
  return props.predecessorOrder?.offer ?? 0;
});

const monthlyOfferDifference = computed(() => {
  return props.offer - predecessorOffer.value;
});

const enableConfirmSepaUpdate = computed((): boolean => {
  if (props.predecessorOrder) {
    return monthlyOfferDifference.value >= 10;
  }
  return true;
});

const enableConfirmBankTransfer = computed((): boolean => {
  if (props.predecessorOrder) {
    return monthlyOfferDifference.value > 0;
  }
  return true;
});

const isModificationOrder = computed(() => {
  return !!props.predecessorOrder;
});

const sepaLabel = computed(() => {
  return getSepaUpdateMessage(
    props.modificationOrder.validFrom,
    props.modificationOrder.validTo,
    props.offer,
    predecessorOffer.value,
    props.organizationInfoFlat,
    isModificationOrder.value,
  );
});

const bankTransferMessage = computed(() => {
  return getBankTransferMessage(
    props.modificationOrder.validFrom,
    props.modificationOrder.validTo,
    config.value?.validFrom ?? new Date(),
    config.value?.validTo ?? new Date(),
    props.offer,
    predecessorOffer.value,
    props.requestUser.name,
    props.organizationInfoFlat["organization.bankAccount"],
    isModificationOrder.value,
  );
});

const requirePaymentInformation = computed(() => {
  return isModificationOrder.value;
});

const initializePaymentInformation = () => {
  const initial: Partial<OrderPayment> = {
    paymentRequired: requirePaymentInformation.value,
  };
  updatePayment(initial);
};

onMounted(() => {
  initializePaymentInformation();
});

watch(
  [
    enableConfirmSepaUpdate,
    enableConfirmBankTransfer,
    monthlyOfferDifference,
    bankTransferMessage,
  ],
  () => {
    const updates: Partial<OrderPayment> = {};
    if (
      (enableConfirmSepaUpdate.value || enableConfirmBankTransfer.value) &&
      !props.paymentInfo.paymentRequired
    ) {
      updates.paymentRequired = requirePaymentInformation.value;
    } else if (
      !(enableConfirmSepaUpdate.value || enableConfirmBankTransfer.value) &&
      props.paymentInfo.paymentRequired
    ) {
      updates.paymentRequired = false;
    }

    // make sure to set the payment type to unconfirmed if the condition for
    // using the payment method is not met anymore
    if (
      !enableConfirmSepaUpdate.value &&
      props.paymentInfo.paymentType === OrderPaymentType.SEPA
    ) {
      updates.paymentType = OrderPaymentType.UNCONFIRMED;
      updates.amount = 0;
    }
    if (
      !enableConfirmBankTransfer.value &&
      props.paymentInfo.paymentType === OrderPaymentType.BANK_TRANSFER
    ) {
      updates.paymentType = OrderPaymentType.UNCONFIRMED;
      updates.amount = 0;
    }
    if (props.paymentInfo.paymentType == OrderPaymentType.BANK_TRANSFER) {
      updates.amount = bankTransferMessage.value.amount;
    }
    if (props.paymentInfo.paymentType == OrderPaymentType.SEPA) {
      updates.amount = props.offer;
    }
    if (Object.keys(updates).length > 0) {
      updatePayment(updates);
    }
  },
);

const onSepaUpdate = (checked: boolean | null) => {
  if (checked) {
    updatePayment({
      amount: props.offer,
      paymentType: OrderPaymentType.SEPA,
    });
  } else if (props.paymentInfo.paymentType === OrderPaymentType.SEPA) {
    updatePayment({
      paymentType: OrderPaymentType.UNCONFIRMED,
      amount: 0,
    });
  }
};

const onBankTransfer = (checked: boolean | null) => {
  if (checked) {
    updatePayment({
      amount: bankTransferMessage.value.amount,
      paymentType: OrderPaymentType.BANK_TRANSFER,
    });
  } else if (props.paymentInfo.paymentType === OrderPaymentType.BANK_TRANSFER) {
    updatePayment({
      paymentType: OrderPaymentType.UNCONFIRMED,
      amount: 0,
    });
  }
};

const isSepaSelected = computed(() => {
  return props.paymentInfo.paymentType === OrderPaymentType.SEPA;
});

const validationResult = computed(() => {
  const result = validatePayment(
    props.paymentInfo,
    props.offer,
    bankTransferMessage.value.amount,
  );
  return result;
});

watch(
  () => validationResult.value,
  (newValidationResult) => {
    emit("update:validationValid", newValidationResult.valid);
  },
  { immediate: true },
);

const onAccountHolderUpdate = (value: string) => {
  updatePayment({
    bankDetails: {
      accountHolder: value,
    },
  });
};

const onIbanUpdate = (value: string) => {
  updatePayment({
    bankDetails: {
      iban: value,
    },
  });
};

const onBankNameUpdate = (value: string) => {
  updatePayment({
    bankDetails: {
      bankName: value,
    },
  });
};
</script>

<template>
  <div class="mt-3" v-if="enableConfirmSepaUpdate || enableConfirmBankTransfer">
    {{ t.confirmPaymentMethod.title }}
    <div class="text-body-2">
      {{
        isModificationOrder
          ? t.confirmPaymentMethod.subtitleModificationOrder
          : t.confirmPaymentMethod.subtitleNewOrder
      }}
    </div>
    <div
      v-if="validationResult.errors?.general?.length > 0"
      class="text-body-2 text-error"
    >
      {{ validationResult.errors?.general?.join("\n") }}
    </div>
    <v-checkbox
      v-if="enableConfirmSepaUpdate"
      :model-value="paymentInfo.paymentType == OrderPaymentType.SEPA"
      @update:model-value="onSepaUpdate"
      :label="sepaLabel"
      hide-details
      density="compact"
    />
    <div v-if="isSepaSelected" class="pl-10 mt-2">
      <v-text-field
        :model-value="paymentInfo.bankDetails.accountHolder"
        @update:model-value="onAccountHolderUpdate"
        label="Kontoinhaber"
        variant="outlined"
        density="compact"
        :error-messages="validationResult.errors?.accountHolder"
        class="mb-2"
      />
      <v-text-field
        :model-value="paymentInfo.bankDetails.iban"
        @update:model-value="onIbanUpdate"
        label="IBAN"
        variant="outlined"
        density="compact"
        :error-messages="validationResult.errors?.iban"
        class="mb-2"
      />
      <v-text-field
        :model-value="paymentInfo.bankDetails.bankName"
        @update:model-value="onBankNameUpdate"
        label="Kreditinstitut"
        variant="outlined"
        density="compact"
        :error-messages="validationResult.errors?.bankName"
      />
    </div>
    <div v-if="enableConfirmBankTransfer">
      <v-checkbox
        :model-value="paymentInfo.paymentType == OrderPaymentType.BANK_TRANSFER"
        @update:model-value="onBankTransfer"
        :label="bankTransferMessage.message"
        hide-details
        density="compact"
      />
      <p
        class="text-body-2 pl-10"
        v-for="text in bankTransferMessage.accountDetails.split('\n')"
      >
        {{ text }}
      </p>
    </div>
  </div>
</template>
