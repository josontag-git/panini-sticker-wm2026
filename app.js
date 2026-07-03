const STORAGE_KEY = "panini-wm26-state-v1";
const STORAGE_SCRIPT_URL = "panini-wm26-script-url";
const STORAGE_DIRTY = "panini-wm26-dirty-v1";
const STORAGE_PENDING_DELETES = "panini-wm26-pending-deletes-v1";
const STORAGE_STICKERS = "panini-wm26-stickers-v1";
const STATUS_CYCLE = { missing: "owned", owned: "duplicate", duplicate: "missing" };
const STATUS_LABEL = { missing: "Fehlt", owned: "Habe", duplicate: "Doppelt" };
const DEFAULT_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby0hA1vkJIGtZdNwk7jdTrBHgLL5_sO2DXAnxh5NKOnC8gFJz8_KyTDSh_wGkC7ODM8/exec";

let state = loadState();
let stickers = loadStickers();
let activeFilter = "all";
let searchTerm = "";
let adminSearchTerm = "";
let editingStickerId = null;
let addingSticker = false;

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function statusOf(id) {
  return state[id] || "missing";
}

function setStatus(id, status) {
  if (status === "missing") delete state[id];
  else state[id] = status;
  saveState();
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// ---------- Sticker-Datenbank (editierbar im Admin-Bereich) ----------

function loadStickers() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_STICKERS));
    if (Array.isArray(stored) && stored.length) return stored;
  } catch {
    // fall through to defaults
  }
  return structuredClone(DEFAULT_STICKERS);
}

function saveStickers() {
  localStorage.setItem(STORAGE_STICKERS, JSON.stringify(stickers));
}

function renameStatusKey(oldId, newId) {
  if (oldId === newId) return;
  if (Object.prototype.hasOwnProperty.call(state, oldId)) {
    state[newId] = state[oldId];
    delete state[oldId];
    saveState();
  }
  const dirty = loadDirty();
  const idx = dirty.indexOf(oldId);
  if (idx !== -1) {
    dirty[idx] = newId;
    saveDirty(dirty);
  }
}

function deleteStatusKey(id) {
  if (Object.prototype.hasOwnProperty.call(state, id)) {
    delete state[id];
    saveState();
  }
  saveDirty(loadDirty().filter((d) => d !== id));
}

function loadPendingDeletes() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_PENDING_DELETES)) || [];
  } catch {
    return [];
  }
}

function savePendingDeletes(ids) {
  localStorage.setItem(STORAGE_PENDING_DELETES, JSON.stringify(ids));
}

function markPendingDelete(id) {
  const pending = loadPendingDeletes();
  if (!pending.includes(id)) {
    pending.push(id);
    savePendingDeletes(pending);
  }
  updateSyncStatus();
}

function clearPendingDelete(id) {
  savePendingDeletes(loadPendingDeletes().filter((d) => d !== id));
  updateSyncStatus();
}

function rerenderAll() {
  buildAlbum();
  updateStats();
  applyFilters();
  renderAdmin();
}

// ---------- Google Sheet Sync ----------

function getScriptUrl() {
  const stored = localStorage.getItem(STORAGE_SCRIPT_URL);
  return stored !== null ? stored : DEFAULT_SCRIPT_URL;
}

function setScriptUrl(url) {
  localStorage.setItem(STORAGE_SCRIPT_URL, url);
}

function loadDirty() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_DIRTY)) || [];
  } catch {
    return [];
  }
}

function saveDirty(ids) {
  localStorage.setItem(STORAGE_DIRTY, JSON.stringify(ids));
}

function markDirty(id) {
  const dirty = loadDirty();
  if (!dirty.includes(id)) {
    dirty.push(id);
    saveDirty(dirty);
  }
  updateSyncStatus();
}

function clearDirty(id) {
  saveDirty(loadDirty().filter((d) => d !== id));
  updateSyncStatus();
}

async function syncSticker(id) {
  const url = getScriptUrl();
  if (!url) return;
  const sticker = stickers.find((s) => s.id === id);
  if (!sticker) return;
  try {
    await fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        id: sticker.id,
        number: sticker.number,
        title: sticker.title,
        area: sticker.area,
        type: sticker.type,
        section: sticker.section,
        status: statusOf(id),
      }),
    });
    clearDirty(id);
  } catch {
    // bleibt als offen markiert, wird beim naechsten Sync erneut versucht
  }
}

// Loescht einen Sticker auf dem Sheet, damit andere Geraete die Loeschung
// beim naechsten Abgleich uebernehmen. Wird ueber ein eigenes pending-deletes-
// Set nachverfolgt, da der Sticker lokal bereits entfernt ist.
async function syncStickerDelete(id) {
  const url = getScriptUrl();
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ id, action: "delete" }),
    });
    clearPendingDelete(id);
  } catch {
    // bleibt als offen markiert, wird beim naechsten Sync erneut versucht
  }
}

// Laedt die komplette lokale Stickerliste (inkl. aktuellem Sammelstatus) in
// einem Rutsch ins Sheet hoch und ersetzt dort den kompletten Bestand. Dient
// zum initialen Befuellen des Sheets sowie zum vollstaendigen Neuabgleich.
async function pushAllStickersToSheet() {
  const url = getScriptUrl();
  if (!url) return false;
  const payload = stickers.map((s) => ({ ...s, status: statusOf(s.id) }));
  try {
    await fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "bulkUpsert", stickers: payload }),
    });
    return true;
  } catch {
    return false;
  }
}

async function flushDirty() {
  for (const id of loadDirty()) {
    await syncSticker(id);
  }
}

async function flushPendingDeletes() {
  for (const id of loadPendingDeletes()) {
    await syncStickerDelete(id);
  }
}

// Das Sheet ist die vollstaendige Quelle fuer die Stickerliste (genau wie
// beim Sammelstatus): jeder Browser gleicht sich beim Start und per
// "Vom Sheet laden" auf exakt diesen Stand ab. Sticker, die lokal existieren
// aber nicht (mehr) im Sheet sind, wurden anderswo geloescht und werden
// ebenfalls entfernt - ausser sie haben noch nicht hochgeladene lokale
// Aenderungen (dirty/pending-deletes), die haben Vorrang.
async function pullFromSheet() {
  const url = getScriptUrl();
  if (!url) return false;
  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) throw new Error("bad response");
    const data = await res.json();
    if (!data || !Array.isArray(data.stickers)) throw new Error("invalid payload");

    const dirty = new Set(loadDirty());
    const pendingDeletes = new Set(loadPendingDeletes());
    // Aeltere Code.gs-Deployments liefern nur {id, status} zurueck (kein
    // Titel/Bereich/Kapitel). Nur mit vollstaendigem Schema wird die
    // Stickerliste selbst abgeglichen (Hinzufuegen/Aendern) - sonst
    // ausschliesslich der Sammelstatus, um keine Definitionen mit
    // Leerstrings zu ueberschreiben.
    const remoteHasFullSchema = data.stickers.length > 0 && "title" in data.stickers[0];
    // Sicherheitsnetz gegen Massen-Loeschung: Solange das Sheet nicht
    // erkennbar die vollstaendige Liste enthaelt (z.B. weil es noch nicht per
    // "Komplette Liste ins Sheet hochladen" befuellt wurde, sondern nur
    // organisch durch einzelne Statusaenderungen gewachsen ist), wird die
    // "Sticker fehlt im Sheet -> lokal entfernen"-Logik nicht angewendet.
    const remoteLooksComplete = data.stickers.length >= DEFAULT_STICKERS.length * 0.5;
    const remoteIds = new Set();
    let changed = false;

    for (const row of data.stickers) {
      remoteIds.add(row.id);
      if (dirty.has(row.id) || pendingDeletes.has(row.id)) continue;

      if (remoteHasFullSchema) {
        const remoteDef = {
          id: row.id,
          number: row.number || row.id,
          title: row.title || "",
          area: row.area || "",
          type: row.type || "-",
          section: row.section || row.area || "",
        };
        const idx = stickers.findIndex((s) => s.id === row.id);
        if (idx === -1) {
          // Auf einem anderen Geraet neu angelegter Sticker.
          stickers.push(remoteDef);
          changed = true;
        } else {
          const local = stickers[idx];
          const defChanged = ADMIN_FIELDS.some((field) => local[field] !== remoteDef[field]);
          if (defChanged) {
            stickers[idx] = remoteDef;
            changed = true;
          }
        }
      }

      if (statusOf(row.id) !== row.status) {
        setStatus(row.id, row.status);
        changed = true;
      }
    }

    if (remoteHasFullSchema && remoteLooksComplete) {
      const toRemove = stickers.filter(
        (s) => !remoteIds.has(s.id) && !dirty.has(s.id) && !pendingDeletes.has(s.id)
      );
      if (toRemove.length) {
        const removeIds = new Set(toRemove.map((s) => s.id));
        stickers = stickers.filter((s) => !removeIds.has(s.id));
        for (const id of removeIds) deleteStatusKey(id);
        changed = true;
      }
    }

    if (changed) {
      saveStickers();
      rerenderAll();
    }
    return true;
  } catch {
    return false;
  }
}

function updateSyncStatus() {
  const el = document.getElementById("sync-status");
  if (!el) return;
  const url = getScriptUrl();
  const pending = loadDirty().length + loadPendingDeletes().length;
  if (!url) {
    el.textContent = "Nicht verbunden.";
  } else if (pending > 0) {
    el.textContent = `Verbunden – ${pending} Sticker noch nicht synchronisiert.`;
  } else {
    el.textContent = "Verbunden – alles synchronisiert.";
  }
}

// ---------- Album rendering ----------

const INSERT_PREFIXES = ["Coca Cola", "McDonald's", "Extra", "Update"];
function isInsertType(type) {
  return INSERT_PREFIXES.some((p) => type.startsWith(p));
}

function buildAlbum() {
  const container = document.getElementById("groups");
  container.innerHTML = "";

  for (const section of deriveSections(stickers)) {
    const sectionStickers = stickers.filter((s) => s.section === section.name);
    const sectionBlock = document.createElement("div");
    sectionBlock.className = "section-block";
    sectionBlock.dataset.section = section.name;

    const sectionHead = document.createElement("div");
    sectionHead.className = "section-head";
    sectionHead.innerHTML = `
      <span class="section-badge" style="background:${teamColor(section.name)}">${escapeHtml(section.badge)}</span>
      <span class="section-name">${escapeHtml(section.name)}</span>
      <span class="section-fraction" data-role="section-fraction"></span>
    `;

    const grid = document.createElement("div");
    grid.className = "sticker-grid";
    for (const sticker of sectionStickers) {
      grid.appendChild(buildStickerEl(sticker));
    }

    sectionBlock.appendChild(sectionHead);
    sectionBlock.appendChild(grid);
    container.appendChild(sectionBlock);
  }
}

function buildStickerEl(sticker) {
  const special = isInsertType(sticker.type);
  const typeClass = sticker.type === "foil" ? "foil" : sticker.type === "silver" ? "silver" : "";
  const tag = special ? sticker.area : sticker.type !== "-" ? sticker.type : "";

  const el = document.createElement("div");
  el.className = `sticker ${typeClass} ${statusOf(sticker.id)}`.trim();
  el.dataset.id = sticker.id;
  el.dataset.area = sticker.area.toLowerCase();
  el.dataset.title = sticker.title.toLowerCase();
  el.dataset.number = sticker.number.toLowerCase();
  el.title = `${sticker.id} ${sticker.area} - ${sticker.title}`;
  el.innerHTML = `
    ${tag ? `<span class="pos">${escapeHtml(tag)}</span>` : ""}
    <span class="num">${escapeHtml(sticker.number)}</span>
    <span class="label">${escapeHtml(sticker.title)}</span>
  `;
  return el;
}

function cycleSticker(id) {
  const next = STATUS_CYCLE[statusOf(id)];
  setStatus(id, next);
  const el = document.querySelector(`.sticker[data-id="${CSS.escape(id)}"]`);
  if (el) {
    el.classList.remove("missing", "owned", "duplicate");
    el.classList.add(next);
  }
  updateStats();
  applyFilters();
  markDirty(id);
  syncSticker(id);
}

document.getElementById("groups").addEventListener("click", (e) => {
  const el = e.target.closest(".sticker");
  if (!el) return;
  cycleSticker(el.dataset.id);
});

// ---------- Filtering & search ----------

function applyFilters() {
  const term = searchTerm.trim().toLowerCase();
  let anyVisible = false;

  document.querySelectorAll(".section-block").forEach((sectionEl) => {
    let sectionHasVisible = false;
    const owned = [];
    const total = [];
    sectionEl.querySelectorAll(".sticker").forEach((s) => {
      const status = statusOf(s.dataset.id);
      total.push(s);
      if (status !== "missing") owned.push(s);
      // "Habe" umfasst auch Doppelte - passend zur Kopfzeilen-Summe.
      const matchesFilter =
        activeFilter === "all" ||
        status === activeFilter ||
        (activeFilter === "owned" && status === "duplicate");
      const matchesSearch =
        !term ||
        s.dataset.number.includes(term) ||
        s.dataset.area.includes(term) ||
        s.dataset.title.includes(term);
      const visible = matchesFilter && matchesSearch;
      s.hidden = !visible;
      if (visible) sectionHasVisible = true;
    });
    sectionEl.hidden = !sectionHasVisible;
    if (sectionHasVisible) anyVisible = true;
    const fractionEl = sectionEl.querySelector('[data-role="section-fraction"]');
    if (fractionEl) fractionEl.textContent = `${owned.length}/${total.length}`;
  });

  document.getElementById("empty-state").hidden = anyVisible;
}

document.getElementById("search").addEventListener("input", (e) => {
  searchTerm = e.target.value;
  applyFilters();
});

document.getElementById("filter-chips").addEventListener("click", (e) => {
  const btn = e.target.closest(".chip");
  if (!btn) return;
  document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
  btn.classList.add("active");
  activeFilter = btn.dataset.filter;
  applyFilters();
});

// ---------- Stats ----------

function updateStats() {
  let owned = 0, duplicate = 0;
  for (const sticker of stickers) {
    const s = statusOf(sticker.id);
    if (s === "owned") owned++;
    else if (s === "duplicate") duplicate++;
  }
  const total = stickers.length;
  const collected = owned + duplicate;
  const missing = total - collected;

  // "Habe" zaehlt auch Doppelte mit - man besitzt den Sticker ja trotzdem.
  document.getElementById("stat-owned").textContent = collected;
  document.getElementById("stat-duplicate").textContent = duplicate;
  document.getElementById("stat-missing").textContent = missing;
  document.getElementById("progress-label").textContent = `${collected} / ${total} Sticker`;
  document.getElementById("progress-fill").style.width = total ? `${(collected / total) * 100}%` : "0%";

  renderLists();
}

function renderLists() {
  const missingEl = document.getElementById("missing-list");
  const duplicateEl = document.getElementById("duplicate-list");
  missingEl.innerHTML = "";
  duplicateEl.innerHTML = "";

  const missing = stickers.filter((s) => statusOf(s.id) === "missing");
  const duplicate = stickers.filter((s) => statusOf(s.id) === "duplicate");

  if (!missing.length) {
    missingEl.innerHTML = '<span class="empty">Alles vollstaendig!</span>';
  } else {
    for (const s of missing) {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = s.id;
      missingEl.appendChild(tag);
    }
  }

  if (!duplicate.length) {
    duplicateEl.innerHTML = '<span class="empty">Noch keine Doppelten</span>';
  } else {
    for (const s of duplicate) {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = s.id;
      duplicateEl.appendChild(tag);
    }
  }
}

document.querySelectorAll(".copy-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const kind = btn.dataset.copy;
    const list = stickers.filter((s) => statusOf(s.id) === kind);
    const text = list.map((s) => `${s.id} - ${s.area}: ${s.title}`).join("\n");
    try {
      await navigator.clipboard.writeText(text || "Leer");
      showToast("In Zwischenablage kopiert");
    } catch {
      showToast("Kopieren nicht moeglich");
    }
  });
});

// ---------- Tabs ----------

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
  });
});

// ---------- Admin: Sticker verwalten ----------

const ADMIN_FIELDS = ["id", "number", "title", "area", "type", "section"];
const ADMIN_LABELS = { id: "ID", number: "Nummer", title: "Titel", area: "Bereich", type: "Typ", section: "Kapitel" };

function renderAdmin() {
  const countEl = document.getElementById("admin-count");
  const listEl = document.getElementById("admin-list");
  const addSlot = document.getElementById("admin-add-slot");
  if (!listEl) return;

  const term = adminSearchTerm.trim().toLowerCase();
  const matches = (s) =>
    !term ||
    s.id.toLowerCase().includes(term) ||
    s.title.toLowerCase().includes(term) ||
    s.area.toLowerCase().includes(term) ||
    s.section.toLowerCase().includes(term);
  const filtered = stickers.filter(matches);

  countEl.textContent = `${filtered.length} / ${stickers.length} Sticker`;

  addSlot.innerHTML = "";
  if (addingSticker) {
    addSlot.appendChild(buildAdminForm(null));
  }

  listEl.innerHTML = "";
  if (!filtered.length) {
    listEl.innerHTML = '<p class="empty-state">Keine Sticker gefunden.</p>';
    return;
  }

  const frag = document.createDocumentFragment();
  for (const section of deriveSections(stickers)) {
    const sectionStickers = filtered.filter((s) => s.section === section.name);
    if (!sectionStickers.length) continue;

    const head = document.createElement("div");
    head.className = "section-head admin-section-head";
    head.innerHTML = `
      <span class="section-badge" style="background:${teamColor(section.name)}">${escapeHtml(section.badge)}</span>
      <span class="section-name">${escapeHtml(section.name)}</span>
      <span class="section-fraction">${sectionStickers.length}</span>
    `;
    frag.appendChild(head);

    for (const sticker of sectionStickers) {
      frag.appendChild(editingStickerId === sticker.id ? buildAdminForm(sticker) : buildAdminRow(sticker));
    }
  }
  listEl.appendChild(frag);
}

function buildAdminRow(sticker) {
  const row = document.createElement("div");
  row.className = "admin-row";
  row.innerHTML = `
    <div class="admin-row-main">
      <strong>${escapeHtml(sticker.id)}</strong>
      <span>${escapeHtml(sticker.title)}</span>
      <span class="admin-row-meta">${escapeHtml(sticker.area)} &middot; ${escapeHtml(sticker.section)}</span>
    </div>
    <div class="admin-row-actions">
      <button class="btn admin-edit-btn" type="button">Bearbeiten</button>
      <button class="btn btn-danger admin-delete-btn" type="button">Loeschen</button>
    </div>
  `;
  row.querySelector(".admin-edit-btn").addEventListener("click", () => {
    editingStickerId = sticker.id;
    addingSticker = false;
    renderAdmin();
  });
  row.querySelector(".admin-delete-btn").addEventListener("click", () => {
    if (!confirm(`"${sticker.id} - ${sticker.title}" wirklich loeschen?`)) return;
    stickers = stickers.filter((s) => s.id !== sticker.id);
    saveStickers();
    deleteStatusKey(sticker.id);
    markPendingDelete(sticker.id);
    syncStickerDelete(sticker.id);
    rerenderAll();
    showToast("Sticker geloescht");
  });
  return row;
}

function buildAdminForm(sticker) {
  const isNew = !sticker;
  const values = sticker || { id: "", number: "", title: "", area: "", type: "-", section: "" };

  const wrap = document.createElement("div");
  wrap.className = "admin-row admin-row-edit";

  const form = document.createElement("div");
  form.className = "admin-form";
  for (const field of ADMIN_FIELDS) {
    const label = document.createElement("label");
    label.textContent = ADMIN_LABELS[field];
    const input = document.createElement("input");
    input.type = "text";
    input.className = `af-${field}`;
    input.value = values[field];
    label.appendChild(input);
    form.appendChild(label);
  }
  wrap.appendChild(form);

  const actions = document.createElement("div");
  actions.className = "admin-row-actions";
  const saveBtn = document.createElement("button");
  saveBtn.className = "btn";
  saveBtn.type = "button";
  saveBtn.textContent = isNew ? "Hinzufuegen" : "Speichern";
  const cancelBtn = document.createElement("button");
  cancelBtn.className = "btn";
  cancelBtn.type = "button";
  cancelBtn.textContent = "Abbrechen";
  actions.appendChild(saveBtn);
  actions.appendChild(cancelBtn);
  wrap.appendChild(actions);

  cancelBtn.addEventListener("click", () => {
    editingStickerId = null;
    addingSticker = false;
    renderAdmin();
  });

  saveBtn.addEventListener("click", () => {
    const next = {};
    for (const field of ADMIN_FIELDS) {
      next[field] = form.querySelector(`.af-${field}`).value.trim();
    }
    if (!next.id || !next.title || !next.area || !next.section) {
      showToast("ID, Titel, Bereich und Kapitel sind Pflichtfelder");
      return;
    }
    if (!next.number) next.number = next.id;
    if (!next.type) next.type = "-";

    const idCollision = stickers.some((s) => s.id === next.id && (isNew || s.id !== values.id));
    if (idCollision) {
      showToast(`ID "${next.id}" ist bereits vergeben`);
      return;
    }

    const idRenamed = !isNew && values.id !== next.id;

    if (isNew) {
      stickers.push(next);
    } else {
      const idx = stickers.findIndex((s) => s.id === values.id);
      if (idx !== -1) stickers[idx] = next;
      renameStatusKey(values.id, next.id);
    }
    saveStickers();

    if (idRenamed) {
      // Alte ID auf dem Sheet als geloescht markieren, neue ID als neuer Sticker pushen.
      markPendingDelete(values.id);
      syncStickerDelete(values.id);
    }
    markDirty(next.id);
    syncSticker(next.id);

    editingStickerId = null;
    addingSticker = false;
    rerenderAll();
    showToast(isNew ? "Sticker hinzugefuegt" : "Sticker gespeichert");
  });

  return wrap;
}

document.getElementById("admin-search").addEventListener("input", (e) => {
  adminSearchTerm = e.target.value;
  renderAdmin();
});

document.getElementById("btn-admin-add").addEventListener("click", () => {
  addingSticker = !addingSticker;
  editingStickerId = null;
  renderAdmin();
});

document.getElementById("btn-admin-reset").addEventListener("click", () => {
  if (!confirm("Wirklich alle Aenderungen an der Stickerliste verwerfen und die Standardliste wiederherstellen?")) return;
  stickers = structuredClone(DEFAULT_STICKERS);
  saveStickers();
  editingStickerId = null;
  addingSticker = false;
  rerenderAll();
  showToast("Stickerliste zurueckgesetzt");
});

// ---------- Settings: Google Sheet sync ----------

document.getElementById("btn-save-script-url").addEventListener("click", () => {
  const input = document.getElementById("script-url");
  setScriptUrl(input.value.trim());
  updateSyncStatus();
  showToast("Sheet-Verbindung gespeichert");
});

document.getElementById("btn-sync-now").addEventListener("click", async () => {
  const url = getScriptUrl();
  if (!url) {
    showToast("Bitte zuerst die Apps-Script-URL speichern");
    return;
  }
  if (!loadDirty().length && !loadPendingDeletes().length) {
    showToast("Bereits alles synchronisiert");
    return;
  }
  await flushDirty();
  await flushPendingDeletes();
  showToast("Synchronisierung abgeschlossen");
});

document.getElementById("btn-pull-sheet").addEventListener("click", async () => {
  const url = getScriptUrl();
  if (!url) {
    showToast("Bitte zuerst die Apps-Script-URL speichern");
    return;
  }
  const ok = await pullFromSheet();
  showToast(ok ? "Stand vom Sheet geladen" : "Laden vom Sheet fehlgeschlagen");
});

document.getElementById("btn-push-all").addEventListener("click", async () => {
  const url = getScriptUrl();
  if (!url) {
    showToast("Bitte zuerst die Apps-Script-URL speichern");
    return;
  }
  if (!confirm(`Die komplette lokale Stickerliste (${stickers.length} Sticker) ins Sheet hochladen? Das ersetzt den kompletten Sheet-Inhalt.`)) return;
  const ok = await pushAllStickersToSheet();
  showToast(ok ? "Komplette Liste hochgeladen" : "Hochladen fehlgeschlagen");
});

// ---------- Settings: export / import / reset ----------

document.getElementById("btn-export").addEventListener("click", () => {
  const payload = { version: 1, exportedAt: new Date().toISOString(), state };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `panini-wm26-sicherung-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Sicherung exportiert");
});

document.getElementById("btn-import").addEventListener("click", () => {
  document.getElementById("file-import").click();
});

document.getElementById("file-import").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!data || typeof data.state !== "object") throw new Error("invalid");
    state = data.state;
    saveState();
    rerenderAll();
    showToast("Sicherung importiert");
  } catch {
    showToast("Datei ungueltig");
  }
  e.target.value = "";
});

document.getElementById("btn-reset").addEventListener("click", () => {
  if (!confirm("Wirklich den gesamten Fortschritt loeschen?")) return;
  state = {};
  saveState();
  rerenderAll();
  showToast("Fortschritt zurueckgesetzt");
});

// ---------- Toast ----------

let toastTimer;
function showToast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 2000);
}

// ---------- Pull-to-refresh: an oberster Stelle nach unten ziehen, um mit dem Sheet abzugleichen ----------

(function setupPullToRefresh() {
  const el = document.getElementById("pull-refresh");
  if (!el) return;

  const THRESHOLD = 68;
  const MAX_PULL = 100;
  let startY = null;
  let pulling = false;
  let refreshing = false;

  function reset() {
    el.classList.remove("dragging");
    el.classList.add("snap");
    el.style.transform = "";
    el.dataset.ready = "0";
    startY = null;
    pulling = false;
  }

  document.addEventListener(
    "touchstart",
    (e) => {
      if (refreshing || window.scrollY > 0) return;
      startY = e.touches[0].clientY;
      pulling = true;
      el.classList.remove("snap");
    },
    { passive: true }
  );

  document.addEventListener(
    "touchmove",
    (e) => {
      if (!pulling || startY === null || refreshing) return;
      const delta = e.touches[0].clientY - startY;
      if (window.scrollY > 0 || delta <= 0) {
        reset();
        return;
      }
      e.preventDefault();
      const damped = Math.min(delta * 0.5, MAX_PULL);
      el.classList.add("dragging");
      el.style.transform = `translateY(${damped}px)`;
      el.dataset.ready = damped >= THRESHOLD ? "1" : "0";
    },
    { passive: false }
  );

  document.addEventListener("touchend", async () => {
    if (!pulling) return;
    const ready = el.dataset.ready === "1";
    pulling = false;
    el.classList.remove("dragging");
    el.classList.add("snap");

    if (!ready) {
      reset();
      return;
    }

    refreshing = true;
    el.classList.add("loading");
    el.style.transform = `translateY(${THRESHOLD}px)`;

    const url = getScriptUrl();
    if (!url) {
      showToast("Keine Sheet-Verbindung eingerichtet");
    } else {
      const ok = await pullFromSheet();
      showToast(ok ? "Stand aktualisiert" : "Sheet nicht erreichbar");
    }

    el.classList.remove("loading");
    reset();
    refreshing = false;
  });
})();

// ---------- Init ----------

buildAlbum();
updateStats();
applyFilters();
renderAdmin();
document.getElementById("script-url").value = getScriptUrl();
updateSyncStatus();

// Beim Start zuerst eigene ausstehende Aenderungen hochladen, dann mit dem
// Sheet abgleichen, damit Aenderungen von anderen Geraeten (z.B. Handy <->
// Desktop) uebernommen werden - inkl. im Admin-Bereich hinzugefuegter,
// bearbeiteter oder geloeschter Sticker.
(async () => {
  await flushDirty();
  await flushPendingDeletes();
  await pullFromSheet();
})();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
