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
import UserDialog from "../components/UserDialog.vue";
import { language } from "@lebenswurzel/solawi-bedarf-shared/src/lang/lang.ts";
import { useUserStore } from "../store/userStore.ts";
import { storeToRefs } from "pinia";
import { useConfigStore } from "../store/configStore";
import {
  NewUser,
  UpdateUserRequest,
  User,
  UserOrder,
  UserWithOrders,
} from "@lebenswurzel/solawi-bedarf-shared/src/types.ts";
import { UserRole } from "@lebenswurzel/solawi-bedarf-shared/src/enum.ts";
import { computed } from "@vue/reactivity";
import { updateUser } from "../requests/user.ts";
import { useUiFeedback } from "../store/uiFeedbackStore.ts";
import {
  getDateTimestampWithoutTime,
  prettyDate,
  prettyDateNoTime,
} from "@lebenswurzel/solawi-bedarf-shared/src/util/dateHelper.ts";
import { useRoute } from "vue-router";

const t = language.pages.user;

const { setError, setSuccess } = useUiFeedback();
const configStore = useConfigStore();
const { externalAuthProvider, activeConfigId } = storeToRefs(configStore);
const route = useRoute();

const defaultUser: NewUser = {
  role: UserRole.USER,
  active: false,
};

const ACTION_ACTIVATE = "Aktivieren";
const ACTION_DEACTIVATE = "Deaktivieren";
const ACTION_SET_ORDER_VALID_FROM = "Setze 'Bedarf gültig ab'";

const userStore = useUserStore();
const { users } = storeToRefs(userStore);
const open = ref(false);
const dialogUser = ref<NewUser | User>({ ...defaultUser });
const search = ref<string>("");
const selectedUsers = ref<number[]>([]);
const selectedUserActions = [
  ACTION_ACTIVATE,
  ACTION_DEACTIVATE,
  ACTION_SET_ORDER_VALID_FROM,
];
const selectedAction = ref(selectedUserActions[0]);
const processedUsers = ref<number>(0);
const isProcessing = ref(false);
const openDatePicker = ref(false);
const selectedDate = ref(new Date());
const displayFilters = ref<{
  validFrom: Array<number>;
  role: Array<number>;
  depot: Array<number>;
}>({ validFrom: [], role: [], depot: [] });

provide("dialogUser", dialogUser);

const headers = [
  { title: "Name", key: "name" },
  { title: "Rolle", key: "role" },
  { title: "Status", key: "active" },
  {
    title: "Letzte Bedarfsänderung",
    key: "orderUpdatedAt",
    sortRaw(a: UserWithOrders, b: UserWithOrders) {
      return (
        (getCurrentSeasonOrder(a.orders)?.updatedAt.getTime() ?? 0) -
        (getCurrentSeasonOrder(b.orders)?.updatedAt.getTime() ?? 0)
      );
    },
  },
  {
    title: "Bedarf gültig ab",
    key: "orderValidFrom",
    sortRaw(a: UserWithOrders, b: UserWithOrders) {
      return (
        (getCurrentSeasonOrder(a.orders)?.validFrom?.getTime() ?? 0) -
        (getCurrentSeasonOrder(b.orders)?.validFrom?.getTime() ?? 0)
      );
    },
  },
  {
    title: "Depot",
    key: "depotName",
  },
  { title: "ID", key: "id" },
  { title: "Bearbeiten", key: "edit" },
];

onMounted(async () => {
  await userStore.update();
  // filter for user if route.params.userName is set
  if (route.params.userName) {
    search.value = route.params.userName as string;
  }
});

const onCreateUser = () => {
  dialogUser.value = { ...defaultUser };
  open.value = true;
};

const onEditUser = (user: User) => {
  dialogUser.value = user;
  open.value = true;
};

const onClose = async () => {
  open.value = false;
  await userStore.update();
};

const selectedUserNames = computed(() => {
  return selectedUsers.value.map((v) => "" + v).join(", ");
});

const applySelectedAction = async () => {
  let option: Omit<UpdateUserRequest, "id"> = {
    configId: activeConfigId.value,
  };
  if (
    selectedAction.value == ACTION_ACTIVATE ||
    selectedAction.value == ACTION_DEACTIVATE
  ) {
    option = {
      ...option,
      active: selectedAction.value == ACTION_ACTIVATE,
    };
    await updateSelectedUsers(option);
  } else if (selectedAction.value == ACTION_SET_ORDER_VALID_FROM) {
    openDatePicker.value = true;
  }
};

const onUpdateValidFromDates = async () => {
  const option = {
    configId: activeConfigId.value,
    orderValidFrom: selectedDate.value,
  };
  openDatePicker.value = false;
  await updateSelectedUsers(option);
};

const updateSelectedUsers = async (option: Omit<UpdateUserRequest, "id">) => {
  isProcessing.value = true;
  processedUsers.value = 0;
  const updateAll = selectedUsers.value.map((userId) =>
    updateUser({
      id: userId,
      ...option,
    }).then(() => {
      processedUsers.value++;
    }),
  );

  try {
    await Promise.all(updateAll);
    setSuccess(
      `${selectedUsers.value.length} Benutzer erfolgreich aktualisiert`,
    );
  } catch (error) {
    setError("Aktualisierung fehlgeschlagen", error as Error);
    throw error;
  } finally {
    isProcessing.value = false;
    userStore.update();
  }
};

const actionProgress = computed(() => {
  return selectedUsers.value.length > 0
    ? (processedUsers.value / selectedUsers.value.length) * 100
    : 0;
});

watch(selectedUsers, () => {
  processedUsers.value = 0;
});

const getCurrentSeasonOrder = (
  userOrders?: UserOrder[],
  ifHasItems = false,
): UserOrder | undefined => {
  const order = userOrders?.find((o) => o.configId == activeConfigId.value);
  if (order && (order.hasItems || !ifHasItems)) {
    return order;
  }
};

const tableItems = computed(() => {
  return users.value.map((user) => {
    const currentOrder = getCurrentSeasonOrder(user.orders);
    const currentOrderWithItems = getCurrentSeasonOrder(user.orders, true);

    return {
      ...user,
      orderUpdatedAt: currentOrderWithItems?.updatedAt,
      orderValidFrom: currentOrder?.validFrom,
      depotName: currentOrder?.depotName,
    };
  });
});

const filteredTableItems = computed(() => {
  return tableItems.value
    .filter(filterValidFromDates)
    .filter(filterUserRoles)
    .filter(filterDepotNames);
});

/// filter form validFrom
const filterValidFromDates = (tableItem: {
  orderValidFrom: Date | undefined | null;
}): boolean => {
  if (displayFilters.value.validFrom.length < 1) {
    return true;
  }
  return displayFilters.value.validFrom
    .map((index) => validFromItems.value[index])
    .includes(getDateTimestampWithoutTime(tableItem.orderValidFrom));
};

const validFromItems = computed(() => {
  return Array.from(
    new Set(
      users.value.map((user) => {
        const currentOrder = getCurrentSeasonOrder(user.orders);
        return getDateTimestampWithoutTime(currentOrder?.validFrom);
      }),
    ),
  ).sort();
});

watch(validFromItems, () => {
  // reset filter if valid from list changes
  displayFilters.value.validFrom = [];
});

/// filter for user role
const filterUserRoles = (tableItem: { role: UserRole }): boolean => {
  if (displayFilters.value.role.length < 1) {
    return true;
  }
  return displayFilters.value.role
    .map((index) => userRoleItems.value[index])
    .includes(tableItem.role);
};
const userRoleItems = computed(() => {
  return Array.from(new Set(users.value.map((user) => user.role)));
});

/// filter for user role
const filterDepotNames = (tableItem: {
  depotName: string | undefined;
}): boolean => {
  if (displayFilters.value.depot.length < 1) {
    return true;
  }
  return displayFilters.value.depot
    .map((index) => depotNameItems.value[index])
    .includes(tableItem.depotName || "- keins -");
};
const depotNameItems = computed(() => {
  return Array.from(
    new Set(tableItems.value.map((item) => item.depotName || "- keins -")),
  ).sort();
});
</script>

<template>
  <v-card class="ma-2">
    <v-card-title>
      {{ t.title }}
    </v-card-title>
    <v-card-text>
      <v-container fluid>
        <v-row no-gutters>
          <v-col cols="11" sm="7">
            <div class="d-flex align-center" v-if="selectedUsers.length > 0">
              <v-tooltip :text="selectedUserNames" location="top" open-on-click>
                <template v-slot:activator="{ props }">
                  <span v-bind="props" class="mb-5">
                    Aktion für {{ selectedUsers.length }} gewählt Nutzer:
                  </span>
                </template>
              </v-tooltip>
              <v-select
                variant="outlined"
                density="compact"
                :items="selectedUserActions"
                v-model="selectedAction"
                class="ma-1 mb-7"
                hide-details
              ></v-select>
              <v-btn
                rounded="3"
                @click="applySelectedAction"
                class="ma-1 mb-7"
                :disabled="isProcessing"
                >OK</v-btn
              >
            </div>
            <div v-else class="opacity-70">
              Wähle einen oder mehrere Benutzer um eine Aktion auszuführen.
            </div>
          </v-col>
          <v-col cols="1" class="d-flex align-center">
            <v-progress-circular
              class="mb-6"
              v-if="actionProgress == 100 || isProcessing"
              :color="actionProgress == 100 ? 'green' : 'grey'"
              :model-value="actionProgress"
            ></v-progress-circular>
          </v-col>
          <v-col cols="12" sm="4" class="d-flex align-center">
            <v-text-field
              prepend-inner-icon="mdi-magnify"
              v-model="search"
              variant="outlined"
              density="compact"
              label="Suche nach Benutzer"
              single-line
              clearable
              hint="Volltextsuche in allen Spalten"
            />
          </v-col>
        </v-row>
        <v-row no-gutters>
          <v-col cols="12">
            <v-data-table
              :headers="headers"
              :items="filteredTableItems"
              density="compact"
              :search="search"
              show-select
              v-model="selectedUsers"
            >
              <template v-slot:item.name="{ item }">
                <v-btn
                  v-if="item.emailEnabled"
                  icon="mdi-account-arrow-right"
                  variant="plain"
                  :to="{ path: `/adminregister/confirmed/${item.name}` }"
                  density="compact"
                ></v-btn
                >{{ item.name }}
              </template>
              <template v-slot:item.active="{ item }">
                <v-tooltip text="aktiviert" open-on-click>
                  <template v-slot:activator="{ props }">
                    <span v-bind="props">
                      <v-icon v-if="item.active"
                        >mdi-checkbox-marked-circle-outline</v-icon
                      >
                    </span>
                  </template>
                </v-tooltip>
                <v-tooltip text="deaktiviert" open-on-click>
                  <template v-slot:activator="{ props }">
                    <span v-bind="props">
                      <v-icon v-if="!item.active" class="opacity-40"
                        >mdi-checkbox-blank-circle-outline</v-icon
                      >
                    </span>
                  </template>
                </v-tooltip>
                <v-tooltip text="E-Mail-Adresse vorhanden" open-on-click>
                  <template v-slot:activator="{ props }">
                    <span v-bind="props">
                      <v-icon v-if="item.emailEnabled"
                        >mdi-email-check-outline</v-icon
                      >
                    </span></template
                  >
                </v-tooltip>
                <v-tooltip text="Keine E-Mail-Adresse vorhanden" open-on-click>
                  <template v-slot:activator="{ props }">
                    <span v-bind="props">
                      <v-icon v-if="!item.emailEnabled" class="opacity-40"
                        >mdi-email-off-outline</v-icon
                      >
                    </span></template
                  >
                </v-tooltip>
              </template>
              <template v-slot:item.orderUpdatedAt="{ item }">
                {{ prettyDate(item.orderUpdatedAt) }}
                <v-btn
                  icon="mdi-eye"
                  variant="plain"
                  :to="{ path: `/shop/${item.id}` }"
                ></v-btn>
              </template>
              <template v-slot:item.orderValidFrom="{ item }">
                {{ prettyDate(item.orderValidFrom) }}
              </template>
              <template v-slot:item.depotName="{ item }">
                {{ item.depotName }}
              </template>
              <template v-slot:item.edit="{ item }">
                <v-btn
                  icon="mdi-pencil"
                  variant="plain"
                  @click="() => onEditUser(item)"
                ></v-btn>
              </template>
            </v-data-table>
          </v-col>
        </v-row>
        <span class="text-h6">Anzeigefilter für die Tabelle</span>
        <v-row dense>
          <v-col cols="12" md="6">
            <div class="text-caption">Bedarf gültig ab Datum</div>
            <v-chip-group
              multiple
              selected-class="text-primary"
              column
              v-model="displayFilters.validFrom"
            >
              <v-chip
                v-for="validFrom in validFromItems"
                :key="validFrom || 0"
                :text="prettyDateNoTime(validFrom)"
                filter
              ></v-chip>
            </v-chip-group>
          </v-col>
          <v-col cols="12" md="6">
            <div class="text-caption">Rolle</div>
            <v-chip-group
              multiple
              selected-class="text-primary"
              column
              v-model="displayFilters.role"
            >
              <v-chip
                v-for="role in userRoleItems"
                :key="role"
                :text="role"
                filter
              ></v-chip>
            </v-chip-group>
          </v-col>
          <v-col cols="12">
            <div class="text-caption">Depot</div>
            <v-chip-group
              multiple
              selected-class="text-primary"
              column
              v-model="displayFilters.depot"
            >
              <v-chip
                v-for="depotName in depotNameItems"
                :key="depotName"
                :text="depotName"
                filter
              ></v-chip>
            </v-chip-group>
          </v-col>
        </v-row>
      </v-container>
    </v-card-text>
    <v-card-actions v-if="!externalAuthProvider">
      <v-btn @click="onCreateUser" prepend-icon="mdi-account-plus-outline">{{
        t.action.createUser
      }}</v-btn>
    </v-card-actions>
  </v-card>
  <UserDialog :open="open" @close="onClose" />
  <v-dialog :model-value="openDatePicker">
    <v-card class="mx-auto">
      <v-card-title>Bedarf gültig ab</v-card-title>
      <v-card-text style="max-width: 600px"
        ><p class="mb-2">
          Setze für die gewählten Nutzer das Datum, ab welchem der Bedarf in den
          Verteilungen berücksichtig werden soll. Es sollte sich um den Freitag
          vor der ersten Lieferung handeln, damit der Bedarf dieses Nutzers in
          der Planung der Verteilung berücksichtigt werden kann.
        </p>
        <p>
          Das Datum wird nur gesetzt, falls der Nutzer bereits einen Bedarf
          angemeldet hat.
        </p></v-card-text
      >
      <v-card-text class="mx-auto">
        <v-date-picker v-model="selectedDate"> </v-date-picker>
      </v-card-text>
      <v-card-actions>
        <v-btn @click="() => (openDatePicker = false)">
          {{ language.app.actions.cancel }}
        </v-btn>
        <v-btn @click="onUpdateValidFromDates">
          {{ language.app.actions.apply }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
