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

import { BuildInfo } from "./types";

/**
 * NOTE: This dummy file will be overwritten with the actual git information when running
 * the build script in dev/build/build-and-deploy.bash
 */

export const buildInfo: BuildInfo = {
  buildDate: "Do 1. Jan 01:00:00 CET 1970",
  git: {
    hash: "dev",
    hashShort: "dev",
    branch: "local",
    tag: "",
    commitDate: "Do 1. Jan 01:00:00 CET 1970",
  },
  maintenance: {
    enabled: false,
    message: "",
  },
};
