// In das Google Sheet einfuegen unter: Erweiterungen -> Apps Script
// Danach als Web App (neu) deployen (siehe README.md im Projekt-Root).

const SHEET_STICKER = "Sticker";
const HEADERS = ["ID", "Nummer", "Titel", "Bereich", "Typ", "Kapitel", "Status", "Zuletzt aktualisiert"];

function doPost(e) {
  const data = JSON.parse(e.postData.contents);

  if (data.action === "delete") {
    deleteStickerRow(data.id);
  } else if (data.action === "bulkUpsert" && Array.isArray(data.stickers)) {
    bulkReplaceStickers(data.stickers);
  } else {
    upsertSticker(data);
  }

  return ContentService.createTextOutput(
    JSON.stringify({ status: "ok" })
  ).setMimeType(ContentService.MimeType.JSON);
}

// Liefert die komplette aktuelle Stickerliste (Definition + Status) zurueck.
// Das Sheet ist die vollstaendige Quelle: jedes Geraet gleicht sich beim
// Start (und per "Vom Sheet laden") auf genau diesen Stand ab - Sticker,
// die hier fehlen, gelten als geloescht.
function doGet(e) {
  const sheet = getOrCreateSheet(SHEET_STICKER, HEADERS);
  const lastRow = sheet.getLastRow();
  const stickers = [];
  if (lastRow > 1) {
    const rows = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
    for (const row of rows) {
      // Vorsicht: Sticker-ID "0" wird von Sheets als Zahl 0 gespeichert, was
      // in JS falsy ist - daher explizit auf leeren String pruefen statt !row[0].
      const id = String(row[0]);
      if (id === "") continue;
      stickers.push({
        id: id,
        number: row[1] ? String(row[1]) : id,
        title: row[2] || "",
        area: row[3] || "",
        type: row[4] || "-",
        section: row[5] || row[3] || "",
        status: row[6] || "missing",
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
    new Date(),
  ]);
}

function deleteStickerRow(id) {
  const sheet = getOrCreateSheet(SHEET_STICKER, HEADERS);
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === String(id)) {
        sheet.deleteRow(i + 2);
        return;
      }
    }
  }
}

// Ersetzt den kompletten Sticker-Bestand im Sheet in einem Rutsch (ein
// einziger setValues-Aufruf statt hunderter einzelner Requests). Dient zum
// initialen Befuellen des Sheets mit der vollstaendigen Stickerliste sowie
// zum vollstaendigen Neuabgleich vom Admin-Bereich aus.
function bulkReplaceStickers(stickers) {
  const sheet = getOrCreateSheet(SHEET_STICKER, HEADERS);
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, HEADERS.length).clearContent();
  }
  if (!stickers.length) return;
  const now = new Date();
  const rows = stickers.map((s) => [
    s.id,
    s.number || s.id,
    s.title || "",
    s.area || "",
    s.type || "-",
    s.section || s.area || "",
    s.status || "missing",
    now,
  ]);
  sheet.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);
}

function upsertRow(sheet, id, row) {
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === String(id)) {
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
    // ID-Spalte als Text formatieren, damit z.B. "0" nicht als Zahl 0
    // interpretiert wird (siehe doGet).
    sheet.getRange("A:A").setNumberFormat("@");
  }
  return sheet;
}
