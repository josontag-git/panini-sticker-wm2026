// In das Google Sheet einfuegen unter: Erweiterungen -> Apps Script
// Danach als Web App (neu) deployen (siehe README.md im Projekt-Root).

const SHEET_STICKER = "Sticker";

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  upsertSticker(data);

  return ContentService.createTextOutput(
    JSON.stringify({ status: "ok" })
  ).setMimeType(ContentService.MimeType.JSON);
}

function upsertSticker(data) {
  const sheet = getOrCreateSheet(SHEET_STICKER, [
    "ID", "Nummer", "Gruppe", "Team", "Typ", "Bezeichnung", "Position", "Status", "Zuletzt aktualisiert",
  ]);
  upsertRow(sheet, data.id, [
    data.id,
    data.number || "",
    data.groupId || "",
    data.teamName || "",
    data.type || "",
    data.label || "",
    data.position || "",
    data.status || "",
    new Date(),
  ]);
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
