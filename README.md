# Joni's Panini Sticker

Progressive Web App zur schnellen Uebersicht ueber die Panini-WM-2026-Sticker-Sammlung: welche Sticker man hat, welche doppelt sind (zum Tauschen) und welche noch fehlen.

Die Stickerliste basiert auf einer vom Nutzer bereitgestellten Checkliste: 48 Team-Kapitel (Emblem, Spieler, Mannschaftsfoto, teils Silber-Parallelen) plus Sonderkapitel wie FIFA-Historie, Coca-Cola-Inserts, McDonald's-Exklusiv, Extra-Tiers und Update-Karten (insgesamt 1219 Sticker in 62 Kapiteln).

## Nutzung auf dem Handy

1. Seite in Safari/Chrome oeffnen ([GitHub-Pages-URL](https://josontag-git.github.io/panini-sticker-wm2026/)).
2. Teilen-Button → "Zum Home-Bildschirm" (iOS) bzw. "App installieren" (Android).
3. App vom Home-Bildschirm starten wie eine normale App.

## Bedienung

- Im Tab **Album** auf einen Sticker tippen, um den Status zu wechseln: Fehlt → Habe → Doppelt → Fehlt. Doppelte zaehlen in der Kopfzeile auch unter "Habe" mit, da man den Sticker ja trotzdem besitzt.
- Suche und Filter-Chips helfen, schnell einzelne Teams oder Sticker-Nummern zu finden.
- Im Tab **Listen** gibt es eine Fehlliste (zum Nachkaufen) und eine Tauschliste (Doppelte), beide mit "Kopieren"-Button.
- Im Tab **Mehr** koennen Sicherungen exportiert/importiert und der Fortschritt zurueckgesetzt werden.
- Im Tab **Mehr** unter "Design" laesst sich der Farbmodus waehlen: System (folgt der Geraete-Einstellung), Hell, Dunkel, Neon, Knallbunt, Black & White, Blue.

## Google Sheet einrichten (einmalig, optional)

1. Neues Google Sheet anlegen.
2. Menü **Erweiterungen → Apps Script** öffnen.
3. Inhalt aus [`apps-script/Code.gs`](apps-script/Code.gs) in den Editor einfügen (bestehenden Beispielcode ersetzen).
4. Speichern, dann **Bereitstellen → Neue Bereitstellung**.
5. Typ: **Web App**.
   - "Ausführen als": **Ich (dein Google-Konto)**
   - "Wer hat Zugriff": **Jeder** (nötig, damit die App ohne Google-Login POST-Requests senden kann)
6. Bereitstellen, Berechtigungen bestätigen.
7. Die angezeigte **Web-App-URL** (endet auf `/exec`) kopieren.

## App mit dem Sheet verbinden

1. In der App zum Tab **Mehr** wechseln.
2. Die kopierte Web-App-URL bei "Google Sheet" einfügen, "URL speichern" tippen.
3. Ab jetzt wird jede Statusänderung (Fehlt/Habe/Doppelt) automatisch als Zeile ins Tabellenblatt "Sticker" geschrieben (anhand der Sticker-ID aktualisiert, keine Duplikate).
4. Der Button "Jetzt synchronisieren" schickt alle noch nicht übertragenen Änderungen erneut (z. B. nach Offline-Nutzung).
5. Der Button "Vom Sheet laden" holt den aktuellen Stand aus dem Sheet und übernimmt ihn lokal — das passiert auch automatisch beim Öffnen der App sowie per Pull-to-Refresh (an oberster Stelle nach unten ziehen).
6. Der Button "Komplette Liste ins Sheet hochladen" ersetzt den kompletten Sheet-Inhalt durch die aktuelle lokale Stickerliste. **Einmalig direkt nach dem Einrichten ausführen**, damit das Sheet von Anfang an alle Sticker enthält (siehe Hinweis unten).

Die Synchronisierung ist zweiseitig: Änderungen werden zum Sheet hochgeladen, und beim Öffnen bzw. per "Vom Sheet laden" wird der Sheet-Stand auch wieder abgeglichen. So bleiben mehrere Geräte (z. B. Handy und Desktop) konsistent, solange beide mit demselben Sheet verbunden sind. Noch nicht hochgeladene lokale Änderungen werden beim Abgleich nicht überschrieben — synchronisiere daher zuerst, bevor du auf einem anderen Gerät weitersammelst.

**Das Sheet führt die komplette Stickerliste**, nicht nur den Sammelstatus: Sticker, die im Admin-Bereich hinzugefügt, bearbeitet oder gelöscht werden, werden ebenfalls hochgeladen bzw. beim Abgleich übernommen. Ein Sticker, der lokal existiert, aber nicht im Sheet auftaucht, gilt als anderswo gelöscht und wird entfernt.

**Sicherheitsnetz:** Damit ein noch nicht vollständig befülltes Sheet (z. B. direkt nach dem Einrichten, wenn es nur einzelne, organisch entstandene Zeilen enthält) nicht versehentlich fast die ganze lokale Liste löscht, wird die "Sticker fehlt im Sheet → lokal entfernen"-Logik erst aktiv, sobald das Sheet mindestens die Hälfte der bekannten Sticker enthält. Nutze daher **"Komplette Liste ins Sheet hochladen"** einmalig, um das Sheet direkt vollständig zu befüllen.

**Wichtig:** Falls du `Code.gs` bereits früher eingerichtet hattest, muss es erneut aktualisiert werden (Schema hat sich geändert) — siehe Schritt 3 oben, danach erneut als neue Version bereitstellen.

## Hosting (GitHub Pages)

Dieses Repo ist für GitHub Pages vorbereitet — kein Server nötig, alles läuft statisch im Browser.
