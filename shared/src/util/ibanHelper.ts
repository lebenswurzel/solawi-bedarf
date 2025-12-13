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
import { OrderPayment } from "../types";
import { OrderPaymentType } from "../enum";

import { validateIBAN, ValidationErrorsIBAN } from "ibantools";

const ibanErrorMessages = {
  [ValidationErrorsIBAN.NoIBANProvided]: "Bitte IBAN angegeben",
  [ValidationErrorsIBAN.NoIBANCountry]: "Ungültige Länderkennung in der IBAN",
  [ValidationErrorsIBAN.WrongBBANLength]:
    "Die Länge der IBAN passt nicht zum Land",
  [ValidationErrorsIBAN.WrongBBANFormat]: "Ungültiges Format der IBAN",
  [ValidationErrorsIBAN.ChecksumNotNumber]:
    "Die Prüfsumme der IBAN ist keine Zahl",
  [ValidationErrorsIBAN.WrongIBANChecksum]: "Die Prüfsumme der IBAN ist falsch",
  [ValidationErrorsIBAN.WrongAccountBankBranchChecksum]:
    "Die Prüfsumme der IBAN ist falsch",
  [ValidationErrorsIBAN.QRIBANNotAllowed]: "QR-IBAN ist nicht erlaubt",
};

const getFirstErrorMessage = (errorCodes: ValidationErrorsIBAN[]) => {
  const firstError = errorCodes[0];
  return ibanErrorMessages[firstError];
};

const getCleanIban = (iban: string) => {
  return iban.replace(/\s/g, "");
};

export const validatePayment = (
  payment: OrderPayment
): {
  valid: boolean;
  errors: {
    paymentType?: string;
    accountHolder?: string;
    iban?: string;
    bankName?: string;
  };
} => {
  const errors: {
    paymentType?: string;
    accountHolder?: string;
    iban?: string;
    bankName?: string;
  } = {};
  if (payment.paymentType === OrderPaymentType.SEPA) {
    if (!payment.bankDetails.accountHolder) {
      errors.accountHolder = "Bitte Kontoinhaber angeben";
    }
    const result = validateIBAN(getCleanIban(payment.bankDetails.iban));
    if (!result.valid) {
      errors.iban = getFirstErrorMessage(result.errorCodes);
    }
    if (!payment.bankDetails.bankName) {
      errors.bankName = "Bitte Kreditinstitut angeben";
    }
  } else if (
    payment.paymentType === OrderPaymentType.UNCONFIRMED &&
    payment.paymentRequired
  ) {
    errors.paymentType = "Keine Zahlungsmethode ausgewählt";
  }
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};
