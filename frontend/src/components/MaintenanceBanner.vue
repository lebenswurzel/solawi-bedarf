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
<script lang="ts" setup>
import { buildInfo } from "../../../shared/src/buildInfo";
</script>
<template>
  <div
    v-if="buildInfo.maintenance?.enabled ?? false"
    class="maintenance-banner"
  >
    <span class="bg-yellow">
      {{
        buildInfo.maintenance?.message ||
        "Wartungsmodus: Änderungen gehen möglicherweise verloren!"
      }}
    </span>
  </div>
</template>

<style>
.maintenance-banner {
  width: 100%;
  padding: 0.5em;
  text-align: center;
  position: sticky;
  top: 60px;
  z-index: 100;
  background-image: repeating-linear-gradient(
    45deg,
    yellow,
    yellow 1em,
    orange 1em,
    orange 2em
  );
}

.maintenance-banner span {
  padding: 0.2em;
  background-color: yellow !important;
}
</style>
