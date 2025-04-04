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
import { useUiFeedback } from "../store/uiFeedbackStore";

export const safeCopyToClipboard = async (text: string): Promise<void> => {
  const { setError, setSuccess } = useUiFeedback();
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      setSuccess("Text wurde in die Zwischenablage kopiert");
    } else {
      throw new Error("Clipboard API not supported");
    }
  } catch (e) {
    setError(
      "Text konnte nicht in die Zwischenablage kopiert werden",
      e as Error,
    );
  }
};
