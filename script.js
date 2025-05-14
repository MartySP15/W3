
// v14 with File System Access API
const DB_KEY = "whiskey_tastings_v14";
const DIR_KEY = "whiskey_photo_dir";
const { get, set } = idbKeyval;
const qs = s => document.querySelector(s);

async function load(){ return (await get(DB_KEY)) || []; }
async function save(arr){ await set(DB_KEY, arr); }
async function getDir(){ return await get(DIR_KEY); }

// choose folder button
qs("#chooseDirBtn").addEventListener("click", async () => {
  if (!window.showDirectoryPicker){ alert("Your browser lacks File System Access API."); return; }
  try{
    const handle = await window.showDirectoryPicker();
    await set(DIR_KEY, handle);
    alert("Folder saved!");
  }catch(e){ console.log(e); }
});

qs("#scoreRange").addEventListener("input", e => qs("#scoreShow").textContent = e.target.value);

// helper to resize for thumbnail
function resizeBlob(file, max=200){ return new Promise(res=>{
  const img = new Image();
  img.onload = ()=>{
    const scale = Math.min(max/img.width, max/img.height, 1);
    const c = document.createElement("canvas"); c.width = img.width*scale; c.height = img.height*scale;
    c.getContext("2d").drawImage(img,0,0,c.width,c.height);
    c.toBlob(b=>res(b),"image/jpeg",0.7);
  };
  img.src = URL.createObjectURL(file);
}); }

const toBase64 = blob => new Promise(r=>{ const fr=new FileReader(); fr.onload=()=>r(fr.result); fr.readAsDataURL(blob); });

qs("#tastingForm").addEventListener("submit", async e => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const obj = {};
  for(const [k,v] of fd.entries()){
    if(k==="photo" && v instanceof File && v.size){
      let saved = false;
      const dir = await getDir();
      if(dir){
        const perm = await dir.requestPermission({mode:"readwrite"});
        if(perm === "granted"){
          const name = `whiskey_${Date.now()}.jpg`;
          const fh = await dir.getFileHandle(name,{create:true});
          const ws = await fh.createWritable();
          await ws.write(v); await ws.close();
          obj.photoPath = name;
          obj.photoThumb = await toBase64(await resizeBlob(v));
          saved = true;
        }
      }
      if(!saved){
        obj.photoThumb = await toBase64(await resizeBlob(v,400));
      }
    }else obj[k] = v;
  }
  const data = await load(); data.unshift(obj); await save(data);
  e.target.reset(); qs("#scoreRange").value=3; qs("#scoreShow").textContent=3;
  render();
});

qs("#clearBtn").addEventListener("click", async ()=>{ if(confirm("Clear all?")){ await save([]); render(); } });

qs("#exportBtn").addEventListener("click", async ()=>{
  const data = await load(); if(!data.length) return alert("No data");
  const h = Object.keys(data[0]); const rows=[h.join(",")];
  data.forEach(o=>rows.push(h.map(k=>`"${(o[k]||'').toString().replace(/"/g,'""')}"`).join(",")));
  const blob = new Blob([rows.join("\n")], {type:"text/csv"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="whiskey_tastings.csv"; a.click();
});

async function render(){
  const list = qs("#tastingsList"); list.innerHTML="";
  const data = await load();
  if(!data.length){ list.textContent="No tastings yet."; return; }
  data.forEach(t=>{
    const div=document.createElement("div"); div.className="entry";
    const img = t.photoThumb ? `<img src="${t.photoThumb}" class="thumb">` : "";
    div.innerHTML = `<div class="row">${img}<div><div class="entry-title">${t.name||"Unnamed"} (${t.score||"-"}/5)</div><div><strong>Distillery:</strong> ${t.distillery||""}</div><div><strong>Date:</strong> ${t.date||""}</div></div></div>`;
    list.appendChild(div);
  });
}

if("serviceWorker" in navigator){ navigator.serviceWorker.register("sw.js"); }
render();
