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
import { computed, inject, Ref, ref } from "vue";
import { language } from "../../../shared/src/lang/lang.ts";
import { deleteTextContent, saveTextContent } from "../requests/textcontent";
import {
  NewTextContent,
  OptionalId,
  TextContent,
  isIdType,
} from "../../../shared/src/types";
import { marked } from "marked";
import { TextContentCategory } from "../../../shared/src/enum";

defineProps(["open"]);
const emit = defineEmits(["close"]);

const loading = ref(false);
const error = ref<string>();

const dialogTextContent = inject<Ref<NewTextContent | TextContent>>(
  "dialogTextContent",
) as Ref<NewTextContent | TextContent>;

const html = computed(() => {
  const parsed = marked.parse(dialogTextContent!.value.content);
  /*
  const sanitized = DOMPurify.sanitize(parsed as string, {
    USE_PROFILES: { html: true },
  });
  */
  return parsed;
});

const titleDisabled = computed(() => {
  return (
    dialogTextContent.value.category ==
      TextContentCategory.MAINTENANCE_MESSAGE ||
    dialogTextContent.value.category == TextContentCategory.IMPRINT ||
    dialogTextContent.value.category == TextContentCategory.PRIVACY_NOTICE
  );
});

const onClose = () => {
  emit("close");
};

const onSave = () => {
  loading.value = true;
  saveTextContent(
    dialogTextContent.value as Required<NewTextContent> & OptionalId,
  )
    .then(() => {
      loading.value = false;
      emit("close");
    })
    .catch((e: Error) => {
      error.value = e.message;
      loading.value = false;
    });
};

const onDelete = () => {
  loading.value = true;
  deleteTextContent((dialogTextContent as Ref<TextContent>).value.id)
    .then(() => {
      loading.value = false;
      emit("close");
    })
    .catch((e: Error) => {
      error.value = e.message;
      loading.value = false;
    });
};
</script>

<template>
  <v-dialog :model-value="open" @update:model-value="onClose">
    <v-card>
      <v-card-title>
        <span class="text-h5"> Text Editor </span>
      </v-card-title>
      <v-card-text>
        <v-text-field
          v-model="dialogTextContent!.title"
          label="Titel"
          :disabled="titleDisabled"
        ></v-text-field>
        <v-textarea v-model="dialogTextContent!.content"></v-textarea>
        <div class="html" v-html="html"></div>
      </v-card-text>
      <v-card-actions>
        <v-btn @click="onClose"> {{ language.app.actions.close }} </v-btn>
        <v-btn :loading="loading" @click="onSave">
          {{ language.app.actions.save }}
        </v-btn>
        <v-btn
          v-if="
            isIdType(dialogTextContent) &&
            dialogTextContent.category == TextContentCategory.FAQ
          "
          :loading="loading"
          @click="onDelete"
          >FAQ löschen</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
  <v-snackbar
    :model-value="!!error"
    color="red"
    @update:model-value="() => (error = undefined)"
  >
    {{ error }}
  </v-snackbar>
</template>

<style>
ul {
  list-style-position: inside;
}
ol {
  list-style-position: inside;
}
</style>
../../../shared/src/types.ts
