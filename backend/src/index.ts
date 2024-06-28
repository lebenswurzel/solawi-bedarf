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

const port = config.server.serverPort;
const app = new Koa();
const router = new Router();

AppDataSource.initialize()
  .then(async () => {
    console.log("db is up.");
    await initDb();
  })
  .catch((error) => console.log(error));

router.get("/config", getConfig);
router.post("/config", saveConfig);
router.get("/depot", getDepot);
router.post("/depot", saveDepot);

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
