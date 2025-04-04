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
import { defineConfig } from "vitest/config";
import swc from "unplugin-swc";

export default defineConfig({
  test: {
    setupFiles: ["./testSetup.ts"],
    include: [
      "src/**/*.test.ts",
      "../shared/**/*.test.ts", // Include shared test files
    ],
    coverage: {
      reporter: ["text", "json-summary", "json", "html"],
      reportOnFailure: true,
      include: [
        "**/config",
        "**/bi",
        "**/order",
        "**/product",
        "**/text",
        "**/user",
        "../shared/src/validation/**", // Specifically include validation directory
      ],
    },
    fileParallelism: false, // tests cannot run in parallel because they use the same DB
  },

  // the following is necessary for typorm decorators to work with vitest
  // https://github.com/vitest-dev/vitest/discussions/3320#discussioncomment-5841661
  plugins: [swc.vite()],
});
