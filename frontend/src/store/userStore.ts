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
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type { User } from "../../../shared/src/types.ts";
import { getUser } from "../requests/user.ts";

export const useUserStore = defineStore("userStore", () => {
  const userId = ref<number>();
  const users = ref<User[]>([]);

  const clear = () => {
    userId.value = undefined;
    users.value = [];
  };

  const update = async () => {
    const { userId: requestUserId, users: requestUsers } = await getUser();
    userId.value = requestUserId;
    users.value = requestUsers;
  };

  const init = async () => {
    if (!userId.value) {
      await update();
    }
  };

  const currentUser = computed(() =>
    users.value.find((user) => user.id == userId.value),
  );

  const userOptions = computed(() =>
    users.value.map((user) => ({ title: user.name, value: user.id })),
  );

  return { userId, users, currentUser, userOptions, update, init, clear };
});
