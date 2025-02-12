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
import { computed, onUnmounted, ref } from "vue";
import type { UserWithOrders } from "../../../shared/src/types.ts";
import { getUser } from "../requests/user.ts";

export enum LoginState {
  ANONYMOUS,
  LOGGED_IN,
  SESSION_EXPIRED,
}

export const useUserStore = defineStore("userStore", () => {
  const userId = ref<number>();
  const users = ref<UserWithOrders[]>([]);
  const loginState = ref<LoginState>(LoginState.ANONYMOUS);
  const tokenValidUntil = ref<Date | null>();

  const clear = () => {
    userId.value = undefined;
    users.value = [];
    loginState.value = LoginState.ANONYMOUS;
  };

  const update = async () => {
    const {
      userId: requestUserId,
      users: requestUsers,
      tokenValidUntil: requestTokenValidUntil,
    } = await getUser();
    userId.value = requestUserId;
    users.value = requestUsers;
    tokenValidUntil.value = requestTokenValidUntil;
    updateLoginState(LoginState.LOGGED_IN);
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

  const isSessionExpired = computed(() => {
    return loginState.value == LoginState.SESSION_EXPIRED;
  });

  const isLoggedIn = computed(() => {
    return loginState.value == LoginState.LOGGED_IN;
  });

  const updateLoginState = (newState: LoginState) => {
    loginState.value = newState;
  };

  // A reactive "now" variable that updates every second
  const now = ref(new Date());
  const timer = setInterval(() => {
    now.value = new Date();
  }, 1000);

  // Clear the interval if the store is ever unmounted (optional in many apps)
  onUnmounted(() => {
    clearInterval(timer);
  });

  // Computed property for the remaining time in seconds.
  const remainingTokenTimeSeconds = computed(() => {
    if (!tokenValidUntil.value) return 0;

    // Calculate the difference in seconds.
    const diffInSeconds = Math.floor(
      (tokenValidUntil.value.getTime() - now.value.getTime()) / 1000,
    );
    const result = diffInSeconds > 0 ? diffInSeconds : 0;
    if (result === 0 && isLoggedIn.value) {
      updateLoginState(LoginState.SESSION_EXPIRED);
    }
    return result;
  });

  // Computed property for a human-readable remaining time.
  const remainingTimeHumanized = computed(() => {
    const seconds = remainingTokenTimeSeconds.value;

    if (seconds <= 0) return "Sitzung abgelaufen";
    if (seconds < 60) return `Sitzung läuft in ${seconds} Sekunden ab`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 5)
      return `Sitzung läuft in ${minutes} Min. ${seconds % 60} Sek. ab`;

    if (minutes < 60) return `Sitzung läuft in ${minutes} Minuten ab`;

    const hours = Math.floor(minutes / 60);
    const remainderMinutes = minutes % 60;
    return `Sitzung läuft in ${hours} Std. ${remainderMinutes} Min. ab`;
  });

  return {
    userId,
    users,
    currentUser,
    userOptions,
    isSessionExpired,
    isLoggedIn,
    loginState,
    tokenValidUntil,
    remainingTokenTimeSeconds,
    remainingTimeHumanized,
    update,
    init,
    clear,
  };
});
