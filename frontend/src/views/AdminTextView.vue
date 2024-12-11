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
import { storeToRefs } from "pinia";
import { useTextContentStore } from "../store/textContentStore";
import { computed, provide, ref } from "vue";
import TextContentDialog from "../components/TextContentDialog.vue";
import { NewTextContent, TextContent } from "../../../shared/src/types";
import { TextContentCategory } from "../../../shared/src/enum";
import { language } from "../lang/lang";

const defaultTextContent: NewTextContent = {
  title: "Beispieltitel",
  content: "Beispieltext",
  category: TextContentCategory.FAQ,
};

const appConfigStore = useTextContentStore();
const { textContent } = storeToRefs(appConfigStore);
const faqs = computed(() =>
  textContent.value.filter((c) => c.category == TextContentCategory.FAQ),
);
const maintenanceMessage = computed(() => {
  const i = textContent.value.filter(
    (c) => c.category == TextContentCategory.MAINTENANCE_MESSAGE,
  );
  if (i.length > 0) {
    return i[0];
  } else {
    return {
      title: language.pages.content.maintenanceMessage.title,
      content: "",
      category: TextContentCategory.MAINTENANCE_MESSAGE,
    };
  }
});
const imprint = computed(() => {
  const i = textContent.value.filter(
    (c) => c.category == TextContentCategory.IMPRINT,
  );
  if (i.length > 0) {
    return i[0];
  } else {
    return {
      title: language.pages.content.imprint,
      content: "",
      category: TextContentCategory.IMPRINT,
    };
  }
});
const privacyNotice = computed(() => {
  const i = textContent.value.filter(
    (c) => c.category == TextContentCategory.PRIVACY_NOTICE,
  );
  if (i.length > 0) {
    return i[0];
  } else {
    return {
      title: language.pages.content.privacyNotice,
      content: "",
      category: TextContentCategory.PRIVACY_NOTICE,
    };
  }
});

const open = ref(false);
const dialogTextContent = ref<NewTextContent | TextContent>({
  ...defaultTextContent,
});

provide("dialogTextContent", dialogTextContent);

const onCreateFAQ = () => {
  dialogTextContent.value = { ...defaultTextContent };
  open.value = true;
};
const onEditTextContent = (textContent: NewTextContent | TextContent) => {
  dialogTextContent.value = textContent;
  open.value = true;
};
const onClose = async () => {
  open.value = false;
  await appConfigStore.update();
};
</script>

<template>
  <v-card class="ma-4">
    <v-card-title>Admin Text</v-card-title>
    <v-card-text>
      <v-list-item @click="() => onEditTextContent(maintenanceMessage)">
        {{ maintenanceMessage.title }}
        <v-list-item-subtitle>
          <v-icon v-if="!!maintenanceMessage.content" color="orange"
            >mdi-alert</v-icon
          >
          {{
            !!maintenanceMessage.content
              ? language.pages.content.maintenanceMessage.enabled + " - "
              : ""
          }}
          {{ language.pages.content.maintenanceMessage.description }}
        </v-list-item-subtitle>
      </v-list-item>
      <v-list-item @click="() => onEditTextContent(imprint)">
        {{ imprint.title }}
        <v-list-item-subtitle> Impressum </v-list-item-subtitle>
      </v-list-item>
      <v-list-item @click="() => onEditTextContent(privacyNotice)">
        {{ privacyNotice.title }}
        <v-list-item-subtitle> Datenschutzerklärung </v-list-item-subtitle>
      </v-list-item>
      <v-list>
        <v-list-item v-for="faq in faqs" @click="() => onEditTextContent(faq)">
          {{ faq.title }}
          <v-list-item-subtitle>{{
            language.pages.content.faq
          }}</v-list-item-subtitle>
        </v-list-item>
      </v-list>
    </v-card-text>
    <v-card-actions>
      <v-btn @click="onCreateFAQ" prepend-icon="mdi-playlist-plus">{{
        language.pages.content.action
      }}</v-btn>
    </v-card-actions>
  </v-card>
  <TextContentDialog :open="open" @close="onClose" />
</template>
../store/textContetnStore../../../shared/src/types
