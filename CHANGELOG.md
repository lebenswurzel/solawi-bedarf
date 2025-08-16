# v0.1.0 - 2024-09-09 - Erste Veröffentlichung

Dieses Release beinhaltet hauptsächlich Anpassungen an Tests und Automatisierungs-Skripten

#21 Frontend checks
#52 Backend tests and checks
#53 Build and deployment, database backup
#33 Fix for hot module replacement in development

# v0.2.0 - 2024-09-11 - Langer Login und saubere Dateinamen

#35 Option beim Einloggen um für heute nicht automatisch ausgeloggt zu werden
#57 Beim PDF-Export werden ungültige Zeichen in Dateinamen durch Bindestriche ersetzt

# v0.3.0 - 2024-09-16 - PDF-Verbesserungen und Icon

#69 Neues, funktionierendes Website/App-Icon
#39 Tabellen-Optimierungen für Lieferscheine, Depot-Übersichten und Ernteteiler-PDFs
#37 Fußzeile mit Datum und Seitenzahl für Lieferscheine, Depot-Übersichten und Ernteteiler-PDFs

# v0.3.1 - 2024-09-16 - Beschreibung in Verteilungsübersicht

#79 Beschreibungen in der Verteilungsübersicht anzeigen

# v0.3.2 - 2024-09-23 - Verbesserungen Verteilungsübersicht & Abweichende Liefermenge

#40 Lieferschein: Verbesserung des Textes bei abweichender Liefermenge
#97 Sortierung der Verteilungen invertiert und Symbole nach Status

Bonus: Buttons im Verteilungs-Dialog immer sichtbar

# v0.3.3 - 2024-09-29 - Sortierbare Depots # NEW dunkler Modus

#36 Depots können sortiert werden. Depot-Verteilungsübersicht wird an Hand der Sortierung erzeugt.
#102 Umschaltung auf dunkles Thema möglich.

# v0.3.4 - 2024-10-13 - Hinweistext zur Lieferung

#114 Hinweistext zur Entnahmemenge

# v0.3.5 - 2024-10-27 - Verbesserung Depot-Auswahl im Verteilungsdialog

#120 Verteilungsdialog: Ausblenden von Depots die nach Bedarfsänderung keine Lieferung eines Produkts mehr erhalten müssen
#122 Verteilungsdialog: "Alle auswählen" für Depots

# v0.4.0 - 2024-11-04 - Konfiguration weiterer Saisons

#23 Neue Saisons können angelegt und konfiguriert werden und werden nach Aktivierung den Benutzern angezeigt.
#23 Übersichtlichere Verwaltung von Produkten inkl. Löschen von Produkten und Produktkategorien, falls diese nirgends verwendet werden.
#23 Übersichtlichere Verwaltung von Benutzern inkl. Anzeige des Datums der letzten Aktualisierung der Bedarfsanmeldung.

# v0.4.1 - 2024-11-05 - Versionsabgleich Client und Server

#130 Versionsabgleich zwischen Server und Client und Nutzerhinweis, dass eine Aktualisierung notwendig.
#130 Erkennung, dass der Server nicht verfügbar war und Hinweis auf notwendige Aktualisierung.

# v0.4.2 - 2024-11-06 - Wartungshinweis konfigurierbar

#132 Admins können Wartungshinweistext konfigurieren (unter Menü -> Text)

# v0.4.3 - 2024-11-09 - Bestätigungsmail und Diagramme

#140 Nutzer erhalten Bestätigungsmail bei Registrierung (benötigt EMAIL_SEND_CONFIRMATION=true in env-be-prod.env).
#135 Kreisdiagramme auf Home-Seite zeigt nur noch Verteilung der Selbstanbauprodukte.
#137 Bedarfsanmeldung: zusätzliche Abfrage zur Bestätigung des aktiven/engagierten Mitgliedschaftsmodells.

# v0.4.4 - 2024-12-06 - Saisonschalter-Hinweis und Multiedit für Benutzer

#152 Hinweis auf Saison-Umschalter sobald die neue Saison verfügbar ist.
#155 Admin: Benutzertabelle ermöglicht das Aktivieren/Deaktivieren von mehreren Benutzern gleichzeitig.

# v0.4.5 - 2024-12-11 - Formulierungen verbessert und FAQ umbenannt

#157 "Fragen & Antworten" in "Informationen & Grundlagen" umbenannt. Formulierungen bei der Bedarfsanmeldung verbessert.

# v0.4.6 - 2024-12-18 - E-Mail bei Bedarfsanmeldung

#159 Mitglieder erhalten optional eine E-Mail als Bestätigung der Bedarfsanmeldung

# v0.4.7 - 2024-12-19 - Bessere Bedarfs-E-Mail und Benutzertabelle

#162 Optimierungen in der Bedarfsanmeldungs-E-Mail (Korrektur Beitragswert, Solawi-Name, Art der Mitarbeit ausblenden)
#163 Benutzertabelle: Anzeige der letzten Bedarfsänderung der gewählten Saison

# v0.4.8 - 2024-12-20 - Bugfix Bedarfsanmeldungsansicht

#166 Fix: Beim Wechseln der Kategorien in der Bedarfsanmeldung gehen die eingetragenen Werte jetzt nicht mehr verloren.

# v0.4.9 - 2024-12-20 - Separate Anzeige der Orientierungswerte

#166 Fix: Beim Schließen des Bestelldialogs in der Bedarfsanmeldung gehen die eingetragenen Werte jetzt nicht mehr verloren.
#136 Aufteilung des Orientierungswerts nach Selbstanbau- und Kooperationsprodukten

# v0.4.10 - 2024-12-20 - E-Mail-Kopie bei Bedarsanmeldung an internes Postfach

#170 Send a BCC to an internal address (specified by EMAIL_ORDER_UPDATED_BCC in env-be-prod.env) if a user updates an order
#170 COMPAT: Renamed EMAIL_SEND_CONFIRMATION to EMAIL_SEND_REGISTER_CONFIRMATION in env-be-prod.env

# v0.4.11 - 2025-01-31 - Neue Textelemente für Lieferscheine

#142 Die Informationen zur Organisation (Name, Adresse) können jetzt in den Text-Einstellungen festgelegt werden (die Infos in shared/src/config.ts sind damit obsolet, werden aber als Standardwerte übernommen)
#142 In den Texteinstellungen können jetzt Texte für die Kopf- und die Fußzeile der Lieferscheine festgelegt werden
#171 Bestätigungsdialog derBedarfsanmeldung: Buttons werden auf schmalen Bildschirmen jetzt übereinander dargestellt
#171 Alle Tooltips funktionieren jetzt auch auf Mobilgeräten

# v0.4.12 - 2025-01-31 - Statistik Bedarfsanmeldungen

#174 Stastitk und Übersicht für Bedarfsanmeldungen

# v0.4.13 - 2025-02-01 - Weitere Statistiken zur Bedarfsanmeldung

#174 Stastik zum Zeitpunkt erstmaliger Bedarfsanmeldungen

# v0.4.14 - 2025-02-01 - Feinschliff Statistik

#174 Feinschliff Statistik zu Bedarfsanmeldungen

# v0.4.15 - 2025-02-03 - Zeitzone und Saisonübersicht

#178 Zeitzonenprobleme bei Zeitstempeln in der Bedars-Bestätigungsmail behoben
#178 Optimierte Darstellung zum Status der Bedarfsanmeldung auf der Home-Seite
#178 Konsistenzprüfungen bei der Saison-Konfiguration

# v0.4.16 - 2025-02-04 - Design Home-Seite

#178 Verbessertes Design der Bedarfsliste auf der Home-Seite für Ernteteiler

# v0.4.17 - 2025-02-07 - Erweiterter Export

#181 Erweiterter Export der Bedarfsanmeldung-CSV
#181 Schöner Wohnen: Überarbeitetes Navigationsmenü

# v0.4.18 - 2025-02-08 - Bedarsanmeldungen gültig setzen

#174 Fix: neu angelegte Bedarfsanmeldungen bekommen ein 'gültig ab'-Datum auf zwei Monate vor Saisonbeginn gesetzt, damit sie in Verteilungen berücksichtigt werden

# v0.4.19 - 2025-02-14 - Sitzungstimer

#184 Bei Ablauf der Sitzung ist ein erneuter Login möglich, ohne dass der Nutzer ungespeicherte Daten verliert.

# v0.4.20 - 2025-02-17 - Dummy-Lieferscheine ignorieren

#117 Verteilungs-Dialog: Die Anzeige der Produktlieferungen je Depot beinhaltet jetzt nur noch Lieferungen, welche aktiv gesetzt sind
#186 Technisches Update: Verwendete Bibliotheken auf den neuesten Stand gebracht

# v0.4.21 - 2025-02-21 - Leere Verteilungen verstecken

#190 CSV-Export um Benutzeradressen erweitert (optional)
#194 Leere Verteilungen ausblenden

# v0.4.22 - 2025-02-22 - Bedarsanmeldungsstastik angepasst

#195 Statstik der Bedarfsanmeldungen: Nur Beitrag > 0 berücksichtigen

# v0.4.23 - 2025-02-24 - Nutzerdaten importieren

#192 Import von Benutzerdaten

# v0.4.24 - 2025-02-25 - Statistik Beiträge

#196 Statistik der Bedarfsanmeldungen: Orientierungswert ggü. Monatsbeitrag darstellen

# v0.4.25 - 2025-03-05 - Tabelle registrierte Nutzer

#207 Darstellung der registrierten Nutzer als Tabelle

# v0.4.26 - 2025-03-26 - Status Home-Seite

#210 Überarbeitete Darstellung der Bedarfsanmeldungs-Status auf der Home-Seite

# v0.4.27 - 2025-03-30 - Benutzerkommentar eingeblendet

#212 Benutzerdaten: Kommentar-Spalte eingeblendet und Querverweis zur Benutzertabelle (und zurück)

# v0.4.28 - 2025-03-30 - Multi-Aktion für Gültig-Ab

#214 Bedarf "Gültig ab"-Datum kann jetzt in der Benutzertabelle per Multi-Aktion auch dann gesetzt werden, wenn noch kein Bedarf angemeldet wurde

# v0.5.0 - 2025-04-02 - Error logging

#220 Error-Logging damit Admins Nutzer bei Problemen besser unterstützen können

# v0.5.1 - 2025-04-04 - Fehlerhinweise bei Produktauswahl

#222 Besseres Feedback beim Fehleingaben in der Bedarfsanmeldung

# v0.6.0 - 2025-04-12 - Verbesserte Verteilungen

#229 Admins können vergangene Verteilungen korrigieren
#229 Verbesserung der Nutzerfreundlichkeit der Verteilungsansicht und -dialog

# v0.6.1 - 2025-04-15 - Umformulierung Orientierungswert

#232 Umformulierung zur Berechnung des Orientierungswerts

# v0.6.2 - 2025-04-21 - Depotbelegung korrigiert

#234 Fehler bei Depotauswahl behoben wenn leere Bedarfsanmeldungen ein Depot belegen

# v0.6.3 - 2025-04-24 - Verbesserungen Verteilungsansicht

#233 Verbesserungen im Verteilungsdialog (Performance, Übersichtlichkeit)
#233 Übersicht über erfolgte Verteilungen je Produkt und Depot

# v0.6.4 - 2025-04-29 - Kartenansicht

#237 Kartenansicht für Admins (unter Statistiken)

# v0.7.0 - 2025-05-14 - Usability Verteilungsdialog und Lieferscheine

#251 Verteilungsdialog: Hervorhebung wenn Verteilmenge von der benötigten Menge abweicht
#228 Verbesserte Formatierung der Lieferscheine

# v0.7.1 - 2025-05-16 - Fix Übersichts-PDFs

#228 Nachbesserung Depot-Übersichts-PDFs und Benutzer-Bedarfs-PDFs

# v0.8.0 - 2025-05-28 - Anmeldungen in der Saison

#225 Verbesserte Berechnung des Orientierungswerts für Ernteteiler, die während der Saison dazukommen
#256 Wenn ein Produkt während der Saison deaktiviert wird, können vorhandene Bedarfsanmeldungen mit diesem Produkt trotzdem noch gespeichert werden

# v0.8.1 - 2025-05-29 - Fixes

#259 Fix: Speichern von aktiven Verteilungen durch Admins wieder möglich
#259 Fix: Prognose-Verteilungen werden nicht mehr auf der Startseite angezeigt

# NEW

#270 Fix: Negative Berechnung des Orientierungswerts behoben
