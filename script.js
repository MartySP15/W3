
const STORE='whiskey_v12';
const {get,set}=idbKeyval;
const qs=s=>document.querySelector(s);
const to64=f=>new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result);fr.readAsDataURL(f);});

async function load(){return await get(STORE)||[];}
async function save(arr){await set(STORE,arr);}

qs('#scoreRange').addEventListener('input',e=>qs('#scoreShow').textContent=e.target.value);

qs('#tastingForm').addEventListener('submit',async e=>{
 e.preventDefault();
 const fd=new FormData(e.target);const o={};
 for(const[k,v] of fd.entries()){o[k]=(k==='photo'&&v.size)?await to64(v):v;}
 const data=await load();data.unshift(o);await save(data);e.target.reset();render();
});

qs('#clearBtn').addEventListener('click',async()=>{if(confirm('Clear?')){await save([]);render();}});

qs('#exportBtn').addEventListener('click',async()=>{const d=await load();if(!d.length)return;
 const h=Object.keys(d[0]), rows=[h.join(',')];
 d.forEach(o=>rows.push(h.map(k=>`"${(o[k]||'').replace(/"/g,'""')}"`).join(',')));
 const blob=new Blob([rows.join('\n')],{type:'text/csv'});const a=document.createElement('a');
 a.href=URL.createObjectURL(blob);a.download='tastings.csv';a.click();
});

async function render(){
 const list=qs('#tastings'); list.innerHTML='';
 const d=await load(); if(!d.length){list.textContent='No tastings';return;}
 d.forEach(t=>{const div=document.createElement('div');div.className='entry';
 div.textContent=`${t.name||'Unnamed'} – ${t.score||'-'}/5`;list.appendChild(div);});
}
render();
