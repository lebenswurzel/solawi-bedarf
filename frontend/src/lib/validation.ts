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
export const firstnameRules = [
  (value: string) => {
    if (value) return true;

    return "Vorname ist erforderlich.";
  },
];
export const lastnameRules = [
  (value: string) => {
    if (value) return true;

    return "Nachname ist erforderlich.";
  },
];
export const emailRules = [
  (value: string) => {
    if (value) return true;

    return "E-Mail-Adresse ist erforderlich.";
  },
  (value: string) => {
    if (/.+@.+\..+/.test(value)) return true;

    return "Bitte eine gültige E-Mail-Adresse eingeben.";
  },
];
export const telephoneRules = [
  (value: string) => {
    if (value) return true;

    return "Telefonnummer ist erforderlich.";
  },
  (value: string) => {
    if (/^\+?[0-9 ]*$/g.test(value)) return true;

    return "Bitte eine gültige Telefonnummer eingeben.";
  },
];
export const streetRules = [
  (value: string) => {
    if (value) return true;

    return "Straße und Nr. sind erforderlich.";
  },
];
export const cityRules = [
  (value: string) => {
    if (value) return true;

    return "Ort ist erforderlich.";
  },
];
export const postalcodeRules = [
  (value: string) => {
    if (value) return true;

    return "Postleitzahl ist erforderlich.";
  },
  (value: string) => {
    if (/^[0-9]*$/g.test(value)) return true;

    return "Bitte eine gültige Postleitzahl eingeben.";
  },
  (value: string) => {
    if (value.length == 5) return true;

    return "Bitte eine gültige Postleitzahl eingeben.";
  },
];
export const commentRules = [
  (value: string) => {
    if (value) return true;

    return "Bitte schreibe kurz, wie Du von diesem Solawi-Projekt erfahren hast.";
  },
  (value: string) => {
    if (value.length > 3) return true;

    return "Mind. 4 Zeichen.";
  },
];
export const gdprRules = [
  (value: boolean) => {
    if (value) return true;

    return "Du musst die Datenschutzerklärung gelesen haben und der Verarbeitung Deiner Daten zustimmen, wenn Du dich registrieren willst.";
  },
];
export const passwordRules = [
  (value: string) => {
    if (value) return true;

    return "Passwort ist erforderlich.";
  },
  (value: string) => {
    if (value.length > 7) return true;

    return "Mind. 8 Zeichen.";
  },
];
export const passwordVerifyRules = (password: string) => [
  (value: string) => {
    if (value) return true;

    return "Passwort bitte bestätigen.";
  },
  (value: string) => {
    if (value == password) return true;

    return "Beide Passwörter müssen gleich sein.";
  },
];
