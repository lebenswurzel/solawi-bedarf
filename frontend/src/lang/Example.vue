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
import Interpolate from "./Interpolate.vue";
const template = "some text with {slot1} and {slot2}";
</script>

<template>
  <div class="outer">
    <Interpolate tag="div" :template="template">
      <template #slot1>
        <a rel="noopener" target="_blank" href="http://localhost:8080">Slot1</a>
      </template>
      <template #slot2>
        <div>Slot2</div>
      </template>
    </Interpolate>
  </div>
</template>
