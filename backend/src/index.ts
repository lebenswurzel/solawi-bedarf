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
import rateLimit from "koa-ratelimit";
import bodyParser from "koa-bodyparser";

import { config } from "./config.js";
import { AppDataSource } from "./database/database.js";
import { saveUser } from "./services/user/saveUser.js";
import { getUser } from "./services/user/getUser.js";
import { login, logout } from "./services/user/login.js";
import { getProductCategory } from "./services/product/getProductCategory.js";
import { saveProductCategory } from "./services/product/saveProductCategory.js";
import { saveProduct } from "./services/product/saveProduct.js";
import { initDb } from "./services/initDb.js";
import { getConfig } from "./services/config/getConfig.js";
import { getOrder } from "./services/order/getOrder.js";
import { getAllOrders } from "./services/order/getAllOrders.js";
import { saveOrder } from "./services/order/saveOrder.js";
import {
  deleteUnconfirmedOrder,
  modifyOrder,
} from "./services/order/modifyOrder.js";
import { saveConfig } from "./services/config/saveConfig.js";
import { saveApplicant } from "./services/applicant/saveApplicant.js";
import { getApplicant } from "./services/applicant/getApplicant.js";
import { convertApplicantToUser } from "./services/applicant/convertApplicantToUser.js";
import { activateApplicant } from "./services/applicant/activateApplicant.js";
import { deactivateApplicant } from "./services/applicant/deactivateApplicant.js";
import { deleteApplicant } from "./services/applicant/deleteApplicant.js";
import { getDepot } from "./services/config/getDepot.js";
import { saveDepot } from "./services/config/saveDepot.js";
import { getOverview } from "./services/getOverview.js";
import { getTextContent } from "./services/text/getTextContent.js";
import { saveTextContent } from "./services/text/saveTextContent.js";
import { deleteTextContent } from "./services/text/deleteTextContent.js";
import { getShipments } from "./services/shipment/getShipments.js";
import { saveShipment } from "./services/shipment/saveShipment.js";
import { biHandler } from "./services/bi/bi.js";
import { deleteConfig } from "./services/config/deleteConfig.js";
import { updateDepot } from "./services/config/updateDepot.js";
import { createConfig } from "./services/config/createConfig.js";
import { deleteProductCategory } from "./services/product/deleteProductCategory.js";
import { deleteProduct } from "./services/product/deleteProduct.js";
import { getVersion } from "./services/getVersion.js";
import { updateUser } from "./services/user/updateUser.js";
import { importApplicant } from "./services/applicant/importApplicant.js";
import { errorLogger } from "./middleware/errorLogger.js";
import { durationLogger } from "./middleware/durationLogger.js";
import { getErrorLog } from "./services/getErrorLog.js";
import { getUserShipments } from "./services/shipment/getUserShipments.js";
import { deleteShipment } from "./services/shipment/deleteShipment.js";
import { availabilityWeightsHandler } from "./services/bi/availabilityWeights.js";
import { Server } from "http";
import { IAppContext } from "./controllers/ctx.js";
import { useDependencies } from "./middleware/dependencies.js";
import {
  passwordReset,
  passwordResetRequest,
} from "./controllers/user/passwordReset.js";
import { sleep } from "@lebenswurzel/solawi-bedarf-shared/src/util/awaitHelper.js";

export async function startServer(): Promise<Server> {
  const port = config.server.serverPort;
  const app = new Koa<Koa.DefaultState, IAppContext>();
  const router = new Router<Koa.DefaultState, IAppContext>();

  useDependencies(app);

  // Add duration logger middleware (before error logger to measure full request duration)
  if (config.debug.logDuration) {
    console.log("Duration logging enabled");
    app.use(durationLogger);
  } else {
    console.log(
      `Duration logging disabled (DEBUG_LOG_DURATION=${process.env.DEBUG_LOG_DURATION})`,
    );
  }

  // Add error logger middleware
  app.use(errorLogger);

  const connectToDatabase = async (tries: number = 10) => {
    while (true) {
      let connected = false;
      try {
        await AppDataSource.initialize();
        console.log("db is up.");
        await initDb();
        connected = true;
      } catch (error) {
        tries--;
        console.log(error);
        console.log(`Retrying after 2 s (${tries} more to go) ...`);
        await sleep(2000); // Sleep for 2000 milliseconds (2 seconds)
      }
      if (tries <= 0) {
        console.error(`Unable to connect to the database!`);
        break;
      }
      if (connected) {
        break;
      }
    }
  };

  const passwordResetLimiter = rateLimit({
    driver: "memory",
    db: new Map(),
    duration: 10 * 60 * 1000, // 10 minutes
    errorMessage: "Too many password reset attempts. Please try again later.",
    headers: {
      remaining: "Rate-Limit-Remaining",
      reset: "Rate-Limit-Reset",
      total: "Rate-Limit-Total",
    },
    max: 10,
  });

  connectToDatabase().then(() => {});

  router.get("/config", getConfig);
  router.post("/config", createConfig);
  router.put("/config", saveConfig);
  router.delete("/config", deleteConfig);
  router.get("/depot", getDepot);
  router.post("/depot", saveDepot);
  router.post("/depot/update", updateDepot);

  router.get("/user", getUser);
  router.get("/user/token", login);
  router.post(
    "/user/requestPasswordReset",
    passwordResetLimiter,
    passwordResetRequest,
  );
  router.post("/user/passwordReset", passwordReset);
  router.post("/user/password", login);
  router.delete("/user/token", logout);
  router.get("/user/data", getOrder);
  router.post("/user", saveUser);
  router.put("/user", updateUser);

  router.post("/applicant", saveApplicant);
  router.get("/applicant", getApplicant);
  router.post("/applicant/:id/convert-to-user", convertApplicantToUser);
  router.post("/applicant/:id/activate", activateApplicant);
  router.post("/applicant/:id/deactivate", deactivateApplicant);
  router.delete("/applicant", deleteApplicant);
  router.put("/applicant/import", importApplicant);

  router.get("/shop/order", getOrder);
  router.get("/shop/orders", getAllOrders);
  router.post("/shop/order", saveOrder);
  router.post("/shop/order/modify", modifyOrder);
  router.delete("/shop/order", deleteUnconfirmedOrder);

  router.get("/shipment", getUserShipments);
  router.get("/shipments", getShipments);
  router.post("/shipment", saveShipment);
  router.delete("/shipment", deleteShipment);

  router.get("/productCategory", getProductCategory);
  router.post("/productCategory", saveProductCategory);
  router.delete("/productCategory", deleteProductCategory);
  router.post("/productCategory/product", saveProduct);
  router.delete("/productCategory/product", deleteProduct);

  router.get("/content/text", getTextContent);
  router.post("/content/text", saveTextContent);
  router.delete("/content/text", deleteTextContent);

  router.get("/bi", biHandler);
  router.get("/bi/availabilityWeights", availabilityWeightsHandler);
  router.get("/overview", getOverview);

  router.get("/version", getVersion);

  router.get("/error-log", getErrorLog);

  app.use(bodyParser());
  app.use(router.routes()).use(router.allowedMethods());

  return app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

export const server = (async (): Promise<Server> => {
  return await startServer();
})();
