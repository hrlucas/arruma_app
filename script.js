/* ArrumaAí Final prototype JS: strict separation, masks, auction timer, admin, logout clearing, persistence */
(function(){
  // data
  let providers = JSON.parse(localStorage.getItem('aa_providers')||'null') || [
    {id:1,name:'João Silva',service:'Eletricista',region:'Centro',rating:4.9,price:120,badge:false,verified:true},
    {id:2,name:'Maria P.',service:'Pintora',region:'Zona Sul',rating:4.7,price:180,badge:false,verified:true},
    {id:3,name:'Equipe Azul',service:'Faz-tudo',region:'Bairro Alto',rating:5.0,price:200,badge:true,verified:true}
  ];
  let auctions = JSON.parse(localStorage.getItem('aa_auctions')||'null') || [{id:1,title:'Pintura quarto 12m²',desc:'Tinta lavável',region:'Centro',budget:250,proposals:[],status:'open',endsAt:Date.now()+60000}];
  let calls = JSON.parse(localStorage.getItem('aa_calls')||'null') || [{id:1,title:'Troca de tomada',desc:'Tomada 3 pinos',region:'Centro',price:80,client:'Ana',status:'pending'}];
  let clients = JSON.parse(localStorage.getItem('aa_clients')||'null') || [];
  let transactions = JSON.parse(localStorage.getItem('aa_transactions')||'null') || [];
  let pendingDocs = JSON.parse(localStorage.getItem('aa_pending_docs')||'null') || [];
  
  // save helpers
  function saveAll(){ 
    localStorage.setItem('aa_providers', JSON.stringify(providers)); 
    localStorage.setItem('aa_auctions', JSON.stringify(auctions)); 
    localStorage.setItem('aa_calls', JSON.stringify(calls));
    localStorage.setItem('aa_clients', JSON.stringify(clients));
    localStorage.setItem('aa_transactions', JSON.stringify(transactions));
    localStorage.setItem('aa_pending_docs', JSON.stringify(pendingDocs));
  }

  // user/session
  let user = JSON.parse(localStorage.getItem('aa_user')||'null');
  function saveUser(){ if(user) localStorage.setItem('aa_user', JSON.stringify(user)); else localStorage.removeItem('aa_user'); }

  // DOM helpers
  const $ = (s, r=document)=> r.querySelector(s);
  const $$ = (s, r=document)=> [...r.querySelectorAll(s)];
  function show(id){ $$('.screen').forEach(s=>s.classList.remove('active')); const el=$('#'+id); if(el) el.classList.add('active'); window.scrollTo(0,0); }
  function toast(txt){ const d=document.createElement('div'); d.textContent=txt; Object.assign(d.style,{position:'fixed',left:'50%',transform:'translateX(-50%)',bottom:'90px',background:'#0D3B66',color:'#fff',padding:'10px 14px',borderRadius:'8px',zIndex:999}); document.body.appendChild(d); setTimeout(()=>d.remove(),1400); }

  // simple mask functions (CPF and phone)
  function maskCPF(v){ v=v.replace(/\D/g,''); v=v.slice(0,11); v=v.replace(/(\d{3})(\d)/,'$1.$2'); v=v.replace(/(\d{3})(\d)/,'$1.$2'); v=v.replace(/(\d{3})(\d{1,2})$/,'$1-$2'); return v; }
  function maskPhone(v){ v=v.replace(/\D/g,''); if(v.length>10) v=v.replace(/(\d{2})(\d{5})(\d{4})/,'($1) $2-$3'); else v=v.replace(/(\d{2})(\d{4})(\d{0,4})/,'($1) $2-$3'); return v; }

  // init UI bindings and state
  function init(){
    // splash -> role or session
    renderHeader();
    bindRoleSelection();
    bindAuthButtons();
    bindNavContainer();
    if(user && user.loggedIn){ enterRole(user.role); } else { show('splash'); setTimeout(()=> show('role'),1000); }
    // auction timers update
    setInterval(updateAuctionTimers, 800);
  }

  function renderHeader(){
    if(user && user.loggedIn){ $('.title').textContent = 'ArrumaAí — '+user.name; $('.subtitle').textContent = user.role==='provider' ? 'Painel do Prestador' : 'Encontrar serviços'; } else { $('.title').textContent='ArrumaAí'; $('.subtitle').textContent='Conectando você de ponta a ponta.'; }
  }

  // role selection and nav binding
  function bindRoleSelection(){ 
    $$('.card-role').forEach(c=> c.addEventListener('click', ()=> { 
      const role=c.dataset.role; 
      if(role==='provider') show('provider-entry'); 
      else if(role==='client') show('client-entry'); 
      else if(role==='admin') enterRole('admin');
      else show('role'); 
    })); 
    $$('.back-role').forEach(b=> b.addEventListener('click', ()=> show('role'))); 
  }

  function bindAuthButtons(){
    $('#prov-login').addEventListener('click', ()=> openAuth('login','provider'));
    $('#prov-register').addEventListener('click', ()=> openAuth('register','provider'));
    $('#cli-login').addEventListener('click', ()=> openAuth('login','client'));
    $('#cli-register').addEventListener('click', ()=> openAuth('register','client'));
    $('#logout').addEventListener('click', ()=> { logout(); });
  }

  // improved login modal (username+password only)
  function openAuth(mode, role){
    const modal = document.createElement('div'); modal.className='modal-center';
    const card = document.createElement('div'); card.className='modal-card';
    if(mode==='login'){
      card.innerHTML = `<div class="h-row"><strong>Entrar (${role==='provider'?'Prestador':'Cliente'})</strong><button class="btn ghost close">Fechar</button></div>
        <form id="loginForm" style="margin-top:10px;display:grid;gap:8px">
          <input name="username" class="input" placeholder="Usuário" required />
          <div style="display:flex;gap:8px"><input name="password" class="input" type="password" placeholder="Senha" required /><button class="btn ghost" id="togglePwd" type="button">Mostrar</button></div>
          <label style="font-size:13px"><input type="checkbox" name="remember" /> Lembrar-me</label>
          <div style="display:flex;gap:8px"><button class="btn primary" type="submit">Entrar</button><button class="btn ghost close" type="button">Cancelar</button></div>
        </form>`;
    } else {
      if(role==='provider'){
        card.innerHTML = `<div class="h-row"><strong>Cadastro Prestador</strong><button class="btn ghost close">Fechar</button></div>
          <form id="regForm" style="margin-top:10px;display:grid;gap:8px">
            <input name="name" class="input" placeholder="Nome completo" required />
            <input name="cpf" id="cpf" class="input" placeholder="CPF" required />
            <input name="phone" id="phone" class="input" placeholder="Telefone" required />
            <input name="region" class="input" placeholder="Região (ex: Centro)" required />
            <input name="service" class="input" placeholder="Serviço (Ex: Eletricista)" required />
            <div style="display:flex;gap:8px"><button class="btn primary" type="submit">Criar conta</button><button class="btn ghost close" type="button">Cancelar</button></div>
          </form>`;
      } else {
        card.innerHTML = `<div class="h-row"><strong>Cadastro Cliente</strong><button class="btn ghost close">Fechar</button></div>
          <form id="regForm" style="margin-top:10px;display:grid;gap:8px">
            <input name="name" class="input" placeholder="Nome completo" required />
            <input name="cpf" id="cpf" class="input" placeholder="CPF" required />
            <input name="phone" id="phone" class="input" placeholder="Telefone" required />
            <input name="region" class="input" placeholder="Região (ex: Zona Sul)" required />
            <div style="display:flex;gap:8px"><button class="btn primary" type="submit">Criar conta</button><button class="btn ghost close" type="button">Cancelar</button></div>
          </form>`;
      }
    }
    modal.appendChild(card); document.body.appendChild(modal);
    card.querySelectorAll('.close').forEach(b=> b.addEventListener('click', ()=> modal.remove()));
    // toggle password
    const tog = card.querySelector('#togglePwd'); if(tog){ tog.addEventListener('click', ()=> { const p=card.querySelector('input[name=password]'); if(p.type==='password'){ p.type='text'; tog.textContent='Esconder'; } else { p.type='password'; tog.textContent='Mostrar'; } }); }
    const loginForm = card.querySelector('#loginForm'); if(loginForm){ loginForm.addEventListener('submit', ev=>{ ev.preventDefault(); const data=Object.fromEntries(new FormData(loginForm).entries()); // minimal login: accept any
        user = {role, name:data.username, loggedIn:true}; if(data.remember){ localStorage.setItem('aa_remember', JSON.stringify(user)); } saveUser(); renderHeader(); modal.remove(); enterRole(role); toast('Login efetuado'); }); }
    const regForm = card.querySelector('#regForm'); if(regForm){ // masks
      const cpf = regForm.querySelector('#cpf'); const phone = regForm.querySelector('#phone');
      cpf && cpf.addEventListener('input', e=> e.target.value = maskCPF(e.target.value));
      phone && phone.addEventListener('input', e=> e.target.value = maskPhone(e.target.value));
      regForm.addEventListener('submit', ev=>{ ev.preventDefault(); const data = Object.fromEntries(new FormData(regForm).entries()); // save to localStorage as real registration
        const newUser = {role, name:data.name, cpf:data.cpf, phone:data.phone, region:data.region, service:data.service||'', loggedIn:true};
        // if provider add to providers list
        if(role==='provider'){ const id = Date.now(); providers.push({id,name:data.name,service:data.service||'','region':data.region, rating:5.0, price:120, badge:false, verified:false}); saveAll(); }
        // if client add to clients list
        if(role==='client'){ const id = Date.now(); clients.push({id,name:data.name,cpf:data.cpf,phone:data.phone,region:data.region, loggedIn:true}); saveAll(); }
        user = newUser; saveUser(); renderHeader(); modal.remove(); enterRole(role); toast('Cadastro realizado e logado'); }); }
  }

  function bindNavContainer(){ const nav = document.querySelector('.nav'); nav.addEventListener('click', (ev)=>{ const a = ev.target.closest('a'); if(!a) return; ev.preventDefault(); const target = a.dataset.target; // ensure only module content shows
      $$('.nav a').forEach(x=>x.classList.remove('active')); a.classList.add('active'); // hide all role screens, then show target
      if(user.role==='client'){ ['client-home','client-services','client-auctions','client-profile'].forEach(id=> document.getElementById(id).style.display='none'); document.getElementById(target).style.display='block'; show(target); } else if(user.role==='provider'){ ['prov-home','prov-calls','prov-auctions','prov-chats','prov-fin','prov-profile'].forEach(id=> document.getElementById(id).style.display='none'); document.getElementById(target).style.display='block'; show(target); } }); }

  function enterRole(role){
    renderHeader();
    // strictly hide screens for other role
    const clientScreens=['client-home','client-services','client-auctions','client-profile'];
    const provScreens=['prov-home','prov-calls','prov-auctions','prov-chats','prov-fin','prov-profile'];
    const adminScreens=['admin-panel'];
    
    clientScreens.forEach(id=> document.getElementById(id).style.display = role==='client' ? 'block' : 'none');
    provScreens.forEach(id=> document.getElementById(id).style.display = role==='provider' ? 'block' : 'none');
    adminScreens.forEach(id=> document.getElementById(id).style.display = role==='admin' ? 'block' : 'none');
    
    // build nav
    if(role==='client'){
      document.querySelector('.nav').innerHTML = `<a class="active" data-target="client-home">Início</a><a data-target="client-services">Serviços</a><a data-target="client-auctions">Leilões</a><a data-target="client-profile">Perfil</a>`;
      show('client-home'); renderClientHome(); renderClientServices(); renderClientAuctions(); renderClientProfile();
    } else if(role==='provider'){
      document.querySelector('.nav').innerHTML = `<a class="active" data-target="prov-home">Início</a><a data-target="prov-calls">Chamados</a><a data-target="prov-auctions">Leilões</a><a data-target="prov-chats">Conversas</a><a data-target="prov-fin">Financeiro</a><a data-target="prov-profile">Perfil</a>`;
      show('prov-home'); renderProviderHome(); renderProvCalls(); renderProvAuctions(); renderProvChats(); renderProvFin(); renderProvProfile();
    } else if(role==='admin'){
      document.querySelector('.nav').innerHTML = `<a class="active" data-target="admin-panel">Dashboard</a>`;
      show('admin-panel'); renderAdminPanel();
    }
  }

  // CLIENT RENDERERS (each module only shows its content)
  function renderClientHome(){ const el = $('#client-home'); if(!el) return; el.innerHTML = `<div class="h-row"><h3>Início</h3><div class="small">Olá, ${user.name}</div></div><div class="card"><strong>Chamados recentes</strong><div class="list">${calls.map(c=>`<div class="item"><div style="flex:1"><strong>${c.title}</strong><div class="small">${c.desc||''}</div><div class="small">R$ ${c.price} • ${c.region}</div></div><div><button class="btn primary view-call" data-id="${c.id}">Abrir</button></div></div>`).join('')}</div></div>`; $$('.view-call').forEach(b=> b.addEventListener('click', ()=> viewCall(parseInt(b.dataset.id)))); }
  function renderClientServices(){ const el = $('#client-services'); if(!el) return; el.innerHTML = `<div class="h-row"><h3>Serviços</h3><button class="btn ghost" id="new-service">Criar serviço</button></div><div class="list">${providers.map(p=>`<div class="item"><div style="flex:1"><strong>${p.service}</strong><div class="small">${p.name} • ${p.region}</div></div><div><button class="btn primary hire" data-id="${p.id}">Chamar</button></div></div>`).join('')}</div>`; $$('.hire').forEach(b=> b.addEventListener('click', ()=> { toast('Chamado enviado (simulado)'); })); $('#new-service') && $('#new-service').addEventListener('click', ()=> openCreateService()); }
  function renderClientAuctions(){ const el = $('#client-auctions'); if(!el) return; el.innerHTML = `<div class="h-row"><h3>Leilões</h3><button class="btn primary" id="create-auction">Criar Leilão</button></div><div class="list">${auctions.map(a=>`<div class="item"><div style="flex:1"><strong>${a.title}</strong><div class="small">${a.region} • R$ ${a.budget}</div><div class="small">Encerra em: <span data-au="${a.id}" class="auction-time">--:--</span></div></div><div><button class="btn primary view-auction" data-id="${a.id}">Abrir</button></div></div>`).join('')}</div>`; $$('.view-auction').forEach(b=> b.addEventListener('click', ()=> viewAuction(parseInt(b.dataset.id)))); $('#create-auction') && $('#create-auction').addEventListener('click', ()=> openCreateAuction()); updateAuctionTimers(); }
  function renderClientProfile(){ const el = $('#client-profile'); if(!el) return; const held = (JSON.parse(localStorage.getItem('aa_escrows')||'[]')).filter(x=> x.status==='held').length; el.innerHTML = `<div class="h-row"><h3>Perfil</h3><button class="btn ghost" id="edit-profile">Editar</button></div><div class="card"><strong>${user.name}</strong><div class="small">Região: ${user.region||'-'}</div><div class="small">Telefone: ${user.phone||'-'}</div></div><div style="margin-top:10px" class="card"><strong>Pagamentos retidos</strong><div class="small">${held} itens</div></div>`; $('#edit-profile') && $('#edit-profile').addEventListener('click', ()=> openEditProfile('client')); }

  // PROVIDER RENDERERS
  function renderProviderHome(){ const el = $('#prov-home'); if(!el) return; el.innerHTML = `<div class="h-row"><h3>Início Prestador</h3><div class="small">${user.name}</div></div><div class="card"><strong>Chamados recebidos</strong><div class="list">${calls.map(c=>`<div class="item"><div style="flex:1"><strong>${c.title}</strong><div class="small">${c.region} • R$ ${c.price}</div></div><div><button class="btn primary view-call-p" data-id="${c.id}">Abrir</button></div></div>`).join('')}</div></div>`; $$('.view-call-p').forEach(b=> b.addEventListener('click', ()=> viewCall(parseInt(b.dataset.id)))); }
  function renderProvCalls(){ const el=$('#prov-calls'); if(!el) return; el.innerHTML = `<div class="h-row"><h3>Chamados</h3></div><div class="list">${calls.map(c=>`<div class="item"><div style="flex:1"><strong>${c.title}</strong><div class="small">Cliente: ${c.client} • R$ ${c.price}</div></div><div><button class="btn primary accept-call" data-id="${c.id}">Aceitar</button></div></div>`).join('')}</div>`; $$('.accept-call').forEach(b=> b.addEventListener('click', ()=> { toast('Chamado aceito (simulado)'); })); }
  function renderProvAuctions(){ const el=$('#prov-auctions'); if(!el) return; el.innerHTML = `<div class="h-row"><h3>Leilões disponíveis</h3></div><div class="list">${auctions.filter(a=>a.status==='open').map(a=>`<div class="item"><div style="flex:1"><strong>${a.title}</strong><div class="small">Orçamento R$ ${a.budget}</div><div class="small">Encerra em: <span data-au="${a.id}" class="auction-time">--:--</span></div></div><div><button class="btn primary bid" data-id="${a.id}">Propor</button></div></div>`).join('')}</div>`; $$('.bid').forEach(b=> b.addEventListener('click', ()=> { openBid(parseInt(b.dataset.id)); })); updateAuctionTimers(); }
  function renderProvChats(){ const el=$('#prov-chats'); if(!el) return; el.innerHTML = `<div class="h-row"><h3>Conversas</h3></div><div class="list"><div class="item"><div style="flex:1"><strong>Ana</strong><div class="small">Pedido: Troca de tomada</div></div><div><button class="btn primary" onclick="openChat()">Abrir</button></div></div></div>`; }
  function renderProvFin(){ const el=$('#prov-fin'); if(!el) return; const esc = JSON.parse(localStorage.getItem('aa_escrows')||'[]'); el.innerHTML = `<div class="h-row"><h3>Financeiro</h3></div><div class="card"><div class="small">Total retido: R$ ${esc.filter(x=> x.status==='held').reduce((s,i)=>s+i.total,0)}</div><div class="small">Total liberado: R$ ${esc.filter(x=> x.status==='released').reduce((s,i)=>s+i.toProvider,0)}</div></div>`; }
  function renderProvProfile(){ 
    const el=$('#prov-profile'); 
    if(!el) return; 
    
    const verificationStatus = user.verified ? '✅ Verificado' : '⏳ Aguardando verificação';
    const verificationColor = user.verified ? '#10b981' : '#f59e0b';
    
    el.innerHTML = `
      <div class="h-row"><h3>Perfil</h3><button class="btn ghost" id="edit-prov">Editar</button></div>
      <div class="card">
        <strong>${user.name}</strong>
        <div class="small">Serviço: ${user.service||'-'}</div>
        <div class="small">Região: ${user.region||'-'}</div>
        <div class="small" style="color:${verificationColor}">Status: ${verificationStatus}</div>
        <div style="margin-top:8px">
          <button class="btn ghost" id="upload-doc">Enviar documento (verificação)</button>
        </div>
      </div>
    `; 
    
    $('#edit-prov') && $('#edit-prov').addEventListener('click', ()=> openEditProfile('provider')); 
    $('#upload-doc') && $('#upload-doc').addEventListener('click', ()=> openUploadDoc()); 
  }

  // ADMIN RENDERERS
  function renderAdminPanel(){ 
    const el = $('#admin-panel'); 
    if(!el) return; 
    
    // Calculate stats
    const totalProviders = providers.length;
    const verifiedProviders = providers.filter(p => p.verified).length;
    const pendingDocsCount = pendingDocs.length;
    const totalTransactions = transactions.length;
    const totalRevenue = transactions.filter(t => t.status === 'held' || t.status === 'released').reduce((sum, t) => sum + (t.amount * 0.15), 0);
    
    // Render providers list
    const providersList = providers.map(p => 
      `<div class="item">
        <div style="flex:1">
          <strong>${p.name}</strong>
          <div class="small">${p.service} • ${p.region} • ${p.verified ? '✅ Verificado' : '⏳ Pendente'}</div>
          <div class="small">Avaliação: ${p.rating}★ • Preço: R$ ${p.price}</div>
        </div>
      </div>`
    ).join('') || '<div class="small">Nenhum prestador cadastrado</div>';
    
    // Render pending docs
    const docsList = pendingDocs.map(doc => 
      `<div class="item">
        <div style="flex:1">
          <strong>${doc.providerName}</strong>
          <div class="small">Documento enviado em ${new Date(doc.timestamp).toLocaleDateString()}</div>
        </div>
        <div style="display:flex;gap:4px">
          <button class="btn primary approve-doc" data-id="${doc.id}">Aprovar</button>
          <button class="btn ghost reject-doc" data-id="${doc.id}">Rejeitar</button>
        </div>
      </div>`
    ).join('') || '<div class="small">Nenhum documento pendente</div>';
    
    // Render transactions
    const transactionsList = transactions.slice(0, 5).map(t => 
      `<div class="item">
        <div style="flex:1">
          <strong>${t.description}</strong>
          <div class="small">R$ ${t.amount} • ${t.status} • ${new Date(t.timestamp).toLocaleDateString()}</div>
        </div>
      </div>`
    ).join('') || '<div class="small">Nenhuma transação recente</div>';
    
    el.innerHTML = `
      <div class="h-row"><h3>Painel Administrativo</h3><button class="btn ghost back-role">Voltar</button></div>
      <div class="admin-note">Painel de gestão da plataforma</div>
      
      <div class="admin-stats">
        <div class="admin-stat">
          <strong>${totalProviders}</strong>
          <div class="small">Prestadores</div>
        </div>
        <div class="admin-stat">
          <strong>${verifiedProviders}</strong>
          <div class="small">Verificados</div>
        </div>
        <div class="admin-stat">
          <strong>${pendingDocsCount}</strong>
          <div class="small">Docs Pendentes</div>
        </div>
        <div class="admin-stat">
          <strong>R$ ${Math.round(totalRevenue)}</strong>
          <div class="small">Receita Total</div>
        </div>
      </div>
      
      <div class="list">
        <div class="card">
          <strong>Prestadores cadastrados</strong>
          <div id="admin-providers-list">${providersList}</div>
        </div>
        <div class="card">
          <strong>Documentos pendentes</strong>
          <div id="admin-docs-list">${docsList}</div>
        </div>
        <div class="card">
          <strong>Transações recentes</strong>
          <div id="admin-transactions-list">${transactionsList}</div>
        </div>
      </div>
    `;
    
    // Bind admin actions
    $$('.approve-doc').forEach(b => b.addEventListener('click', () => approveDocument(parseInt(b.dataset.id))));
    $$('.reject-doc').forEach(b => b.addEventListener('click', () => rejectDocument(parseInt(b.dataset.id))));
  }

  // AUCTION: create, simulate proposals, timer, accept proposal -> escrow
  function openCreateAuction(){ const modal=document.createElement('div'); modal.className='modal-center'; modal.innerHTML=`<div class="modal-card"><div class="h-row"><strong>Novo leilão</strong><button class="btn ghost close">Fechar</button></div><form id="auctionForm" style="margin-top:8px;display:grid;gap:8px"><input name="title" class="input" placeholder="Título" required /><input name="budget" class="input" placeholder="Orçamento (R$)" required /><input name="region" class="input" placeholder="Região" /><textarea name="desc" class="input" placeholder="Descrição"></textarea><div style="display:flex;gap:8px"><button class="btn primary" type="submit">Criar</button><button class="btn ghost close" type="button">Cancelar</button></div></form></div>`; document.body.appendChild(modal); modal.querySelectorAll('.close').forEach(b=> b.addEventListener('click', ()=> modal.remove())); modal.querySelector('form').addEventListener('submit', ev=>{ ev.preventDefault(); const data=Object.fromEntries(new FormData(ev.target).entries()); const ends = Date.now() + (Number(data.duration || 60) * 1000 || 60000); const a={id:Date.now(),title:data.title,desc:data.desc,region:data.region,budget:Number(data.budget),proposals:[],status:'open',endsAt:ends}; auctions.unshift(a); saveAll(); modal.remove(); toast('Leilão criado — aguardando propostas (simulado)'); simulateAuctionResponses(a.id); renderClientAuctions(); renderProvAuctions(); }); }
  function simulateAuctionResponses(auctionId){ const a = auctions.find(x=> x.id===auctionId); if(!a) return; // create 3 proposals spaced in time
    setTimeout(()=> { a.proposals.push({name:'Maria P.',price:Math.max(50,a.budget-20),eta:'2h',rating:4.9}); saveAll(); },800);
    setTimeout(()=> { a.proposals.push({name:'João E.',price:Math.max(40,a.budget-40),eta:'3h',rating:4.7}); saveAll(); },1500);
    setTimeout(()=> { a.proposals.push({name:'Equipe Azul',price:Math.max(30,a.budget-10),eta:'1.5h',rating:5.0}); saveAll(); },2200);
  }
  function updateAuctionTimers(){ // update displayed timers
    $$('.auction-time').forEach(span=>{ const aid = Number(span.dataset.au); const a = auctions.find(x=> x.id===aid); if(!a){ span.textContent='--:--'; return; } const diff = a.endsAt - Date.now(); if(diff<=0){ span.textContent='00:00'; a.status='closed'; saveAll(); } else { const s=Math.floor(diff/1000); const m=Math.floor(s/60); const sec=s%60; span.textContent = `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`; } }); }

  function viewAuction(id){ 
    const a=auctions.find(x=> x.id===id); 
    if(!a) return; 
    const sh=$('#sheet'); 
    sh.style.display='block'; 
    const proposalsHtml = (a.proposals||[]).map((p,i)=>`<div style="border:1px solid #eef2f7;padding:8px;border-radius:8px;margin-top:8px"><strong>${p.name}</strong><div class="small">R$ ${p.price} • ${p.eta} • ${p.rating}★</div><div style="margin-top:8px"><button class="btn primary accept-prop" data-a="${a.id}" data-index="${i}">Aceitar</button></div></div>`).join('') || '<div class="small">Nenhuma proposta ainda</div>'; 
    sh.innerHTML=`<div class="h-row"><strong>${a.title}</strong><button class="btn ghost" id="closeSheet">Fechar</button></div><div style="margin-top:8px" class="small">${a.desc}</div><div style="margin-top:8px" class="small">Orçamento: R$ ${a.budget} • Status: ${a.status}</div><div style="margin-top:10px"><strong>Propostas</strong>${proposalsHtml}</div>`; 
    $('#closeSheet').addEventListener('click', ()=> sh.style.display='none'); 
    $$('.accept-prop').forEach(b=> b.addEventListener('click', ()=> { 
      const ai = Number(b.dataset.a); 
      const idx = Number(b.dataset.index); 
      const aq = auctions.find(x=> x.id===ai); 
      if(!aq) return; 
      const prop = aq.proposals[idx]; 
      
      // create escrow
      const orderId = Date.now(); 
      const commissionRate = (prop && prop.name==='Equipe Azul') ? 0.10 : 0.15; 
      const commission = Math.round(prop.price * commissionRate); 
      const toProvider = prop.price - commission; 
      const escrows = JSON.parse(localStorage.getItem('aa_escrows')||'[]'); 
      escrows.push({orderId,total:prop.price,commission,toProvider,providerName:prop.name,status:'held'}); 
      localStorage.setItem('aa_escrows', JSON.stringify(escrows)); 
      
      // Add transaction
      transactions.push({
        id: Date.now(),
        description: `Leilão aceito - ${a.title} por ${prop.name}`,
        amount: prop.price,
        status: 'held',
        timestamp: Date.now(),
        orderId: orderId
      });
      
      saveAll();
      sh.style.display='none'; 
      toast('Proposta aceita e pagamento retido'); 
      renderProvFin(); 
    })); 
  }

  // Bidding for providers
  function openBid(auctionId){ const modal=document.createElement('div'); modal.className='modal-center'; modal.innerHTML=`<div class="modal-card"><div class="h-row"><strong>Enviar proposta</strong><button class="btn ghost close">Fechar</button></div><form id="bidForm" style="margin-top:8px;display:grid;gap:8px"><input name="price" class="input" placeholder="Valor (R$)" required /><input name="eta" class="input" placeholder="Prazo (ex: 2h)" /><div style="display:flex;gap:8px"><button class="btn primary" type="submit">Enviar</button><button class="btn ghost close" type="button">Cancelar</button></div></form></div>`; document.body.appendChild(modal); modal.querySelectorAll('.close').forEach(b=> b.addEventListener('click', ()=> modal.remove())); modal.querySelector('form').addEventListener('submit', ev=>{ ev.preventDefault(); const data=Object.fromEntries(new FormData(ev.target).entries()); const a = auctions.find(x=> x.id===auctionId); if(!a) return; a.proposals = a.proposals || []; a.proposals.push({name:user.name || 'Prestador', price: Number(data.price), eta: data.eta || '—', rating:4.5}); saveAll(); modal.remove(); toast('Proposta enviada (simulado)'); renderProvAuctions(); renderClientAuctions(); }); }

  // ESCROW release (client can confirm and release)
  window.releaseEscrow = function(orderId){ 
    const esc = JSON.parse(localStorage.getItem('aa_escrows')||'[]'); 
    const e = esc.find(x=> x.orderId===orderId); 
    if(!e) return toast('Escrow não encontrado'); 
    e.status='released'; 
    localStorage.setItem('aa_escrows', JSON.stringify(esc)); 
    
    // Update transaction
    const transaction = transactions.find(t => t.orderId === orderId);
    if (transaction) {
      transaction.status = 'released';
    }
    
    saveAll();
    toast('Pagamento liberado'); 
    renderProvFin(); 
  }

  // Chat & audio (consent)
  let mediaRecorder, audioChunks=[];
  window.startRecording = async function(){ if(!confirm('Você consente com a gravação de áudio desta sessão?')){ toast('Consentimento necessário'); return; } try{ const stream = await navigator.mediaDevices.getUserMedia({audio:true}); mediaRecorder = new MediaRecorder(stream); audioChunks=[]; mediaRecorder.ondataavailable = e=> audioChunks.push(e.data); mediaRecorder.onstop = async ()=>{ const blob = new Blob(audioChunks,{type:'audio/webm'}); const reader = new FileReader(); reader.onloadend = ()=>{ const b64 = reader.result; const log = $('#chat-log'); const el = document.createElement('div'); el.style.marginTop='8px'; el.innerHTML = `<strong>${user.name||'Você'}:</strong><div><audio controls src="${b64}"></audio></div>`; log.appendChild(el); log.scrollTop = log.scrollHeight; toast('Áudio anexado (simulado)'); }; reader.readAsDataURL(blob); }; mediaRecorder.start(); toast('Gravação iniciada'); }catch(err){ toast('Erro de microfone / permissão'); } };
  window.stopRecording = function(){ if(mediaRecorder && mediaRecorder.state!=='inactive') mediaRecorder.stop(); };

  window.openChat = function(){ $('#chat-title').textContent = 'Chat'; $('#chat-log').innerHTML = '<div class="small">Conversa simulada</div>'; show('chat'); setTimeout(()=>{ const el = document.createElement('div'); el.style.marginTop='8px'; el.textContent = 'Prestador: Olá! (simulado)'; $('#chat-log').appendChild(el); },700); };
  $('#chat-send') && $('#chat-send').addEventListener('click', ()=>{ const t = $('#chat-input'); if(!t) return; const txt = t.value.trim(); if(!txt) return; const el = document.createElement('div'); el.style.marginTop='8px'; el.style.padding='8px'; el.style.background='#f1f5f9'; el.style.borderRadius='8px'; el.textContent = (user.name||'Você') + ': ' + txt; $('#chat-log').appendChild(el); t.value=''; setTimeout(()=>{ const r = document.createElement('div'); r.style.marginTop='8px'; r.style.padding='8px'; r.style.background='#fff'; r.style.borderRadius='8px'; r.textContent = 'Prestador: Recebido (simulado)'; $('#chat-log').appendChild(r); },700); });

  // upload doc
  function openUploadDoc(){ 
    const modal=document.createElement('div'); 
    modal.className='modal-center'; 
    modal.innerHTML=`<div class="modal-card"><div class="h-row"><strong>Enviar documento</strong><button class="btn ghost close">Fechar</button></div><form id="docForm" style="margin-top:8px;display:grid;gap:8px"><input id="docFile" type="file" accept="image/*" /><div style="display:flex;gap:8px"><button class="btn primary" type="submit">Enviar</button><button class="btn ghost close" type="button">Cancelar</button></div></form></div>`; 
    document.body.appendChild(modal); 
    modal.querySelectorAll('.close').forEach(b=> b.addEventListener('click', ()=> modal.remove())); 
    modal.querySelector('form').addEventListener('submit', async ev=>{ 
      ev.preventDefault(); 
      const file = document.getElementById('docFile').files[0]; 
      if(!file){ toast('Selecione um arquivo'); return; } 
      const reader = new FileReader(); 
      reader.onloadend = ()=>{ 
        const b64 = reader.result; 
        user.docs = user.docs || []; 
        user.docs.push(b64); 
        user.verified = false; 
        
        // Add to pending docs for admin review
        pendingDocs.push({
          id: Date.now(),
          providerName: user.name,
          document: b64,
          timestamp: Date.now(),
          status: 'pending'
        });
        
        saveUser(); 
        saveAll();
        modal.remove(); 
        toast('Documento enviado — verificação pendente'); 
      }; 
      reader.readAsDataURL(file); 
    }); 
  }

  // ADMIN FUNCTIONS
  function approveDocument(docId) {
    const doc = pendingDocs.find(d => d.id === docId);
    if (!doc) return;
    
    // Mark provider as verified
    const provider = providers.find(p => p.name === doc.providerName);
    if (provider) {
      provider.verified = true;
    }
    
    // Remove from pending docs
    pendingDocs = pendingDocs.filter(d => d.id !== docId);
    
    // Add transaction
    transactions.push({
      id: Date.now(),
      description: `Aprovação de documento - ${doc.providerName}`,
      amount: 0,
      status: 'approved',
      timestamp: Date.now()
    });
    
    saveAll();
    renderAdminPanel();
    toast('Documento aprovado');
  }
  
  function rejectDocument(docId) {
    const doc = pendingDocs.find(d => d.id === docId);
    if (!doc) return;
    
    // Remove from pending docs
    pendingDocs = pendingDocs.filter(d => d.id !== docId);
    
    // Add transaction
    transactions.push({
      id: Date.now(),
      description: `Rejeição de documento - ${doc.providerName}`,
      amount: 0,
      status: 'rejected',
      timestamp: Date.now()
    });
    
    saveAll();
    renderAdminPanel();
    toast('Documento rejeitado');
  }

  // edit profile
  function openEditProfile(role){ const modal=document.createElement('div'); modal.className='modal-center'; modal.innerHTML=`<div class="modal-card"><div class="h-row"><strong>Editar perfil</strong><button class="btn ghost close">Fechar</button></div><form id="editForm" style="margin-top:8px;display:grid;gap:8px"><input name="name" class="input" placeholder="Nome" value="${user.name||''}" required /><input name="cpf" class="input" placeholder="CPF" value="${user.cpf||''}" /><input name="phone" class="input" placeholder="Telefone" value="${user.phone||''}" /><input name="region" class="input" placeholder="Região" value="${user.region||''}" /><div style="display:flex;gap:8px"><button class="btn primary" type="submit">Salvar</button><button class="btn ghost close" type="button">Cancelar</button></div></form></div>`; document.body.appendChild(modal); modal.querySelectorAll('.close').forEach(b=> b.addEventListener('click', ()=> modal.remove())); modal.querySelector('form').addEventListener('submit', ev=>{ ev.preventDefault(); const data = Object.fromEntries(new FormData(ev.target).entries()); user.name=data.name; user.cpf=data.cpf; user.phone=data.phone; user.region=data.region; saveUser(); renderHeader(); modal.remove(); toast('Perfil atualizado'); }); }

  // create service simple
  function openCreateService(){ const modal=document.createElement('div'); modal.className='modal-center'; modal.innerHTML=`<div class="modal-card"><div class="h-row"><strong>Novo serviço</strong><button class="btn ghost close">Fechar</button></div><form id="serviceForm" style="margin-top:8px;display:grid;gap:8px"><input name="title" class="input" placeholder="Título" required /><input name="price" class="input" placeholder="Preço" /><div style="display:flex;gap:8px"><button class="btn primary" type="submit">Criar</button><button class="btn ghost close" type="button">Cancelar</button></div></form></div>`; document.body.appendChild(modal); modal.querySelectorAll('.close').forEach(b=> b.addEventListener('click', ()=> modal.remove())); modal.querySelector('form').addEventListener('submit', ev=>{ ev.preventDefault(); modal.remove(); toast('Serviço criado (simulado)'); }); }

  // view call
  function viewCall(id){ const c = calls.find(x=> x.id===id); if(!c) return; const sh=$('#sheet'); sh.style.display='block'; sh.innerHTML = `<div class="h-row"><strong>${c.title}</strong><button class="btn ghost" id="closeSheet">Fechar</button></div><div style="margin-top:10px" class="small">Cliente: ${c.client} • Região: ${c.region}</div><div style="margin-top:10px"><div class="small">Preço: R$ ${c.price}</div></div><div style="margin-top:10px;display:flex;gap:8px"><button class="btn primary" id="acceptCall">Aceitar</button><button class="btn ghost" id="close2">Fechar</button></div>`; $('#closeSheet').addEventListener('click', ()=> sh.style.display='none'); $('#close2').addEventListener('click', ()=> sh.style.display='none'); $('#acceptCall').addEventListener('click', ()=> { sh.style.display='none'; toast('Chamado aceito (simulado)'); }); }

  // logout clears session and sensitive data as requested
  function logout(){ 
    if(confirm('Deseja sair e limpar sessão?')){ 
      user=null; 
      localStorage.removeItem('aa_user'); 
      localStorage.removeItem('aa_remember');
      // clear escrows and remember flags optionally
      // but keep registered providers and auctions - preserve them; clear sensitive data like temporary escrows
      localStorage.removeItem('aa_escrows'); 
      renderHeader(); 
      show('role'); 
      document.querySelector('.nav').innerHTML=''; 
      toast('Desconectado e dados de sessão limpos'); 
    } 
  }

  // utilities: expose some functions globally used in inline handlers
  window.openCreateService = openCreateService;
  window.openChat = function(){ $('#chat-title').textContent='Chat'; $('#chat-log').innerHTML='<div class="small">Conversa simulada</div>'; show('chat'); };
  window.openUploadDoc = openUploadDoc;
  window.openBid = function(aid){ openBid(aid); };

  // Sample data for services
const services = {
  limpeza: [
    {
      id: 'limpeza-residencial',
      name: 'Limpeza Residencial',
      description: 'Limpeza completa da sua residência com produtos de qualidade.',
      price: 120,
      rating: 4.2,
      icon: '🧹',
      discount: 10
    },
    {
      id: 'limpeza-pos-obra',
      name: 'Limpeza Pós-Obra',
      description: 'Limpeza pesada após reformas e construções.',
      price: 250,
      rating: 4.5,
      icon: '🏗️',
      discount: 15
    }
  ],
  pintura: [
    {
      id: 'pintura-residencial',
      name: 'Pintura Residencial',
      description: 'Pintura interna ou externa da sua casa.',
      price: 35,
      rating: 4.7,
      icon: '🎨',
      priceType: 'por m²'
    }
  ],
  encanamento: [
    {
      id: 'desentupimento',
      name: 'Desentupimento',
      description: 'Desentupimento de pias, ralos e vasos sanitários.',
      price: 150,
      rating: 4.3,
      icon: '🚰',
      emergency: true
    }
  ],
  eletricista: [
    {
      id: 'instalacao-eletrica',
      name: 'Instalação Elétrica',
      description: 'Instalação e manutenção elétrica residencial.',
      price: 80,
      rating: 4.8,
      icon: '🔌',
      priceType: 'por hora'
    }
  ]
};

// Partners data
const partners = [
  {
    id: 'casa-cia',
    name: 'Casa & Cia',
    discount: '15% em materiais',
    icon: '🏪'
  },
  {
    id: 'tintas-ideal',
    name: 'Tintas Ideal',
    discount: '10% em tintas',
    icon: '🎨'
  }
];

// Initialize the app
init();

// Add event listeners for category cards
document.addEventListener('DOMContentLoaded', function() {
  // Handle category clicks
  document.querySelectorAll('.category-card').forEach(card => {
    card.addEventListener('click', function() {
      const category = this.dataset.category;
      showServicesByCategory(category);
    });
  });

  // Handle service requests
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('btn-request-service')) {
      const serviceId = e.target.dataset.serviceId;
      requestService(serviceId);
    }
  });

  // Initialize featured services
  renderFeaturedServices();
  renderPartners();
});

function renderFeaturedServices() {
  const featuredContainer = document.querySelector('.featured-services');
  if (!featuredContainer) return;
  
  // Get all services and sort by rating
  const allServices = Object.values(services).flat();
  const featured = [...allServices].sort((a, b) => b.rating - a.rating).slice(0, 3);
  
  featuredContainer.innerHTML = featured.map(service => `
    <div class="service-card">
      <div class="service-header">
        <div class="service-icon">${service.icon}</div>
        <div class="service-info">
          <strong>${service.name}</strong>
          <div class="rating">${'★'.repeat(Math.floor(service.rating))}${'☆'.repeat(5 - Math.floor(service.rating))} ${service.rating}</div>
        </div>
        <button class="btn ghost small btn-request-service" data-service-id="${service.id}">Solicitar</button>
      </div>
      <p class="service-description">${service.description}</p>
      <div class="service-footer">
        <span class="price">A partir de R$ ${service.price}${service.priceType ? ' ' + service.priceType : ''}</span>
        ${service.discount ? `<span class="badge yellow">${service.discount}% OFF</span>` : ''}
        ${service.emergency ? '<span class="badge red">Urgente</span>' : ''}
      </div>
    </div>
  `).join('');
}

function renderPartners() {
  const partnersContainer = document.querySelector('.partners');
  if (!partnersContainer) return;
  
  partnersContainer.innerHTML = partners.map(partner => `
    <div class="partner-card">
      <div class="partner-logo">${partner.icon}</div>
      <div class="partner-info">
        <strong>${partner.name}</strong>
        <div class="small">${partner.discount}</div>
      </div>
    </div>
  `).join('');
}

function showServicesByCategory(category) {
  const categoryServices = services[category] || [];
  const servicesList = document.createElement('div');
  servicesList.className = 'services-list';
  servicesList.innerHTML = `
    <div class="h-row">
      <h3>${category.charAt(0).toUpperCase() + category.slice(1)}</h3>
      <button class="btn ghost back-to-home">Voltar</button>
    </div>
    <div class="list">
      ${categoryServices.map(service => `
        <div class="service-card">
          <div class="service-header">
            <div class="service-icon">${service.icon}</div>
            <div class="service-info">
              <strong>${service.name}</strong>
              <div class="rating">${'★'.repeat(Math.floor(service.rating))}${'☆'.repeat(5 - Math.floor(service.rating))} ${service.rating}</div>
            </div>
            <button class="btn primary btn-request-service" data-service-id="${service.id}">Solicitar</button>
          </div>
          <p class="service-description">${service.description}</p>
          <div class="service-footer">
            <span class="price">R$ ${service.price}${service.priceType ? ' ' + service.priceType : ''}</span>
            ${service.discount ? `<span class="badge yellow">${service.discount}% OFF</span>` : ''}
            ${service.emergency ? '<span class="badge red">Urgente</span>' : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;
  
  // Replace client home with services list
  const clientHome = document.getElementById('client-home');
  clientHome.style.display = 'none';
  clientHome.parentNode.insertBefore(servicesList, clientHome.nextSibling);
  
  // Add back button handler
  servicesList.querySelector('.back-to-home').addEventListener('click', () => {
    servicesList.remove();
    clientHome.style.display = 'block';
  });
}

function requestService(serviceId) {
  // Find the service
  let service = null;
  for (const category in services) {
    service = services[category].find(s => s.id === serviceId);
    if (service) break;
  }
  
  if (!service) return;
  
  // Show service request form
  const form = document.createElement('div');
  form.className = 'service-request-form';
  form.innerHTML = `
    <div class="card">
      <div class="h-row">
        <h3>Solicitar ${service.name}</h3>
        <button class="btn ghost back-to-services">Voltar</button>
      </div>
      <div class="form-group">
        <label>Endereço</label>
        <input type="text" class="input" placeholder="Onde o serviço será realizado?">
      </div>
      <div class="form-group">
        <label>Data e Hora</label>
        <input type="datetime-local" class="input">
      </div>
      <div class="form-group">
        <label>Detalhes adicionais (opcional)</label>
        <textarea class="input" rows="3" placeholder="Descreva melhor o que você precisa"></textarea>
      </div>
      <div class="form-actions">
        <button class="btn primary" id="confirm-request">Solicitar Orçamento</button>
      </div>
    </div>
  `;
  
  // Replace current view with form
  const currentView = document.querySelector('.services-list') || document.getElementById('client-home');
  currentView.style.display = 'none';
  currentView.parentNode.insertBefore(form, currentView.nextSibling);
  
  // Add back button handler
  form.querySelector('.back-to-services').addEventListener('click', () => {
    form.remove();
    currentView.style.display = 'block';
  });
  
  // Handle form submission
  form.querySelector('#confirm-request').addEventListener('click', () => {
    alert('Solicitação enviada com sucesso! Em breve você receberá orçamentos dos nossos prestadores.');
    // In a real app, this would submit to a backend
    form.remove();
    document.getElementById('client-home').style.display = 'block';
  });
}

  document.addEventListener('DOMContentLoaded', init);
  // persist initial providers/auctions/calls
  saveAll();
  // expose releaseEscrow for dev buttons
  window.releaseEscrow = function(orderId){ const esc = JSON.parse(localStorage.getItem('aa_escrows')||'[]'); const e = esc.find(x=> x.orderId===orderId); if(!e) return alert('not found'); e.status='released'; localStorage.setItem('aa_escrows', JSON.stringify(esc)); alert('released'); };
})();
