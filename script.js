
/* v15: Dexie + thumbnails + optional original save + ZIP export */
const db = new Dexie("WhiskeyDB");
db.version(1).stores({ tastings:"++id,date,name,distillery", meta:"key" });

const pickBtn = document.getElementById("pickFolderBtn");
let dirHandle = null;

(async()=>{ const m = await db.meta.get("photoDir"); dirHandle = m?.handle; })();

pickBtn.addEventListener("click", async ()=>{
  if(!window.showDirectoryPicker){ alert("Browser lacks File System Access API."); return; }
  try{ dirHandle = await window.showDirectoryPicker(); await db.meta.put({key:"photoDir",handle:dirHandle}); alert("Folder selected!"); }catch(e){ console.log(e); }
});

function makeThumb(file,max=600){ return new Promise(async res=>{
  const img = await createImageBitmap(file);
  const scale=Math.min(max/img.width,max/img.height,1);
  const c=new OffscreenCanvas(img.width*scale,img.height*scale);
  c.getContext("2d").drawImage(img,0,0,c.width,c.height);
  const blob=await c.convertToBlob({type:"image/webp",quality:.8});
  res(blob);
});}
const toB64 = b=>new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result);fr.readAsDataURL(b);});

document.getElementById("scoreRange").addEventListener("input",e=>document.getElementById("scoreShow").textContent=e.target.value);

document.getElementById("tastingForm").addEventListener("submit", async e=>{
  e.preventDefault();
  const fd=new FormData(e.target); const rec=Object.fromEntries(fd);
  const file=fd.get("photo");
  if(file&&file.size){
    rec.thumb=await toB64(await makeThumb(file));
    if(dirHandle){
      try{
        if(await dirHandle.requestPermission({mode:"readwrite"})==="granted"){
          const name=`whiskey_${Date.now()}.jpg`;
          const fh=await dirHandle.getFileHandle(name,{create:true});
          const ws=await fh.createWritable(); await ws.write(file); await ws.close();
          rec.photo=name;
        }
      }catch(err){console.log(err);}
    }
  }
  await db.tastings.add(rec);
  e.target.reset(); document.getElementById("scoreRange").value=3; document.getElementById("scoreShow").textContent=3;
  render();
});

document.getElementById("clearBtn").addEventListener("click", async()=>{if(confirm("Delete all tastings?")){await db.tastings.clear(); render();}});

document.getElementById("exportBtn").addEventListener("click", async ()=>{
  const rows=await db.tastings.toArray(); if(!rows.length) return alert("No data");
  const JSZip=(await import("https://cdn.jsdelivr.net/npm/jszip@3/dist/jszip.min.js")).default;
  const zip=new JSZip(); zip.file("tastings.json",JSON.stringify(rows,null,2));
  rows.forEach(t=>{ if(t.thumb) zip.file(`thumbs/${t.name||t.id}.webp`, t.thumb.split(",")[1], {base64:true}); });
  const blob=await zip.generateAsync({type:"blob"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="whiskey_backup.zip"; a.click();
});

async function render(){
  const list=document.getElementById("tastingsList"); list.innerHTML="";
  const data=await db.tastings.toArray();
  if(!data.length){ list.textContent="No tastings yet."; return; }
  data.forEach(t=>{
    const div=document.createElement("div"); div.className="entry";
    const img=t.thumb?`<img src="${t.thumb}" class="thumb">`:"";
    div.innerHTML=`<div class="row">${img}<div><div class="entry-title">${t.name||"Unnamed"} (${t.score||"-"}/5)</div><div>${t.date||""}</div></div></div>`;
    list.appendChild(div);
  });
}
render();
