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

export const smokeBaseUrl =
  process.env.SMOKE_BASE_URL ?? "http://0.0.0.0:8184/api";

const defaultHeaders: Record<string, string> = {
  Accept: "*/*",
  "Accept-Language": "en-US,en",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  Referer: "http://0.0.0.0:8184/",
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
};

let authCookie: string | undefined;

function parseTokenCookie(response: Response): string {
  const setCookies =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie")].filter(
          (c): c is string => c != null,
        );

  for (const header of setCookies) {
    const match = header.match(/(?:^|,\s*)token=([^;]+)/);
    if (match) {
      return `token=${match[1]}`;
    }
  }

  throw new Error(
    `Login did not return token cookie (Set-Cookie: ${setCookies.join("; ") || "(none)"})`,
  );
}

export async function loginAsAdmin(): Promise<void> {
  const response = await fetch(`${smokeBaseUrl}/user/token`, {
    method: "GET",
    headers: {
      ...defaultHeaders,
      Authorization: "Basic YWRtaW46YWRtaW4=",
    },
  });

  if (response.status < 200 || response.status >= 300) {
    const body = await response.text();
    throw new Error(
      `Login failed: GET /user/token — HTTP ${response.status}\n${body}`,
    );
  }

  authCookie = parseTokenCookie(response);
}

export async function apiFetch<T = unknown>(
  method: string,
  path: string,
  options?: { body?: unknown },
): Promise<T> {
  if (!authCookie) {
    throw new Error("Not logged in — call loginAsAdmin() first");
  }

  const headers: Record<string, string> = {
    ...defaultHeaders,
    Cookie: authCookie,
  };

  let body: string | undefined;
  if (options?.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  const response = await fetch(`${smokeBaseUrl}${path}`, {
    method,
    headers,
    body,
  });

  const text = await response.text();
  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `${method} ${path} — HTTP ${response.status}\n${text || "(empty body)"}`,
    );
  }

  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}
