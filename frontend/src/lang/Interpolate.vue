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
import { useSlots } from "vue";
import { VNode } from "vue";
import { h } from "vue";

const props = defineProps<{
  tag?: string;
  template: string;
}>();

const slots = useSlots();

const children: Array<string | VNode> = [];

const template: string = props.template;
const splitPattern = /(\{[^}]+\})/;
const keyPattern = /^\{([^\}]+)\}$/;

const rawParts = template.split(splitPattern).filter(Boolean);
const parts = rawParts.map((part) => {
  const match = part.match(keyPattern);
  return match ? { part: match[1], isKey: true } : { part: part, isKey: false };
});
const keys = Object.keys(slots);

for (let part of parts) {
  if (part.isKey && keys.includes(part.part)) {
    const slot = slots[part.part];
    if (slot) {
      children.push(h(slot));
    }
  } else {
    children.push(part.part);
  }
}

const root = h(props.tag || "span", children);
</script>

<template>
  <root />
</template>
