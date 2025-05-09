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
import { ParsedUrlQuery } from "querystring";
import Koa from "koa";
import Router from "koa-router";
import { http } from "../consts/http";

export const getNumericQueryParameter = (
  requestQuery: ParsedUrlQuery,
  name: string,
  fallback?: number,
): number => {
  fallback = fallback ?? -1;
  const requestValue = requestQuery[name];
  if (!requestValue || Array.isArray(requestValue)) {
    return fallback;
  }
  const numericValue = parseInt(requestValue);
  return isFinite(numericValue) ? numericValue : fallback;
};

export const getNumericArrayQueryParameter = (
  requestQuery: ParsedUrlQuery,
  name: string,
  fallback?: number,
): number[] => {
  const numericFallback: number = fallback ?? -1;
  const requestValue = requestQuery[name];
  if (!requestValue) {
    return [];
  }
  if (Array.isArray(requestValue)) {
    return requestValue.map((value) => {
      const numericValue = parseInt(value);
      return isFinite(numericValue) ? numericValue : numericFallback;
    });
  }
  const numericValue = parseInt(requestValue);
  return [isFinite(numericValue) ? numericValue : numericFallback];
};

export const getConfigIdFromQuery = (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
): number => {
  const configId = getNumericQueryParameter(ctx.request.query, "configId");
  if (configId < 1) {
    ctx.throw(
      http.bad_request,
      `missing or bad config id=${configId} in query`,
    );
  }
  return configId;
};

export const getConfigIdsFromQuery = (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
): number[] => {
  const configIds = getNumericArrayQueryParameter(
    ctx.request.query,
    "configId",
  );
  if (configIds.length < 1) {
    ctx.throw(http.bad_request, `missing config id in query`);
  }
  if (configIds.some((configId) => configId < 1)) {
    ctx.throw(http.bad_request, `bad config id in query ${configIds}`);
  }
  return configIds;
};

export const getStringQueryParameter = (
  requestQuery: ParsedUrlQuery,
  name: string,
  fallback?: string,
): string => {
  fallback = fallback ?? "";
  const requestValue = requestQuery[name];
  return requestValue && !Array.isArray(requestValue) ? requestValue : fallback;
};

export const getIncludeItemsFromQuery = (
  ctx: Koa.ParameterizedContext,
): boolean => {
  const includeItems = ctx.query.includeItems;
  return includeItems === "true";
};
