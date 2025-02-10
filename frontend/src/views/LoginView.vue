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
import { onMounted } from "vue";
import { useUserStore } from "../store/userStore.ts";
import { useConfigStore } from "../store/configStore.ts";
import { useProductStore } from "../store/productStore.ts";
import { useOrderStore } from "../store/orderStore.ts";
import Login from "../components/Login.vue";
const userStore = useUserStore();
const configStore = useConfigStore();
const productStore = useProductStore();
const orderStore = useOrderStore();

onMounted(() => {
  userStore.clear();
  orderStore.clear();
  productStore.clear();
  configStore.clear();
});
</script>

<template>
  <div class="mx-auto" style="max-width: 800px">
    <Login show-register-link use-redirect />
  </div>
</template>
