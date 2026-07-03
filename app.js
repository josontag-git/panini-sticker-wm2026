const STORAGE_KEY = "panini-wm26-state-v1";
const STORAGE_SCRIPT_URL = "panini-wm26-script-url";
const STORAGE_DIRTY = "panini-wm26-dirty-v1";
const STATUS_CYCLE = { missing: "owned", owned: "duplicate", duplicate: "missing" };
const STATUS_LABEL = { missing: "Fehlt", owned: "Habe", duplicate: "Doppelt" };
const DEFAULT_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby0hA1vkJIGtZdNwk7jdTrBHgLL5_sO2DXAnxh5NKOnC8gFJz8_KyTDSh_wGkC7ODM8/exec";

let state = loadState();
let activeFilter = "all";
let searchTerm = "";

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
  const sticker = STICKERS.find((s) => s.id === id);
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

function updateSyncStatus() {
  const el = document.getElementById("sync-status");
  if (!el) return;
  const url = getScriptUrl();
  const pending = loadDirty().length;
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

  for (const section of SECTIONS) {
    const sectionStickers = STICKERS.filter((s) => s.section === section.name);
    const sectionBlock = document.createElement("div");
    sectionBlock.className = "section-block";
    sectionBlock.dataset.section = section.name;

    const sectionHead = document.createElement("div");
    sectionHead.className = "section-head";
    sectionHead.innerHTML = `
      <span class="section-badge" style="background:${teamColor(section.name)}">${section.badge}</span>
      <span class="section-name">${section.name}</span>
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
    ${tag ? `<span class="pos">${tag}</span>` : ""}
    <span class="num">${sticker.number}</span>
    <span class="label">${sticker.title}</span>
  `;
  return el;
}

function cycleSticker(id) {
  const next = STATUS_CYCLE[statusOf(id)];
  setStatus(id, next);
  const el = document.querySelector(`.sticker[data-id="${id}"]`);
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
  for (const sticker of STICKERS) {
    const s = statusOf(sticker.id);
    if (s === "owned") owned++;
    else if (s === "duplicate") duplicate++;
  }
  const total = STICKERS.length;
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

  const missing = STICKERS.filter((s) => statusOf(s.id) === "missing");
  const duplicate = STICKERS.filter((s) => statusOf(s.id) === "duplicate");

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
    const list = STICKERS.filter((s) => statusOf(s.id) === kind);
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
  const dirty = loadDirty();
  if (!dirty.length) {
    showToast("Bereits alles synchronisiert");
    return;
  }
  for (const id of dirty) {
    await syncSticker(id);
  }
  showToast("Synchronisierung abgeschlossen");
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
    document.querySelectorAll(".sticker").forEach((el) => {
      const status = statusOf(el.dataset.id);
      el.classList.remove("missing", "owned", "duplicate");
      el.classList.add(status);
    });
    updateStats();
    applyFilters();
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
  document.querySelectorAll(".sticker").forEach((el) => {
    el.classList.remove("missing", "owned", "duplicate");
    el.classList.add("missing");
  });
  updateStats();
  applyFilters();
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

// ---------- Init ----------

buildAlbum();
updateStats();
applyFilters();
document.getElementById("script-url").value = getScriptUrl();
updateSyncStatus();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
