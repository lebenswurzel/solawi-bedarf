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
import { ref, provide, inject, Ref } from "vue";

interface ErrorStore {
  error: Ref<string | null>;
  setError: (message: string) => void;
  clearError: () => void;
}

export function useErrorStore(): ErrorStore {
  const error = ref<string | null>("");

  const setError = (message: string) => {
    error.value = message;
  };

  const clearError = () => {
    error.value = null;
  };

  return {
    error,
    setError,
    clearError,
  };
}

export function provideErrorStore(): void {
  const errorStore = useErrorStore();
  provide("errorStore", errorStore);
}

export function useError(): ErrorStore {
  const errorStore = inject<ErrorStore>("errorStore");
  if (!errorStore) {
    throw new Error("useError() must be used within a <provider>");
  }
  return errorStore;
}
