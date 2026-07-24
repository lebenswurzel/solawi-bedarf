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
import { language } from "@lebenswurzel/solawi-bedarf-shared/src/lang/lang.ts";
import { deleteTextContent, saveTextContent } from "../../requests/textcontent";
import {
  NewTextContent,
  OptionalId,
  TextContent,
  isIdType,
} from "@lebenswurzel/solawi-bedarf-shared/src/types.ts";
import { marked } from "marked";
import {
  TextContentCategory,
  TextContentTyp,
} from "@lebenswurzel/solawi-bedarf-shared/src/enum.ts";
import { escapeHtmlEntities } from "@lebenswurzel/solawi-bedarf-shared/src/util/stringHelper.ts";
import { PDF_LOGO_MAX_BYTES } from "@lebenswurzel/solawi-bedarf-shared/src/config.ts";

defineProps(["open"]);
const emit = defineEmits(["close"]);

const loading = ref(false);
const error = ref<string>();
const imageFile = ref<File[]>([]);

const dialogTextContent = inject<Ref<NewTextContent | TextContent>>(
  "dialogTextContent",
) as Ref<NewTextContent | TextContent>;

const isMD = computed(() => {
  return dialogTextContent.value.typ == TextContentTyp.MD;
});

const isBase64Image = computed(() => {
  return dialogTextContent.value.typ == TextContentTyp.BASE64_IMAGE;
});

const html = computed(() => {
  if (dialogTextContent.value.typ == TextContentTyp.MD) {
    return marked.parse(dialogTextContent!.value.content);
  }
  return escapeHtmlEntities(dialogTextContent.value.content);
});

const titleDisabled = computed(() => {
  return dialogTextContent.value.category != TextContentCategory.FAQ;
});

const onClose = () => {
  imageFile.value = [];
  emit("close");
};

const onSave = () => {
  loading.value = true;
  saveTextContent(
    dialogTextContent.value as Required<NewTextContent> & OptionalId,
  )
    .then(() => {
      loading.value = false;
      imageFile.value = [];
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

const onClearImage = () => {
  dialogTextContent.value.content = "";
  imageFile.value = [];
};

const onImageSelected = (files: File | File[] | null) => {
  const file = Array.isArray(files) ? files[0] : files;
  if (!file) {
    return;
  }
  if (file.size > PDF_LOGO_MAX_BYTES) {
    error.value = `Bild ist zu groß (max. ${Math.round(PDF_LOGO_MAX_BYTES / 1024)} KB)`;
    imageFile.value = [];
    return;
  }
  const allowed = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
  if (!allowed.includes(file.type)) {
    error.value = "Nur PNG, JPEG oder SVG erlaubt";
    imageFile.value = [];
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    dialogTextContent.value.content = String(reader.result ?? "");
  };
  reader.onerror = () => {
    error.value = "Bild konnte nicht gelesen werden";
  };
  reader.readAsDataURL(file);
};
</script>

<template>
  <v-dialog :model-value="open" @update:model-value="onClose">
    <v-card>
      <v-container fluid class="pa-2">
        <v-row density="compact">
          <v-col cols="6">
            <v-card-title> Text Editor </v-card-title>
          </v-col>
          <v-col cols="6" v-if="!isBase64Image">
            Modus:
            <v-chip :color="isMD ? 'primary' : 'grey'">
              <v-icon v-if="isMD">mdi-check</v-icon> Markdown
            </v-chip>
            <v-chip :color="!isMD ? 'primary' : 'grey'">
              <v-icon v-if="!isMD">mdi-check</v-icon>
              Text
            </v-chip>
          </v-col>
        </v-row>
      </v-container>
      <v-card-text>
        <v-text-field
          v-model="dialogTextContent!.title"
          label="Titel"
          :disabled="titleDisabled"
        ></v-text-field>
        <template v-if="isBase64Image">
          <v-file-input
            v-model="imageFile"
            label="Bild hochladen"
            accept="image/png,image/jpeg,image/svg+xml"
            prepend-icon="mdi-image"
            show-size
            clearable
            @update:model-value="onImageSelected"
          ></v-file-input>
          <div v-if="dialogTextContent.content" class="mb-2">
            <div class="text-h6 mb-2">Vorschau:</div>
            <img
              :src="dialogTextContent.content"
              alt="PDF-Logo"
              class="pdf-logo-preview"
            />
            <div class="mt-2">
              <v-btn size="small" variant="outlined" @click="onClearImage">
                Bild entfernen
              </v-btn>
            </div>
          </div>
          <div v-else class="text-medium-emphasis">Kein Bild gesetzt</div>
        </template>
        <template v-else>
          <v-textarea v-model="dialogTextContent!.content"></v-textarea>
          <div class="text-h6">Vorschau:</div>
          <div class="text-body-medium preview" v-html="html"></div>
        </template>
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

.preview p {
  margin-bottom: 0.5rem;
  margin-top: 0.5rem;
}

.pdf-logo-preview {
  width: 100%;
  max-height: 200px;
  object-fit: contain;
  display: block;
}
</style>
