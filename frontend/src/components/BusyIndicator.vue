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
defineProps<{ busy: boolean }>();
</script>

<template>
  <v-progress-linear
    indeterminate
    color="primary"
    v-show="busy"
    class="progress-bar"
  ></v-progress-linear>
</template>

<style>
.progress-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
}
</style>
