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
import { createRouter, createWebHashHistory } from "vue-router";
import ShopView from "./views/ShopView.vue";
import HomeView from "./views/HomeView.vue";
import LoginView from "./views/LoginView.vue";
import AdminUserView from "./views/AdminUserView.vue";
import AdminProductsView from "./views/AdminProductsView.vue";
import AdminConfigView from "./views/AdminConfigView.vue";
import RegisterView from "./views/RegisterView.vue";
import AdminApplicantView from "./views/AdminApplicantView.vue";
import AdminDepotView from "./views/AdminDepotView.vue";
import FAQView from "./views/FAQView.vue";
import AdminTextView from "./views/AdminTextView.vue";

const routes = [
  { path: "/register", component: RegisterView },
  { path: "/shop/:userId?", component: ShopView },
  { path: "/faq", component: FAQView },
  {
    path: "/employeeshipment",
    component: () => import("./views/EmployeeShipmentView.vue"),
  },
  { path: "/adminusers/:userName?", component: AdminUserView },
  { path: "/adminproducts", component: AdminProductsView },
  { path: "/adminregister/:tab?/:userName?", component: AdminApplicantView },
  { path: "/admindepot", component: AdminDepotView },
  { path: "/adminconfig", component: AdminConfigView },
  { path: "/admintext", component: AdminTextView },
  {
    path: "/adminoverview",
    component: () => import("./views/AdminOverview.vue"),
  },
  {
    path: "/statistics",
    component: () => import("./views/AdminStatisticsView.vue"),
  },
  { path: "/login", component: LoginView },
  { path: "/", component: HomeView },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});
