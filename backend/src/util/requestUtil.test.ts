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
import { describe, it, expect, beforeEach, vi } from "vitest";
import { ParsedUrlQuery } from "querystring";
import Koa from "koa";
import Router from "koa-router";
import { http } from "../consts/http";
import { ShipmentType } from "../../../shared/src/enum";
import {
  getNumericQueryParameter,
  getNumericArrayQueryParameter,
  getConfigIdFromQuery,
  getConfigIdsFromQuery,
  getStringQueryParameter,
  getBooleanQueryParameter,
  getEnumQueryParameter,
} from "./requestUtil";

describe("requestUtil", () => {
  describe("getNumericQueryParameter", () => {
    it("should return the numeric value when valid", () => {
      const query: ParsedUrlQuery = { id: "123" };
      expect(getNumericQueryParameter(query, "id")).toBe(123);
    });

    it("should return fallback when parameter is missing", () => {
      const query: ParsedUrlQuery = {};
      expect(getNumericQueryParameter(query, "id", 0)).toBe(0);
    });

    it("should return fallback when parameter is not a number", () => {
      const query: ParsedUrlQuery = { id: "abc" };
      expect(getNumericQueryParameter(query, "id", 0)).toBe(0);
    });

    it("should return fallback when parameter is an array", () => {
      const query: ParsedUrlQuery = { id: ["123", "456"] };
      expect(getNumericQueryParameter(query, "id", 0)).toBe(0);
    });

    it("should handle decimal numbers by truncating", () => {
      const query: ParsedUrlQuery = { id: "3.14" };
      expect(getNumericQueryParameter(query, "id")).toBe(3);
    });
  });

  describe("getNumericArrayQueryParameter", () => {
    it("should return array of numbers when valid", () => {
      const query: ParsedUrlQuery = { ids: ["123", "456"] };
      expect(getNumericArrayQueryParameter(query, "ids")).toEqual([123, 456]);
    });

    it("should return single number array when single value", () => {
      const query: ParsedUrlQuery = { ids: "123" };
      expect(getNumericArrayQueryParameter(query, "ids")).toEqual([123]);
    });

    it("should return empty array when parameter is missing", () => {
      const query: ParsedUrlQuery = {};
      expect(getNumericArrayQueryParameter(query, "ids")).toEqual([]);
    });

    it("should use fallback for invalid numbers", () => {
      const query: ParsedUrlQuery = { ids: ["123", "abc"] };
      expect(getNumericArrayQueryParameter(query, "ids", 0)).toEqual([123, 0]);
    });
  });

  describe("getConfigIdFromQuery", () => {
    let ctx: Koa.ParameterizedContext<
      any,
      Router.IRouterParamContext<any, {}>,
      any
    >;

    beforeEach(() => {
      ctx = {
        request: {
          query: {},
        },
        throw: vi.fn(),
        params: {},
        router: {} as Router,
        _matchedRoute: "",
        _matchedRouteName: "",
      } as any;
    });

    it("should return valid config id", () => {
      ctx.request.query = { configId: "123" };
      expect(getConfigIdFromQuery(ctx)).toBe(123);
    });

    it("should throw error when config id is missing", () => {
      ctx.request.query = {};
      getConfigIdFromQuery(ctx);
      expect(ctx.throw).toHaveBeenCalledWith(
        http.bad_request,
        "missing or bad config id=-1 in query",
      );
    });

    it("should throw error when config id is invalid", () => {
      ctx.request.query = { configId: "abc" };
      getConfigIdFromQuery(ctx);
      expect(ctx.throw).toHaveBeenCalledWith(
        http.bad_request,
        "missing or bad config id=-1 in query",
      );
    });
  });

  describe("getConfigIdsFromQuery", () => {
    let ctx: Koa.ParameterizedContext<
      any,
      Router.IRouterParamContext<any, {}>,
      any
    >;

    beforeEach(() => {
      ctx = {
        request: {
          query: {},
        },
        throw: vi.fn(),
        params: {},
        router: {} as Router,
        _matchedRoute: "",
        _matchedRouteName: "",
      } as any;
    });

    it("should return array of valid config ids", () => {
      ctx.request.query = { configId: ["123", "456"] };
      expect(getConfigIdsFromQuery(ctx)).toEqual([123, 456]);
    });

    it("should throw error when config ids are missing", () => {
      ctx.request.query = {};
      getConfigIdsFromQuery(ctx);
      expect(ctx.throw).toHaveBeenCalledWith(
        http.bad_request,
        "missing config id in query",
      );
    });

    it("should throw error when any config id is invalid", () => {
      ctx.request.query = { configId: ["123", "abc"] };
      getConfigIdsFromQuery(ctx);
      expect(ctx.throw).toHaveBeenCalledWith(
        http.bad_request,
        "bad config id in query 123,-1",
      );
    });
  });

  describe("getStringQueryParameter", () => {
    it("should return string value when valid", () => {
      const query: ParsedUrlQuery = { name: "test" };
      expect(getStringQueryParameter(query, "name")).toBe("test");
    });

    it("should return fallback when parameter is missing", () => {
      const query: ParsedUrlQuery = {};
      expect(getStringQueryParameter(query, "name", "default")).toBe("default");
    });

    it("should return fallback when parameter is an array", () => {
      const query: ParsedUrlQuery = { name: ["test1", "test2"] };
      expect(getStringQueryParameter(query, "name", "default")).toBe("default");
    });
  });

  describe("getBooleanQueryParameter", () => {
    let ctx: Koa.ParameterizedContext<
      any,
      Router.IRouterParamContext<any, {}>,
      any
    >;

    beforeEach(() => {
      ctx = {
        query: {},
        params: {},
        router: {} as Router,
        _matchedRoute: "",
        _matchedRouteName: "",
      } as any;
    });

    it("should return true when value is 'true'", () => {
      ctx.query = { flag: "true" };
      expect(getBooleanQueryParameter(ctx.query, "flag")).toBe(true);
    });

    it("should return false when value is not 'true'", () => {
      ctx.query = { flag: "false" };
      expect(getBooleanQueryParameter(ctx.query, "flag")).toBe(false);
    });

    it("should return fallback when parameter is missing", () => {
      ctx.query = {};
      expect(getBooleanQueryParameter(ctx.query, "flag", true)).toBe(true);
    });

    it("should return fallback when parameter is an array", () => {
      ctx.query = { flag: ["true", "false"] };
      expect(getBooleanQueryParameter(ctx.query, "flag", true)).toBe(true);
    });
  });

  describe("getEnumQueryParameter", () => {
    it("should return valid enum value when present", () => {
      const query: ParsedUrlQuery = { type: "NORMAL" };
      expect(getEnumQueryParameter(query, "type", ShipmentType)).toBe(
        ShipmentType.NORMAL,
      );
    });

    it("should return fallback when parameter is missing", () => {
      const query: ParsedUrlQuery = {};
      expect(
        getEnumQueryParameter(query, "type", ShipmentType, ShipmentType.DRAFT),
      ).toBe(ShipmentType.DRAFT);
    });

    it("should return first enum value as default when no fallback provided and parameter is missing", () => {
      const query: ParsedUrlQuery = {};
      expect(getEnumQueryParameter(query, "type", ShipmentType)).toBe(
        ShipmentType.NORMAL,
      );
    });

    it("should throw error when parameter is an array", () => {
      const query: ParsedUrlQuery = { type: ["NORMAL", "DRAFT"] };
      expect(getEnumQueryParameter(query, "type", ShipmentType)).toBe(
        ShipmentType.NORMAL,
      );
    });

    it("should throw error when parameter is not a valid enum value", () => {
      const query: ParsedUrlQuery = { type: "INVALID" };
      expect(() => getEnumQueryParameter(query, "type", ShipmentType)).toThrow(
        "Invalid value 'INVALID' for parameter 'type'. Valid values are: NORMAL, DRAFT, FORECAST",
      );
    });
  });
});
