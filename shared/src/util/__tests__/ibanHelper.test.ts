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
import { describe, it, expect } from "vitest";
import { validatePayment } from "../ibanHelper";
import { OrderPayment } from "../../types";
import { OrderPaymentType } from "../../enum";

describe("validatePayment", () => {
  const validGermanIBAN = "DE89370400440532013000";
  const requiredSepaAmount = 100;
  const requiredBankTransferAmount = 50;

  describe("SEPA payment validation", () => {
    it("should return valid for a complete SEPA payment with correct amount", () => {
      const payment: OrderPayment = {
        paymentType: OrderPaymentType.SEPA,
        paymentRequired: true,
        amount: requiredSepaAmount,
        bankDetails: {
          accountHolder: "Max Mustermann",
          iban: validGermanIBAN,
          bankName: "Test Bank",
        },
      };

      const result = validatePayment(
        payment,
        requiredSepaAmount,
        requiredBankTransferAmount
      );

      expect(result.valid).toBe(true);
      expect(result.errors.general).toHaveLength(0);
      expect(result.errors.accountHolder).toBeUndefined();
      expect(result.errors.iban).toBeUndefined();
      expect(result.errors.bankName).toBeUndefined();
    });

    it("should return error when accountHolder is missing", () => {
      const payment: OrderPayment = {
        paymentType: OrderPaymentType.SEPA,
        paymentRequired: true,
        amount: requiredSepaAmount,
        bankDetails: {
          accountHolder: "",
          iban: validGermanIBAN,
          bankName: "Test Bank",
        },
      };

      const result = validatePayment(
        payment,
        requiredSepaAmount,
        requiredBankTransferAmount
      );

      expect(result.valid).toBe(false);
      expect(result.errors.accountHolder).toBe("Bitte Kontoinhaber angeben");
    });

    it("should return error when IBAN is invalid", () => {
      const payment: OrderPayment = {
        paymentType: OrderPaymentType.SEPA,
        paymentRequired: true,
        amount: requiredSepaAmount,
        bankDetails: {
          accountHolder: "Max Mustermann",
          iban: "INVALID_IBAN",
          bankName: "Test Bank",
        },
      };

      const result = validatePayment(
        payment,
        requiredSepaAmount,
        requiredBankTransferAmount
      );

      expect(result.valid).toBe(false);
      expect(result.errors.iban).toBeDefined();
      expect(result.errors.iban).not.toBe("");
    });

    it("should return error when IBAN is empty", () => {
      const payment: OrderPayment = {
        paymentType: OrderPaymentType.SEPA,
        paymentRequired: true,
        amount: requiredSepaAmount,
        bankDetails: {
          accountHolder: "Max Mustermann",
          iban: "",
          bankName: "Test Bank",
        },
      };

      const result = validatePayment(
        payment,
        requiredSepaAmount,
        requiredBankTransferAmount
      );

      expect(result.valid).toBe(false);
      expect(result.errors.iban).toBe("Bitte IBAN angegeben");
    });

    it("should handle IBAN with spaces correctly", () => {
      const payment: OrderPayment = {
        paymentType: OrderPaymentType.SEPA,
        paymentRequired: true,
        amount: requiredSepaAmount,
        bankDetails: {
          accountHolder: "Max Mustermann",
          iban: "DE89 3704 0044 0532 0130 00",
          bankName: "Test Bank",
        },
      };

      const result = validatePayment(
        payment,
        requiredSepaAmount,
        requiredBankTransferAmount
      );

      expect(result.valid).toBe(true);
      expect(result.errors.iban).toBeUndefined();
    });

    it("should return error when bankName is missing", () => {
      const payment: OrderPayment = {
        paymentType: OrderPaymentType.SEPA,
        paymentRequired: true,
        amount: requiredSepaAmount,
        bankDetails: {
          accountHolder: "Max Mustermann",
          iban: validGermanIBAN,
          bankName: "",
        },
      };

      const result = validatePayment(
        payment,
        requiredSepaAmount,
        requiredBankTransferAmount
      );

      expect(result.valid).toBe(false);
      expect(result.errors.bankName).toBe("Bitte Kreditinstitut angeben");
    });

    it("should return error when SEPA amount does not match required amount", () => {
      const payment: OrderPayment = {
        paymentType: OrderPaymentType.SEPA,
        paymentRequired: true,
        amount: 50,
        bankDetails: {
          accountHolder: "Max Mustermann",
          iban: validGermanIBAN,
          bankName: "Test Bank",
        },
      };

      const result = validatePayment(
        payment,
        requiredSepaAmount,
        requiredBankTransferAmount
      );

      expect(result.valid).toBe(false);
      expect(result.errors.general).toContain(
        `Die SEPA-Zahlung muss der geforderten Höhe entsprechen (${requiredSepaAmount}€ statt 50€)`
      );
    });

    it("should return multiple errors for SEPA payment with multiple issues", () => {
      const payment: OrderPayment = {
        paymentType: OrderPaymentType.SEPA,
        paymentRequired: true,
        amount: 50,
        bankDetails: {
          accountHolder: "",
          iban: "",
          bankName: "",
        },
      };

      const result = validatePayment(
        payment,
        requiredSepaAmount,
        requiredBankTransferAmount
      );

      expect(result.valid).toBe(false);
      expect(result.errors.accountHolder).toBe("Bitte Kontoinhaber angeben");
      expect(result.errors.iban).toBeDefined();
      expect(result.errors.bankName).toBe("Bitte Kreditinstitut angeben");
      expect(result.errors.general.length).toBeGreaterThan(0);
    });
  });

  describe("BANK_TRANSFER payment validation", () => {
    it("should return valid for BANK_TRANSFER with correct amount", () => {
      const payment: OrderPayment = {
        paymentType: OrderPaymentType.BANK_TRANSFER,
        paymentRequired: true,
        amount: requiredBankTransferAmount,
        bankDetails: {
          accountHolder: "",
          iban: "",
          bankName: "",
        },
      };

      const result = validatePayment(
        payment,
        requiredSepaAmount,
        requiredBankTransferAmount
      );

      expect(result.valid).toBe(true);
      expect(result.errors.general).toHaveLength(0);
    });

    it("should return error when BANK_TRANSFER amount does not match required amount", () => {
      const payment: OrderPayment = {
        paymentType: OrderPaymentType.BANK_TRANSFER,
        paymentRequired: true,
        amount: 25,
        bankDetails: {
          accountHolder: "",
          iban: "",
          bankName: "",
        },
      };

      const result = validatePayment(
        payment,
        requiredSepaAmount,
        requiredBankTransferAmount
      );

      expect(result.valid).toBe(false);
      expect(result.errors.general).toContain(
        `Die Banküberweisung muss der geforderten Höhe entsprechen (${requiredBankTransferAmount}€ statt 25€)`
      );
    });
  });

  describe("UNCONFIRMED payment validation", () => {
    it("should return error when UNCONFIRMED and paymentRequired is true", () => {
      const payment: OrderPayment = {
        paymentType: OrderPaymentType.UNCONFIRMED,
        paymentRequired: true,
        amount: 0,
        bankDetails: {
          accountHolder: "",
          iban: "",
          bankName: "",
        },
      };

      const result = validatePayment(
        payment,
        requiredSepaAmount,
        requiredBankTransferAmount
      );

      expect(result.valid).toBe(false);
      expect(result.errors.general).toContain(
        "Keine Zahlungsmethode ausgewählt"
      );
    });

    it("should return valid when UNCONFIRMED and paymentRequired is false", () => {
      const payment: OrderPayment = {
        paymentType: OrderPaymentType.UNCONFIRMED,
        paymentRequired: false,
        amount: 0,
        bankDetails: {
          accountHolder: "",
          iban: "",
          bankName: "",
        },
      };

      const result = validatePayment(
        payment,
        requiredSepaAmount,
        requiredBankTransferAmount
      );

      expect(result.valid).toBe(true);
      expect(result.errors.general).toHaveLength(0);
    });
  });

  describe("edge cases", () => {
    it("should handle zero amounts correctly", () => {
      const payment: OrderPayment = {
        paymentType: OrderPaymentType.SEPA,
        paymentRequired: true,
        amount: 0,
        bankDetails: {
          accountHolder: "Max Mustermann",
          iban: validGermanIBAN,
          bankName: "Test Bank",
        },
      };

      const result = validatePayment(payment, 0, 0);

      expect(result.valid).toBe(true);
    });

    it("should handle negative amounts", () => {
      const payment: OrderPayment = {
        paymentType: OrderPaymentType.SEPA,
        paymentRequired: true,
        amount: -10,
        bankDetails: {
          accountHolder: "Max Mustermann",
          iban: validGermanIBAN,
          bankName: "Test Bank",
        },
      };

      const result = validatePayment(
        payment,
        requiredSepaAmount,
        requiredBankTransferAmount
      );

      expect(result.valid).toBe(false);
      expect(result.errors.general.length).toBeGreaterThan(0);
    });

    it("should not validate SEPA fields for BANK_TRANSFER", () => {
      const payment: OrderPayment = {
        paymentType: OrderPaymentType.BANK_TRANSFER,
        paymentRequired: true,
        amount: requiredBankTransferAmount,
        bankDetails: {
          accountHolder: "",
          iban: "INVALID",
          bankName: "",
        },
      };

      const result = validatePayment(
        payment,
        requiredSepaAmount,
        requiredBankTransferAmount
      );

      expect(result.valid).toBe(true);
      expect(result.errors.accountHolder).toBeUndefined();
      expect(result.errors.iban).toBeUndefined();
      expect(result.errors.bankName).toBeUndefined();
    });

    it("should not validate SEPA fields for UNCONFIRMED", () => {
      const payment: OrderPayment = {
        paymentType: OrderPaymentType.UNCONFIRMED,
        paymentRequired: false,
        amount: 0,
        bankDetails: {
          accountHolder: "",
          iban: "INVALID",
          bankName: "",
        },
      };

      const result = validatePayment(
        payment,
        requiredSepaAmount,
        requiredBankTransferAmount
      );

      expect(result.valid).toBe(true);
      expect(result.errors.accountHolder).toBeUndefined();
      expect(result.errors.iban).toBeUndefined();
      expect(result.errors.bankName).toBeUndefined();
    });
  });
});
