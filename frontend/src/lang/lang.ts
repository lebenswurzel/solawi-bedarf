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
import { UserCategory, UserRole } from "../../../shared/src/enum.ts";

// info i: 24D8
// black truck: 26DF

export const language = {
  app: {
    title: "Dein Solawi-Projekt",
    subtitle: "Gemüseanbau in Graupa",
    navigation: {
      title: "Navigation",
      subtitle: "Solawi",
    },
    units: {
      weight: "Gewicht",
      piece: "Stück",
      volume: "Volumen",
      kg: "kg",
      g: "g",
      l: "l",
      ml: "ml",
      pcs: "Stk.",
      ct: "ct",
      euro: "€",
      unit: "Einheit",
    },
    actions: {
      cancel: "Abbrechen",
      save: "Speichern",
      close: "Schließen",
      more: "Mehr",
      createNew: "Neu erstellen",
      delete: "Löschen",
    },
    uiFeedback: {
      saving: {
        success: "Speichern erfolgreich",
        failed: "Speichern fehlgeschlagen",
      },
    },
    options: {
      active: {
        true: "aktive",
        false: "inaktiv",
      },
      userRoles: {
        [UserRole.USER]: "Ernteteiler",
        [UserRole.EMPLOYEE]: "Mitarbeiter",
        [UserRole.ADMIN]: "Admin",
      },
      orderUserCategories: {
        [UserCategory.CAT130]: {
          title: "stilles Solawi-Mitglied",
          subtitle: "keine Mitarbeit",
        },
        [UserCategory.CAT115]: {
          title: "aktives Solawi-Mitglied",
          subtitle:
            "Mitarbeit ca. 5 h/Monat, z. B. Depotkoordination, regelmäßiges Mitgärtnern (Orientierungswert mit ca. 11 % Ermäßigung)",
        },
        [UserCategory.CAT100]: {
          title: "engagiertes Solawi-Mitglied",
          subtitle:
            "Mitarbeit mind. 10 h/Monat, z. B. Aufgaben übernehmen in AGs, regelmäßiges Mitgärtnern (Orientierungswert mit ca. 23 % Ermäßigung)",
        },
      },
    },
    errors: {
      general:
        "Es ist leider ein Fehler aufgetreten. Bitte lade die Seite neu und versuche es noch einmal.",
    },
    footer: {
      imprint: "Impressum",
      privacyNotice: "Datenschutzerklärung",
      licensedUnder: "Lizensiert unter AGPLv3",
      sourceCode: "Quellcode",
    },
  },
  pages: {
    login: {
      title: "Login",
      subtitle: 'Noch kein Login? <a href="/#/register">Hier registrieren</a>',
      username: {
        label: "Anmeldename",
        placholder: "LW23042",
      },
      password: {
        label: "Passwort",
      },
      action: {
        login: "Login",
      },
    },
    home: {
      navigation: {
        title: "Home",
      },
      cards: {
        shop: {
          title:
            "Herzlich willkommen zur Bedarfsanmeldung des Solawi-Projektes!",
          subtitle:
            'Hier kannst Du Deine <a href="/#/shop">Bedarfsanmeldung</a> abgeben.',
          offers: "{offers} € verfügbare monatliche Beiträge`",
          food: "{food} % verteilte Nahrungsmittel",
          action: "Zur Bedarfsmeldung",
        },
        list: {
          title: "Nahrungsmittel entsprechend Deiner Bedarfsanmeldung für",
          detailText:
            "Bitte entnimm in deinem Depot genau die hier angegebenen Mengen. Diese berücksichtigen bereits mögliche Abweichungen in der Lieferung durch variierende Erntemengen.",
          subtitle: "KW {kw}",
          text: "Hier erscheinen ab der nächsten Saison 2024/25 die Nahrungsmittel, die Du entsprechend Deiner Bedarfsanmeldung in Deinem Depot abholen kannst.",
          shipment: "Nach der Bedarfsanmeldung gibt es:",
          additionalShipment: "Zusätzlich gibt es:",
        },
      },
    },
    shop: {
      navigation: {
        title: "Bedarfsanmeldung",
      },
      cards: {
        header: {
          hello: "Hallo",
          depot: "Dein Depot:",
          openingHours: "Abholzeiten:",
          explaination:
            "Bitte wähle in den entsprechenden Kategorien das Gemüse bzw. die Nahrungsmittel aus, die Du in der Saison 2024/25 im Rahmen des Solawi-Projektes beziehen möchtest. Lege dafür Deine entsprechende Menge je geplanter Verteilung \u26DF fest. Bitte beachte die zusätzlichen Infor­matio­nen für manche Nahrungs­mittel (abrufbar über das Information-Symbol \u24D8 hinter dem Namen des Nahrungsmittels) sowie die",
          faq: "Fragen & Antworten (F&A)",
        },
        products: {
          title: "Bedarfsanmeldung",
          msrp: "Dein Orientierungswert: {msrp} € pro Monat",
          msrpTooltip:
            "Der Orientierungswert errechnet sich aus den von Dir gewählten Nahrungsmitteln sowie Mengen und entspricht dem durchschnittlichen Solawi-Beitrag für Deine Auswahl.",
          offer: "Dein Beitrag: {offer} € pro Monat",
          item: {
            freq: "{freq} vorraussichtkiche Häufigkeit (in Wochen)",
            stock: "{stock} % verteilt",
            value: "Menge [{unit}]",
          },
        },
      },
      dialog: {
        title: "Bedarfsanmledung",
        alert: {
          title: "Wichtige Eingabehinweise",
          text: '<p class="my-2"> In Abhängigkeit davon, was Du eingibst, erscheinen möglicherweise zusätzliche Eingabefelder.</p> <p class="mb-2">Bitte fülle alle Eingabefelder, auch die gegebenenfalls zusätzlich erscheinenden, aus und stimme den Bedingungen am Ende dieses Formulars zu. Erst wenn diese Voraus­setzungen erfüllt sind, wird der »Speichern«-Button aktiviert.</p><p>Danke!</p>',
        },
        offer: {
          label: "Solawi-Beitrag pro Monat [€]",
          hint: "Mindestwert für Deinen Solawi-Beitrag: {msrp}€",
        },
        offerReason: {
          label: "Warum möchtest Du weniger zahlen?",
          hint: "Bitte gib an, warum Du weniger als den Orientierungswert zahlen möchtest.",
        },
        depot: {
          label: "Depot (Abholstation)",
          hint: "Bitte wähle ein Depot.",
        },
        alternateDepot: {
          label: "Ausweichdepot",
          hint: "Das Ausweichdepot wird genutzt wenn die erste Wahl überfüllt ist.",
        },
        category: {
          label: "Wie möchtest Du mitarbeiten?",
        },
        categoryReason: {
          label: "Wie möchtest Du mitarbeiten?",
          hint: "Bitte gib an, wie Du mitarbeiten möchtest.",
        },
        confirm: {
          title: "Deine Zustimmung zu den Bedingungen",
          label:
            "Ich habe die »Fragen & Antworten« (F&A) gelesen. Mir ist bewusst, dass meine Bedarfsanmeldung im gesamten Zeitraum vor Ablauf der Anmeldefrist unverbindlich bleibt und jederzeit änderbar ist. Erst mit Ablauf der Anmeldefrist werden meine zuletzt ausgewählten Nahrungsmittel und -mengen sowie mein Solawi-Beitrag verbindlich. Ich verpflichte mich, mit meinem verbindlichen Solawi-Beitrag für die gesamte Saison 2024/25 (12 Monate) das Solawi-Projekt mitzufinanzieren.",
        },
        action: {
          faq: "F&A",
        },
      },
    },
    faq: {
      title: "Fragen & Antworten",
      navigation: {
        title: "Fragen & Antworten (F&A)",
      },
    },
    user: {
      title: "Benutzer",
      navigation: {
        subtitle: "Admin",
      },
      filter: {
        label: "Filter",
      },
      sort: {
        label: "Sortierung",
        alpha_up: "Alphabetisch \u2191",
        alpha_down: "Alphabetisch \u2193",
      },
      action: {
        createUser: "Benutzer",
      },
      dialog: {
        title: "Benutzer Profil",
        name: "Name",
        password: "Passwort",
        role: "Role",
        orderValidFrom: "Fr. vor 1. Liefertag",
      },
    },
    shipment: {
      title: "Verteilungen",
      navigation: {
        subtitle: "Mitarbeiter",
      },
      action: {
        createShipment: "Verteilung",
        createShipmentItem: "Verteilung",
        createAdditionalShipmentItem: "Verteilung",
      },
      dialog: {
        title: "Verteilung",
      },
    },
    product: {
      title: "Nahrungsmittel",
      subtitle: "Beiträge: {offers} €",
      navigation: {
        subtitle: "Admin",
      },
      item: {
        subtitle: "Umsatz (Gesamt): {msrp} €",
      },
      action: {
        createProductCategory: "Produkt Kategorie",
        createProduct: "Produkt",
      },
      dialog: {
        productCategory: "Produkt Kategorie",
        product: "Produkt",
        name: "Name",
        description: "Beschreibung",
        msrp: "Orientierungswert [ct/{unit}]",
        frequency: "Verteilhäufigkeit",
        quantity: "Gesamtmenge [{unit}]",
        quantityMin: "Menge (min) [{unit}]",
        quantityMax: "Menge (max) [{unit}]",
        quantityStep: "Menge (Stückelung) [{unit}]",
      },
    },
    applicants: {
      title: "Registrierte Nutzer",
      navigation: {
        subtitle: "Admin",
      },
      state: "Status",
      options: {
        new: "Neu",
        deleted: "Gelöscht",
        confirmed: "Bestätigt",
      },
      hint: "GELÖSCHT",
    },
    depots: {
      title: "Depots",
      navigation: {
        subtitle: "Admin",
      },
      action: {
        createDepot: "Depot",
      },
      dialog: {
        title: "Depot",
        name: "Name",
        adress: "Adresse",
        openingHours: "Abholzeiten",
        comment: "Kommentar",
        capacity: "Kapazität",
      },
    },
    config: {
      title: "Konfiguration",
      subtitle: "Bedarfsmeldung 24/25",
      navigation: {
        subtitle: "Admin",
      },
      startOrder: "Start der Bedarfsmeldung",
      startBiddingRound: "Start der Bieterrunde",
      endBiddingRound: "Ende der Bieterrunde",
      budget: "Budget [€]",
      validFrom: "Start der Saison",
      validTo: "Ende der Saison",
    },
    content: {
      title: "Text",
      navigation: {
        subtitle: "Admin",
      },
      imprint: "Impressum",
      privacyNotice: "Datenschutzerklärung",
      faq: "Fragen & Antworten",
      action: "FAQ erstellen",
      dialog: {},
    },
    overview: {
      title: "Übersicht",
      navigation: {
        subtitle: "Admin",
      },
      text: 'Bei Click auf "Übersicht herunterladen" wird eine aktuelle Übersicht der Bedarfsanmeldung als csv heruntergeladen und generiert. Das kann eine Weile dauern und sollte mit Rücksicht auf die Nutzer nicht zur Hauptnutzungszeit erfolgen.',
      action: "Übersicht Herunterladen",
      documents: {
        user: {
          description:
            "Dein angemeldeter Bedarf für die Solawi-Saison 2024/2025",
        },
        depot: {
          description: "Angemeldeter Bedarf für die Solawi-Saison 2024/2025",
        },
      },
    },
  },
  components: {
    seasonSelector: {
      label: "Saison-Auswahl",
    },
  },
};
