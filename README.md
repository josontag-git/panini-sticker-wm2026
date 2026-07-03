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

Die Synchronisierung ist zweiseitig: Änderungen werden zum Sheet hochgeladen, und beim Öffnen bzw. per "Vom Sheet laden" wird der Sheet-Stand auch wieder abgeglichen. So bleiben mehrere Geräte (z. B. Handy und Desktop) konsistent, solange beide mit demselben Sheet verbunden sind. Noch nicht hochgeladene lokale Änderungen werden beim Abgleich nicht überschrieben — synchronisiere daher zuerst, bevor du auf einem anderen Gerät weitersammelst.

Synchronisiert wird nicht nur der Sammelstatus, sondern auch der **Admin-Bereich**: Wird ein Sticker auf einem Gerät hinzugefügt, bearbeitet oder gelöscht, übernehmen andere Geräte das beim nächsten Abgleich ebenfalls. Gelöschte Sticker werden im Sheet als "Geloescht" markiert (Tombstone), damit auch Geräte, die den Sticker vorher nie gesehen haben, die Löschung zuverlässig mitbekommen.

**Wichtig:** Falls du `Code.gs` bereits früher eingerichtet hattest, muss es erneut aktualisiert werden (neue Spalte "Geloescht") — siehe Schritt 3 oben, danach erneut als neue Version bereitstellen.

## Hosting (GitHub Pages)

Dieses Repo ist für GitHub Pages vorbereitet — kein Server nötig, alles läuft statisch im Browser.
