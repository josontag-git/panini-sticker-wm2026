// In das Google Sheet einfuegen unter: Erweiterungen -> Apps Script
// Danach als Web App (neu) deployen (siehe README.md im Projekt-Root).

const SHEET_STICKER = "Sticker";
const HEADERS = [
  "ID", "Nummer", "Titel", "Bereich", "Typ", "Kapitel", "Status", "Geloescht", "Zuletzt aktualisiert",
];

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  if (data.action === "delete") {
    markDeleted(data.id);
  } else {
    upsertSticker(data);
  }

  return ContentService.createTextOutput(
    JSON.stringify({ status: "ok" })
  ).setMimeType(ContentService.MimeType.JSON);
}

// Liefert Definition + Status + Loesch-Markierung aller Sticker zurueck, damit ein
// Geraet den Stand anderer Geraete abgleichen kann (Sammelstatus UND Admin-Aenderungen
// wie Hinzufuegen/Bearbeiten/Loeschen von Stickern, z.B. Desktop <-> Handy).
function doGet(e) {
  const sheet = getOrCreateSheet(SHEET_STICKER, HEADERS);
  const lastRow = sheet.getLastRow();
  const stickers = [];
  if (lastRow > 1) {
    const rows = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
    for (const row of rows) {
      if (!row[0]) continue;
      stickers.push({
        id: row[0],
        number: row[1] || row[0],
        title: row[2] || "",
        area: row[3] || "",
        type: row[4] || "-",
        section: row[5] || row[3] || "",
        status: row[6] || "missing",
        deleted: row[7] === "1" || row[7] === true,
      });
    }
  }
  return ContentService.createTextOutput(
    JSON.stringify({ stickers })
  ).setMimeType(ContentService.MimeType.JSON);
}

function upsertSticker(data) {
  const sheet = getOrCreateSheet(SHEET_STICKER, HEADERS);
  upsertRow(sheet, data.id, [
    data.id,
    data.number || "",
    data.title || "",
    data.area || "",
    data.type || "",
    data.section || "",
    data.status || "",
    "",
    new Date(),
  ]);
}

// Markiert einen Sticker als geloescht, statt die Zeile zu entfernen (Tombstone) -
// so erfahren andere Geraete beim naechsten Abgleich zuverlaessig von der Loeschung,
// auch wenn sie den Sticker vorher nie gesehen haben.
function markDeleted(id) {
  const sheet = getOrCreateSheet(SHEET_STICKER, HEADERS);
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (ids[i][0] === id) {
        sheet.getRange(i + 2, 8, 1, 1).setValue("1");
        sheet.getRange(i + 2, 9, 1, 1).setValue(new Date());
        return;
      }
    }
  }
  // Sticker war noch nie im Sheet - trotzdem als Tombstone anlegen.
  sheet.appendRow([id, "", "", "", "", "", "", "1", new Date()]);
}

function upsertRow(sheet, id, row) {
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (ids[i][0] === id) {
        sheet.getRange(i + 2, 1, 1, row.length).setValues([row]);
        return;
      }
    }
  }
  sheet.appendRow(row);
}

function getOrCreateSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  }
  return sheet;
}
