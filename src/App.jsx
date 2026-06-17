import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";

// 가족이 공유하는 단일 Firestore 문서 (collection: inventory, doc: shared)
const DOC_REF = () => doc(db, "inventory", "shared");

const ICONS=["🛏️","🛋️","🍳","📚","🚿","🚪","👕","📦","🧹","🎮","🧸","🌿"];
const PALETTE=[{bg:"#EEF2FF",border:"#818CF8",text:"#4338CA"},{bg:"#ECFDF5",border:"#34D399",text:"#065F46"},{bg:"#FFF7ED",border:"#FB923C",text:"#9A3412"},{bg:"#FDF2F8",border:"#F472B6",text:"#9D174D"},{bg:"#F0F9FF",border:"#38BDF8",text:"#075985"},{bg:"#FEFCE8",border:"#FACC15",text:"#854D0E"},{bg:"#F5F3FF",border:"#A78BFA",text:"#5B21B6"},{bg:"#FFF1F2",border:"#FB7185",text:"#9F1239"},{bg:"#F0FDFA",border:"#2DD4BF",text:"#115E59"},{bg:"#FEF3C7",border:"#F59E0B",text:"#92400E"},{bg:"#E0E7FF",border:"#6366F1",text:"#3730A3"},{bg:"#D1FAE5",border:"#10B981",text:"#047857"}];
const COLS=12,ROWS=8,RC=10,RR=8,DAY_NAMES=["일","월","화","수","목","금","토"];
const toDay=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;};
const fmt=d=>{if(!d)return"";const[y,m,dd]=d.split("-");return `${y}.${m}.${dd}`;};
let _s=Date.now();const uid=()=>`_${_s++}`;

const FURN=[{id:"bed",icon:"🛏️",name:"침대",w:4,h:3,bg:"#EDE9FE",bd:"#A78BFA"},{id:"desk",icon:"🪑",name:"책상",w:3,h:2,bg:"#FEF3C7",bd:"#F59E0B"},{id:"closet",icon:"👕",name:"옷장",w:3,h:2,bg:"#FCE7F3",bd:"#EC4899"},{id:"shelf",icon:"📚",name:"선반/책장",w:4,h:1,bg:"#DBEAFE",bd:"#3B82F6"},{id:"drawer",icon:"🗄️",name:"서랍장",w:2,h:2,bg:"#FEE2E2",bd:"#F87171"},{id:"cabinet",icon:"📦",name:"수납장",w:2,h:2,bg:"#D1FAE5",bd:"#34D399"},{id:"tv",icon:"📺",name:"TV장",w:4,h:1,bg:"#E0E7FF",bd:"#6366F1"},{id:"fridge",icon:"🧊",name:"냉장고",w:2,h:2,bg:"#CFFAFE",bd:"#06B6D4"},{id:"washer",icon:"🧺",name:"세탁기",w:2,h:2,bg:"#F3E8FF",bd:"#A855F7"},{id:"sink",icon:"🚰",name:"세면대",w:3,h:1,bg:"#ECFEFF",bd:"#22D3EE"},{id:"shoe",icon:"👟",name:"신발장",w:3,h:1,bg:"#FFF7ED",bd:"#FB923C"},{id:"other",icon:"📌",name:"기타",w:2,h:2,bg:"#F1F5F9",bd:"#94A3B8"}];
const furnById=id=>FURN.find(f=>f.id===id)||FURN[FURN.length-1];
const guessType=n=>{const m=[["침대","bed"],["책상","desk"],["옷장","closet"],["책장","shelf"],["선반","shelf"],["서랍","drawer"],["수납","cabinet"],["tv","tv"],["TV","tv"],["냉장고","fridge"],["세탁","washer"],["세면","sink"],["신발","shoe"]];for(const[k,v]of m)if(n.includes(k))return v;return "other";};

// Tree helpers (no JSX, safe outside component)
const countAll=n=>{let c=(n.items||[]).length;(n.children||[]).forEach(ch=>{c+=countAll(ch);});return c;};
const updateAtPath=(locs,path,fn)=>{if(!path.length)return locs;if(path.length===1)return locs.map(l=>l.id===path[0]?fn(l):l);return locs.map(l=>{if(l.id!==path[0])return l;return{...l,children:updateCh(l.children||[],path.slice(1),fn)};});};
const updateCh=(ch,path,fn)=>{if(path.length===1)return ch.map(c=>c.id===path[0]?fn(c):c);return ch.map(c=>{if(c.id!==path[0])return c;return{...c,children:updateCh(c.children||[],path.slice(1),fn)};});};
const flattenNode=(node,pathStr,rId,rIcon,nav)=>{let items=(node.items||[]).map(it=>({...it,path:pathStr,roomId:rId,navPath:[...nav],roomIcon:rIcon}));(node.children||[]).forEach(ch=>{items=[...items,...flattenNode(ch,`${pathStr} › ${ch.name}`,rId,rIcon,[...nav,ch.id])];});return items;};

const SAMPLE={rooms:[
  {id:"r1",name:"안방",icon:"🛏️",layout:{x:0,y:0,w:5,h:4},locations:[
    {id:"l1",name:"책상서랍",furniture:{type:"desk",x:0,y:0,w:3,h:2},items:[],children:[
      {id:"c1",name:"1층",items:[{id:"i1",name:"여권",date:"2023-05-20"},{id:"i2",name:"통장",date:"2024-01-15"}],children:[]},
      {id:"c2",name:"2층",items:[{id:"i3",name:"도장",date:"2023-05-20"},{id:"i5",name:"볼펜",date:"2025-03-10"}],children:[]},
      {id:"c3",name:"3층",items:[{id:"i4",name:"USB 메모리",date:"2024-11-03"},{id:"i7",name:"스테이플러",date:"2024-08-22"}],children:[]},
    ]},
    {id:"l3",name:"옷장",furniture:{type:"closet",x:0,y:3,w:4,h:3},items:[],children:[
      {id:"c10",name:"상단",items:[{id:"i8",name:"겨울이불",date:"2023-11-15"},{id:"i9",name:"전기장판",date:"2024-10-28"},{id:"i10",name:"담요",date:"2023-11-15"}],children:[]},
      {id:"c11",name:"하단",items:[],children:[
        {id:"c12",name:"좌측",items:[{id:"i11",name:"정장",date:"2024-03-05"}],children:[]},
        {id:"c13",name:"우측",items:[{id:"i12",name:"코트",date:"2023-12-01"},{id:"i13",name:"패딩",date:"2024-11-20"}],children:[]},
      ]},
    ]},
    {id:"l5",name:"침대",furniture:{type:"bed",x:5,y:0,w:4,h:4},items:[],children:[]},
  ]},
  {id:"r2",name:"거실",icon:"🛋️",layout:{x:5,y:0,w:7,h:5},locations:[
    {id:"l6",name:"TV장",furniture:{type:"tv",x:0,y:0,w:5,h:1},items:[{id:"i14",name:"리모컨",date:"2024-06-15"},{id:"i15",name:"건전지",date:"2025-04-01"},{id:"i16",name:"HDMI 케이블",date:"2024-06-15"}],children:[]},
    {id:"l7",name:"책장",furniture:{type:"shelf",x:0,y:2,w:4,h:2},items:[{id:"i17",name:"소설책",date:"2025-02-14"},{id:"i18",name:"앨범",date:"2023-08-10"},{id:"i19",name:"보드게임",date:"2024-12-25"}],children:[]},
  ]},
  {id:"r3",name:"주방",icon:"🍳",layout:{x:5,y:5,w:7,h:3},locations:[
    {id:"l8",name:"상부장",furniture:{type:"cabinet",x:0,y:0,w:5,h:2},items:[],children:[
      {id:"c20",name:"왼쪽",items:[{id:"i20",name:"접시",date:"2024-02-10"},{id:"i21",name:"컵",date:"2024-02-10"}],children:[]},
      {id:"c21",name:"오른쪽",items:[{id:"i23",name:"소금",date:"2025-05-01"},{id:"i25",name:"간장",date:"2025-04-15"}],children:[]},
    ]},
    {id:"l10",name:"하부장",furniture:{type:"cabinet",x:0,y:3,w:4,h:2},items:[{id:"i27",name:"냄비",date:"2024-02-10"},{id:"i28",name:"프라이팬",date:"2024-07-20"},{id:"i29",name:"밥솥",date:"2024-02-10"}],children:[]},
    {id:"l11",name:"냉장고",furniture:{type:"fridge",x:7,y:0,w:2,h:3},items:[],children:[]},
  ]},
  {id:"r4",name:"서재",icon:"📚",layout:{x:0,y:4,w:3,h:2},locations:[
    {id:"l12",name:"책상",furniture:{type:"desk",x:0,y:0,w:4,h:2},items:[{id:"i30",name:"모니터",date:"2024-09-01"},{id:"i31",name:"키보드",date:"2024-09-01"},{id:"i32",name:"마우스",date:"2025-01-10"}],children:[]},
    {id:"l13",name:"서랍장",furniture:{type:"drawer",x:0,y:3,w:3,h:2},items:[{id:"i33",name:"이어폰",date:"2025-03-20"},{id:"i34",name:"충전케이블",date:"2025-01-10"},{id:"i35",name:"외장하드",date:"2024-04-15"}],children:[]},
  ]},
  {id:"r5",name:"화장실",icon:"🚿",layout:{x:3,y:4,w:2,h:2},locations:[
    {id:"l15",name:"세면대 하부",furniture:{type:"sink",x:0,y:0,w:4,h:2},items:[{id:"i36",name:"세제",date:"2025-05-10"},{id:"i37",name:"청소용품",date:"2025-03-01"}],children:[]},
    {id:"l16",name:"수납장",furniture:{type:"cabinet",x:5,y:0,w:3,h:2},items:[{id:"i38",name:"치약",date:"2025-05-10"},{id:"i40",name:"면도기",date:"2025-04-01"}],children:[]},
  ]},
  {id:"r6",name:"현관",icon:"🚪",layout:{x:0,y:6,w:5,h:2},locations:[
    {id:"l17",name:"신발장",furniture:{type:"shoe",x:0,y:0,w:5,h:2},items:[{id:"i41",name:"운동화",date:"2024-08-15"},{id:"i42",name:"구두",date:"2024-03-05"}],children:[]},
    {id:"l18",name:"수납함",furniture:{type:"cabinet",x:6,y:0,w:3,h:2},items:[{id:"i44",name:"우산",date:"2024-07-10"},{id:"i45",name:"열쇠",date:"2023-06-01"},{id:"i46",name:"마스크",date:"2025-04-20"}],children:[]},
  ]},
]};

const migrate=d=>({...d,rooms:d.rooms.map((r,ri)=>({...r,layout:r.layout||{x:(ri%3)*4,y:Math.floor(ri/3)*4,w:4,h:3},locations:r.locations.map((l,li)=>{const migrateNode=n=>({...n,children:(n.children||[]).map(migrateNode),items:(n.items||[]).map(it=>typeof it==="string"?{id:uid(),name:it,date:toDay()}:it)});const ml=migrateNode(l);return{...ml,furniture:l.furniture||{type:guessType(l.name),x:(li%3)*3,y:Math.floor(li/3)*3,w:furnById(guessType(l.name)).w,h:furnById(guessType(l.name)).h}};})
}))});

export default function App(){
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(true);
  const [tab,setTab]=useState("map");
  const [roomId,setRoomId]=useState(null);
  const [navPath,setNavPath]=useState([]); // ["locId","childId","childId",...]
  const [query,setQuery]=useState("");
  const [acOpen,setAcOpen]=useState(false);
  const [editMode,setEditMode]=useState(false);
  const [drag,setDrag]=useState(null);
  const [resize,setResize]=useState(null);
  const [tempLayouts,setTempLayouts]=useState({});
  const [fDrag,setFDrag]=useState(null);
  const [fResize,setFResize]=useState(null);
  const [tempFurn,setTempFurn]=useState({});
  const [calYear,setCalYear]=useState(new Date().getFullYear());
  const [calMonth,setCalMonth]=useState(new Date().getMonth());
  const [selectedDate,setSelectedDate]=useState(null);
  const [calQuery,setCalQuery]=useState("");
  const [calAcOpen,setCalAcOpen]=useState(false);
  const [modal,setModal]=useState(null);
  const [inputVal,setInputVal]=useState("");
  const [inputDate,setInputDate]=useState(toDay());
  const [inputIcon,setInputIcon]=useState("📦");
  const [inputFType,setInputFType]=useState("other");
  const [pendingDel,setPendingDel]=useState(null);
  const searchRef=useRef(null);const calSearchRef=useRef(null);const planRef=useRef(null);const roomRef=useRef(null);const inputRef=useRef(null);

  // Firestore 실시간 동기화 — 같은 URL에 접속한 가족 모두에게 즉시 반영
  useEffect(()=>{const ref=DOC_REF();const unsub=onSnapshot(ref,snap=>{
    if(!snap.exists()){setData(SAMPLE);setLoading(false);setDoc(ref,{data:JSON.stringify(SAMPLE)}).catch(e=>console.error("초기화 실패:",e));return;}
    if(snap.metadata.hasPendingWrites){setLoading(false);return;} // 내 낙관적 쓰기의 메아리는 무시
    try{setData(migrate(JSON.parse(snap.data().data)));}catch(e){console.error("데이터 파싱 실패:",e);}
    setLoading(false);
  },err=>{console.error("Firestore 연결 오류:",err);setData(SAMPLE);setLoading(false);});
  return ()=>unsub();},[]);
  const save=async d=>{setData(d);try{await setDoc(DOC_REF(),{data:JSON.stringify(d)});}catch(e){console.error("저장 실패:",e);}};
  useEffect(()=>{const h=e=>{if(searchRef.current&&!searchRef.current.contains(e.target))setAcOpen(false);if(calSearchRef.current&&!calSearchRef.current.contains(e.target))setCalAcOpen(false);};document.addEventListener("mousedown",h);return ()=>document.removeEventListener("mousedown",h);},[]);
  useEffect(()=>{if(modal&&inputRef.current)setTimeout(()=>inputRef.current?.focus(),50);},[modal]);

  const currentRoom=roomId?data?.rooms.find(r=>r.id===roomId):null;
  const currentNode=useMemo(()=>{if(!currentRoom||!navPath.length)return null;let n=currentRoom.locations.find(l=>l.id===navPath[0]);for(let i=1;i<navPath.length&&n;i++)n=(n.children||[]).find(c=>c.id===navPath[i]);return n;},[currentRoom,navPath]);
  const breadcrumb=useMemo(()=>{if(!currentRoom||!navPath.length)return[];const nodes=[];let n=currentRoom.locations.find(l=>l.id===navPath[0]);if(n){nodes.push({id:n.id,name:n.name});for(let i=1;i<navPath.length&&n;i++){n=(n.children||[]).find(c=>c.id===navPath[i]);if(n)nodes.push({id:n.id,name:n.name});}}return nodes;},[currentRoom,navPath]);

  const allItems=useMemo(()=>{if(!data)return[];return data.rooms.flatMap(r=>r.locations.flatMap(l=>flattenNode(l,`${r.name} › ${l.name}`,r.id,r.icon,[l.id])));},[data]);
  const doSearch=(q,items)=>{if(!q.trim())return[];const tokens=q.toLowerCase().trim().split(/\s+/);return items.map(item=>{const t=`${item.name} ${item.path}`.toLowerCase();return{...item,score:tokens.reduce((s,tk)=>s+(t.includes(tk)?1:0),0)};}).filter(i=>i.score>0).sort((a,b)=>b.score-a.score).slice(0,10);};
  const acResults=useMemo(()=>doSearch(query,allItems),[query,allItems]);
  const calAcResults=useMemo(()=>doSearch(calQuery,allItems),[calQuery,allItems]);
  const itemsByDate=useMemo(()=>{const m={};allItems.forEach(it=>{if(!it.date)return;if(!m[it.date])m[it.date]=[];m[it.date].push(it);});return m;},[allItems]);

  const goHome=()=>{setRoomId(null);setNavPath([]);setEditMode(false);};
  const goRoom=id=>{setRoomId(id);setNavPath([]);setEditMode(false);};
  const goPath=idx=>{setNavPath(navPath.slice(0,idx+1));setEditMode(false);setSortMode(null);};
  const enterNode=id=>{setNavPath([...navPath,id]);setSortMode(null);};
  const goSearchResult=item=>{setRoomId(item.roomId);setNavPath(item.navPath);setQuery("");setAcOpen(false);setEditMode(false);};

  // CRUD
  const addRoom=(name,icon)=>{const occ=new Set();data.rooms.forEach(r=>{for(let gx=r.layout.x;gx<r.layout.x+r.layout.w;gx++)for(let gy=r.layout.y;gy<r.layout.y+r.layout.h;gy++)occ.add(`${gx},${gy}`)});let p={x:0,y:0,w:3,h:2};outer:for(let gy=0;gy<=ROWS-2;gy++)for(let gx=0;gx<=COLS-3;gx++){let f=true;for(let dx=0;dx<3&&f;dx++)for(let dy=0;dy<2&&f;dy++)if(occ.has(`${gx+dx},${gy+dy}`))f=false;if(f){p={x:gx,y:gy,w:3,h:2};break outer;}}save({...data,rooms:[...data.rooms,{id:uid(),name,icon,layout:p,locations:[]}]});};
  const deleteRoom=rId=>{save({...data,rooms:data.rooms.filter(r=>r.id!==rId)});if(roomId===rId)goHome();};
  const addFurniture=(rId,name,fType)=>{const ft=furnById(fType);const occ=new Set();const room=data.rooms.find(r=>r.id===rId);if(room)room.locations.forEach(l=>{if(!l.furniture)return;for(let x=l.furniture.x;x<l.furniture.x+l.furniture.w;x++)for(let y=l.furniture.y;y<l.furniture.y+l.furniture.h;y++)occ.add(`${x},${y}`);});let px=0,py=0;outer2:for(let gy=0;gy<=RR-ft.h;gy++)for(let gx=0;gx<=RC-ft.w;gx++){let free=true;for(let dx=0;dx<ft.w&&free;dx++)for(let dy=0;dy<ft.h&&free;dy++)if(occ.has(`${gx+dx},${gy+dy}`))free=false;if(free){px=gx;py=gy;break outer2;}}save({...data,rooms:data.rooms.map(r=>r.id===rId?{...r,locations:[...r.locations,{id:uid(),name,furniture:{type:fType,x:px,y:py,w:ft.w,h:ft.h},items:[],children:[]}]}:r)});};
  const deleteFurniture=(rId,lId)=>{save({...data,rooms:data.rooms.map(r=>r.id===rId?{...r,locations:r.locations.filter(l=>l.id!==lId)}:r)});if(navPath[0]===lId)setNavPath([]);};
  const addChildAtPath=name=>{save({...data,rooms:data.rooms.map(r=>r.id===roomId?{...r,locations:updateAtPath(r.locations,navPath,n=>({...n,children:[...(n.children||[]),{id:uid(),name,items:[],children:[]}]}))}:r)});};
  const deleteChild=childId=>{save({...data,rooms:data.rooms.map(r=>r.id===roomId?{...r,locations:updateAtPath(r.locations,navPath,n=>({...n,children:(n.children||[]).filter(c=>c.id!==childId)}))}:r)});};
  const addItemAtPath=(name,date)=>{save({...data,rooms:data.rooms.map(r=>r.id===roomId?{...r,locations:updateAtPath(r.locations,navPath,n=>({...n,items:[...n.items,{id:uid(),name,date}]}))}:r)});};
  const updateItemAtPath=(itemId,name,date)=>{save({...data,rooms:data.rooms.map(r=>r.id===roomId?{...r,locations:updateAtPath(r.locations,navPath,n=>({...n,items:n.items.map(it=>it.id===itemId?{...it,name,date}:it)}))}:r)});};
  const deleteItemAtPath=itemId=>{save({...data,rooms:data.rooms.map(r=>r.id===roomId?{...r,locations:updateAtPath(r.locations,navPath,n=>({...n,items:n.items.filter(it=>it.id!==itemId)}))}:r)});};
  const editRoom=(rId,name,icon)=>{save({...data,rooms:data.rooms.map(r=>r.id===rId?{...r,name,icon}:r)});};
  const editFurniture=(rId,lId,name)=>{save({...data,rooms:data.rooms.map(r=>r.id===rId?{...r,locations:r.locations.map(l=>l.id===lId?{...l,name}:l)}:r)});};
  const editChildName=(childId,name)=>{save({...data,rooms:data.rooms.map(r=>r.id===roomId?{...r,locations:updateAtPath(r.locations,navPath,n=>({...n,children:(n.children||[]).map(c=>c.id===childId?{...c,name}:c)}))}:r)});};
  const exportData=()=>{const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`home-inventory-${toDay()}.json`;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);};
  const fileRef=useRef(null);
  const importData=e=>{const file=e.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=ev=>{try{const d=JSON.parse(ev.target.result);if(d?.rooms){save(migrate(d));goHome();setTempLayouts({});setTempFurn({});}}catch{}};reader.readAsText(file);e.target.value="";};
  const reorderList=(key,fromIdx,toIdx)=>{if(fromIdx===toIdx)return;save({...data,rooms:data.rooms.map(r=>r.id===roomId?{...r,locations:updateAtPath(r.locations,navPath,n=>{const arr=[...(n[key]||[])];const[moved]=arr.splice(fromIdx,1);arr.splice(toIdx,0,moved);return{...n,[key]:arr};})}:r)});};
  const moveItemToChild=(itemId,childId)=>{save({...data,rooms:data.rooms.map(r=>r.id===roomId?{...r,locations:updateAtPath(r.locations,navPath,n=>{const item=n.items.find(it=>it.id===itemId);if(!item)return n;return{...n,items:n.items.filter(it=>it.id!==itemId),children:(n.children||[]).map(ch=>ch.id===childId?{...ch,items:[...ch.items,item]}:ch)};})}:r)});};
  const [dragSrc,setDragSrc]=useState(null);
  const [dragTarget,setDragTarget]=useState(null);
  const clearDrag=()=>{setDragSrc(null);setDragTarget(null);};
  const handleDrop=(e)=>{e.preventDefault();if(!dragSrc||!dragTarget)return clearDrag();
    if(dragTarget.zone==="folder"&&dragSrc.type==="item"){moveItemToChild(dragSrc.id,dragTarget.folderId);}
    else if(dragTarget.zone===dragSrc.type){const from=dragSrc.index;let to=dragTarget.index;if(to>from)to--;if(from!==to)reorderList(dragSrc.type==="child"?"children":"items",from,to);}
    clearDrag();};
  const [sortMode,setSortMode]=useState(null); // {key:"name"|"date",dir:"asc"|"desc"}
  const toggleSort=key=>{if(sortMode?.key===key){if(sortMode.dir==="asc")setSortMode({key,dir:"desc"});else setSortMode(null);}else setSortMode({key,dir:"asc"});};
  const sortedItems=useMemo(()=>{if(!currentNode)return[];const items=[...currentNode.items];if(!sortMode)return items;return items.sort((a,b)=>{let c=sortMode.key==="name"?a.name.localeCompare(b.name,"ko"):(a.date||"").localeCompare(b.date||"");return sortMode.dir==="desc"?-c:c;});},[currentNode,sortMode]);

  // Floor plan drag
  const updateRoomLayout=useCallback((rId,ly)=>{setTempLayouts(p=>({...p,[rId]:ly}));},[]);
  const commitLayouts=useCallback(()=>{setTempLayouts(cur=>{if(!Object.keys(cur).length)return cur;setData(prev=>{const rooms=prev.rooms.map(r=>cur[r.id]?{...r,layout:cur[r.id]}:r);const nd={...prev,rooms};(async()=>{try{await setDoc(DOC_REF(),{data:JSON.stringify(nd)})}catch(e){console.error("저장 실패:",e)}})();return nd;});return{};});},[]);
  const getLayout=room=>tempLayouts[room.id]||room.layout;
  const cellSize=(ref,c,r)=>{if(!ref.current)return{cw:0,ch:0};const rect=ref.current.getBoundingClientRect();return{cw:rect.width/c,ch:rect.height/r};};
  const hdStart=(e,room)=>{if(!editMode)return;e.preventDefault();e.stopPropagation();const pt=e.touches?e.touches[0]:e;const ly=getLayout(room);setDrag({id:room.id,sx:pt.clientX,sy:pt.clientY,ox:ly.x,oy:ly.y});};
  const hrStart=(e,room)=>{e.preventDefault();e.stopPropagation();const pt=e.touches?e.touches[0]:e;const ly=getLayout(room);setResize({id:room.id,sx:pt.clientX,sy:pt.clientY,ow:ly.w,oh:ly.h});};
  useEffect(()=>{if(!drag&&!resize)return;const move=e=>{e.preventDefault();const pt=e.touches?e.touches[0]:e;const{cw,ch}=cellSize(planRef,COLS,ROWS);if(!cw)return;if(drag){const dx=Math.round((pt.clientX-drag.sx)/cw);const dy=Math.round((pt.clientY-drag.sy)/ch);const room=data.rooms.find(r=>r.id===drag.id);const ly=room.layout;updateRoomLayout(drag.id,{...ly,x:Math.max(0,Math.min(COLS-ly.w,drag.ox+dx)),y:Math.max(0,Math.min(ROWS-ly.h,drag.oy+dy))});}if(resize){const dx=Math.round((pt.clientX-resize.sx)/cw);const dy=Math.round((pt.clientY-resize.sy)/ch);const room=data.rooms.find(r=>r.id===resize.id);const ly=getLayout(room);updateRoomLayout(resize.id,{...ly,w:Math.max(2,Math.min(COLS-ly.x,resize.ow+dx)),h:Math.max(1,Math.min(ROWS-ly.y,resize.oh+dy))});}};const up=()=>{setDrag(null);setResize(null);commitLayouts();};window.addEventListener("mousemove",move);window.addEventListener("mouseup",up);window.addEventListener("touchmove",move,{passive:false});window.addEventListener("touchend",up);return ()=>{window.removeEventListener("mousemove",move);window.removeEventListener("mouseup",up);window.removeEventListener("touchmove",move);window.removeEventListener("touchend",up);};},[drag,resize,data,updateRoomLayout,commitLayouts]);

  // Furniture drag
  const getFurn=loc=>tempFurn[loc.id]||loc.furniture;
  const commitFurn=useCallback(()=>{setTempFurn(cur=>{if(!Object.keys(cur).length)return cur;setData(prev=>{const rooms=prev.rooms.map(r=>r.id===roomId?{...r,locations:r.locations.map(l=>cur[l.id]?{...l,furniture:cur[l.id]}:l)}:r);const nd={...prev,rooms};(async()=>{try{await setDoc(DOC_REF(),{data:JSON.stringify(nd)})}catch(e){console.error("저장 실패:",e)}})();return nd;});return{};});},[roomId]);
  const hfDStart=(e,loc)=>{if(!editMode)return;e.preventDefault();e.stopPropagation();const pt=e.touches?e.touches[0]:e;const f=getFurn(loc);setFDrag({id:loc.id,sx:pt.clientX,sy:pt.clientY,ox:f.x,oy:f.y});};
  const hfRStart=(e,loc)=>{e.preventDefault();e.stopPropagation();const pt=e.touches?e.touches[0]:e;const f=getFurn(loc);setFResize({id:loc.id,sx:pt.clientX,sy:pt.clientY,ow:f.w,oh:f.h});};
  useEffect(()=>{if(!fDrag&&!fResize)return;const move=e=>{e.preventDefault();const pt=e.touches?e.touches[0]:e;const{cw,ch}=cellSize(roomRef,RC,RR);if(!cw)return;if(fDrag){const dx=Math.round((pt.clientX-fDrag.sx)/cw);const dy=Math.round((pt.clientY-fDrag.sy)/ch);const loc=currentRoom?.locations.find(l=>l.id===fDrag.id);if(!loc)return;const f=loc.furniture;setTempFurn(p=>({...p,[fDrag.id]:{...f,x:Math.max(0,Math.min(RC-f.w,fDrag.ox+dx)),y:Math.max(0,Math.min(RR-f.h,fDrag.oy+dy))}}));}if(fResize){const dx=Math.round((pt.clientX-fResize.sx)/cw);const dy=Math.round((pt.clientY-fResize.sy)/ch);const loc=currentRoom?.locations.find(l=>l.id===fResize.id);if(!loc)return;const f=getFurn(loc);setTempFurn(p=>({...p,[fResize.id]:{...f,w:Math.max(1,Math.min(RC-f.x,fResize.ow+dx)),h:Math.max(1,Math.min(RR-f.y,fResize.oh+dy))}}));}};const up=()=>{setFDrag(null);setFResize(null);commitFurn();};window.addEventListener("mousemove",move);window.addEventListener("mouseup",up);window.addEventListener("touchmove",move,{passive:false});window.addEventListener("touchend",up);return ()=>{window.removeEventListener("mousemove",move);window.removeEventListener("mouseup",up);window.removeEventListener("touchmove",move);window.removeEventListener("touchend",up);};},[fDrag,fResize,currentRoom,commitFurn]);

  const openModal=(type,extra={})=>{setModal({type,...extra});setInputVal(extra.name||"");setInputDate(extra.date||toDay());setInputIcon(extra.icon||"📦");setInputFType(extra.fType||"other");};
  const handleModalSubmit=()=>{const v=inputVal.trim();if(!v)return;if(modal.type==="addRoom")addRoom(v,inputIcon);if(modal.type==="addFurniture")addFurniture(roomId,v,inputFType);if(modal.type==="addChild")addChildAtPath(v);if(modal.type==="addItem")addItemAtPath(v,inputDate);if(modal.type==="editItem")updateItemAtPath(modal.itemId,v,inputDate);if(modal.type==="editRoom")editRoom(modal.roomId,v,inputIcon);if(modal.type==="editFurniture")editFurniture(modal.roomId,modal.locId,v);if(modal.type==="editChild")editChildName(modal.childId,v);setModal(null);};
  const navigateCalTo=ds=>{if(!ds)return;const[y,m]=ds.split("-").map(Number);setCalYear(y);setCalMonth(m-1);setSelectedDate(ds);setCalQuery("");setCalAcOpen(false);};

  const calDays=useMemo(()=>{const first=new Date(calYear,calMonth,1);const sd=first.getDay();const dim=new Date(calYear,calMonth+1,0).getDate();const c=[];for(let i=0;i<sd;i++)c.push(null);for(let d=1;d<=dim;d++)c.push(d);return c;},[calYear,calMonth]);
  const prevMonth=()=>{if(calMonth===0){setCalYear(calYear-1);setCalMonth(11);}else setCalMonth(calMonth-1);setSelectedDate(null);};
  const nextMonth=()=>{if(calMonth===11){setCalYear(calYear+1);setCalMonth(0);}else setCalMonth(calMonth+1);setSelectedDate(null);};
  const toDateStr=day=>`${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
  const selectedDateItems=useMemo(()=>selectedDate?(itemsByDate[selectedDate]||[]):[],[selectedDate,itemsByDate]);
  const totalItems=allItems.length;
  const monthItems=useMemo(()=>allItems.filter(it=>it.date&&it.date.startsWith(`${calYear}-${String(calMonth+1).padStart(2,"0")}`)).sort((a,b)=>a.date.localeCompare(b.date)),[allItems,calYear,calMonth]);
  const hl=(text,q)=>{if(!q||!q.trim())return text;const tokens=q.toLowerCase().trim().split(/\s+/);let r=text;tokens.forEach(t=>{if(!t)return;r=r.replace(new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")})`,"gi"),"\u27E8$1\u27E9");});return r.split(/\u27E8|\u27E9/).map((p,i)=>(i%2===1?<span key={i} className="text-teal-600 font-bold">{p}</span>:<span key={i}>{p}</span>));};

  if(loading) return (<div className="flex items-center justify-center h-screen bg-slate-50"><p className="text-slate-400 text-sm">불러오는 중...</p></div>);

  return (
    <div className="min-h-screen bg-slate-50 pb-24" style={{fontFamily:"'Pretendard',system-ui,sans-serif"}}>
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 pt-3 pb-2">
          <div className="flex items-center justify-between mb-3"><button onClick={goHome} className="flex items-center gap-2 group"><span className="text-xl">🏠</span><span className="text-base font-bold text-slate-800 group-hover:text-teal-600 transition">우리집 물건 지도</span></button><span className="text-xs text-slate-400 tabular-nums">{totalItems}개 물건</span></div>
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            <button onClick={()=>{setTab("map");setSelectedDate(null);}} className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${tab==="map"?"bg-white text-teal-600 shadow-sm":"text-slate-500"}`}>🗺️ 물건 지도</button>
            <button onClick={()=>{setTab("calendar");goHome();}} className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${tab==="calendar"?"bg-white text-teal-600 shadow-sm":"text-slate-500"}`}>📅 달력</button>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 pb-3">
          <div ref={searchRef} className="relative" style={{display:tab==="map"?"block":"none"}}>
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" strokeWidth="2"/><path d="m21 21-4.35-4.35" strokeWidth="2" strokeLinecap="round"/></svg>
            <input type="text" value={query} onChange={e=>{setQuery(e.target.value);setAcOpen(true);}} onFocus={()=>query.trim()&&setAcOpen(true)} placeholder="물건 이름으로 검색" className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 bg-slate-50/80 text-sm placeholder:text-slate-400 focus:outline-none focus:border-teal-400 focus:bg-white transition"/>
            {query&&<button onClick={()=>{setQuery("");setAcOpen(false);}} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 text-sm">✕</button>}
            {acOpen&&query.trim()&&(<div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-40 max-h-72 overflow-y-auto">{acResults.length>0?acResults.map((item,i)=>(<button key={i} onClick={()=>goSearchResult(item)} className="w-full px-4 py-3 text-left hover:bg-teal-50 flex items-center justify-between gap-2 border-b border-slate-50 last:border-0 transition"><div className="flex items-center gap-2 min-w-0"><span className="text-sm shrink-0">{item.roomIcon}</span><span className="text-sm text-slate-800 truncate">{hl(item.name,query)}</span></div><span className="text-xs text-slate-400 shrink-0 whitespace-nowrap">{item.path}</span></button>)):<div className="px-4 py-6 text-center text-sm text-slate-400">&ldquo;{query}&rdquo; 검색 결과 없음</div>}</div>)}
          </div>
          <div ref={calSearchRef} className="relative" style={{display:tab==="calendar"?"block":"none"}}>
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" strokeWidth="2"/><path d="m21 21-4.35-4.35" strokeWidth="2" strokeLinecap="round"/></svg>
            <input type="text" value={calQuery} onChange={e=>{setCalQuery(e.target.value);setCalAcOpen(true);}} onFocus={()=>calQuery.trim()&&setCalAcOpen(true)} placeholder="물건 검색 → 달력에서 찾기" className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 bg-slate-50/80 text-sm placeholder:text-slate-400 focus:outline-none focus:border-teal-400 focus:bg-white transition"/>
            {calQuery&&<button onClick={()=>{setCalQuery("");setCalAcOpen(false);}} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 text-sm">✕</button>}
            {calAcOpen&&calQuery.trim()&&(<div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-40 max-h-72 overflow-y-auto">{calAcResults.length>0?calAcResults.map((item,i)=>(<button key={i} onClick={()=>navigateCalTo(item.date)} className="w-full px-4 py-3 text-left hover:bg-teal-50 flex items-center justify-between gap-2 border-b border-slate-50 last:border-0 transition"><div className="flex items-center gap-2 min-w-0"><span className="text-sm shrink-0">{item.roomIcon}</span><span className="text-sm truncate">{hl(item.name,calQuery)}</span></div><div className="flex items-center gap-2 shrink-0"><span className="text-xs text-slate-400">{item.path}</span><span className="text-xs text-teal-500 font-medium">{fmt(item.date)}</span></div></button>)):<div className="px-4 py-6 text-center text-sm text-slate-400">&ldquo;{calQuery}&rdquo; 검색 결과 없음</div>}</div>)}
          </div>
        </div>
      </div>

      {/* MAP TAB */}
      {tab==="map"&&(<>
        <div className="max-w-2xl mx-auto px-4 pt-3 pb-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm flex-wrap">
            <button onClick={goHome} className={`transition ${!roomId?"text-slate-700 font-medium":"text-slate-400 hover:text-teal-600"}`}>전체</button>
            {currentRoom&&<><span className="text-slate-300 text-xs">›</span><button onClick={()=>goRoom(currentRoom.id)} className={`transition ${!navPath.length?"text-slate-700 font-medium":"text-slate-400 hover:text-teal-600"}`}>{currentRoom.icon} {currentRoom.name}</button></>}
            {breadcrumb.map((bc,i)=>(<span key={bc.id} className="flex items-center gap-1.5"><span className="text-slate-300 text-xs">›</span><button onClick={()=>goPath(i)} className={`transition ${i===breadcrumb.length-1?"text-slate-700 font-medium":"text-slate-400 hover:text-teal-600"}`}>{bc.name}</button></span>))}
          </div>
          {roomId&&!navPath.length&&<button onClick={()=>setEditMode(!editMode)} className={`text-xs font-medium px-3 py-1.5 rounded-lg transition shrink-0 ${editMode?"bg-teal-500 text-white shadow-sm":"bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>{editMode?"✓ 완료":"배치 편집"}</button>}
          {!roomId&&<button onClick={()=>setEditMode(!editMode)} className={`text-xs font-medium px-3 py-1.5 rounded-lg transition shrink-0 ${editMode?"bg-teal-500 text-white shadow-sm":"bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>{editMode?"✓ 완료":"배치 편집"}</button>}
          {roomId&&navPath.length>0&&currentNode&&currentNode.items.length>1&&(<div className="flex gap-1 shrink-0">
            <button onClick={()=>toggleSort("name")} className={`text-xs px-2 py-1 rounded-md transition ${sortMode?.key==="name"?"bg-teal-100 text-teal-700 font-medium":"text-slate-400 hover:bg-slate-100 hover:text-slate-600"}`}>이름{sortMode?.key==="name"?(sortMode.dir==="asc"?" ↑":" ↓"):""}</button>
            <button onClick={()=>toggleSort("date")} className={`text-xs px-2 py-1 rounded-md transition ${sortMode?.key==="date"?"bg-teal-100 text-teal-700 font-medium":"text-slate-400 hover:bg-slate-100 hover:text-slate-600"}`}>날짜{sortMode?.key==="date"?(sortMode.dir==="asc"?" ↑":" ↓"):""}</button>
          </div>)}
        </div>
        <div className="max-w-2xl mx-auto px-4 pt-2">
          {/* Floor Plan */}
          {!roomId&&(<div>
            {editMode&&<p className="text-xs text-teal-600 mb-2 text-center animate-pulse">드래그로 이동 · 우하단 모서리로 크기 조절</p>}
            <div ref={planRef} className="relative w-full rounded-2xl border-2 overflow-hidden select-none" style={{aspectRatio:`${COLS}/${ROWS}`,borderColor:editMode?"#5EEAD4":"#E2E8F0",background:editMode?`linear-gradient(to right,#F0FDFA 1px,transparent 1px),linear-gradient(to bottom,#F0FDFA 1px,transparent 1px)`:"#F8FAFC",backgroundSize:editMode?`${100/COLS}% ${100/ROWS}%`:undefined}}>
              {data.rooms.map((room,idx)=>{const ly=getLayout(room);const color=PALETTE[idx%PALETTE.length];const ic=countAll({items:[],children:room.locations});const active=drag?.id===room.id||resize?.id===room.id;
                return (<div key={room.id} onMouseDown={e=>editMode?hdStart(e,room):null} onTouchStart={e=>editMode?hdStart(e,room):null} onClick={()=>{if(!editMode&&!drag)goRoom(room.id);}} className="absolute flex flex-col items-center justify-center overflow-hidden" style={{left:`${(ly.x/COLS)*100}%`,top:`${(ly.y/ROWS)*100}%`,width:`${(ly.w/COLS)*100}%`,height:`${(ly.h/ROWS)*100}%`,background:color.bg,border:`2.5px solid ${color.border}`,borderRadius:"10px",cursor:editMode?(active?"grabbing":"grab"):"pointer",zIndex:active?20:1,boxShadow:active?`0 12px 40px ${color.border}44`:"none",transition:active?"box-shadow 0.15s":"left 0.25s,top 0.25s,width 0.25s,height 0.25s,box-shadow 0.2s",userSelect:"none",touchAction:"none"}}>
                  <span style={{fontSize:ly.h<=1?"16px":ly.h<=2?"22px":"28px"}}>{room.icon}</span><span className="font-bold mt-0.5 text-center px-1" style={{color:color.text,fontSize:ly.w<=2?"10px":"12px"}}>{room.name}</span>{ly.h>1&&<span className="mt-0.5" style={{color:color.text,opacity:0.5,fontSize:"10px"}}>{ic}개</span>}
                  {editMode&&<><div onMouseDown={e=>hrStart(e,room)} onTouchStart={e=>hrStart(e,room)} className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize flex items-end justify-end p-0.5 opacity-50 hover:opacity-100" style={{touchAction:"none"}}><svg width="10" height="10" viewBox="0 0 10 10"><path d="M9 1v8H1" fill="none" stroke={color.text} strokeWidth="1.5" strokeLinecap="round"/><path d="M9 5v4H5" fill="none" stroke={color.text} strokeWidth="1.5" strokeLinecap="round"/></svg></div><button onClick={e=>{e.stopPropagation();openModal("editRoom",{roomId:room.id,name:room.name,icon:room.icon});}} className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-teal-500 hover:bg-teal-600 text-white rounded-full text-xs flex items-center justify-center shadow-md z-10">✏</button><button onClick={e=>{e.stopPropagation();setPendingDel({type:"room",id:room.id,name:room.name});}} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-400 hover:bg-red-500 text-white rounded-full text-xs flex items-center justify-center shadow-md z-10">✕</button></>}
                </div>);})}
            </div>
            <div className="flex items-center justify-between mt-3"><button onClick={()=>openModal("addRoom")} className="text-sm text-teal-600 font-medium">+ 방 추가</button><div className="flex gap-2 items-center"><button onClick={exportData} className="text-xs text-slate-400 hover:text-teal-500 transition">내보내기</button><button onClick={()=>fileRef.current?.click()} className="text-xs text-slate-400 hover:text-teal-500 transition">가져오기</button><button onClick={()=>setPendingDel({type:"reset"})} className="text-xs text-slate-300 hover:text-red-400 transition">초기화</button></div></div>
            <input ref={fileRef} type="file" accept=".json" onChange={importData} className="hidden"/>
          </div>)}

          {/* Room Interior */}
          {roomId&&!navPath.length&&currentRoom&&(<div>
            {editMode&&<p className="text-xs text-teal-600 mb-2 text-center animate-pulse">가구 드래그 이동 · 우하단 크기 조절</p>}
            <div ref={roomRef} className="relative w-full rounded-2xl border-2 overflow-hidden select-none" style={{aspectRatio:`${RC}/${RR}`,borderColor:editMode?"#5EEAD4":"#CBD5E1",background:editMode?`linear-gradient(to right,#F0FDFA 1px,transparent 1px),linear-gradient(to bottom,#F0FDFA 1px,transparent 1px)`:"linear-gradient(135deg,#FAFAF9 25%,#F5F5F4 25%,#F5F5F4 50%,#FAFAF9 50%,#FAFAF9 75%,#F5F5F4 75%)",backgroundSize:editMode?`${100/RC}% ${100/RR}%`:"20px 20px"}}>
              {currentRoom.locations.map(loc=>{const f=getFurn(loc);const ft=furnById(f.type);const active=fDrag?.id===loc.id||fResize?.id===loc.id;const ic=countAll(loc);
                return (<div key={loc.id} onMouseDown={e=>editMode?hfDStart(e,loc):null} onTouchStart={e=>editMode?hfDStart(e,loc):null} onClick={()=>{if(!editMode&&!fDrag)enterNode(loc.id);}} className="absolute flex flex-col items-center justify-center overflow-hidden gap-0.5" style={{left:`${(f.x/RC)*100}%`,top:`${(f.y/RR)*100}%`,width:`${(f.w/RC)*100}%`,height:`${(f.h/RR)*100}%`,background:ft.bg,border:`2px solid ${ft.bd}`,borderRadius:"8px",cursor:editMode?(active?"grabbing":"grab"):"pointer",zIndex:active?20:1,boxShadow:active?`0 8px 30px ${ft.bd}44`:"0 1px 2px rgba(0,0,0,0.04)",transition:active?"box-shadow 0.15s":"left 0.2s,top 0.2s,width 0.2s,height 0.2s,box-shadow 0.2s",userSelect:"none",touchAction:"none"}}>
                  <span style={{fontSize:f.h<=1?"14px":"20px",lineHeight:1}}>{ft.icon}</span><span className="font-semibold text-center px-1 leading-tight" style={{fontSize:f.w<=2?"9px":"10px",color:"#334155"}}>{loc.name}</span>{f.h>1&&<span style={{fontSize:"9px",color:"#94A3B8"}}>{ic}개</span>}
                  {editMode&&<><div onMouseDown={e=>hfRStart(e,loc)} onTouchStart={e=>hfRStart(e,loc)} className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize flex items-end justify-end p-0.5 opacity-40 hover:opacity-100" style={{touchAction:"none"}}><svg width="8" height="8" viewBox="0 0 10 10"><path d="M9 1v8H1" fill="none" stroke="#475569" strokeWidth="1.5" strokeLinecap="round"/><path d="M9 5v4H5" fill="none" stroke="#475569" strokeWidth="1.5" strokeLinecap="round"/></svg></div><button onClick={e=>{e.stopPropagation();openModal("editFurniture",{roomId,locId:loc.id,name:loc.name});}} className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-teal-500 hover:bg-teal-600 text-white rounded-full flex items-center justify-center shadow z-10" style={{fontSize:"8px"}}>✏</button><button onClick={e=>{e.stopPropagation();setPendingDel({type:"furniture",roomId,locId:loc.id,name:loc.name});}} className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-400 hover:bg-red-500 text-white rounded-full flex items-center justify-center shadow z-10" style={{fontSize:"9px"}}>✕</button></>}
                </div>);})}
              {currentRoom.locations.length===0&&<div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">가구를 추가해주세요</div>}
            </div>
            <div className="flex items-center justify-between mt-3"><button onClick={()=>openModal("addFurniture")} className="text-sm text-teal-600 font-medium">+ 가구 추가</button><button onClick={()=>setPendingDel({type:"room",id:currentRoom.id,name:currentRoom.name})} className="text-xs text-slate-300 hover:text-red-400 transition">이 방 삭제</button></div>
          </div>)}

          {/* Node View */}
          {roomId&&navPath.length>0&&currentNode&&(<div>
            {(currentNode.children||[]).length>0&&(<div className="mb-4">
              <p className="text-xs text-slate-500 font-medium mb-2">하위 칸</p>
              <div className="space-y-0">{currentNode.children.map((ch,ci)=>{const ic=countAll(ch);const isOverFolder=dragSrc?.type==="item"&&dragTarget?.zone==="folder"&&dragTarget.folderId===ch.id;const showTop=dragSrc?.type==="child"&&dragTarget?.zone==="child"&&dragTarget.index===ci;const showBot=dragSrc?.type==="child"&&dragTarget?.zone==="child"&&ci===currentNode.children.length-1&&dragTarget.index===ci+1;
                return (<div key={ch.id} className="py-0.5">
                  {showTop&&<div className="h-0.5 bg-teal-400 rounded-full mx-2 mb-1"/>}
                  <div draggable onDragStart={e=>{e.dataTransfer.effectAllowed="move";setDragSrc({type:"child",index:ci,id:ch.id});}}
                    onDragOver={e=>{e.preventDefault();if(dragSrc?.type==="child"){const rect=e.currentTarget.getBoundingClientRect();setDragTarget({zone:"child",index:e.clientY<rect.top+rect.height/2?ci:ci+1});}else if(dragSrc?.type==="item"){setDragTarget({zone:"folder",folderId:ch.id});}}}
                    onDragLeave={()=>dragTarget?.zone==="folder"&&setDragTarget(null)}
                    onDrop={handleDrop} onDragEnd={clearDrag}
                    className={`flex items-stretch gap-1 ${dragSrc?.id===ch.id?"opacity-40":""}`}>
                    <span className="flex items-center px-1 text-slate-300 cursor-grab active:cursor-grabbing select-none text-sm">⠿</span>
                    <button onClick={()=>enterNode(ch.id)} className={`flex-1 bg-white rounded-xl px-4 py-3 border transition text-left flex items-center justify-between group active:scale-[0.99] ${isOverFolder?"border-teal-400 bg-teal-50 shadow-md ring-2 ring-teal-200":"border-slate-100 hover:border-teal-200 hover:shadow-md"}`}>
                      <div><p className="font-medium text-slate-700 group-hover:text-teal-600 transition text-sm">📂 {ch.name}</p><p className="text-xs text-slate-400 mt-0.5">{ic}개{(ch.children||[]).length>0?` · ${ch.children.length}칸`:""}</p></div>
                      <svg className="w-4 h-4 text-slate-300 group-hover:text-teal-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    <button onClick={e=>{e.stopPropagation();openModal("editChild",{childId:ch.id,name:ch.name});}} className="w-8 flex items-center justify-center rounded-xl hover:bg-teal-50 text-slate-300 hover:text-teal-500 transition shrink-0"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 1 1 3.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                    <button onClick={()=>setPendingDel({type:"child",childId:ch.id,name:ch.name})} className="w-8 flex items-center justify-center rounded-xl hover:bg-red-50 text-slate-300 hover:text-red-400 transition shrink-0"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="1.5" strokeLinecap="round"/></svg></button>
                  </div>
                  {showBot&&<div className="h-0.5 bg-teal-400 rounded-full mx-2 mt-1"/>}
                </div>);})}</div>
            </div>)}
            {currentNode.items.length>0&&(<div className="mb-3">
              {(currentNode.children||[]).length>0&&<p className="text-xs text-slate-500 font-medium mb-2">이 칸의 물건 <span className="text-slate-400 font-normal">(폴더 위에 놓으면 이동)</span></p>}
              <div className="space-y-0">{sortedItems.map((item,ii)=>{const showTop=!sortMode&&dragSrc?.type==="item"&&dragTarget?.zone==="item"&&dragTarget.index===ii;const showBot=!sortMode&&dragSrc?.type==="item"&&dragTarget?.zone==="item"&&ii===sortedItems.length-1&&dragTarget.index===ii+1;
                return (<div key={item.id} className="py-0.5">
                  {showTop&&<div className="h-0.5 bg-teal-400 rounded-full mx-2 mb-1"/>}
                  <div draggable={!sortMode} onDragStart={e=>{if(sortMode)return;e.dataTransfer.effectAllowed="move";setDragSrc({type:"item",index:ii,id:item.id});}}
                    onDragOver={e=>{e.preventDefault();if(!sortMode&&dragSrc?.type==="item"){const rect=e.currentTarget.getBoundingClientRect();setDragTarget({zone:"item",index:e.clientY<rect.top+rect.height/2?ii:ii+1});}}}
                    onDrop={handleDrop} onDragEnd={clearDrag}
                    className={`bg-white rounded-lg px-2 py-3 border border-slate-100 hover:border-teal-200 transition flex items-center group ${dragSrc?.id===item.id?"opacity-40":""}`}>
                    {!sortMode&&<span className="text-slate-300 cursor-grab active:cursor-grabbing select-none text-sm px-1 mr-1">⠿</span>}
                    <button onClick={()=>openModal("editItem",{itemId:item.id,name:item.name,date:item.date})} className="flex items-center gap-2 min-w-0 flex-1 text-left"><span className="text-sm text-slate-700 truncate">{item.name}</span>{item.date&&<span className="text-xs text-slate-400 shrink-0">{fmt(item.date)}</span>}</button>
                    <div className="flex items-center gap-0.5 shrink-0 ml-1">
                      <button onClick={()=>openModal("editItem",{itemId:item.id,name:item.name,date:item.date})} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 group-hover:text-teal-400 transition"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 1 1 3.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                      <button onClick={()=>setPendingDel({type:"item",itemId:item.id,name:item.name})} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round"/></svg></button>
                    </div>
                  </div>
                  {showBot&&<div className="h-0.5 bg-teal-400 rounded-full mx-2 mt-1"/>}
                </div>);})}</div>
            </div>)}
            {currentNode.items.length===0&&(currentNode.children||[]).length===0&&<div className="text-center py-10 text-slate-400 text-sm">아직 내용이 없습니다</div>}
            <div className="flex gap-2 mt-2">
              <button onClick={()=>openModal("addChild")} className="flex-1 rounded-xl py-2.5 border-2 border-dashed border-slate-200 hover:border-teal-300 hover:bg-teal-50/50 transition text-sm text-slate-400 hover:text-teal-500 font-medium">+ 하위 칸</button>
              <button onClick={()=>openModal("addItem")} className="flex-1 rounded-xl py-2.5 border-2 border-dashed border-slate-200 hover:border-teal-300 hover:bg-teal-50/50 transition text-sm text-slate-400 hover:text-teal-500 font-medium">+ 물건</button>
            </div>
          </div>)}
        </div>
      </>)}

      {/* CALENDAR TAB */}
      {tab==="calendar"&&(<div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
          <h2 className="text-base font-bold text-slate-800">{calYear}년 {calMonth+1}월</h2>
          <button onClick={nextMonth} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-100">{DAY_NAMES.map((d,i)=>(<div key={d} className={`py-2 text-center text-xs font-medium ${i===0?"text-red-400":i===6?"text-blue-400":"text-slate-400"}`}>{d}</div>))}</div>
          <div className="grid grid-cols-7">{calDays.map((day,i)=>{
            if(day===null) return (<div key={`e${i}`} className="aspect-square border-b border-r border-slate-50"/>);
            const ds=toDateStr(day);const its=itemsByDate[ds]||[];const isToday=ds===toDay();const isSel=ds===selectedDate;const dow=new Date(calYear,calMonth,day).getDay();
            return (<button key={day} onClick={()=>setSelectedDate(isSel?null:ds)} className={`aspect-square border-b border-r border-slate-50 flex flex-col items-center justify-center gap-0.5 transition ${isSel?"bg-teal-50":"hover:bg-slate-50"} ${isToday?"ring-2 ring-inset ring-teal-400 rounded-lg":""}`}>
              <span className={`text-sm leading-none ${isSel?"font-bold text-teal-600":dow===0?"text-red-400":dow===6?"text-blue-400":"text-slate-700"}`}>{day}</span>
              {its.length>0&&<div className="flex gap-0.5 mt-0.5">{its.length<=3?its.map((_,j)=>(<div key={j} className="w-1 h-1 rounded-full bg-teal-400"/>)):<><div className="w-1 h-1 rounded-full bg-teal-400"/><span className="text-[8px] text-teal-500 font-bold">{its.length}</span></>}</div>}
            </button>);
          })}</div>
        </div>
        {selectedDate&&(<div className="mt-4"><h3 className="text-sm font-bold text-slate-700 mb-2">📦 {fmt(selectedDate)}</h3>{selectedDateItems.length===0?(<div className="text-center py-8 text-slate-400 text-sm bg-white rounded-xl border border-slate-100">등록된 물건 없음</div>):(<div className="space-y-1.5">{selectedDateItems.map(item=>(<button key={item.id} onClick={()=>{setTab("map");setRoomId(item.roomId);setNavPath(item.navPath);}} className="w-full bg-white rounded-lg px-4 py-3 border border-slate-100 hover:border-teal-200 transition text-left flex items-center justify-between"><div className="flex items-center gap-2 min-w-0"><span className="text-sm shrink-0">{item.roomIcon}</span><span className="text-sm font-medium text-slate-700 truncate">{item.name}</span></div><span className="text-xs text-slate-400 shrink-0">{item.path}</span></button>))}</div>)}</div>)}
        {!selectedDate&&monthItems.length>0&&(<div className="mt-4"><h3 className="text-sm font-bold text-slate-700 mb-2">이번 달 ({monthItems.length}개)</h3><div className="space-y-1.5">{monthItems.map(item=>(<button key={item.id} onClick={()=>{setTab("map");setRoomId(item.roomId);setNavPath(item.navPath);}} className="w-full bg-white rounded-lg px-4 py-3 border border-slate-100 hover:border-teal-200 transition text-left flex items-center justify-between"><div className="flex items-center gap-2 min-w-0"><span className="text-sm shrink-0">{item.roomIcon}</span><span className="text-sm font-medium text-slate-700 truncate">{item.name}</span></div><div className="flex items-center gap-2 shrink-0"><span className="text-xs text-slate-400">{item.path}</span><span className="text-xs text-slate-300">{fmt(item.date)}</span></div></button>))}</div></div>)}
        {!selectedDate&&monthItems.length===0&&<div className="mt-4 text-center py-8 text-slate-400 text-sm bg-white rounded-xl border border-slate-100">이번 달 등록 물건 없음</div>}
      </div>)}

      {/* Delete modal */}
      {pendingDel&&(<div className="fixed inset-0 bg-black/25 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={()=>setPendingDel(null)}>
        <div className="bg-white w-full sm:max-w-xs rounded-t-2xl sm:rounded-2xl p-5 shadow-xl text-center" onClick={e=>e.stopPropagation()}>
          <p className="text-sm text-slate-700 mb-4">{pendingDel.type==="reset"?"샘플 데이터로 초기화할까요?":<><span className="font-bold">&ldquo;{pendingDel.name}&rdquo;</span> 삭제?</>}</p>
          <div className="flex gap-2">
            <button onClick={()=>setPendingDel(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 transition font-medium">취소</button>
            <button onClick={()=>{if(pendingDel.type==="item")deleteItemAtPath(pendingDel.itemId);if(pendingDel.type==="child")deleteChild(pendingDel.childId);if(pendingDel.type==="furniture")deleteFurniture(pendingDel.roomId,pendingDel.locId);if(pendingDel.type==="room")deleteRoom(pendingDel.id);if(pendingDel.type==="reset"){save(SAMPLE);goHome();setTempLayouts({});setTempFurn({});}setPendingDel(null);}} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm hover:bg-red-600 transition font-medium">{pendingDel.type==="reset"?"초기화":"삭제"}</button>
          </div>
        </div>
      </div>)}

      {/* Add/Edit modal */}
      {modal&&(<div className="fixed inset-0 bg-black/25 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={()=>setModal(null)}>
        <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 shadow-xl max-h-[85vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
          <h3 className="font-bold text-slate-800 mb-4 text-base">{modal.type==="addRoom"&&"새 방 추가"}{modal.type==="addFurniture"&&"가구 추가"}{modal.type==="addChild"&&"하위 칸 추가"}{modal.type==="addItem"&&"물건 추가"}{modal.type==="editItem"&&"물건 편집"}{modal.type==="editRoom"&&"방 이름 편집"}{modal.type==="editFurniture"&&"가구 이름 편집"}{modal.type==="editChild"&&"칸 이름 편집"}</h3>
          {(modal.type==="addRoom"||modal.type==="editRoom")&&(<div className="mb-4"><p className="text-xs text-slate-500 mb-2 font-medium">아이콘</p><div className="flex gap-1.5 flex-wrap">{ICONS.map(icon=>(<button key={icon} onClick={()=>setInputIcon(icon)} className={`text-xl w-10 h-10 flex items-center justify-center rounded-xl transition ${inputIcon===icon?"bg-teal-100 ring-2 ring-teal-400 scale-110":"hover:bg-slate-100"}`}>{icon}</button>))}</div></div>)}
          {modal.type==="addFurniture"&&(<div className="mb-4"><p className="text-xs text-slate-500 mb-2 font-medium">가구 종류</p><div className="grid grid-cols-4 gap-1.5">{FURN.map(f=>(<button key={f.id} onClick={()=>{setInputFType(f.id);if(!inputVal.trim())setInputVal(f.name);}} className={`flex flex-col items-center py-2 rounded-xl text-xs transition ${inputFType===f.id?"ring-2 ring-teal-400 shadow-sm":"hover:bg-slate-50"}`} style={{background:inputFType===f.id?f.bg:"transparent"}}><span className="text-lg">{f.icon}</span><span className="mt-0.5 text-slate-600">{f.name}</span></button>))}</div></div>)}
          <input ref={inputRef} type="text" value={inputVal} onChange={e=>setInputVal(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")handleModalSubmit();}} placeholder={modal.type==="addRoom"||modal.type==="editRoom"?"방 이름":modal.type==="addFurniture"||modal.type==="editFurniture"?"가구 이름":modal.type==="addChild"||modal.type==="editChild"?"칸 이름 (예: 1층, 좌측)":"물건 이름"} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-teal-400 transition"/>
          {(modal.type==="addItem"||modal.type==="editItem")&&(<div className="mt-3"><p className="text-xs text-slate-500 mb-1.5 font-medium">구매/보관 날짜</p><input type="date" value={inputDate} onChange={e=>setInputDate(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-teal-400 transition text-slate-700"/></div>)}
          <div className="flex gap-2 mt-4">
            {modal.type==="editItem"&&<button onClick={()=>{deleteItemAtPath(modal.itemId);setModal(null);}} className="py-2.5 px-4 rounded-xl border border-red-200 text-sm text-red-400 hover:bg-red-50 transition font-medium">삭제</button>}
            <button onClick={()=>setModal(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 transition font-medium">취소</button>
            <button onClick={handleModalSubmit} disabled={!inputVal.trim()} className="flex-1 py-2.5 rounded-xl bg-teal-500 text-white text-sm hover:bg-teal-600 disabled:opacity-40 transition font-medium">{modal.type.startsWith("edit")?"저장":"추가"}</button>
          </div>
        </div>
      </div>)}
    </div>
  );
}
