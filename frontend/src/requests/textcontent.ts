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
import { TextContentCategory } from "@lebenswurzel/solawi-bedarf-shared/src/enum.ts";
import { TextContent } from "@lebenswurzel/solawi-bedarf-shared/src/types.ts";
import { getUrl, verifyResponse } from "./requests.ts";

export const getTextContent = async (): Promise<{
  textContent: TextContent[];
}> => {
  const response = await fetch(getUrl("/content/text"));

  await verifyResponse(response);

  return await response.json();
};

export const saveTextContent = async (textContent: {
  id?: number;
  title: string;
  content: string;
  category: TextContentCategory;
}) => {
  const response = await fetch(getUrl("/content/text"), {
    method: "POST",
    body: JSON.stringify(textContent),
    headers: {
      "Content-Type": "application/json",
    },
  });

  await verifyResponse(response);
};

export const deleteTextContent = async (id: number) => {
  const response = await fetch(getUrl(`/content/text?id=${id}`), {
    method: "DELETE",
  });

  await verifyResponse(response);
};
