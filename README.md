# Joni's Panini Sticker

Progressive Web App zur schnellen Uebersicht ueber die Panini-WM-2026-Sticker-Sammlung: welche Sticker man hat, welche doppelt sind (zum Tauschen) und welche noch fehlen.

Die Team-Liste (48 Teams, je 20 Sticker) orientiert sich am WM-2026-Teilnehmerfeld. Die Aufteilung der 20 Sticker pro Team (Logo, Mannschaftsfoto, Spielerpositionen) ist eine generische Platzhalter-Struktur, keine offizielle Panini-Checkliste.

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

Die Synchronisierung ist einseitig (Gerät → Sheet) und dient als Backup/Freigabe, z. B. um den Sammelstand mit anderen zu teilen. Ein Rücklesen aus dem Sheet in die App ist nicht vorgesehen.

## Hosting (GitHub Pages)

Dieses Repo ist für GitHub Pages vorbereitet — kein Server nötig, alles läuft statisch im Browser.
