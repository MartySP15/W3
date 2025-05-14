
// v13 manual-entry app (IndexedDB storage)
const DB_KEY = "whiskey_tastings_v13";
const { get, set } = idbKeyval;
const qs = sel => document.querySelector(sel);
const toBase64 = f => new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(f); });

async function load()  { return (await get(DB_KEY)) || []; }
async function save(a) { await set(DB_KEY, a); }

qs("#scoreRange").addEventListener("input", e => qs("#scoreShow").textContent = e.target.value);

qs("#tastingForm").addEventListener("submit", async e => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const obj = {};
  for (const [k, v] of fd.entries()) {
    if (k === "photo" && v instanceof File && v.size) obj[k] = await toBase64(v);
    else obj[k] = v;
  }
  const data = await load();
  data.unshift(obj);
  await save(data);
  e.target.reset();
  qs("#scoreRange").value = 3; qs("#scoreShow").textContent = 3;
  render();
});

qs("#clearBtn").addEventListener("click", async () => {
  if (confirm("Delete all tastings?")) { await set(DB_KEY, []); render(); }
});

qs("#exportBtn").addEventListener("click", async () => {
  const data = await load();
  if (!data.length) return alert("Nothing to export.");
  const headers = Object.keys(data[0]);
  const rows = [headers.join(",")];
  data.forEach(o => rows.push(headers.map(h => `"${(o[h] || "").toString().replace(/"/g, '""')}"`).join(",")));
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "whiskey_tastings.csv";
  a.click();
});

qs("#pdfBtn").addEventListener("click", async () => {
  if (!window.jspdf) return alert("jsPDF not loaded.");
  const { jsPDF } = window.jspdf;
  const data = await load();
  if (!data.length) return alert("Nothing to export.");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = 15;
  doc.setFontSize(16);
  doc.text("Whiskey Live 2025 – Tasting Notes", 15, y);
  y += 8;
  data.forEach((t, i) => {
    doc.setFontSize(12);
    doc.text(`${i + 1}. ${t.name || "Unnamed"} (${t.score || "-"}/5)`, 15, y);
    y += 6;
    [["Distillery", t.distillery], ["Country", t.country], ["Date", t.date]].forEach(([l, v]) => {
      if (!v) return;
      doc.setFont(undefined, "bold");
      doc.text(l + ":", 15, y);
      doc.setFont(undefined, "normal");
      doc.text(String(v), 40, y);
      y += 5;
    });
    y += 4;
    if (y > 270 && i < data.length - 1) { doc.addPage(); y = 15; }
  });
  doc.save("whiskey_tastings.pdf");
});

async function render() {
  const list = qs("#tastingsList");
  list.innerHTML = "";
  const data = await load();
  if (!data.length) { list.innerHTML = "<p>No tastings yet.</p>"; return; }
  data.forEach(t => {
    const div = document.createElement("div");
    div.className = "entry";
    const img = t.photo ? `<img src="${t.photo}" class="thumb">` : "";
    div.innerHTML = `<div class="row">${img}<div>
      <div class="entry-title">${t.name || "Unnamed"} (${t.score || "-"}/5)</div>
      <div><strong>Distillery:</strong> ${t.distillery || ""}</div>
      <div><strong>Country:</strong> ${t.country || ""}</div>
      <div><strong>Date:</strong> ${t.date || ""}</div></div></div>`;
    list.appendChild(div);
  });
}

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
render();
