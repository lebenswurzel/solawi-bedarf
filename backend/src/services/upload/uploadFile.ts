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
import Koa from "koa";
import Router from "koa-router";
import { getUserFromContext } from "../getUserFromContext";
import { UserRole } from "../../../../shared/src/enum";
import { http } from "../../consts/http";
import { getStringQueryParameter } from "../../util/requestUtil";

// Helper function to read stream into buffer
const streamToBuffer = async (
  stream: NodeJS.ReadableStream,
): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

const extractDomainAndShare = (
  url: string,
): { baseUrl: string; share: string } => {
  const regex = /^(https?:\/\/[^\/]+)\/s\/([a-zA-Z0-9]+)$/;
  const match = url.match(regex);

  if (match) {
    const [_, baseUrl, share] = match;
    return { baseUrl, share };
  }
  return { baseUrl: "", share: "" };
};

export const uploadFile = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  const { role } = await getUserFromContext(ctx);
  if (role != UserRole.ADMIN) {
    ctx.throw(http.forbidden);
  }
  try {
    const filename = getStringQueryParameter(ctx.request.query, "filename");

    // TODO get from config
    const nextcloudUrl = "https://cloud.example.com/s/ShareToken123";

    const { baseUrl, share } = extractDomainAndShare(nextcloudUrl);

    const bodyBuffer = await streamToBuffer(ctx.req);

    const response = await fetch(`${baseUrl}/public.php/webdav/${filename}`, {
      method: "PUT",
      headers: {
        Authorization: "Basic " + Buffer.from(share + ":").toString("base64"),
        "X-Requested-With": "XMLHttpRequest",
        "Content-Type": "application/zip",
      },
      body: bodyBuffer,
    });

    if (!response.ok) {
      throw new Error(
        `Nextcloud responded with ${response.status}: ${response.statusText}`,
      );
    } else {
      console.log(`Nextcloud upload ok: ${filename}`);
    }

    ctx.status = http.ok;
  } catch (error) {
    console.error("Upload error:", error);
    ctx.throw(http.service_unavailable, (error as Error).toString());
  }
};
