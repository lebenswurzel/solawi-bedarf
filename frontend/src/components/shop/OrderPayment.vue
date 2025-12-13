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
import { computed } from "vue";
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
  payment: OrderPayment;
  enableConfirmSepaUpdate: boolean;
  enableConfirmBankTransfer: boolean;
  modificationOrder?: SavedOrder;
  offer: number;
  predecessorOffer: number;
  organizationInfoFlat: OrganizationInfoFlat;
  requestUser: UserWithOrders;
}>();

const emit = defineEmits<{
  "update:payment": [payment: OrderPayment];
}>();

const t = language.pages.shop.dialog;

const configStore = useConfigStore();
const { config } = storeToRefs(configStore);

const updatePayment = (updates: {
  paymentType?: OrderPaymentType;
  amount?: number;
  bankDetails?: Partial<OrderPayment["bankDetails"]>;
}) => {
  const updatedPayment: OrderPayment = {
    ...props.payment,
    ...updates,
    bankDetails: updates.bankDetails
      ? {
          ...props.payment.bankDetails,
          ...updates.bankDetails,
        }
      : props.payment.bankDetails,
  };
  emit("update:payment", updatedPayment);
};

const sepaLabel = computed(() => {
  return getSepaUpdateMessage(
    props.modificationOrder?.validFrom ?? new Date(),
    props.modificationOrder?.validTo ?? new Date(),
    props.offer,
    props.predecessorOffer,
    props.organizationInfoFlat,
  );
});

const bankTransferMessage = computed(() => {
  return getBankTransferMessage(
    props.modificationOrder?.validFrom ?? new Date(),
    props.modificationOrder?.validTo ?? new Date(),
    config.value?.validFrom ?? new Date(),
    config.value?.validTo ?? new Date(),
    props.offer,
    props.predecessorOffer,
    props.requestUser.name,
    props.organizationInfoFlat["organization.bankAccount"],
  );
});

const onSepaUpdate = (checked: boolean | null) => {
  if (checked) {
    updatePayment({
      amount: props.offer,
      paymentType: OrderPaymentType.SEPA,
    });
  } else if (props.payment.paymentType === OrderPaymentType.SEPA) {
    updatePayment({
      paymentType: OrderPaymentType.UNCONFIRMED,
    });
  }
};

const onBankTransfer = (checked: boolean | null) => {
  if (checked) {
    updatePayment({
      amount: bankTransferMessage.value.amount,
      paymentType: OrderPaymentType.BANK_TRANSFER,
    });
  } else if (props.payment.paymentType === OrderPaymentType.BANK_TRANSFER) {
    updatePayment({
      paymentType: OrderPaymentType.UNCONFIRMED,
    });
  }
};

const isSepaSelected = computed(() => {
  return props.payment.paymentType === OrderPaymentType.SEPA;
});

const validationResult = computed(() => {
  return validatePayment(props.payment);
});

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
    <div
      v-if="validationResult.errors?.paymentType"
      class="text-body-2 text-error"
    >
      {{ validationResult.errors?.paymentType }}
    </div>
    <v-checkbox
      v-if="enableConfirmSepaUpdate"
      :model-value="payment.paymentType == OrderPaymentType.SEPA"
      @update:model-value="onSepaUpdate"
      :label="sepaLabel"
      hide-details
      density="compact"
    />
    <div v-if="isSepaSelected" class="pl-10 mt-2">
      <v-text-field
        :model-value="payment.bankDetails.accountHolder"
        @update:model-value="onAccountHolderUpdate"
        label="Kontoinhaber"
        variant="outlined"
        density="compact"
        :error-messages="validationResult.errors?.accountHolder"
        class="mb-2"
      />
      <v-text-field
        :model-value="payment.bankDetails.iban"
        @update:model-value="onIbanUpdate"
        label="IBAN"
        variant="outlined"
        density="compact"
        :error-messages="validationResult.errors?.iban"
        class="mb-2"
      />
      <v-text-field
        :model-value="payment.bankDetails.bankName"
        @update:model-value="onBankNameUpdate"
        label="Kreditinstitut"
        variant="outlined"
        density="compact"
        :error-messages="validationResult.errors?.bankName"
      />
    </div>
    <div v-if="enableConfirmBankTransfer">
      <v-checkbox
        :model-value="payment.paymentType == OrderPaymentType.BANK_TRANSFER"
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
