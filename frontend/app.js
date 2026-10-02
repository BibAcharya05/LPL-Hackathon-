const clients = [
  {id:'T001',name:'Sarah Johnson',account:'Traditional IRA',display:'Traditional IRA ••••2198',status:'Ready',issues:0,severity:null,reason:'All checks passed',progress:100,last:'8 minutes ago',issueList:[]},
  {id:'T002',name:'Priya Shah',account:'Roth IRA',display:'Roth IRA ••••7310',status:'Missing Info',issues:1,severity:'Medium',reason:'Beneficiary form missing',progress:83,last:'12 minutes ago',issueList:[]},
  {id:'T003',name:'Marcus Lee',account:'Brokerage',display:'Brokerage ••••4821',status:'Flagged',issues:2,severity:'Medium',reason:'Address + risk profile mismatch',progress:78,last:'2 minutes ago',issueList:[
    {title:'Address mismatch',severity:'Medium',leftLabel:'Existing Statement',leftValue:'350 Prototype Road',leftSource:'Account_Statement.pdf',rightLabel:'New Account Application',rightValue:'305 Prototype Road',rightSource:'Application.pdf'},
    {title:'Risk tolerance mismatch',severity:'Medium',leftLabel:'Application',leftValue:'Conservative',leftSource:'Application.pdf',rightLabel:'Investor Profile',rightValue:'Moderate',rightSource:'Investor_Profile.pdf'}]},
  {id:'T004',name:'Elena Rodriguez',account:'Brokerage',display:'Brokerage ••••1307',status:'Flagged',issues:4,severity:'High',reason:'Multiple document inconsistencies',progress:64,last:'5 minutes ago',issueList:[
    {title:'Client name mismatch',severity:'Low',leftLabel:'Account Statement',leftValue:'Elena M. Rodriguez',leftSource:'Account_Statement.pdf',rightLabel:'Application',rightValue:'Elena Rodriguez',rightSource:'Application.pdf'},
    {title:'$35,000 account value difference',severity:'High',leftLabel:'Account Statement',leftValue:'$638,145.75',leftSource:'Account_Statement.pdf',rightLabel:'Transfer Form',rightValue:'$603,145.75',rightSource:'Transfer_Form.pdf'},
    {title:'Transfer form not signed',severity:'High',leftLabel:'Required field',leftValue:'Client signature required',leftSource:'Transition_Requirements.pdf',rightLabel:'Transfer Form',rightValue:'No signature detected',rightSource:'Transfer_Form.pdf'},
    {title:'Investment objective mismatch',severity:'Medium',leftLabel:'Application',leftValue:'Balanced Growth',leftSource:'Application.pdf',rightLabel:'Investor Profile',rightValue:'Aggressive Growth',rightSource:'Investor_Profile.pdf'}]},
  {id:'T005',name:'Cameron Blake',account:'Brokerage',display:'Brokerage ••••9064',status:'Flagged',issues:3,severity:'Critical',reason:'Suspicious transaction activity',progress:52,last:'Just now',issueList:[]},
  {id:'T006',name:'Daniel Kim',account:'Traditional IRA',display:'Traditional IRA ••••6634',status:'Ready',issues:0,severity:null,reason:'All checks passed',progress:100,last:'18 minutes ago',issueList:[]},
  {id:'T007',name:'Amina Patel',account:'Joint Brokerage',display:'Joint Brokerage ••••5518',status:'Ready',issues:0,severity:null,reason:'All checks passed',progress:100,last:'24 minutes ago',issueList:[]},
  {id:'T008',name:'Robert Chen',account:'Rollover IRA',display:'Rollover IRA ••••0942',status:'Ready',issues:0,severity:null,reason:'All checks passed',progress:100,last:'31 minutes ago',issueList:[]},
  {id:'T009',name:'Olivia Martin',account:'Traditional IRA',display:'Traditional IRA ••••8426',status:'Missing Info',issues:1,severity:'Low',reason:'Transfer form signature missing',progress:72,last:'14 minutes ago',issueList:[]},
  {id:'T010',name:'James Wilson',account:'Brokerage',display:'Brokerage ••••3371',status:'Missing Info',issues:1,severity:'Medium',reason:'Investor profile not received',progress:67,last:'36 minutes ago',issueList:[]},
  {id:'T011',name:'Nora Thompson',account:'Roth IRA',display:'Roth IRA ••••7255',status:'Flagged',issues:2,severity:'High',reason:'Registration and ownership mismatch',progress:61,last:'9 minutes ago',issueList:[
    {title:'Account ownership mismatch',severity:'High',leftLabel:'Account Statement',leftValue:'Nora L. Thompson',leftSource:'Account_Statement.pdf',rightLabel:'Transfer Form',rightValue:'Nora Thompson',rightSource:'Transfer_Form.pdf'}]},
  {id:'T012',name:'Michael Foster',account:'SEP IRA',display:'SEP IRA ••••4109',status:'Submitted',issues:0,severity:null,reason:'Pending custodian review',progress:100,last:'1 hour ago',issueList:[]}
];

const docs = ['Existing Account Statement','New Account Application','Transfer Form','Investor Profile','Beneficiary Designation','Advisory Agreement'];
let state = {screen:'dashboard',filter:'All',client:null,issue:null};
const app = document.getElementById('app');
const modalRoot = document.getElementById('modal-root');
const toastRoot = document.getElementById('toast-root');

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const initials = n => n.split(' ').map(x=>x[0]).join('');
const statusClass = s => 'status-' + s.toLowerCase().replaceAll(' ','-');
const severityClass = s => 'severity-' + s.toLowerCase();
const statusChip = s => `<span class="status-chip ${statusClass(s)}">${esc(s)}</span>`;
const severityChip = s => s ? `<span class="severity-chip ${severityClass(s)}">${esc(s)}</span>` : '<span style="color:#98a2b3">—</span>';

function shell(content){
  const detail = state.screen !== 'dashboard';
  app.innerHTML = `
  <div class="app-shell">
    <header class="topbar">
      <button class="brand" data-action="home"><span class="brand-mark">⇄</span><span>Transition Copilot</span></button>
      <div class="top-actions"><div class="search-box">⌕ <span>Search transitions</span></div><button class="top-upload" data-action="upload">⇧ Add documents</button><div class="user-avatar">JM</div></div>
    </header>
    <aside class="sidebar">
      <nav class="nav"><button class="${!detail?'active':''}" data-action="home">▦ Dashboard</button><button class="${detail?'active':''}">⇄ Transitions <span class="nav-count">12</span></button><button>▤ Documents</button></nav>
      <div class="sidebar-footer"><div class="advisor-avatar">JM</div><div><strong>Jordan Miller</strong><span>Senior Advisor</span></div></div>
    </aside>
    <main class="main">${content}</main>
  </div>`;
  bindGlobal();
}

function renderDashboard(){
  state.screen='dashboard'; state.client=null; state.issue=null;
  const filter = state.filter;
  const visible = clients.filter(c=>filter==='All'||c.status===filter);
  const cards = [
    ['Active Transitions',12,'navy','2 added this week','All','⇄'],
    ['Ready',4,'green','33% of active','Ready','✓'],
    ['Missing Info',3,'yellow','Awaiting documents','Missing Info','▤'],
    ['Flagged',4,'red','Review required','Flagged','!'],
    ['Submitted',1,'blue','Pending custodian','Submitted','✓']];
  const cardHtml = cards.map(([label,value,tone,note,f,icon])=>`<button class="summary-card ${filter===f?'selected':''}" data-filter="${esc(f)}"><span class="summary-icon tone-${tone}">${icon}</span><span class="summary-label">${label}</span><strong class="summary-value">${value}</strong><span class="summary-note">${note}</span></button>`).join('');
  const rows = visible.map(c=>`<tr data-client="${c.id}"><td><div class="client-cell"><div class="client-avatar">${initials(c.name)}</div><div><strong>${esc(c.name)}</strong><span>${c.id}</span></div></div></td><td>${esc(c.account)}</td><td>${statusChip(c.status)}</td><td><span class="issue-count ${c.issues?'active':''}">${c.issues}</span></td><td>${severityChip(c.severity)}</td><td class="reason">${esc(c.reason)}</td><td>›</td></tr>`).join('');
  shell(`<div class="page"><div class="page-heading"><div><p class="eyebrow">Transition operations</p><h1>Advisor Transition Dashboard</h1><p class="subtitle">Review transition packages, resolve issues, and prepare accounts for submission.</p></div><div class="updated">◷ Updated just now</div></div>
    <section class="summary-grid">${cardHtml}</section>
    <section class="card table-card"><div class="table-toolbar"><div><h2>Active transitions</h2><p>Accounts currently moving through transition review.</p></div><div class="filter-tabs">${['All','Ready','Missing Info','Flagged','Submitted'].map(f=>`<button class="${filter===f?'active':''}" data-filter="${f}">${f}</button>`).join('')}</div></div><table><thead><tr><th>Client</th><th>Account</th><th>Status</th><th>Issues</th><th>Severity</th><th>Main reason</th><th></th></tr></thead><tbody>${rows}</tbody></table><div class="table-footer"><span>Showing ${visible.length} of 12 transitions</span><span>Last 30 days</span></div></section></div>`);
  document.querySelectorAll('[data-filter]').forEach(el=>el.addEventListener('click',()=>{state.filter=el.dataset.filter;renderDashboard();}));
  document.querySelectorAll('[data-client]').forEach(el=>el.addEventListener('click',()=>openClient(el.dataset.client)));
}

function detailHeader(c){
  return `<button class="back-link" data-action="home">‹ All transitions</button><div class="detail-header"><div class="detail-title-row"><div><div class="title-with-status"><h1>${esc(c.name)}</h1>${statusChip(c.status)}</div><div class="metadata"><span>Advisor: <strong>Jordan Miller</strong></span><span>Account: <strong>${esc(c.display)}</strong></span><span>Transition ID: <strong>${c.id}</strong></span><span>Last analyzed: <strong>${c.last}</strong></span></div></div>${c.severity?`<div class="severity-box"><span>Overall severity</span>${severityChip(c.severity)}</div>`:''}</div><div class="progress-row"><div class="progress-label"><span>Transition progress</span><strong>${c.progress}%</strong></div><div class="progress-track"><div class="progress-fill" style="width:${c.progress}%"></div></div></div></div>`;
}

function summaryText(c){
  const map = {
    'Marcus Lee':'2 issues require attention. The client’s address differs between the existing statement and new account application. The recorded risk tolerance also differs between the application and investor profile. Review these fields before submitting the transition.',
    'Elena Rodriguez':'4 issues require attention. Client naming differs across documents, the transfer form contains a $35,000 account-value variance, the transfer form is unsigned, and the client’s investment objective differs between the application and investor profile.',
    'Sarah Johnson':'All required documents and cross-document checks are complete. This transition appears ready for advisor review and submission.'
  };
  if(map[c.name]) return map[c.name];
  if(c.status==='Ready') return 'All required documents and cross-document checks are complete. This transition appears ready for advisor review and submission.';
  if(c.status==='Submitted') return 'This transition package has been submitted and is pending custodian review. No additional advisor action is required at this time.';
  return `${c.issues} item${c.issues===1?'':'s'} require attention before this transition can proceed.`;
}

function docChecklist(missing=false){
  return `<section class="card checklist"><div class="checklist-head"><div><p class="eyebrow">Package status</p><h2>Document checklist</h2></div><span>${missing?'5 of 6':'6 of 6'}</span></div>${docs.map(d=>{const m=missing&&d==='Beneficiary Designation';return `<div class="doc-row"><span class="doc-check ${m?'missing':''}">${m?'×':'✓'}</span><div><strong>${d}</strong><span>${m?'Not received':'Received'}</span></div><span>›</span></div>`}).join('')}</section>`;
}

function issueCard(c,i,index){
  return `<button class="issue-card" data-issue="${index}"><div class="issue-top"><div>${severityChip(i.severity)}<h3>${esc(i.title)}</h3></div><span class="review-link">Review documents →</span></div><div class="compare-values"><div><span>${esc(i.leftLabel)}</span><strong>${esc(i.leftValue)}</strong><small>Source: ${esc(i.leftSource)}</small></div><div><span>${esc(i.rightLabel)}</span><strong>${esc(i.rightValue)}</strong><small>Source: ${esc(i.rightSource)}</small></div></div></button>`;
}

function renderStandard(c){
  const issues = c.issueList.map((i,n)=>issueCard(c,i,n)).join('');
  shell(`<div class="page">${detailHeader(c)}<div class="detail-layout"><div><section class="ai-card"><div class="ai-icon">✦</div><div><p class="eyebrow">AI-assisted review</p><h2>Transition Copilot Summary</h2><p>${esc(summaryText(c))}</p><div class="disclaimer">AI-generated summary · Verify against source documents</div></div></section>${issues?`<section><div class="section-heading"><div><p class="eyebrow">Review queue</p><h2>Issues requiring attention</h2></div><span>${c.issueList.length} open issues</span></div><div class="issue-list">${issues}</div></section>`:''}</div><aside>${docChecklist(false)}<div class="next-step"><span>Next step</span><strong>${c.issueList.length?'Resolve open issues':'Ready for review'}</strong><p>${c.issueList.length?'Review source documents and mark each discrepancy as resolved.':'Complete advisor review and submit the package.'}</p></div></aside></div></div>`);
  document.querySelectorAll('[data-issue]').forEach(el=>el.addEventListener('click',()=>renderComparison(c,c.issueList[Number(el.dataset.issue)])));
}

function renderPriya(c){
  shell(`<div class="page">${detailHeader(c)}<div class="simple-grid">${docChecklist(true)}<section class="card action-card"><div class="action-icon">▤</div><p class="eyebrow">Action required</p><h2>Missing Beneficiary Designation</h2><p>The transition package indicates beneficiary information should be documented, but no beneficiary designation form was received.</p><button class="primary" id="request-doc">Request document →</button></section></div></div>`);
  document.getElementById('request-doc').addEventListener('click',()=>toast('Request sent to advisor','Jordan Miller has been notified.'));
}

function renderCameron(c){
  shell(`<div class="page">${detailHeader(c)}<section class="fraud-banner"><div class="fraud-icon">!</div><div><p class="eyebrow">Requires fraud review</p><h2>Potential Fraud Indicators Detected</h2><p>A newly observed $125,000 ACH deposit was followed by $119,500 in outgoing wires to newly added third-party recipients within 48 hours. A separate $22,400 ACH was returned because of an account-name mismatch. These indicators do not prove fraud but warrant further investigation.</p></div></section><div class="fraud-grid"><section class="card fraud-card"><div class="section-heading"><div><p class="eyebrow">Transaction pattern</p><h2>Rapid movement of funds</h2></div><span>48-hour window</span></div><div class="flow"><div class="flow-node in"><span>Incoming ACH</span><strong>$125,000</strong><small>Newly observed deposit</small></div><div class="flow-arrow">↓ &lt; 48 hours ↓</div><div class="flow-outs"><div class="flow-node out"><span>Outgoing wire</span><strong>$64,500</strong><small>New recipient A</small></div><div class="flow-node out"><span>Outgoing wire</span><strong>$55,000</strong><small>New recipient B</small></div></div><div class="flow-stat"><strong>95.6%</strong><span>of incoming funds rapidly moved out</span></div></div></section><section class="card fraud-card"><div class="section-heading"><div><p class="eyebrow">Risk checks</p><h2>Detected indicators</h2></div><span>3 indicators</span></div>${[
    ['High','Rapid movement of funds','95.6% moved within 48 hours'],['High','New third-party recipients','2 recipients added recently'],['Critical','Returned ACH / name mismatch','$22,400 return']].map(([s,t,n])=>`<div class="detection-row">${severityChip(s)}<div class="grow"><strong>${t}</strong><span class="note">${n}</span></div><span>›</span></div>`).join('')}<div class="why-box"><div>!</div><div><strong>Why was this flagged?</strong><p>The combination of rapid fund movement, newly added third-party recipients, and an ownership-name mismatch creates a pattern requiring fraud review.</p></div></div><div class="human-note">Not a determination of fraud. Human review required.</div></section></div></div>`);
}

function renderComparison(c,i){
  state.screen='comparison';state.client=c;state.issue=i;
  shell(`<div class="page"><button class="back-link" id="back-detail">‹ Back to ${esc(c.name)}</button><div class="comparison-header"><div><p class="eyebrow">Cross-document comparison</p><div class="title-with-status"><h1>${esc(i.title)}</h1>${severityChip(i.severity)}</div><p>Transition ${c.id} · ${esc(c.name)} · ${esc(c.display)}</p></div></div><section class="document-comparison"><div class="document-pane"><div class="document-pane-head">▤ ${esc(i.leftLabel)}</div><div class="document-canvas"><div class="fake-page"><div class="fake-logo">NORTHSTAR</div><div class="fake-title">ACCOUNT INFORMATION</div><div class="fake-field"><span>Client name</span><strong>${esc(c.name)}</strong></div><div class="highlight"><div class="fake-field"><span>${esc(i.leftLabel)}</span><strong>${esc(i.leftValue)}</strong></div></div><div class="fake-field"><span>Account type</span><strong>${esc(c.account)}</strong></div></div></div><div class="document-source">${esc(i.leftSource)} · Page 1</div></div><div class="document-pane"><div class="document-pane-head">▤ ${esc(i.rightLabel)}</div><div class="document-canvas"><div class="fake-page"><div class="fake-logo">TRANSITION</div><div class="fake-title">NEW ACCOUNT APPLICATION</div><div class="fake-field"><span>Applicant</span><strong>${esc(c.name)}</strong></div><div class="highlight"><div class="fake-field"><span>${esc(i.rightLabel)}</span><strong>${esc(i.rightValue)}</strong></div></div><div class="fake-field"><span>Account type</span><strong>${esc(c.account)}</strong></div></div></div><div class="document-source">${esc(i.rightSource)} · Page 1</div></div></section><section class="comparison-action"><div><strong>Transition Copilot finding</strong><p>Different values were detected across these source documents. Verify the correct value before proceeding.</p></div><div class="action-buttons"><button class="secondary" id="mark-reviewed">✓ Mark reviewed</button><button class="primary" id="needs-correction">Needs correction</button></div></section></div>`);
  document.getElementById('back-detail').addEventListener('click',()=>openClient(c.id));
  document.getElementById('mark-reviewed').addEventListener('click',()=>toast('Issue marked as reviewed','The transition record has been updated.'));
  document.getElementById('needs-correction').addEventListener('click',()=>toast('Correction requested','The advisor has been notified.'));
}

function openClient(id){
  const c=clients.find(x=>x.id===id); if(!c)return; state.screen='detail';state.client=c;state.issue=null;
  if(c.name==='Priya Shah') renderPriya(c); else if(c.name==='Cameron Blake') renderCameron(c); else renderStandard(c);
  window.scrollTo(0,0);
}

function bindGlobal(){
  document.querySelectorAll('[data-action="home"]').forEach(el=>el.addEventListener('click',renderDashboard));
  document.querySelectorAll('[data-action="upload"]').forEach(el=>el.addEventListener('click',openUpload));
}

function openUpload(){
  modalRoot.innerHTML=`<div class="modal-backdrop"><div class="modal"><div class="modal-head"><div><p class="eyebrow">New analysis</p><h2>Add Transition Documents</h2></div><button class="icon-btn" id="close-modal">×</button></div><div class="modal-body"><label class="field-label">Client<div class="fake-select">CB &nbsp; Cameron Blake ▾</div></label><div class="drop-zone"><strong>⇧ Drop documents here</strong><p>or click to browse your computer</p><small>PDF, JPG, PNG · Up to 25 MB each</small></div><div class="uploaded"><strong style="font-size:10px">Uploaded · 4 files</strong>${['account_statement.pdf','new_account_application.pdf','transfer_form.pdf','transaction_activity.pdf'].map((f,n)=>`<div class="uploaded-file"><span class="file-type">PDF</span><div class="grow"><strong>${f}</strong><span>${(1.2+n*.4).toFixed(1)} MB</span></div><span>✓</span></div>`).join('')}</div></div><div class="modal-foot"><button class="secondary" id="cancel-upload">Cancel</button><button class="primary" id="analyze">✦ Analyze package</button></div></div></div>`;
  document.getElementById('close-modal').onclick=closeModal; document.getElementById('cancel-upload').onclick=closeModal; document.getElementById('analyze').onclick=analyze;
}
function closeModal(){modalRoot.innerHTML='';}
function analyze(){
  const steps=['Documents identified','Information extracted','Cross-document checks complete','Risk checks complete','Summary generated'];
  modalRoot.innerHTML=`<div class="modal-backdrop"><div class="modal"><div class="modal-head"><div><p class="eyebrow">AI-assisted review</p><h2>Analyzing transition...</h2></div></div><div class="analysis"><div class="spinner"></div><p>Checking documents and reconciling account information.</p><div id="analysis-steps">${steps.map((s,i)=>`<div class="analysis-step" id="step-${i}">○ ${s}</div>`).join('')}</div></div></div></div>`;
  let i=0; const timer=setInterval(()=>{if(i<steps.length){document.getElementById(`step-${i}`).classList.add('done');document.getElementById(`step-${i}`).textContent='✓ '+steps[i];i++;}else{clearInterval(timer);setTimeout(()=>{closeModal();openClient('T005');},450);}},450);
}
function toast(title,body){
  toastRoot.innerHTML=`<div class="toast"><div class="toast-badge">✓</div><div><strong>${esc(title)}</strong><p>${esc(body)}</p></div></div>`; setTimeout(()=>toastRoot.innerHTML='',3000);
}
renderDashboard();
