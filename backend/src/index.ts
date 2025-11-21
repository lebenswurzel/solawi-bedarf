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
import bodyParser from "koa-bodyparser";

import { config } from "./config";
import { AppDataSource } from "./database/database";
import { saveUser } from "./services/user/saveUser";
import { getUser } from "./services/user/getUser";
import { login, logout } from "./services/user/login";
import { getProductCategory } from "./services/product/getProductCategory";
import { saveProductCategory } from "./services/product/saveProductCategory";
import { saveProduct } from "./services/product/saveProduct";
import { initDb } from "./services/initDb";
import { getConfig } from "./services/config/getConfig";
import { getOrder } from "./services/order/getOrder";
import { getAllOrders } from "./services/order/getAllOrders";
import { saveOrder } from "./services/order/saveOrder";
import { modifyOrder } from "./services/order/modifyOrder";
import { saveConfig } from "./services/config/saveConfig";
import { saveApplicant } from "./services/applicant/saveApplicant";
import { getApplicant } from "./services/applicant/getApplicant";
import { convertApplicantToUser } from "./services/applicant/convertApplicantToUser";
import { activateApplicant } from "./services/applicant/activateApplicant";
import { deactivateApplicant } from "./services/applicant/deactivateApplicant";
import { deleteApplicant } from "./services/applicant/deleteApplicant";
import { getDepot } from "./services/config/getDepot";
import { saveDepot } from "./services/config/saveDepot";
import { getOverview } from "./services/getOverview";
import { getTextContent } from "./services/text/getTextContent";
import { saveTextContent } from "./services/text/saveTextContent";
import { deleteTextContent } from "./services/text/deleteTextContent";
import { getShipments } from "./services/shipment/getShipments";
import { saveShipment } from "./services/shipment/saveShipment";
import { biHandler } from "./services/bi/bi";
import { deleteConfig } from "./services/config/deleteConfig";
import { updateDepot } from "./services/config/updateDepot";
import { createConfig } from "./services/config/createConfig";
import { deleteProductCategory } from "./services/product/deleteProductCategory";
import { deleteProduct } from "./services/product/deleteProduct";
import { getVersion } from "./services/getVersion";
import { updateUser } from "./services/user/updateUser";
import { importApplicant } from "./services/applicant/importApplicant";
import { errorLogger } from "./middleware/errorLogger";
import { durationLogger } from "./middleware/durationLogger";
import { getErrorLog } from "./services/getErrorLog";
import { getUserShipments } from "./services/shipment/getUserShipments";
import { deleteShipment } from "./services/shipment/deleteShipment";
import { availabilityWeightsHandler } from "./services/bi/availabilityWeights";

const port = config.server.serverPort;
const app = new Koa();
const router = new Router();

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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
