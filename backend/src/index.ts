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
import { saveOrder } from "./services/order/saveOrder";
import { saveConfig } from "./services/config/saveConfig";
import { saveApplicant } from "./services/applicant/saveApplicant";
import { getApplicant } from "./services/applicant/getApplicant";
import { updateApplicant } from "./services/applicant/updateApplicant";
import { getDepot } from "./services/config/getDepot";
import { saveDepot } from "./services/config/saveDepot";
import { getOverview } from "./services/getOverview";
import { getTextContent } from "./services/text/getTextContent";
import { saveTextContent } from "./services/text/saveTextContent";
import { deleteTextContent } from "./services/text/deleteTextContent";
import { getShipment } from "./services/shipment/getShipment";
import { getShipments } from "./services/shipment/getShipments";
import { saveShipment } from "./services/shipment/saveShipment";
import { biHandler } from "./services/bi/bi";
import { deleteConfig } from "./services/config/deleteConfig";
import { updateDepot } from "./services/config/updateDepot";

const port = config.server.serverPort;
const app = new Koa();
const router = new Router();

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
router.post("/config", saveConfig);
router.delete("/config", deleteConfig);
router.get("/depot", getDepot);
router.post("/depot", saveDepot);
router.post("/depot/update", updateDepot);

router.get("/user", getUser);
router.get("/user/token", login);
router.delete("/user/token", logout);
router.get("/user/data", getOrder);
router.post("/user", saveUser);

router.post("/applicant", saveApplicant);
router.get("/applicant", getApplicant);
router.post("/applicant/update", updateApplicant);

router.get("/shop/order", getOrder);
router.post("/shop/order", saveOrder);

router.get("/shipment", getShipment);
router.get("/shipments", getShipments);
router.post("/shipment", saveShipment);

router.get("/productCategory", getProductCategory);
router.post("/productCategory", saveProductCategory);
router.post("/productCategory/product", saveProduct);

router.get("/content/text", getTextContent);
router.post("/content/text", saveTextContent);
router.delete("/content/text", deleteTextContent);

router.get("/bi", biHandler);
router.get("/overview", getOverview);

app.use(bodyParser());
app.use(router.routes()).use(router.allowedMethods());

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
