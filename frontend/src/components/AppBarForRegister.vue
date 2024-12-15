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
import { language } from "../../../shared/src/lang/lang";
</script>

<template>
  <v-app-bar elevation="2">
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
  </v-app-bar>
</template>
