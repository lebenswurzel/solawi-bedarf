/*
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
*/
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { TextContent } from "../../../shared/src/types.ts";
import { getTextContent } from "../requests/textcontent.ts";
import { marked } from "marked";
import { TextContentCategory } from "../../../shared/src/enum.ts";
import { faqAlphabeticalDown } from "../lib/compare.ts";

export const useTextContentStore = defineStore("textContent", () => {
  const textContent = ref<TextContent[]>([]);

  const update = async () => {
    textContent.value = (await getTextContent()).textContent.sort(
      faqAlphabeticalDown,
    );
  };

  const faqs = computed(() => {
    return textContent.value
      .filter((content) => content.category == TextContentCategory.FAQ)
      .map((content) => ({
        title: content.title,
        content: marked.parse(content.content),
      }));
  });

  const imprint = computed(() => {
    return textContent.value
      .filter((content) => content.category == TextContentCategory.IMPRINT)
      .map((content) => ({
        title: content.title,
        content: marked.parse(content.content),
      }))[0];
  });

  const privacyNotice = computed(() => {
    return textContent.value
      .filter(
        (content) => content.category == TextContentCategory.PRIVACY_NOTICE,
      )
      .map((content) => ({
        title: content.title,
        content: marked.parse(content.content),
      }))[0];
  });

  return {
    textContent,
    faqs,
    imprint,
    privacyNotice,
    update,
  };
});
