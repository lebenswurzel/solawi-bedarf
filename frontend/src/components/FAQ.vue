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
import { useTextContentStore } from "../store/textContentStore";

const textContentStore = useTextContentStore();
</script>

<template>
  <v-card-title>{{ language.pages.faq.title }} </v-card-title>
  <v-card-text>
    <v-expansion-panels class="pa-0">
      <v-expansion-panel v-for="faq in textContentStore.faqs">
        <v-expansion-panel-title>
          {{ faq.title }}
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <div v-html="faq.content"></div>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </v-card-text>
</template>
../store/textContetnStore
