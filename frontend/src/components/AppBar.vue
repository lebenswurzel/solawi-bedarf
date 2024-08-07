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
import { language } from "../lang/lang.ts";
import { onMounted, ref } from "vue";
import { useUserStore } from "../store/userStore.ts";
import { storeToRefs } from "pinia";
import { logout } from "../requests/login.ts";
import { useRouter } from "vue-router";
import { useConfigStore } from "../store/configStore.ts";
import { useProductStore } from "../store/productStore.ts";
import { useOrderStore } from "../store/orderStore.ts";
import { UserRole } from "../../../shared/src/enum";

const drawer = ref(false);

const router = useRouter();
const userStore = useUserStore();
const configStore = useConfigStore();
const productStore = useProductStore();
const orderStore = useOrderStore();

const { currentUser } = storeToRefs(userStore);

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
    <template v-slot:append>
      <v-btn icon @click="onLogout">
        <v-icon color="secondary">mdi-logout</v-icon>
      </v-btn>
    </template>
  </v-app-bar>
  <v-navigation-drawer v-model="drawer">
    <v-list-item>
      <v-list-item-title>{{ language.app.navigation.title }}</v-list-item-title>
      <v-list-item-subtitle>{{
        language.app.navigation.subtitle
      }}</v-list-item-subtitle>
    </v-list-item>
    <v-divider></v-divider>
    <v-list-item to="/">
      <v-list-item-title>{{
        language.pages.home.navigation.title
      }}</v-list-item-title>
    </v-list-item>
    <v-list-item to="/shop">
      <v-list-item-title>{{
        language.pages.shop.navigation.title
      }}</v-list-item-title>
    </v-list-item>
    <v-list-item to="/faq">
      <v-list-item-title>{{
        language.pages.faq.navigation.title
      }}</v-list-item-title>
    </v-list-item>
    <v-divider></v-divider>
    <v-list-item
      to="/employeeshipment"
      v-if="
        currentUser?.role == UserRole.ADMIN ||
        currentUser?.role == UserRole.EMPLOYEE
      "
    >
      <v-list-item-title>{{ language.pages.shipment.title }}</v-list-item-title>
      <v-list-item-subtitle>{{
        language.pages.shipment.navigation.subtitle
      }}</v-list-item-subtitle>
    </v-list-item>
    <v-divider></v-divider>
    <v-list-item to="/adminusers" v-if="currentUser?.role == UserRole.ADMIN">
      <v-list-item-title>{{ language.pages.user.title }}</v-list-item-title>
      <v-list-item-subtitle>{{
        language.pages.user.navigation.subtitle
      }}</v-list-item-subtitle>
    </v-list-item>
    <v-list-item to="/adminproducts" v-if="currentUser?.role == UserRole.ADMIN">
      <v-list-item-title>{{ language.pages.product.title }}</v-list-item-title>
      <v-list-item-subtitle>{{
        language.pages.product.navigation.subtitle
      }}</v-list-item-subtitle>
    </v-list-item>
    <v-list-item to="/adminregister" v-if="currentUser?.role == UserRole.ADMIN">
      <v-list-item-title>{{
        language.pages.applicants.title
      }}</v-list-item-title>
      <v-list-item-subtitle>{{
        language.pages.applicants.navigation.subtitle
      }}</v-list-item-subtitle>
    </v-list-item>
    <v-list-item to="/admindepot" v-if="currentUser?.role == UserRole.ADMIN">
      <v-list-item-title>{{ language.pages.depots.title }}</v-list-item-title>
      <v-list-item-subtitle>{{
        language.pages.depots.navigation.subtitle
      }}</v-list-item-subtitle>
    </v-list-item>
    <v-list-item to="/adminconfig" v-if="currentUser?.role == UserRole.ADMIN">
      <v-list-item-title>{{ language.pages.config.title }}</v-list-item-title>
      <v-list-item-subtitle>{{
        language.pages.config.navigation.subtitle
      }}</v-list-item-subtitle>
    </v-list-item>
    <v-list-item to="/admintext" v-if="currentUser?.role == UserRole.ADMIN">
      <v-list-item-title> {{ language.pages.content.title }}</v-list-item-title>
      <v-list-item-subtitle>{{
        language.pages.content.navigation.subtitle
      }}</v-list-item-subtitle>
    </v-list-item>
    <v-list-item to="/adminoverview" v-if="currentUser?.role == UserRole.ADMIN">
      <v-list-item-title>
        {{ language.pages.overview.title }}</v-list-item-title
      >
      <v-list-item-subtitle>{{
        language.pages.overview.navigation.subtitle
      }}</v-list-item-subtitle>
    </v-list-item>
  </v-navigation-drawer>
</template>
