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
import { language } from "../../../shared/src/lang/lang.ts";
import { computed, onMounted, ref } from "vue";
import { useUserStore } from "../store/userStore.ts";
import { storeToRefs } from "pinia";
import { logout } from "../requests/login.ts";
import { useRouter } from "vue-router";
import { useConfigStore } from "../store/configStore.ts";
import { useProductStore } from "../store/productStore.ts";
import { useOrderStore } from "../store/orderStore.ts";
import { UserRole } from "../../../shared/src/enum";
import { useTheme } from "vuetify";
import SeasonSelector from "./SeasonSelector.vue";

const drawer = ref(false);

const router = useRouter();
const userStore = useUserStore();
const configStore = useConfigStore();
const productStore = useProductStore();
const orderStore = useOrderStore();

const { currentUser } = storeToRefs(userStore);
const theme = useTheme();
const { config, seasonColorClass } = storeToRefs(configStore);
const isLoggedIn = computed(() => {
  return currentUser.value !== undefined;
});

onMounted(async () => {
  if (window.location.hash != "#/register") {
    await userStore.init();
  }
});

const onLogout = async () => {
  await logout();
  userStore.clear();
  orderStore.clear();
  productStore.clear();
  configStore.clear();
  await router.push("/login");
};

const onToggleTheme = () => {
  const newTheme = theme.global.current.value.dark ? "light" : "dark";
  localStorage.setItem("theme-color", newTheme);
  theme.global.name.value = newTheme;
};

type NavEntry = {
  title: string;
  icon: string;
  to: string;
};

const mainNavEntries: NavEntry[] = [
  {
    title: language.pages.home.navigation.title,
    icon: "mdi-home",
    to: "/",
  },
  {
    title: language.pages.shop.navigation.title,
    icon: "mdi-storefront",
    to: "/shop",
  },
  {
    title: language.pages.faq.navigation.title,
    icon: "mdi-help-circle-outline",
    to: "/faq",
  },
];

const adminNavEntries: NavEntry[] = [
  {
    title: language.pages.user.title,
    icon: "mdi-account", // Replace with appropriate icons
    to: "/adminusers",
  },
  {
    title: language.pages.product.title,
    icon: "mdi-cube-outline",
    to: "/adminproducts",
  },
  {
    title: language.pages.applicants.title,
    icon: "mdi-clipboard-text",
    to: "/adminregister",
  },
  {
    title: language.pages.depots.title,
    icon: "mdi-warehouse",
    to: "/admindepot",
  },
  {
    title: language.pages.config.title,
    icon: "mdi-cog",
    to: "/adminconfig",
  },
  {
    title: language.pages.content.title,
    icon: "mdi-text-box-multiple",
    to: "/admintext",
  },
  {
    title: language.pages.overview.title,
    icon: "mdi-view-dashboard",
    to: "/adminoverview",
  },
  {
    title: "Statistics", // Replace with a placeholder title or update as needed
    icon: "mdi-chart-bar",
    to: "/statistics",
  },
];
</script>

<template>
  <v-app-bar elevation="2">
    <template v-slot:prepend>
      <v-app-bar-nav-icon
        variant="text"
        @click.stop="drawer = !drawer"
      ></v-app-bar-nav-icon>
    </template>

    <v-toolbar-title class="d-inline-flex">
      <div>{{ language.app.title }}</div>
      <div
        style="
          color: #797779;
          font-size: 14px;
          white-space: normal;
          line-height: normal;
        "
      >
        {{ language.app.subtitle }}
      </div>
    </v-toolbar-title>

    <SeasonSelector v-if="isLoggedIn" />

    <template v-slot:append>
      <v-btn icon @click="onToggleTheme">
        <v-icon color="secondary">mdi-brightness-4</v-icon>
      </v-btn>
      <v-btn icon @click="onLogout" v-if="isLoggedIn">
        <v-icon color="secondary">mdi-logout</v-icon>
      </v-btn>
    </template>
  </v-app-bar>
  <v-navigation-drawer v-model="drawer">
    <v-list>
      <v-list-item :class="seasonColorClass">
        <v-list-item-title>{{
          language.app.navigation.title
        }}</v-list-item-title>
        <v-list-item-subtitle>{{ config?.name }}</v-list-item-subtitle>
      </v-list-item>
      <v-divider></v-divider>
      <v-list-item
        v-for="entry in mainNavEntries"
        :to="entry.to"
        :prepend-icon="entry.icon"
      >
        <v-list-item-title>{{ entry.title }}</v-list-item-title>
      </v-list-item>
      <v-divider></v-divider>
      <v-list-subheader class="ml-2">{{
        language.navigation.employees
      }}</v-list-subheader>
      <v-list-item
        to="/employeeshipment"
        v-if="
          currentUser?.role == UserRole.ADMIN ||
          currentUser?.role == UserRole.EMPLOYEE
        "
        prepend-icon="mdi-truck"
      >
        <v-list-item-title>{{
          language.pages.shipment.title
        }}</v-list-item-title>
      </v-list-item>
      <v-divider></v-divider>
      <v-list-subheader class="ml-2">{{
        language.navigation.administration
      }}</v-list-subheader>
      <v-list-item
        v-for="entry in adminNavEntries"
        :to="entry.to"
        v-if="currentUser?.role == UserRole.ADMIN"
        :prepend-icon="entry.icon"
      >
        <v-list-item-title>{{ entry.title }}</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-navigation-drawer>
</template>

<style>
.v-list-item__prepend > .v-icon ~ .v-list-item__spacer {
  width: 8px;
}
</style>
