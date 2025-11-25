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
import { computed, ref, Ref, watch } from "vue";

interface UiFeedbackStore {
  error: Ref<string | null>;
  setError: (message: string, e?: Error) => void;
  clearError: () => void;

  success: Ref<string | null>;
  setSuccess: (message: string) => void;
  clearSuccess: () => void;

  busy: Ref<boolean>;
  startBusy: () => () => void;
  withBusy: <T>(fn: () => T | Promise<T>) => Promise<T>;
}

export const useUiFeedback = defineStore(
  "uiFeedbackStore",
  (): UiFeedbackStore => {
    const error = ref<string | null>("");

    const setError = (message: string, e?: Error) => {
      if (e) {
        error.value = message + "\n" + e.message;
      } else {
        error.value = message;
      }
    };

    const clearError = () => {
      error.value = null;
    };

    const success = ref<string | null>("");

    const setSuccess = (message: string) => {
      clearSuccess();
      success.value = message;
    };

    const clearSuccess = () => {
      success.value = null;
    };

    // Track busy state per caller ID
    const busyCallers = ref<Set<string>>(new Set());
    let busyCallerCounter = 0;

    // Internal state: true if any caller is busy
    const hasBusyCallers = computed(() => busyCallers.value.size > 0);

    // Display state: only true if busy has been true for at least 1 second
    const busyDisplayState = ref<boolean>(false);
    let busyTimeoutId: ReturnType<typeof setTimeout> | null = null;

    // Watch for changes in busy state and implement 1-second delay
    watch(
      hasBusyCallers,
      (isBusy) => {
        // Clear any pending timeouts
        if (busyTimeoutId !== null) {
          clearTimeout(busyTimeoutId);
          busyTimeoutId = null;
        }

        if (isBusy) {
          // If becoming busy, wait 1 second before showing
          busyTimeoutId = setTimeout(() => {
            busyDisplayState.value = true;
            busyTimeoutId = null;
          }, 500);
        } else {
          // If no longer busy, hide immediately
          busyDisplayState.value = false;
        }
      },
      { immediate: true },
    );

    const startBusy = () => {
      const callerId = `busy-${++busyCallerCounter}`;
      busyCallers.value.add(callerId);
      return () => {
        busyCallers.value.delete(callerId);
      };
    };

    const withBusy = async <T>(fn: () => T | Promise<T>): Promise<T> => {
      const stopBusy = startBusy();
      try {
        return await fn();
      } finally {
        stopBusy();
      }
    };

    const busy = computed(() => {
      return busyDisplayState.value;
    });

    return {
      error,
      setError,
      clearError,
      success,
      setSuccess,
      clearSuccess,
      busy,
      startBusy,
      withBusy,
    };
  },
);
