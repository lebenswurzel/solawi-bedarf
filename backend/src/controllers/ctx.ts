import { DependenciesContext } from "../middleware/dependencies";
import Router from "koa-router";
import Koa from "koa";

export type IAppContext = Router.IRouterParamContext<any, {}> &
  DependenciesContext;

export type KoaAppContext = Koa.ParameterizedContext<any, IAppContext, any>;
