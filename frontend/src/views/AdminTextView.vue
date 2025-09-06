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
import TextContentDialog from "../components/text/TextContentDialog.vue";
import {
  EmailTextsKeys,
  NewTextContent,
  OrganizationInfoKeys,
  PdfTextsKeys,
  TextContent,
} from "@lebenswurzel/solawi-bedarf-shared/src/types.ts";
import {
  TextContentCategory,
  TextContentTyp,
} from "@lebenswurzel/solawi-bedarf-shared/src/enum.ts";
import {
  langEmailTextLabels,
  langOrganizationInfo,
  langPdfTexts,
  language,
} from "@lebenswurzel/solawi-bedarf-shared/src/lang/lang.ts";

const defaultTextContent: NewTextContent = {
  title: "Beispieltitel",
  content: "Beispieltext",
  category: TextContentCategory.FAQ,
  typ: TextContentTyp.MD,
};

const textContentStore = useTextContentStore();
const { textContent } = storeToRefs(textContentStore);
const currentTab = ref("faq");
const faqs = computed(() =>
  textContent.value.filter((c) => c.category == TextContentCategory.FAQ),
);

const organizationInfo = computed(() =>
  textContent.value
    .filter((c) => c.category == TextContentCategory.ORGANIZATION_INFO)
    .sort((a, b) => (a.title < b.title ? -1 : 1)),
);
const pdfTexts = computed(() =>
  textContent.value
    .filter((c) => c.category == TextContentCategory.PDF)
    .sort((a, b) => (a.title < b.title ? -1 : 1)),
);
const emailTexts = computed(() =>
  textContent.value
    .filter((c) => c.category == TextContentCategory.EMAIL)
    .sort((a, b) => (a.title < b.title ? -1 : 1)),
);

const maintenanceMessage = computed((): NewTextContent => {
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
      typ: TextContentTyp.MD,
    };
  }
});
const imprint = computed((): NewTextContent => {
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
      typ: TextContentTyp.MD,
    };
  }
});
const privacyNotice = computed((): NewTextContent => {
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
      typ: TextContentTyp.MD,
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
  await textContentStore.update();
};
</script>

<template>
  <v-card class="ma-2">
    <v-card-title>{{ language.pages.content.pageTitle }}</v-card-title>
    <v-tabs v-model="currentTab">
      <v-tab value="faq">{{ language.pages.content.faq }}</v-tab>
      <v-tab value="organization">{{
        language.pages.content.organizationInfo
      }}</v-tab>
      <v-tab value="pdf">{{ language.pages.content.pdf }}</v-tab>
      <v-tab value="email">{{ language.pages.content.email }}</v-tab>
      <v-tab value="general">{{ language.pages.content.general }}</v-tab>
    </v-tabs>

    <v-tabs-window v-model="currentTab">
      <v-tabs-window-item value="faq">
        <v-card-text>
          <v-list>
            <v-list-item
              v-for="faq in faqs"
              @click="() => onEditTextContent(faq)"
            >
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
      </v-tabs-window-item>

      <v-tabs-window-item value="organization">
        <v-card-text>
          <v-list>
            <v-list-item
              v-for="info in organizationInfo"
              @click="() => onEditTextContent(info)"
            >
              {{
                langOrganizationInfo[info.title as OrganizationInfoKeys] ??
                info.title
              }}
              <code class="opacity-50">{organization.{{ info.title }}}</code>
              <v-list-item-subtitle>{{ info.content }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-tabs-window-item>

      <v-tabs-window-item value="pdf">
        <v-card-text>
          <v-list>
            <v-list-item
              v-for="text in pdfTexts"
              @click="() => onEditTextContent(text)"
            >
              {{ langPdfTexts[text.title as PdfTextsKeys] ?? text.title }}
              <code class="opacity-50">{pdf.{{ text.title }}}</code>
              <v-list-item-subtitle>{{ text.content }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-tabs-window-item>

      <v-tabs-window-item value="email">
        <v-card-text>
          <v-list>
            <v-list-item
              v-for="text in emailTexts"
              @click="() => onEditTextContent(text)"
            >
              {{
                langEmailTextLabels[text.title as EmailTextsKeys] ?? text.title
              }}
              <v-list-item-subtitle>{{ text.content }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-tabs-window-item>

      <v-tabs-window-item value="general">
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
        </v-card-text>
      </v-tabs-window-item>
    </v-tabs-window>
  </v-card>
  <TextContentDialog :open="open" @close="onClose" />
</template>

<style>
span.keyword {
  font-family: monospace;
}
</style>
