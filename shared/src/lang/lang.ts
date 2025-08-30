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
import {
  ProductCategoryType,
  ShipmentType,
  UserCategory,
  UserRole,
} from "../enum";
import { OrganizationInfoKeys, PdfTextsKeys } from "../types";

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
      apply: "Übernehmen",
      edit: "Bearbeiten",
      update: "Aktualisieren",
      restore: "Änderungen verwerfen",
      activate: "Aktivieren",
    },
    hints: {
      warning: "Warnung",
      note: "Hinweis",
    },
    uiFeedback: {
      saving: {
        success: "Speichern erfolgreich",
        failed: "Speichern fehlgeschlagen",
      },
      deleting: {
        success: "Löschen erfolgreich",
        failed: "Löschen fehlgeschlagen",
        askConfirmation: "Soll {item} wirklich gelöscht werden?",
      },
    },
    maintenance: {
      defaultMessage:
        "Wartungsmodus: Änderungen gehen möglicherweise verloren!",
      inconsistentServerVersion:
        "Es existiert eine neuere Version der App. Bitte die Seite aktualisieren.",
      serverError: "Server nicht verfügbar: {message}",
      serverAvailable:
        "Server wieder verfügbar. Bitte die die Seite aktualisieren.",
    },
    options: {
      active: {
        true: "aktiv",
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
          subtitle: "Keine Mitarbeit, Orientierungswert ca. 15% erhöht.",
        },
        [UserCategory.CAT115]: {
          title: "aktives Mitglied",
          subtitle:
            "Mitarbeit mindestens 5 h/Monat, regulärer Orientierungswert.",
        },
        [UserCategory.CAT100]: {
          title: "engagiertes Mitglied",
          subtitle:
            "Mitarbeit mindestens 10 h/Monat, Orientierungswert ca. 15% reduziert.",
        },
      },
      productCategoryTyps: {
        [ProductCategoryType.SELFGROWN]: {
          title: "Selbstanbauprodukte",
          subtitle: "Die Produkte werden in {name} angebaut",
        },
        [ProductCategoryType.COOPERATION]: {
          title: "Kooperationsprodukte",
          subtitle:
            "Die Produkte werden durch Kooperationspartner bereitgestellt",
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
    status: {
      autoLogout:
        "Du wurdest automatisch ausgeloggt. Zum Weiterarbeiten bitte erneut einloggen.",
      loginAgain: "Erneut einloggen",
    },
  },
  navigation: {
    employees: "Mitarbeiter",
    administration: "Administration",
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
        logout: "Logout",
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
          offers: "{offers} € erreichtes monatliches Budget",
          food: "{food} % verteilte Nahrungsmittel aus Selbstanbau",
          action: "Zur Bedarfsmeldung",
        },
        list: {
          title: "Nahrungsmittel entsprechend Deiner Bedarfsanmeldung für",
          detailText:
            "Bitte entnimm in deinem Depot genau die hier angegebenen Mengen. Diese berücksichtigen bereits mögliche Abweichungen in der Lieferung durch variierende Erntemengen.",
          subtitle: "KW {kw}",
          text: "Hier erscheinen zu gegebener Zeit die Nahrungsmittel, die Du entsprechend Deiner Bedarfsanmeldung in Deinem Depot abholen kannst.",
          shipment: "Nach der Bedarfsanmeldung gibt es ab {from}",
          additionalShipment: "Zusätzlich gibt es:",
          seasonBefore: "Die Saison ist zur Zeit noch nicht aktiv.",
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
            "Bitte wähle in den entsprechenden Kategorien das Gemüse bzw. die Nahrungsmittel aus, die Du in der {season} im Rahmen des Solawi-Projektes beziehen möchtest. Lege dafür Deine entsprechende Menge je geplanter Verteilung \u26DF fest. Bitte beachte die zusätzlichen Infor­matio­nen für manche Nahrungs­mittel (abrufbar über das Information-Symbol \u24D8 hinter dem Namen des Nahrungsmittels) sowie die",
          faq: "Informationen und Grundlagen",
          orderDuringSeason:
            "Für Ernteteiler, die erst während der Saison dazustoßen und die daher nicht die vollen zwölf Monate dabei sind, wird zusätzlich angezeigt, wieviel eines Produkts bereits verteilt wurde (hellgraues Lastwagensymbol mit Prozentangabe). Bei der Berechnung des Orientierungswerts sind die bereits verteilten Produkte bereits herausgerechnet.",
        },
        products: {
          title: "Bedarfsanmeldung",
          msrp: "Dein Orientierungswert: **{total} € pro Monat**, davon",
          msrpSelfgrown: "{selfgrown} € für selbst angebaute Produkte",
          msrpCooperation: "{cooperation} € für Kooperationsprodukte",
          msrpCompensation:
            "{compensation} € Ausgleich für verringerten Selbstanbauanteil",
          msrpTooltip:
            "Der Orientierungswert errechnet sich aus den von Dir gewählten Nahrungsmitteln sowie Mengen und entspricht dem durchschnittlichen Solawi-Beitrag für Deine Auswahl.",
          msrpCompensationTooltip:
            "Ausgleichsbeitrag, da die Verringerung des Gemüses aus Eigenanbau nicht auf eine Erhöhung der Kooperationsprodukte angerechnet werden kann",
          offer: "Dein gewählter Solawi-Beitrag:",
          item: {
            freq: "{freq} vorraussichtliche Häufigkeit (in Wochen)",
            deliveryPercentage:
              "{percent} % der geplanten Lieferungen sind bereits erfolgt",
            stock: "{stock} % verteilt",
            value: "Menge [{unit}]",
            oldValue: "Menge vorher [{unit}]",
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
          title: "Deine Zustimmung zu den Bedingungen:",
          label:
            "Ich haben die »Informationen und Grundlagen« unseres „{solawiName}“ gelesen. Mir ist bewusst, dass meine Bedarfsanmeldung im gesamten Zeitraum vor Ablauf der Anmeldefrist unverbindlich bleibt und jederzeit änderbar ist. Erst mit Ablauf der Anmeldefrist werden meine zuletzt ausgewählten Nahrungsmittel und -mengen, sowie mein Solawi-Beitrag verbindlich. Ich verpflichte mich, mit meinem verbindlichen Solawi-Beitrag für die gesamte {season} (12 Monate) das Solawi-Projekt mitzufinanzieren.",
        },
        confirmContribution: {
          title: "Bestätigung deines Mitgliedschaftsmodells als {model}:",
          label:
            "Ich habe zur Kenntnis genommen, dass es für eine gut funktionierende Solawi essentiell ist, die mit meiner Mitgliedschaft verbundenen Mitarbeitsstunden zu erfüllen und dies zu dokumentieren. Die Bedingungen der Beteiligung und Konsequenzen bei fehlender Beteiligung und Dokumentation sind mir bewusst.",
        },
        confirmPaymentMethod: {
          title: "Bestätigung der Zahlungsmethode (nur zuteffendes auswählen):",
        },
        confirmSepaUpdate: {
          title: "Bestätigung der SEPA-Lastschrift",
          label:
            "Ich ermächtige den Lebenswurzel e.V., ab {from} bis {to} den monatlichen Beitrag in Höhe von {total}€ (statt bisher {previousTotal}€) per SEPA-Lastschrift von meinem bekannten Konto einzuziehen.",
        },
        confirmBankTransfer: {
          title: "Bestätigung der Überweisung",
          label:
            "Ich überweise den zusätzlichen Gesamtbetrag von {difference}€ bis zum {date} auf folgendes Konto:",
          reference: "Verwendungszweck: Bedarfsanpassung {userId}",
        },
        depotNote: {
          title: "Hinweis zu Depots mit (*)",
          show: "Anzeigen",
          paragraphs: [
            "Depots, die mit einem Sternchen (*) gekennzeichnet sind, befinden sich aktuell noch in der Planungs- und Abstimmungsphase. Es kann daher sein, dass diese Depots zu Beginn der Saison noch nicht verfügbar sind.",
            "Solltest Du eines dieser Depots wählen, könnte es notwendig sein, dass Du Dein Gemüse doch in einem anderen Depot abholen musst. Wir informieren Dich rechtzeitig und geben unser Bestes, die Planung so schnell wie möglich abzuschließen, damit alle gelisteten Depots nutzbar werden. Bitte gib daher ein zweites Wunschdepot an, welches kein Sternchen hat.",
            "Wenn du die Depotkoordination in deinem Wunschdepot unterstützen möchtest, leistest du einen wertvollen Beitrag zur Sicherstellung des Depots. Melde dich hierfür gern im Forum bei {forumContact} oder bei der Mitgliederbetreuung unter {email}.",
          ],
        },
        sendConfirmationEmail: {
          title:
            "Eine Kopie der Bedarfsanmeldung an meine hinterlegte E-Mail-Adresse schicken.",
          notAvailable:
            "E-Mail-Versand nicht möglich, da für dein Konto keine E-Mail-Adresse hinterlegt ist.",
        },
        action: {
          faq: "Informationen & Grundlagen",
        },
      },
    },
    faq: {
      title: "Informationen und Grundlagen",
      navigation: {
        title: "Informationen & Grundlagen",
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
        createShipment: "Verteilung erstellen",
        createForecastShipment: "Prognose-Verteilung erstellen",
        createShipmentItem: "Verteilung",
        createAdditionalShipmentItem: "Verteilung",
      },
      dialog: {
        title: "Verteilung",
      },
      types: {
        [ShipmentType.NORMAL]: "Standard",
        [ShipmentType.DRAFT]: "Entwurf",
        [ShipmentType.FORECAST]: "Prognose",
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
        createProductCategory: "Produktkategorie",
        createProduct: "Produkt",
        editProductCategory: "Einstellungen",
      },
      dialog: {
        productCategory: "Produktkategorie",
        product: "Produkt",
        name: "Name",
        active: "Aktiv",
        productCategoryType: "Art der enthaltenen Produkte",
        sold: "Verkauft [{unit}]",
        delivered: "Geliefert",
        deliveries: "Lieferungen an Depots",
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
      subtitle:
        "Hier können Einstellungen für die jeweils ausgewählte Saison vorgenommen werden.",
      navigation: {
        subtitle: "Admin",
      },
      name: "Bezeichnung",
      public: {
        yes: "Veröffentlicht: für alle Benutzer sichtbar",
        no: "Nicht veröffentlicht: sichtbar nur für Administratoren und Mitarbeiter",
      },
      validity: {
        title: "Zeitraum der Saison",
        description:
          "Gültigkeitszeitraum der Saison. Üblicherweise 12 Monate vom 1.4. eines Jahres bis zum 31.3. des Folgejahres.",
      },
      bidding: {
        title: "Bedarfsanmeldung und Bieterrunde",
        description:
          "Festlegung ab wann Nutzer ihren Bedarf für die Saison anmelden können (Start der Bedarfsanmeldung). Ab dem Zeitpunkt der Bieterrunde kann der Bedarf nur noch nach oben angepasst werden. Zum Ende der Bieterrunde wird der Bedarf verbindlich.",
      },
      startOrder: "Start der Bedarfsmeldung",
      startBiddingRound: "Start der Bieterrunde",
      endBiddingRound: "Ende der Bieterrunde",
      budget: "Geplantes Budget [€]",
      validFrom: "Start der Saison",
      validTo: "Ende der Saison",
      newSeason: {
        title: "Neue Saison anlegen",
        copyFromPrevious: "Kopiere Produktkonfiguration von vorheriger Saison",
      },
    },
    content: {
      title: "Textelemente",
      navigation: {
        subtitle: "Admin",
      },
      pageTitle: "Textelemente",
      maintenanceMessage: {
        title: "Wartungshinweis",
        description:
          "Ein hier festgelegter Text wird allen Benutzern angezeigt",
        enabled: "Wartungshinweis aktiv!",
        disabled: "Aktuell kein Wartungshinweis aktiv",
      },
      imprint: "Impressum",
      privacyNotice: "Datenschutzerklärung",
      faq: "Informationen & Grundlagen",
      action: "Textbaustein hinzufügen",
      organizationInfo: "Organisation",
      pdf: "PDF",
      general: "Allgemein",
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
          description: "Dein angemeldeter Bedarf für die Solawi-{season}",
        },
        depot: {
          description: "Angemeldeter Bedarf für die Solawi-{season}",
        },
      },
    },
    statistics: {
      title: "Statistiken",
      tabs: {
        products: "Produkte",
        orders: "Bedarfsanmeldungen",
        map: "Karte",
      },
      navigation: {
        subtitle: "Admin",
      },
      productsCard: {
        title: "Produkte nach monatlichem Umsatz",
        text: "In Bedarfsanmeldungen enthaltene Produkte mit durchschnittlichem Monatsumsatz in Klammern.",
      },
      ordersCard: {
        title: "Bedarfsanmeldungen in der gewählten",
        text: "Alle Bedarfsanmeldung, die für die gewählte Saison relevant sind.",
        distributions: "Verteilungen",
      },
    },
  },
  components: {
    seasonSelector: {
      label: "Saison-Auswahl",
      description:
        "Hier kannst du festlegen, für welche Saison du deinen Bedarf anmelden und Einstellungen vornehmen möchtest.",
      notYetAvailable:
        "Hier kann die nächste Saison für die Bedarfsanmeldung ausgewählt werden, sobald diese freigeschaltet wurde.",
    },
  },
  email: {
    orderConfirmation: {
      subject:
        "Bestätigung Deiner Bedarfsmeldung für die {season} (Stand {now})",
      changingUserNote: "Hinweis: Änderung wurde vorgenommen durch {userName}",
      disclaimer: "Diese E-Mail wurde automatisiert erstellt",
      body: [
        "Liebe(r) {userName},",

        "vielen Dank für Deine Bedarfsanmeldung für die {season} im {solawiName}. Deine Angaben wurden erfolgreich gespeichert.",

        "Im Anhang befindet sich ein PDF-Dokument mit einer Übersicht der von Dir angemeldeten Mengen für Gemüse und Kooperationsprodukte für die kommende Saison. Die Saison startet am {seasonStart} und endet am {seasonEnd}.",

        "Beim Speichern der Bedarfsmeldung hast Du bestätigt, dass Du die „[Grundlagen und Informationen]({appUrl}/#/faq)“ der Solawi gelesen und verstanden hast. Sollten dennoch Unklarheiten bestehen, kannst Du Dich bei Rückfragen jederzeit an die Mitgliederbetreuung unter {solawiEmail} wenden.",

        "Besonders wichtig bei den „[Grundlagen und Informationen]({appUrl}/#/faq)“ sind die Abschnitte zur Verbindlichkeit und den Bedingungen der Bedarfsmeldung:",

        "**Verbindlichkeit Deiner Bedarfsmeldung:**",

        "Solange die Anmeldefrist für die laufende Bieterunde (auf der [Home-Seite der Bedarfsanmeldung]({appUrl}/) sichtbar) noch nicht verstrichen ist, bleiben Deine angemeldeten Bedarfsmengen unverbindlich. Das heißt, Du kannst diese jederzeit bis zum Ende der Anmeldefrist ändern, also sowohl Deine Nahrungsmittelmengen als auch Deinen Solawi-Beitrag nach oben oder unten justieren. In folgenden Bieterunden, mit verlängerten Anmeldefristen, kannst Du Deinen Solawi-Beitrag ausschließlich nach oben justieren.",

        "Mit Ablauf der Anmeldefrist wird der zuletzt von Dir gespeicherte Stand Deiner Bedarfsanmeldung verbindlich. In diesem Moment gehst Du automatisch eine rechtsverbindliche Zusage mit dem Träger des Solawi-Projektes ein, woran Du bis zum Ende der Solawi-Saison am 31.03. des Folgejahres gebunden bist.",

        "**Diese Bedingungen akzeptierst Du mit der Anmeldung Deines Bedarfs:**",

        "Du trägst das Ernterisiko für die Solawi-{season} (vom {seasonStart} bis zum {seasonEnd}) gemeinsam mit allen anderen Solawi-Mitgliedern.",

        "Dafür kannst Du die von Dir als Bedarf angemeldeten Nahrungsmittel in dem von Dir gewählten Depot abholen (8). Dir ist dabei bewusst, dass die Häufigkeit der Verteilung je Gemüse erntebedingt schwanken kann. Du trägst sowohl Überschüsse als auch Mindererträge mit.",

        "Die Information zur voraussichtlichen Häufigkeit der Verteilung erhältst Du wöchentlich per E-Mail oder über die Seite der Bedarfsanmeldung.",

        "Du kannst darauf vertrauen, dass das angebaute Gemüse höhere Ansprüche erfüllt, als es die EU-Bio-Verordnung verlangt, das Gemüse zu Deiner nährstoff- sowie vitaminreichen Ernährung beiträgt und der genutzte Boden – gemäß dem Leitbild dieses Solawi-Projektes – ökologisch, naturnah, schonend bewirtschaftet und gepflegt wird. Die Pflege der organischen Bodensubstanz (wie Bodenlebewesen, Humus) und die Förderung der Artenvielfalt ist dabei wichtig.",

        "Für die Dauer der Solawi-Saison zahlst Du Deinen monatlichen Solawi-Beitrag, oder zahlst die Gesamtsumme aller Monatsbeiträge im Voraus zu Beginn der Saison.",

        "Du verpflichtest Dich, die mit der Wahl Deiner Art der Mitgliedschaft einhergehenden Bedingungen einzuhalten:",

        "* **stilles Mitglied** | keine Mitarbeit\n* **aktives Mitglied** | Mitarbeit mindestens 5 h/Monat\n* **engagiertes Mitglied** | Mitarbeit mindestens 10 h/Monat",

        "Dir ist bewusst, dass bei mangelnder Beteiligung oder fehlendem Nachweis der im Rahmen Deiner Art der Mitgliedschaft zugesicherten Stunden, der entsprechende Ausgleich nachgezahlt werden muss. Diese Zahlung ist nach Aufforderung durch die Solawi entweder als Einmalzahlung zu erstatten, oder Du erteilst Deine Zustimmung für den Einzug des entsprechend höheren Monatsbeitrags für den Rest der Saison.",

        "**Folgende Angaben sind auf Grundlage deiner Bedarfsanmeldung bei uns hinterlegt:**",

        "* Benutzername: {userId}\n* Monatlicher Beitrag: {offer}\n* Mitgliedschaftsmodell: {contributionModel}\n{contributionKindBulletPoint}* Bestellte Lebensmittel und Depot: siehe PDF im Anhang",

        "Gewählte Zahlungsweise: {paymentMethod}",

        "Vielen Dank für Deine Unterstützung des {solawiName} und das Engagement für eine nachhaltige und faire Landwirtschaft.",

        "Viele Grüße",

        "Dein {solawiName}",
      ],
      contributionKindBulletPoint: "* Art der Mitarbeit: {contributionKind}\n",
    },
  },
};

export const langOrganizationInfo: Record<OrganizationInfoKeys, string> = {
  appUrl: "URL",
  "address.email": "E-Mail-Addresse",
  address: "Addresse",
  "address.name": "Name",
  "address.street": "Straße",
  "address.postalcode": "Postleitzahl",
  "address.city": "Stadt",
  "address.forumContact": "Forum-Kontakt",
  bankAccount: "Kontoverbindung",
};

export const langPdfTexts: Record<PdfTextsKeys, string> = {
  packagingListFooter: "Fußzeile im Lieferschein",
  packagingListHeader: "Kopfzeile im Lieferschein",
};
