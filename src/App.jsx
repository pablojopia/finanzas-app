import { useState, useEffect, useRef } from "react";

const T = {
  bg: '#0d0d0d', surface: '#1c1c1e', card: '#252528', border: '#2e2e32',
  accent: '#f59e0b', accentDim: '#78350f', text: '#f2f2f7', muted: '#8e8e93',
  success: '#30d158', danger: '#ff453a', blue: '#0a84ff',
};

const fmt = (n) => {
  const num = Number(n) || 0;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
  return `$${num.toLocaleString('es-AR')}`;
};
const fmtFull = (n) => `$${(Number(n) || 0).toLocaleString('es-AR')}`;
const uid = () => Math.random().toString(36).slice(2);
const today = () => new Date().toISOString().split('T')[0];
const getCurrentMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; };
const getLastMonth = () => { const d = new Date(); d.setMonth(d.getMonth()-1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; };
const getWeekOfMonth = (dateStr) => Math.ceil(new Date(dateStr).getDate() / 7);

async function load(key) { try { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : null; } catch { return null; } }
async function save(key, val) { try { await window.storage.set(key, JSON.stringify(val)); } catch {} }

function Ico({ name, size = 18, color = 'currentColor' }) {
  const P = {
    home: ['M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z'],
    card: ['M1 4h22v16H1z','M1 9h22'],
    income: ['M12 2v20','M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6'],
    work: ['M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z','M14 2v6h6','M16 13H8','M16 17H8','M10 9H8'],
    budget: ['M9 11l3 3L22 4','M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11'],
    plus: ['M12 5v14','M5 12h14'],
    trash: ['M3 6h18','M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6','M8 6V4h8v2'],
    edit: ['M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7','M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z'],
    photo: ['M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z','M12 17a4 4 0 100-8 4 4 0 000 8z'],
    x: ['M18 6L6 18','M6 6l12 12'],
    back: ['M19 12H5','M12 19l-7-7 7-7'],
    convert: ['M8 3H5a2 2 0 00-2 2v3','M21 8V5a2 2 0 00-2-2h-3','M3 16v3a2 2 0 002 2h3','M16 21h3a2 2 0 002-2v-3'],
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {(P[name]||P.x).map((d,i)=><path key={i} d={d}/>)}
    </svg>
  );
}

const Btn = ({children, onClick, color=T.accent, text='#000', style={}, small=false}) => (
  <button onClick={onClick} style={{background:color,color:text,border:'none',borderRadius:10,padding:small?'6px 12px':'10px 16px',fontSize:small?12:14,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:6,...style}}>{children}</button>
);
const Card = ({children, style={}}) => (
  <div style={{background:T.card,borderRadius:14,padding:16,border:`1px solid ${T.border}`,...style}}>{children}</div>
);
const Label = ({children}) => (
  <div style={{color:T.muted,fontSize:11,fontWeight:600,letterSpacing:1,textTransform:'uppercase',marginBottom:4}}>{children}</div>
);
const Input = ({value,onChange,placeholder,type='text',style={}}) => (
  <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} type={type}
    style={{width:'100%',background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:'10px 12px',color:T.text,fontSize:14,outline:'none',boxSizing:'border-box',...style}}/>
);
const Modal = ({title, onClose, children}) => (
  <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:100,display:'flex',alignItems:'flex-end'}}>
    <div style={{background:T.surface,borderRadius:'20px 20px 0 0',width:'100%',maxHeight:'92vh',overflowY:'auto',padding:20,boxSizing:'border-box'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <span style={{color:T.text,fontWeight:700,fontSize:18}}>{title}</span>
        <button onClick={onClose} style={{background:T.card,border:'none',borderRadius:8,padding:6,cursor:'pointer',color:T.muted}}><Ico name="x" size={16}/></button>
      </div>
      {children}
    </div>
  </div>
);

// ── WEEKLY CHART ──────────────────────────────────────────────────────────────
function WeeklyChart({ incomes, goal, onGoalChange }) {
  const cm = getCurrentMonth();
  const cw = getWeekOfMonth(today());
  const weeks = [1,2,3,4,5].filter(w => w <= Math.min(cw+1,5));
  const totals = [1,2,3,4,5].map(w =>
    incomes.filter(i => i.status==='collected' && i.collectedDate?.startsWith(cm) && getWeekOfMonth(i.collectedDate)===w)
      .reduce((s,i) => s+Number(i.amount),0)
  );
  const maxV = Math.max(goal*1.4, ...totals, 1);

  return (
    <Card>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <span style={{color:T.text,fontWeight:700,fontSize:15}}>Ingresos semanales</span>
        <span style={{color:T.accent,fontSize:13,fontWeight:700}}>Meta: {fmt(goal)}</span>
      </div>
      <div style={{display:'flex',alignItems:'flex-end',gap:8,height:100,marginBottom:10}}>
        {weeks.map(w => {
          const val = totals[w-1];
          const pct = Math.min(val/maxV,1);
          const met = val >= goal;
          const isCur = w === cw;
          return (
            <div key={w} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
              <span style={{color:T.muted,fontSize:9,minHeight:12}}>{val>0?fmt(val):''}</span>
              <div style={{width:'100%',height:75,display:'flex',alignItems:'flex-end'}}>
                <div style={{width:'100%',height:`${Math.max(pct*100, val>0?6:1.5)}%`,background:met?T.success:isCur?T.accent:T.border,borderRadius:'4px 4px 0 0',transition:'height 0.4s'}}/>
              </div>
              <span style={{color:isCur?T.accent:T.muted,fontSize:10,fontWeight:isCur?700:400}}>S{w}</span>
            </div>
          );
        })}
      </div>
      <div style={{marginTop:6}}>
        <Label>Meta semanal editable</Label>
        <div style={{display:'flex',alignItems:'center',gap:10,marginTop:4}}>
          <span style={{color:T.muted,fontSize:11,whiteSpace:'nowrap'}}>$1M</span>
          <input type="range" min={1000000} max={10000000} step={500000} value={goal}
            onChange={e=>onGoalChange(Number(e.target.value))}
            style={{flex:1,accentColor:T.accent,height:4}}/>
          <span style={{color:T.muted,fontSize:11,whiteSpace:'nowrap'}}>$10M</span>
        </div>
      </div>
    </Card>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function Dashboard({ cards, incomes, works, weeklyGoal, onGoalChange }) {
  const cm = getCurrentMonth(), lm = getLastMonth();
  const pendingIncome = incomes.filter(i=>i.status==='pending').reduce((s,i)=>s+Number(i.amount),0);
  const thisMonth = incomes.filter(i=>i.status==='collected'&&i.collectedDate?.startsWith(cm)).reduce((s,i)=>s+Number(i.amount),0);
  const lastMonth = incomes.filter(i=>i.status==='collected'&&i.collectedDate?.startsWith(lm)).reduce((s,i)=>s+Number(i.amount),0);
  const diff = thisMonth - lastMonth;
  const marginProfit = works.reduce((s,w)=>s+(w.materials||[]).reduce((ms,m)=>ms+Number(m.amount||0)*(Number(m.margin||0)/100),0),0);
  const totalDebt = cards.reduce((s,c)=>s+Number(c.totalAmount||0),0);
  const nextDue = cards.filter(c=>c.dueDate).sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate))[0];

  const Stat = ({label, value, sub, color=T.text}) => (
    <Card style={{flex:1}}>
      <Label>{label}</Label>
      <div style={{color,fontSize:19,fontWeight:700,lineHeight:1.2}}>{fmt(value)}</div>
      {sub&&<div style={{color:T.muted,fontSize:11,marginTop:3}}>{sub}</div>}
    </Card>
  );

  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <WeeklyChart incomes={incomes} goal={weeklyGoal} onGoalChange={onGoalChange}/>
      <div style={{display:'flex',gap:10}}>
        <Stat label="A cobrar" value={pendingIncome} sub="ingresos pendientes" color={T.accent}/>
        <Stat label="Margen materiales" value={marginProfit} sub="ganancia acumulada" color={T.success}/>
      </div>
      <div style={{display:'flex',gap:10}}>
        <Stat label="Deuda tarjetas" value={totalDebt} sub={nextDue?`Vence ${nextDue.dueDate}`:'sin vencimientos'} color={T.danger}/>
        <Card style={{flex:1}}>
          <Label>vs. mes anterior</Label>
          <div style={{color:diff>=0?T.success:T.danger,fontSize:19,fontWeight:700,lineHeight:1.2}}>{diff>=0?'+':''}{fmt(diff)}</div>
          <div style={{color:T.muted,fontSize:11,marginTop:3}}>{fmt(thisMonth)} este mes</div>
        </Card>
      </div>
    </div>
  );
}

// ── CARDS ─────────────────────────────────────────────────────────────────────
function CardsModule({ cards, setCards }) {
  const [modal, setModal] = useState(null);
  const empty = {name:'',bank:'',closeDate:'',dueDate:'',minAmount:'',totalAmount:''};
  const [form, setForm] = useState(empty);
  const f = (k,v) => setForm(p=>({...p,[k]:v}));

  const save = () => {
    if(!form.name) return;
    if(modal==='add') setCards(p=>[...p,{...form,id:uid()}]);
    else setCards(p=>p.map(c=>c.id===modal?{...form,id:modal}:c));
    setModal(null);
  };

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <h2 style={{color:T.text,margin:0,fontSize:20,fontWeight:700}}>Tarjetas</h2>
        <Btn small onClick={()=>{setForm(empty);setModal('add')}}><Ico name="plus" size={14}/> Nueva</Btn>
      </div>
      {cards.length===0&&<div style={{color:T.muted,textAlign:'center',padding:40}}>Sin tarjetas cargadas</div>}
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {cards.map(c=>(
          <Card key={c.id}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div>
                <div style={{color:T.text,fontWeight:700,fontSize:16}}>{c.name}</div>
                {c.bank&&<div style={{color:T.muted,fontSize:12}}>{c.bank}</div>}
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>{setForm({...c});setModal(c.id)}} style={{background:'none',border:'none',cursor:'pointer',color:T.muted}}><Ico name="edit" size={16}/></button>
                <button onClick={()=>setCards(p=>p.filter(x=>x.id!==c.id))} style={{background:'none',border:'none',cursor:'pointer',color:T.danger}}><Ico name="trash" size={16}/></button>
              </div>
            </div>
            <div style={{display:'flex',gap:20,marginTop:12}}>
              <div><Label>Mínimo</Label><span style={{color:T.accent,fontWeight:700}}>{fmtFull(c.minAmount||0)}</span></div>
              <div><Label>Total</Label><span style={{color:T.danger,fontWeight:700}}>{fmtFull(c.totalAmount||0)}</span></div>
            </div>
            <div style={{display:'flex',gap:20,marginTop:8}}>
              <div><Label>Cierre</Label><span style={{color:T.muted,fontSize:13}}>{c.closeDate||'—'}</span></div>
              <div><Label>Vencimiento</Label><span style={{color:T.muted,fontSize:13}}>{c.dueDate||'—'}</span></div>
            </div>
          </Card>
        ))}
      </div>
      {modal&&(
        <Modal title={modal==='add'?'Nueva tarjeta':'Editar tarjeta'} onClose={()=>setModal(null)}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div><Label>Nombre</Label><Input value={form.name} onChange={v=>f('name',v)} placeholder="Ej: Visa Banco Nación"/></div>
            <div><Label>Banco / Emisor</Label><Input value={form.bank} onChange={v=>f('bank',v)} placeholder="Ej: Banco Nación"/></div>
            <div style={{display:'flex',gap:10}}>
              <div style={{flex:1}}><Label>Cierre</Label><Input type="date" value={form.closeDate} onChange={v=>f('closeDate',v)}/></div>
              <div style={{flex:1}}><Label>Vencimiento</Label><Input type="date" value={form.dueDate} onChange={v=>f('dueDate',v)}/></div>
            </div>
            <div style={{display:'flex',gap:10}}>
              <div style={{flex:1}}><Label>Mínimo</Label><Input type="number" value={form.minAmount} onChange={v=>f('minAmount',v)} placeholder="0"/></div>
              <div style={{flex:1}}><Label>Total</Label><Input type="number" value={form.totalAmount} onChange={v=>f('totalAmount',v)} placeholder="0"/></div>
            </div>
            <Btn onClick={save} style={{width:'100%',justifyContent:'center'}}>Guardar</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── INCOMES ───────────────────────────────────────────────────────────────────
function IncomesModule({ incomes, setIncomes }) {
  const [modal, setModal] = useState(null);
  const empty = {description:'',amount:'',expectedDate:'',status:'pending',collectedDate:''};
  const [form, setForm] = useState(empty);
  const f = (k,v) => setForm(p=>({...p,[k]:v}));

  const save = () => {
    if(!form.amount) return;
    if(modal==='add') setIncomes(p=>[...p,{...form,id:uid()}]);
    else setIncomes(p=>p.map(i=>i.id===modal?{...form,id:modal}:i));
    setModal(null);
  };

  const toggle = (item) => setIncomes(p=>p.map(i=>i.id===item.id
    ?{...i,status:i.status==='pending'?'collected':'pending',collectedDate:i.status==='pending'?today():''}:i));

  const Item = ({item}) => (
    <Card>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div style={{flex:1}}>
          <div style={{color:T.text,fontWeight:600}}>{item.description||'Sin descripción'}</div>
          <div style={{color:item.status==='collected'?T.success:T.accent,fontSize:18,fontWeight:700}}>{fmtFull(item.amount)}</div>
          <div style={{color:T.muted,fontSize:12,marginTop:2}}>
            {item.status==='pending'?`Esperado: ${item.expectedDate||'sin fecha'}`:`Cobrado: ${item.collectedDate}`}
          </div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:6,alignItems:'flex-end'}}>
          <button onClick={()=>toggle(item)} style={{background:item.status==='collected'?T.success+'33':T.accentDim,border:`1px solid ${item.status==='collected'?T.success:T.accent}`,borderRadius:6,padding:'4px 8px',cursor:'pointer',color:item.status==='collected'?T.success:T.accent,fontSize:11,fontWeight:600}}>
            {item.status==='collected'?'✓ Cobrado':'Pendiente'}
          </button>
          <div style={{display:'flex',gap:6}}>
            <button onClick={()=>{setForm({...item});setModal(item.id)}} style={{background:'none',border:'none',cursor:'pointer',color:T.muted}}><Ico name="edit" size={15}/></button>
            <button onClick={()=>setIncomes(p=>p.filter(i=>i.id!==item.id))} style={{background:'none',border:'none',cursor:'pointer',color:T.danger}}><Ico name="trash" size={15}/></button>
          </div>
        </div>
      </div>
    </Card>
  );

  const pending = incomes.filter(i=>i.status==='pending');
  const collected = incomes.filter(i=>i.status==='collected');

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <h2 style={{color:T.text,margin:0,fontSize:20,fontWeight:700}}>Ingresos</h2>
        <Btn small onClick={()=>{setForm(empty);setModal('add')}}><Ico name="plus" size={14}/> Nuevo</Btn>
      </div>
      {incomes.length===0&&<div style={{color:T.muted,textAlign:'center',padding:40}}>Sin ingresos cargados</div>}
      {pending.length>0&&<div style={{marginBottom:16}}><div style={{color:T.accent,fontWeight:600,fontSize:13,marginBottom:8}}>PENDIENTES ({pending.length})</div><div style={{display:'flex',flexDirection:'column',gap:10}}>{pending.map(i=><Item key={i.id} item={i}/>)}</div></div>}
      {collected.length>0&&<div><div style={{color:T.success,fontWeight:600,fontSize:13,marginBottom:8}}>COBRADOS ({collected.length})</div><div style={{display:'flex',flexDirection:'column',gap:10}}>{collected.map(i=><Item key={i.id} item={i}/>)}</div></div>}
      {modal&&(
        <Modal title={modal==='add'?'Nuevo ingreso':'Editar ingreso'} onClose={()=>setModal(null)}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div><Label>Descripción</Label><Input value={form.description} onChange={v=>f('description',v)} placeholder="Ej: Cobro obra García"/></div>
            <div><Label>Monto</Label><Input type="number" value={form.amount} onChange={v=>f('amount',v)} placeholder="0"/></div>
            <div><Label>Fecha estimada</Label><Input type="date" value={form.expectedDate} onChange={v=>f('expectedDate',v)}/></div>
            <div><Label>Estado</Label>
              <div style={{display:'flex',gap:8}}>
                {['pending','collected'].map(s=>(
                  <button key={s} onClick={()=>f('status',s)} style={{flex:1,padding:'8px',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13,background:form.status===s?(s==='collected'?T.success:T.accent):T.card,color:form.status===s?'#000':T.muted,border:'none'}}>
                    {s==='pending'?'Pendiente':'Cobrado'}
                  </button>
                ))}
              </div>
            </div>
            {form.status==='collected'&&<div><Label>Fecha de cobro</Label><Input type="date" value={form.collectedDate} onChange={v=>f('collectedDate',v)}/></div>}
            <Btn onClick={save} style={{width:'100%',justifyContent:'center'}}>Guardar</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── WORK DETAIL ───────────────────────────────────────────────────────────────
function WorkDetail({ work, onBack, onUpdate }) {
  const [tab, setTab] = useState('info');
  const [w, setW] = useState(work);
  const upd = (nw) => { setW(nw); onUpdate(nw); };

  // Materials
  const [matModal, setMatModal] = useState(null);
  const emptyMat = {company:'',amount:'',paymentDate:'',margin:''};
  const [mf, setMf] = useState(emptyMat);
  const saveMat = () => {
    if(!mf.company||!mf.amount) return;
    const mats = w.materials||[];
    if(matModal==='add') upd({...w,materials:[...mats,{...mf,id:uid()}]});
    else upd({...w,materials:mats.map(m=>m.id===matModal?{...mf,id:matModal}:m)});
    setMatModal(null);
  };

  // Labor
  const [laborModal, setLaborModal] = useState(null);
  const [lf, setLf] = useState({name:'',totalAgreed:''});
  const [payModal, setPayModal] = useState(null);
  const [pf, setPf] = useState({amount:'',date:today()});
  const savePerson = () => {
    if(!lf.name) return;
    const labor = w.labor||[];
    if(laborModal==='add') upd({...w,labor:[...labor,{...lf,id:uid(),payments:[]}]});
    else upd({...w,labor:labor.map(l=>l.id===laborModal?{...lf,id:laborModal,payments:l.payments}:l)});
    setLaborModal(null);
  };
  const addPayment = (personId) => {
    if(!pf.amount) return;
    upd({...w,labor:(w.labor||[]).map(l=>l.id!==personId?l:{...l,payments:[...(l.payments||[]),{...pf,id:uid()}]})});
    setPayModal(null); setPf({amount:'',date:today()});
  };
  const delPayment = (pid,payId) => upd({...w,labor:(w.labor||[]).map(l=>l.id!==pid?l:{...l,payments:(l.payments||[]).filter(p=>p.id!==payId)})});

  // Photos
  const fileRef = useRef();
  const [photoModal, setPhotoModal] = useState(null);
  const [caption, setCaption] = useState('');
  const handleFile = (e) => {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => { setPhotoModal({url:ev.target.result}); setCaption(''); };
    reader.readAsDataURL(file);
    e.target.value='';
  };
  const savePhoto = () => { upd({...w,photos:[...(w.photos||[]),{id:uid(),url:photoModal.url,caption}]}); setPhotoModal(null); };

  const totalMat = (w.materials||[]).reduce((s,m)=>s+Number(m.amount||0),0);
  const totalMargin = (w.materials||[]).reduce((s,m)=>s+Number(m.amount||0)*(Number(m.margin||0)/100),0);
  const totalLab = (w.labor||[]).reduce((s,l)=>s+Number(l.totalAgreed||0),0);
  const totalPaid = (w.labor||[]).reduce((s,l)=>s+(l.payments||[]).reduce((ps,p)=>ps+Number(p.amount||0),0),0);

  const tabs = [{k:'info',l:'Info'},{k:'materials',l:'Materiales'},{k:'labor',l:'M. de Obra'},{k:'photos',l:'Fotos'}];

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
        <button onClick={onBack} style={{background:T.card,border:'none',borderRadius:8,padding:8,cursor:'pointer',color:T.text}}><Ico name="back" size={16}/></button>
        <h2 style={{color:T.text,margin:0,fontSize:18,fontWeight:700,flex:1}}>{w.name}</h2>
      </div>
      <div style={{display:'flex',gap:4,marginBottom:16,background:T.surface,borderRadius:10,padding:4}}>
        {tabs.map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} style={{flex:1,padding:'7px 4px',borderRadius:7,border:'none',cursor:'pointer',fontSize:11,fontWeight:600,background:tab===t.k?T.accent:'transparent',color:tab===t.k?'#000':T.muted}}>
            {t.l}
          </button>
        ))}
      </div>

      {tab==='info'&&(
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <Card><Label>Descripción</Label><div style={{color:T.text,fontSize:14,lineHeight:1.5}}>{w.description||'Sin descripción'}</div></Card>
          <div style={{display:'flex',gap:10}}>
            <Card style={{flex:1}}><Label>Materiales</Label><div style={{color:T.text,fontWeight:700,fontSize:16}}>{fmtFull(totalMat)}</div></Card>
            <Card style={{flex:1}}><Label>Ganancia mat.</Label><div style={{color:T.success,fontWeight:700,fontSize:16}}>+{fmtFull(totalMargin)}</div></Card>
          </div>
          <div style={{display:'flex',gap:10}}>
            <Card style={{flex:1}}><Label>M. de obra</Label><div style={{color:T.text,fontWeight:700,fontSize:16}}>{fmtFull(totalLab)}</div></Card>
            <Card style={{flex:1}}><Label>Pagado M.O.</Label><div style={{color:T.accent,fontWeight:700,fontSize:16}}>{fmtFull(totalPaid)}</div></Card>
          </div>
          <Card><Label>Costo total</Label><div style={{color:T.danger,fontWeight:700,fontSize:22}}>{fmtFull(totalMat+totalLab)}</div></Card>
        </div>
      )}

      {tab==='materials'&&(
        <div>
          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:12}}>
            <Btn small onClick={()=>{setMf(emptyMat);setMatModal('add')}}><Ico name="plus" size={14}/> Agregar</Btn>
          </div>
          {(w.materials||[]).length===0&&<div style={{color:T.muted,textAlign:'center',padding:30}}>Sin materiales</div>}
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {(w.materials||[]).map(m=>{
              const profit = Number(m.amount||0)*(Number(m.margin||0)/100);
              return (
                <Card key={m.id}>
                  <div style={{display:'flex',justifyContent:'space-between'}}>
                    <div style={{fontWeight:700,color:T.text,fontSize:15}}>{m.company}</div>
                    <div style={{display:'flex',gap:8}}>
                      <button onClick={()=>{setMf({...m});setMatModal(m.id)}} style={{background:'none',border:'none',cursor:'pointer',color:T.muted}}><Ico name="edit" size={15}/></button>
                      <button onClick={()=>upd({...w,materials:(w.materials||[]).filter(x=>x.id!==m.id)})} style={{background:'none',border:'none',cursor:'pointer',color:T.danger}}><Ico name="trash" size={15}/></button>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:16,marginTop:8,flexWrap:'wrap'}}>
                    <div><Label>Monto</Label><span style={{color:T.text,fontWeight:600}}>{fmtFull(m.amount)}</span></div>
                    <div><Label>Margen</Label><span style={{color:T.accent,fontWeight:600}}>{m.margin}%</span></div>
                    <div><Label>Ganancia</Label><span style={{color:T.success,fontWeight:600}}>+{fmtFull(profit)}</span></div>
                  </div>
                  {m.paymentDate&&<div style={{marginTop:6}}><Label>Fecha de pago</Label><span style={{color:T.muted,fontSize:13}}>{m.paymentDate}</span></div>}
                </Card>
              );
            })}
          </div>
          {matModal&&(
            <Modal title={matModal==='add'?'Nuevo material':'Editar material'} onClose={()=>setMatModal(null)}>
              <div style={{display:'flex',flexDirection:'column',gap:14}}>
                <div><Label>Distribuidora / Empresa</Label><Input value={mf.company} onChange={v=>setMf(p=>({...p,company:v}))} placeholder="Ej: Cerámicos del Sur"/></div>
                <div><Label>Monto</Label><Input type="number" value={mf.amount} onChange={v=>setMf(p=>({...p,amount:v}))} placeholder="0"/></div>
                <div><Label>Margen de ganancia (%)</Label><Input type="number" value={mf.margin} onChange={v=>setMf(p=>({...p,margin:v}))} placeholder="Ej: 20"/></div>
                <div><Label>Fecha de pago</Label><Input type="date" value={mf.paymentDate} onChange={v=>setMf(p=>({...p,paymentDate:v}))}/></div>
                <Btn onClick={saveMat} style={{width:'100%',justifyContent:'center'}}>Guardar</Btn>
              </div>
            </Modal>
          )}
        </div>
      )}

      {tab==='labor'&&(
        <div>
          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:12}}>
            <Btn small onClick={()=>{setLf({name:'',totalAgreed:''});setLaborModal('add')}}><Ico name="plus" size={14}/> Persona</Btn>
          </div>
          {(w.labor||[]).length===0&&<div style={{color:T.muted,textAlign:'center',padding:30}}>Sin mano de obra</div>}
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {(w.labor||[]).map(l=>{
              const paid = (l.payments||[]).reduce((s,p)=>s+Number(p.amount||0),0);
              const rem = Number(l.totalAgreed||0)-paid;
              const pct = l.totalAgreed>0?Math.min(paid/Number(l.totalAgreed)*100,100):0;
              return (
                <Card key={l.id}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                    <div style={{fontWeight:700,color:T.text,fontSize:15}}>{l.name}</div>
                    <div style={{display:'flex',gap:6}}>
                      <Btn small onClick={()=>{setPf({amount:'',date:today()});setPayModal(l.id)}} color={T.surface} text={T.accent} style={{border:`1px solid ${T.accent}`}}>+ Pago</Btn>
                      <button onClick={()=>upd({...w,labor:(w.labor||[]).filter(x=>x.id!==l.id)})} style={{background:'none',border:'none',cursor:'pointer',color:T.danger}}><Ico name="trash" size={15}/></button>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:16,marginTop:10}}>
                    <div><Label>Acordado</Label><span style={{color:T.text,fontWeight:600}}>{fmtFull(l.totalAgreed)}</span></div>
                    <div><Label>Pagado</Label><span style={{color:T.success,fontWeight:600}}>{fmtFull(paid)}</span></div>
                    <div><Label>Restante</Label><span style={{color:rem>0?T.danger:T.success,fontWeight:600}}>{fmtFull(rem)}</span></div>
                  </div>
                  <div style={{background:T.border,borderRadius:4,height:5,marginTop:10}}>
                    <div style={{background:pct>=100?T.success:T.accent,height:'100%',borderRadius:4,width:`${pct}%`,transition:'width 0.3s'}}/>
                  </div>
                  {(l.payments||[]).length>0&&(
                    <div style={{marginTop:10,display:'flex',flexDirection:'column',gap:4}}>
                      {(l.payments||[]).map(p=>(
                        <div key={p.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:T.surface,borderRadius:6,padding:'6px 10px'}}>
                          <span style={{color:T.text,fontSize:13,fontWeight:600}}>{fmtFull(p.amount)}</span>
                          <span style={{color:T.muted,fontSize:12}}>{p.date}</span>
                          <button onClick={()=>delPayment(l.id,p.id)} style={{background:'none',border:'none',cursor:'pointer',color:T.danger}}><Ico name="trash" size={13}/></button>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
          {laborModal&&(
            <Modal title="Agregar persona" onClose={()=>setLaborModal(null)}>
              <div style={{display:'flex',flexDirection:'column',gap:14}}>
                <div><Label>Nombre</Label><Input value={lf.name} onChange={v=>setLf(p=>({...p,name:v}))} placeholder="Ej: Juan Pérez"/></div>
                <div><Label>Monto total acordado</Label><Input type="number" value={lf.totalAgreed} onChange={v=>setLf(p=>({...p,totalAgreed:v}))} placeholder="0"/></div>
                <Btn onClick={savePerson} style={{width:'100%',justifyContent:'center'}}>Guardar</Btn>
              </div>
            </Modal>
          )}
          {payModal&&(
            <Modal title="Registrar pago" onClose={()=>setPayModal(null)}>
              <div style={{display:'flex',flexDirection:'column',gap:14}}>
                <div><Label>Monto</Label><Input type="number" value={pf.amount} onChange={v=>setPf(p=>({...p,amount:v}))} placeholder="0"/></div>
                <div><Label>Fecha</Label><Input type="date" value={pf.date} onChange={v=>setPf(p=>({...p,date:v}))}/></div>
                <Btn onClick={()=>addPayment(payModal)} style={{width:'100%',justifyContent:'center'}}>Registrar pago</Btn>
              </div>
            </Modal>
          )}
        </div>
      )}

      {tab==='photos'&&(
        <div>
          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:12}}>
            <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleFile}/>
            <Btn small onClick={()=>fileRef.current.click()}><Ico name="photo" size={14}/> Foto</Btn>
          </div>
          {(w.photos||[]).length===0&&<div style={{color:T.muted,textAlign:'center',padding:30}}>Sin fotos</div>}
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {(w.photos||[]).map(p=>(
              <Card key={p.id}>
                <img src={p.url} alt={p.caption} style={{width:'100%',borderRadius:10,objectFit:'cover',maxHeight:220}}/>
                {p.caption&&<div style={{color:T.muted,fontSize:13,marginTop:8,lineHeight:1.4}}>{p.caption}</div>}
                <div style={{display:'flex',justifyContent:'flex-end',marginTop:8}}>
                  <button onClick={()=>upd({...w,photos:(w.photos||[]).filter(x=>x.id!==p.id)})} style={{background:'none',border:'none',cursor:'pointer',color:T.danger}}><Ico name="trash" size={15}/></button>
                </div>
              </Card>
            ))}
          </div>
          {photoModal&&(
            <Modal title="Agregar foto" onClose={()=>setPhotoModal(null)}>
              <img src={photoModal.url} alt="" style={{width:'100%',borderRadius:10,marginBottom:14,objectFit:'cover',maxHeight:200}}/>
              <div><Label>Descripción</Label><Input value={caption} onChange={setCaption} placeholder="Ej: Pared antes del revestimiento"/></div>
              <Btn onClick={savePhoto} style={{width:'100%',justifyContent:'center',marginTop:14}}>Guardar foto</Btn>
            </Modal>
          )}
        </div>
      )}
    </div>
  );
}

// ── WORKS MODULE ──────────────────────────────────────────────────────────────
function WorksModule({ works, setWorks }) {
  const [detail, setDetail] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({name:'',description:''});

  const save = () => {
    if(!form.name) return;
    setWorks(p=>[...p,{...form,id:uid(),materials:[],labor:[],photos:[]}]);
    setModal(false);
  };

  const updateWork = (upd) => setWorks(p=>p.map(w=>w.id===upd.id?upd:w));

  if(detail) {
    const work = works.find(w=>w.id===detail);
    if(!work) { setDetail(null); return null; }
    return <WorkDetail work={work} onBack={()=>setDetail(null)} onUpdate={updateWork}/>;
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <h2 style={{color:T.text,margin:0,fontSize:20,fontWeight:700}}>Trabajos</h2>
        <Btn small onClick={()=>{setForm({name:'',description:''});setModal(true)}}><Ico name="plus" size={14}/> Nuevo</Btn>
      </div>
      {works.length===0&&<div style={{color:T.muted,textAlign:'center',padding:40}}>Sin trabajos cargados</div>}
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {works.map(w=>{
          const totalMat = (w.materials||[]).reduce((s,m)=>s+Number(m.amount||0),0);
          const totalLab = (w.labor||[]).reduce((s,l)=>s+Number(l.totalAgreed||0),0);
          const photos = (w.photos||[]).length;
          return (
            <Card key={w.id} style={{cursor:'pointer'}} onClick={()=>setDetail(w.id)}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div style={{flex:1}}>
                  <div style={{color:T.text,fontWeight:700,fontSize:16}}>{w.name}</div>
                  {w.description&&<div style={{color:T.muted,fontSize:12,marginTop:2}}>{w.description.slice(0,60)}{w.description.length>60?'...':''}</div>}
                </div>
                <button onClick={e=>{e.stopPropagation();setWorks(p=>p.filter(x=>x.id!==w.id))}} style={{background:'none',border:'none',cursor:'pointer',color:T.danger}}><Ico name="trash" size={15}/></button>
              </div>
              <div style={{display:'flex',gap:16,marginTop:10}}>
                <div><Label>Materiales</Label><span style={{color:T.text,fontSize:13}}>{fmtFull(totalMat)}</span></div>
                <div><Label>M. de obra</Label><span style={{color:T.text,fontSize:13}}>{fmtFull(totalLab)}</span></div>
                {photos>0&&<div><Label>Fotos</Label><span style={{color:T.accent,fontSize:13}}>{photos}</span></div>}
              </div>
              <div style={{color:T.muted,fontSize:11,marginTop:8,textAlign:'right'}}>Tap para ver detalle →</div>
            </Card>
          );
        })}
      </div>
      {modal&&(
        <Modal title="Nuevo trabajo" onClose={()=>setModal(false)}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div><Label>Nombre</Label><Input value={form.name} onChange={v=>setForm(p=>({...p,name:v}))} placeholder="Ej: Construcción García"/></div>
            <div><Label>Descripción</Label>
              <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))}
                placeholder="Descripción del trabajo..." rows={3}
                style={{width:'100%',background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:'10px 12px',color:T.text,fontSize:14,outline:'none',boxSizing:'border-box',resize:'none'}}/>
            </div>
            <Btn onClick={save} style={{width:'100%',justifyContent:'center'}}>Crear trabajo</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── BUDGETS MODULE ────────────────────────────────────────────────────────────
function BudgetsModule({ budgets, setBudgets, works, setWorks }) {
  const [modal, setModal] = useState(null);
  const empty = {name:'',description:'',amount:'',budgetDate:today(),estimatedStartDate:'',status:'waiting'};
  const [form, setForm] = useState(empty);
  const f = (k,v) => setForm(p=>({...p,[k]:v}));

  const save = () => {
    if(!form.name) return;
    if(modal==='add') setBudgets(p=>[...p,{...form,id:uid(),converted:false}]);
    else setBudgets(p=>p.map(b=>b.id===modal?{...form,id:modal,converted:b.converted}:b));
    setModal(null);
  };

  const convertToWork = (b) => {
    setWorks(p=>[...p,{id:uid(),name:b.name,description:b.description,materials:[],labor:[],photos:[]}]);
    setBudgets(p=>p.map(x=>x.id===b.id?{...x,converted:true}:x));
  };

  const SC = {waiting:T.accent, approved:T.success, rejected:T.danger};
  const SL = {waiting:'En espera', approved:'Aprobado', rejected:'Rechazado'};
  const groups = {waiting:[],approved:[],rejected:[]};
  budgets.forEach(b=>groups[b.status]?.push(b));

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <h2 style={{color:T.text,margin:0,fontSize:20,fontWeight:700}}>Presupuestos</h2>
        <Btn small onClick={()=>{setForm(empty);setModal('add')}}><Ico name="plus" size={14}/> Nuevo</Btn>
      </div>
      {budgets.length===0&&<div style={{color:T.muted,textAlign:'center',padding:40}}>Sin presupuestos</div>}
      {['waiting','approved','rejected'].map(status=>(
        groups[status].length>0&&(
          <div key={status} style={{marginBottom:20}}>
            <div style={{color:SC[status],fontWeight:600,fontSize:13,marginBottom:8}}>{SL[status].toUpperCase()} ({groups[status].length})</div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {groups[status].map(b=>(
                <Card key={b.id}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                        <span style={{color:T.text,fontWeight:700,fontSize:15}}>{b.name}</span>
                        {b.converted&&<span style={{background:T.success+'33',color:T.success,fontSize:10,padding:'2px 6px',borderRadius:4,fontWeight:600}}>→ TRABAJO</span>}
                      </div>
                      {b.description&&<div style={{color:T.muted,fontSize:12,marginTop:2}}>{b.description}</div>}
                      {b.amount&&<div style={{color:T.accent,fontWeight:700,marginTop:6}}>{fmtFull(b.amount)}</div>}
                    </div>
                    <div style={{display:'flex',gap:6}}>
                      <button onClick={()=>{setForm({...b});setModal(b.id)}} style={{background:'none',border:'none',cursor:'pointer',color:T.muted}}><Ico name="edit" size={15}/></button>
                      <button onClick={()=>setBudgets(p=>p.filter(x=>x.id!==b.id))} style={{background:'none',border:'none',cursor:'pointer',color:T.danger}}><Ico name="trash" size={15}/></button>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:16,marginTop:8}}>
                    <div><Label>Presupuestado</Label><span style={{color:T.muted,fontSize:12}}>{b.budgetDate||'—'}</span></div>
                    <div><Label>Inicio estimado</Label><span style={{color:T.muted,fontSize:12}}>{b.estimatedStartDate||'—'}</span></div>
                  </div>
                  {b.status==='approved'&&!b.converted&&(
                    <Btn onClick={()=>convertToWork(b)} small color={T.success} text="#000" style={{marginTop:10}}>
                      <Ico name="convert" size={13}/> Convertir en trabajo
                    </Btn>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )
      ))}
      {modal&&(
        <Modal title={modal==='add'?'Nuevo presupuesto':'Editar presupuesto'} onClose={()=>setModal(null)}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div><Label>Nombre / Cliente</Label><Input value={form.name} onChange={v=>f('name',v)} placeholder="Ej: Reforma baño Rodríguez"/></div>
            <div><Label>Descripción</Label>
              <textarea value={form.description} onChange={e=>f('description',e.target.value)}
                placeholder="Detalle del presupuesto..." rows={3}
                style={{width:'100%',background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:'10px 12px',color:T.text,fontSize:14,outline:'none',boxSizing:'border-box',resize:'none'}}/>
            </div>
            <div><Label>Monto presupuestado</Label><Input type="number" value={form.amount} onChange={v=>f('amount',v)} placeholder="0"/></div>
            <div style={{display:'flex',gap:10}}>
              <div style={{flex:1}}><Label>Fecha presupuestado</Label><Input type="date" value={form.budgetDate} onChange={v=>f('budgetDate',v)}/></div>
              <div style={{flex:1}}><Label>Inicio estimado</Label><Input type="date" value={form.estimatedStartDate} onChange={v=>f('estimatedStartDate',v)}/></div>
            </div>
            <div><Label>Estado</Label>
              <div style={{display:'flex',gap:6}}>
                {['waiting','approved','rejected'].map(s=>(
                  <button key={s} onClick={()=>f('status',s)} style={{flex:1,padding:'8px 4px',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:11,background:form.status===s?SC[s]:T.card,color:form.status===s?'#000':T.muted,border:'none'}}>
                    {SL[s]}
                  </button>
                ))}
              </div>
            </div>
            <Btn onClick={save} style={{width:'100%',justifyContent:'center'}}>Guardar</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [cards, setCards] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [works, setWorks] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [weeklyGoal, setWeeklyGoal] = useState(3000000);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const [c,i,w,b,g] = await Promise.all([load('cards'),load('incomes'),load('works'),load('budgets'),load('weeklyGoal')]);
      if(c) setCards(c); if(i) setIncomes(i); if(w) setWorks(w); if(b) setBudgets(b); if(g!=null) setWeeklyGoal(g);
      setLoaded(true);
    })();
  }, []);

  useEffect(()=>{ if(loaded) save('cards',cards); },[cards,loaded]);
  useEffect(()=>{ if(loaded) save('incomes',incomes); },[incomes,loaded]);
  useEffect(()=>{ if(loaded) save('works',works); },[works,loaded]);
  useEffect(()=>{ if(loaded) save('budgets',budgets); },[budgets,loaded]);
  useEffect(()=>{ if(loaded) save('weeklyGoal',weeklyGoal); },[weeklyGoal,loaded]);

  const nav = [
    {k:'dashboard',icon:'home',l:'Inicio'},
    {k:'cards',icon:'card',l:'Tarjetas'},
    {k:'incomes',icon:'income',l:'Ingresos'},
    {k:'works',icon:'work',l:'Trabajos'},
    {k:'budgets',icon:'budget',l:'Presup.'},
  ];

  if(!loaded) return (
    <div style={{background:T.bg,minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{color:T.muted,fontSize:16}}>Cargando...</div>
    </div>
  );

  return (
    <div style={{background:T.bg,minHeight:'100vh',fontFamily:"'-apple-system', 'SF Pro Display', 'Segoe UI', sans-serif",color:T.text}}>
      <div style={{paddingBottom:84,paddingTop:16,paddingLeft:16,paddingRight:16,maxWidth:500,margin:'0 auto'}}>
        {tab==='dashboard'&&<Dashboard cards={cards} incomes={incomes} works={works} weeklyGoal={weeklyGoal} onGoalChange={setWeeklyGoal}/>}
        {tab==='cards'&&<CardsModule cards={cards} setCards={setCards}/>}
        {tab==='incomes'&&<IncomesModule incomes={incomes} setIncomes={setIncomes}/>}
        {tab==='works'&&<WorksModule works={works} setWorks={setWorks}/>}
        {tab==='budgets'&&<BudgetsModule budgets={budgets} setBudgets={setBudgets} works={works} setWorks={setWorks}/>}
      </div>
      <div style={{position:'fixed',bottom:0,left:0,right:0,background:T.surface,borderTop:`1px solid ${T.border}`,display:'flex',justifyContent:'space-around',padding:'10px 0 16px',zIndex:50}}>
        {nav.map(n=>(
          <button key={n.k} onClick={()=>setTab(n.k)} style={{background:'none',border:'none',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:3,color:tab===n.k?T.accent:T.muted,padding:'0 8px'}}>
            <Ico name={n.icon} size={20} color={tab===n.k?T.accent:T.muted}/>
            <span style={{fontSize:10,fontWeight:tab===n.k?700:400}}>{n.l}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
