/* The intake renderer: one section = named boxes marked Required or Optional, saving as he types;
   the two check lists (the menu draft, the app) as cards with Right / a note; and the state of every step.
   Shared by the step page and the profile. Needs PM (pm.js) and an account from get_account. */
window.Intake = (function(){
  var STAGES = ['setup', 'drafting', 'building', 'app_check', 'approved', 'uat', 'uat_passed', 'live'];
  function stageRank(s){ var i = STAGES.indexOf(s); return i < 0 ? 0 : i; }
  function el(tag, cls, text){ var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function val(state, s, f){ if (f.sameAs && state[s.id + '.' + f.id + '.same'] === '1') return (state[s.id + '.' + f.sameAs] || '').trim(); return (state[s.id + '.' + f.id] || '').trim(); }
  function filled(state, s, f){ var v = val(state, s, f); return f.want ? v === f.want : v !== ''; }
  function shown(state, s, f){
    if (f.when_any) return f.when_any[1].indexOf(state[s.id + '.' + f.when_any[0]] || '') >= 0;
    return !f.when || (state[s.id + '.' + f.when[0]] || '') === f.when[1];
  }
  function left(state, s){ return s.fields.filter(function(f){ return f.req && shown(state, s, f) && !filled(state, s, f); }).length; }
  function statusOf(tasks, state, s){
    var opt = !s.fields.some(function(f){ return f.req; });
    if (opt) return s.fields.some(function(f){ return filled(state, s, f); }) ? 'added' : 'optional';
    var st = tasks[s.id]; var n = left(state, s);
    if (st === 'done' || (!st && n === 0)) return 'done';
    if (st === 'pending' || (s.pending && (state[s.id + '.' + s.pending[0]] || '') === s.pending[1])) return 'pending';
    return n + ' left';
  }
  function chipText(st){ return st === 'done' ? 'Done' : st === 'pending' ? 'Pending' : st === 'added' ? 'Added' : st === 'optional' ? 'Optional' : st; }

  // Draws the sections into host. onChange(tasks) is called after every save.
  function render(host, acct, sections, savingEl, onChange){
    var state = acct.answers || {}, tasks = acct.tasks || {}, chips = {}, timers = {};
    function save(key){
      clearTimeout(timers[key]);
      timers[key] = setTimeout(function(){
        savingEl.className = 'saving'; savingEl.textContent = 'Saving…';
        PM.rpc('save_answer', { p_key: key, p_value: state[key] || '' }).then(function(t){
          tasks = t || tasks; acct.tasks = tasks; savingEl.textContent = 'Saved.'; paint(); if (onChange) onChange(tasks);
          setTimeout(function(){ if (savingEl.textContent === 'Saved.') savingEl.textContent = ''; }, 1500);
        }).catch(function(err){ savingEl.className = 'saving err'; savingEl.textContent = 'Not saved: ' + err.message + ' Check your connection and try again.'; });
      }, 500);
    }
    function paint(){
      sections.forEach(function(s){
        var st = statusOf(tasks, state, s), ok = st === 'done' || st === 'added', wait = st === 'pending';
        chips[s.id].textContent = chipText(st); chips[s.id].classList.toggle('ok', ok); chips[s.id].classList.toggle('wait', wait);
        var sec = document.getElementById('sec-' + s.id); sec.classList.toggle('ok', ok); sec.classList.toggle('wait', wait);
        s.fields.forEach(function(f){ var w = document.getElementById('f-' + s.id + '-' + f.id); w.classList.toggle('filled', filled(state, s, f)); w.hidden = !shown(state, s, f); });
      });
    }
    // Boxes we already know from his account open filled in (and are saved so they count).
    sections.forEach(function(s){ s.fields.forEach(function(f){ var key = s.id + '.' + f.id; if (f.from && !state[key] && acct[f.from]){ state[key] = String(acct[f.from]); save(key); } }); });
    sections.forEach(function(s){
      var sec = el('section', 'sec'); sec.id = 'sec-' + s.id;
      var head = el('div', 'sec-head'); head.appendChild(el('h2', '', s.title)); var c = el('span', 'chip'); head.appendChild(c); sec.appendChild(head); chips[s.id] = c;
      if (s.hint) sec.appendChild(el('p', 'hint', s.hint));
      if (s.url){ var g = el('a', 'go', s.go || 'Open'); g.href = s.url; g.target = '_blank'; g.rel = 'noopener'; sec.appendChild(g); }
      s.fields.forEach(function(f){
        var key = s.id + '.' + f.id, id = 'in-' + s.id + '-' + f.id;
        var wrap = el('div', 'f'); wrap.id = 'f-' + s.id + '-' + f.id;
        var lab = el(f.choice || f.file ? 'div' : 'label', 'f-label', f.label); if (!f.choice && !f.file) lab.htmlFor = id;
        lab.appendChild(el('span', 'tag' + (f.req ? ' req' : ''), f.req ? 'Required' : 'Optional'));
        wrap.appendChild(lab);
        if (f.url){ var fg = el('a', 'go', f.go || 'Open'); fg.href = f.url; fg.target = '_blank'; fg.rel = 'noopener'; wrap.appendChild(fg); }
        if (f.note) wrap.appendChild(el('p', 'note', f.note));
        if (f.file){
          var have = el('p', 'have', state[key] ? '✓ We have it: ' + state[key] : ''); wrap.appendChild(have);
          if (state[key + '.preview']){ var img = el('img', 'preview'); img.src = state[key + '.preview']; img.alt = state[key]; wrap.appendChild(img); }
          var pick = el('label', 'pick' + (state[key] ? ' small' : ''), state[key] ? 'Replace or add a file' : (f.multi ? 'Upload files' : 'Upload a file'));
          var inp = el('input'); inp.type = 'file'; inp.accept = f.accept || ''; if (f.multi) inp.multiple = true; inp.id = id; pick.htmlFor = id; pick.appendChild(inp);
          inp.addEventListener('change', function(){
            var files = Array.prototype.slice.call(inp.files || []); if (!files.length) return;
            savingEl.className = 'saving'; savingEl.textContent = 'Uploading ' + files.length + ' file' + (files.length > 1 ? 's' : '') + '…';
            var names = [];
            files.reduce(function(p, file){ return p.then(function(){
              var clean = file.name.replace(/[^A-Za-z0-9._-]+/g, '_');
              return PM.upload(acct.id + '/' + key + '/' + Date.now() + '-' + clean, file).then(function(){ names.push(file.name); });
            }); }, Promise.resolve()).then(function(){
              state[key] = (f.multi && state[key] ? state[key] + ', ' : '') + names.join(', ');
              have.textContent = '✓ We have it: ' + state[key]; pick.firstChild.textContent = 'Replace or add a file'; pick.classList.add('small'); inp.value = '';
              save(key);
            }).catch(function(err){ savingEl.className = 'saving err'; savingEl.textContent = 'Upload failed: ' + err.message; inp.value = ''; });
          });
          wrap.appendChild(pick);
        } else if (f.choice){
          var ch = el('div', 'choice'); ch.setAttribute('role', 'group'); ch.setAttribute('aria-label', f.label);
          f.choice.forEach(function(cv){
            var b = el('button', '', cv); b.type = 'button'; b.setAttribute('aria-pressed', String(state[key] === cv));
            b.addEventListener('click', function(){
              state[key] = (state[key] === cv) ? '' : cv; save(key);
              ch.querySelectorAll('button').forEach(function(x){ x.setAttribute('aria-pressed', String(x.textContent === state[key])); });
              paint();
            });
            ch.appendChild(b);
          });
          wrap.appendChild(ch);
        } else {
          var tin = el(f.area ? 'textarea' : 'input'); if (!f.area) tin.type = 'text';
          tin.id = id; tin.placeholder = f.ph || ''; tin.value = state[key] || '';
          tin.addEventListener('input', function(){ state[key] = tin.value; save(key); paint(); });
          if (f.sameAs){
            var sl = el('label', 'same'), sc = el('input'); sc.type = 'checkbox'; sc.id = id + '-same'; sc.checked = state[key + '.same'] === '1';
            sl.appendChild(sc); sl.appendChild(document.createTextNode(f.sameLabel || 'Same as above'));
            tin.hidden = sc.checked;
            sc.addEventListener('change', function(){ state[key + '.same'] = sc.checked ? '1' : ''; tin.hidden = sc.checked; save(key + '.same'); paint(); });
            wrap.appendChild(sl);
          }
          wrap.appendChild(tin);
        }
        sec.appendChild(wrap);
      });
      host.appendChild(sec);
    });
    paint();
  }

  // A check list. step.review = 'app': his menu first (kind menu), then every screen (kind app), Pass / Fail / a note,
  // notes under each part and a box at the end. step.review = 'uat': the final test, same shape, with our tester's result shown.
  function listKinds(step){ return step.review === 'app' ? ['menu', 'app'] : [step.review]; }
  function listItems(acct, step){
    var kinds = listKinds(step);
    return (acct.review || []).filter(function(i){ return kinds.indexOf(i.kind) >= 0; })
      .sort(function(x, y){ return kinds.indexOf(x.kind) - kinds.indexOf(y.kind) || (x.sort || 0) - (y.sort || 0) || String(x.item_id).localeCompare(String(y.item_id)); });
  }
  function slug(t){ return String(t).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40); }
  function renderReview(host, acct, step, savingEl, onChange){
    var kind = step.review, items = listItems(acct, step), state = acct.answers || {}, timers = {}, cards = {};
    function passed(i){ return i.result === 'pass'; }
    function count(){ var ok = items.filter(passed).length; return { ok: ok, n: items.length }; }
    function busy(t){ savingEl.className = 'saving'; savingEl.textContent = t; }
    function saved(){ savingEl.textContent = 'Saved.'; setTimeout(function(){ if (savingEl.textContent === 'Saved.') savingEl.textContent = ''; }, 1500); if (onChange) onChange(count()); }
    function failed(err){ savingEl.className = 'saving err'; savingEl.textContent = 'Not saved: ' + err.message; }
    function paintItem(it){ var c = cards[it.item_id]; c.card.classList.toggle('ok', passed(it)); c.card.classList.toggle('fail', it.result === 'fail');
      c.pass.setAttribute('aria-pressed', String(it.result === 'pass')); c.fail.setAttribute('aria-pressed', String(it.result === 'fail')); }
    function applyList(list){ (list || []).forEach(function(r){ items.forEach(function(it){ if (it.item_id === r.item_id){ it.ok = r.ok; it.note = r.note; if (r.result !== undefined) it.result = r.result; paintItem(it); } }); }); }
    function label(i){ return (kind === 'app' && i.kind === 'menu' ? 'Your menu · ' : '') + (i.section || ''); }

    var where = el('section', 'sec where'); where.appendChild(el('h2', '', kind === 'uat' ? 'The real thing' : 'Where to open it'));
    var any = false, pre = kind === 'uat' ? 'uat.' : 'app.';
    [['web', kind === 'uat' ? 'Your website' : 'In your browser'], ['testflight', 'On your iPhone'], ['store', 'In the stores'], ['android', 'On Android']].forEach(function(p){
      var v = (state[pre + p[0]] || '').trim(); if (!v) return; any = true;
      var row = el('p', 'd'); row.appendChild(el('b', '', p[1] + ': '));
      if (/^https?:\/\//.test(v)){ var a = el('a', '', v.replace(/^https?:\/\//, '')); a.href = v; a.target = '_blank'; a.rel = 'noopener'; row.appendChild(a); } else row.appendChild(document.createTextNode(v));
      where.appendChild(row);
    });
    if (!any) where.appendChild(el('p', 'd', kind === 'uat' ? 'The links come with the email that says the final test is on.' : 'The links come with the email that says your app is ready.'));
    where.appendChild(el('p', 'note', kind === 'uat' ? 'Real card, real orders (refund them after). Each check: Pass, or Fail with what happened. Our tester does the same list; both have to pass before launch.'
      : 'Test app, test orders, nothing real. Your menu first: open each item like a customer and compare it with the words under it. Then the screens. Account → Test controls sets the stamp card and resets the free drink. Each one: Pass, or Fail with what you saw. We fix it and reply here; then reopen the app and check again.'));
    host.appendChild(where);

    var sections = []; items.forEach(function(i){ var l = label(i); if (sections.indexOf(l) < 0) sections.push(l); });
    sections.forEach(function(sname){
      var mine = items.filter(function(i){ return label(i) === sname; }), first = mine[0];
      var sec = el('section', 'sec list');
      var head = el('div', 'sec-head'); head.appendChild(el('h2', '', sname || 'Your app'));
      if (mine.length > 1 && kind !== 'uat'){
        var all = el('button', 'okb all', 'All of these pass'); all.type = 'button';
        all.addEventListener('click', function(){ busy('Saving…'); PM.rpc('save_review_all', { p_kind: first.kind, p_section: first.section || null }).then(function(list){ applyList(list); saved(); }).catch(failed); });
        head.appendChild(all);
      }
      sec.appendChild(head);
      mine.forEach(function(it){
        var card = el('div', 'item' + (passed(it) ? ' ok' : it.result === 'fail' ? ' fail' : '')); card.appendChild(el('b', '', it.name));
        String(it.detail || '').split('\n').forEach(function(line){
          if (!line.trim()) return; var p = el('p', 'd'), m = line.match(/^([A-Z][^:]{1,28}):\s*(.*)$/);
          if (m){ p.appendChild(el('span', 'k', m[1] + ': ')); p.appendChild(document.createTextNode(m[2])); } else p.textContent = line;
          card.appendChild(p);
        });
        if (it.reply){ var rp = el('div', 'reply'); rp.appendChild(el('b', '', 'Us: ')); rp.appendChild(document.createTextNode(it.reply)); card.appendChild(rp); }
        if (kind === 'uat' && it.t_result){ var tr = el('p', 'd tester'); tr.appendChild(el('b', '', 'Our tester: ' + (it.t_result === 'pass' ? 'Pass' : 'Fail'))); if (it.t_note) tr.appendChild(document.createTextNode(' · ' + it.t_note)); card.appendChild(tr); }
        var row = el('div', 'row'), pb = el('button', 'okb', 'Pass'), fb = el('button', 'okb failb', 'Fail'); pb.type = 'button'; fb.type = 'button'; row.appendChild(pb); row.appendChild(fb); card.appendChild(row);
        var ta = el('textarea'); ta.placeholder = it.kind === 'menu' ? 'What is wrong or missing, if it failed.' : 'What you saw, if it failed.'; ta.value = it.note || ''; card.appendChild(ta);
        cards[it.item_id] = { card: card, pass: pb, fail: fb };
        function save(){ clearTimeout(timers[it.item_id]); timers[it.item_id] = setTimeout(function(){
          busy('Saving…'); PM.rpc('save_uat', { p_item: it.item_id, p_result: it.result || '', p_note: ta.value }).then(saved).catch(failed);
        }, 500); }
        pb.addEventListener('click', function(){ it.result = it.result === 'pass' ? '' : 'pass'; paintItem(it); save(); });
        fb.addEventListener('click', function(){ it.result = it.result === 'fail' ? '' : 'fail'; paintItem(it); save(); if (it.result === 'fail') ta.focus(); });
        paintItem(it);
        sec.appendChild(card);
      });
      // Notes on this part.
      var sl = slug(sname), nk = kind + '.notes.' + sl, rk = kind + '.notes_reply.' + sl;
      if (state[rk]){ var nr = el('div', 'reply'); nr.appendChild(el('b', '', 'Us: ')); nr.appendChild(document.createTextNode(state[rk])); sec.appendChild(nr); }
      var nta = el('textarea'); nta.className = 'missing part'; nta.placeholder = 'Notes on ' + (sname ? sname.replace('Your menu · ', '').toLowerCase() : 'this part') + ': anything to add, remove or change.'; nta.value = state[nk] || '';
      var nt; nta.addEventListener('input', function(){ state[nk] = nta.value; clearTimeout(nt); nt = setTimeout(function(){ busy('Saving…'); PM.rpc('save_notes', { p_kind: kind, p_section: sl, p_text: nta.value }).then(saved).catch(failed); }, 700); });
      sec.appendChild(nta);
      host.appendChild(sec);
    });
    // The box at the end.
    var notes = el('section', 'sec'); notes.appendChild(el('h2', '', 'Anything else'));
    notes.appendChild(el('p', 'hint', 'Whatever the list above does not cover. Paste your own notes here as they are; we sort them and reply here.'));
    if (state[kind + '.notes_reply']){ var nr2 = el('div', 'reply'); nr2.appendChild(el('b', '', 'Us: ')); nr2.appendChild(document.createTextNode(state[kind + '.notes_reply'])); notes.appendChild(nr2); }
    var eta = el('textarea'); eta.className = 'missing notes'; eta.placeholder = 'For example: the order screen should show the pickup time; remove the TikTok button for now; add a kids meal, $6, with a drink'; eta.value = state[kind + '.notes'] || '';
    var et; eta.addEventListener('input', function(){ state[kind + '.notes'] = eta.value; clearTimeout(et); et = setTimeout(function(){ busy('Saving…'); PM.rpc('save_notes', { p_kind: kind, p_section: '', p_text: eta.value }).then(saved).catch(failed); }, 700); });
    notes.appendChild(eta); host.appendChild(notes);
    return count();
  }

  // One step's state. {status:'done'|'pending'|'locked'|'todo', left, done, total, why}
  function stepState(acct, step){
    var state = acct.answers || {}, tasks = acct.tasks || {}, bySec = {}, steps = acct.template.steps || [];
    (acct.template.sections || []).forEach(function(s){ bySec[s.id] = s; });
    function lockedBy(){
      if (step.after && stageRank(acct.stage) < stageRank(step.after)) return step.after;
      if (step.needs && step.needs.some(function(id){ var s = steps.filter(function(x){ return x.id === id; })[0]; return s && stepState(acct, s).status !== 'done'; })) return 'needs';
      return null;
    }
    var why = lockedBy();
    if (step.review){
      var items = listItems(acct, step);
      if (why || !items.length) return { status: 'locked', left: 0, done: 0, total: 0, why: why || step.after };
      var okd = items.filter(function(i){ return i.result === 'pass'; }).length;
      return { status: okd === items.length ? 'done' : 'todo', left: items.length - okd, done: okd, total: items.length };
    }
    var done = 0, total = 0, left = 0, pend = false;
    (step.sections || []).forEach(function(id){
      var s = bySec[id]; if (!s) return; var st = statusOf(tasks, state, s);
      if (st === 'optional' || st === 'added') return;
      total++; if (st === 'done') done++; else if (st === 'pending') pend = true; else left += parseInt(st, 10) || 0;
    });
    var status = done === total ? 'done' : (pend && left === 0 ? 'pending' : 'todo');
    if (why && status !== 'done') return { status: 'locked', left: left, done: done, total: total, why: why };
    return { status: status, left: left, done: done, total: total };
  }
  function lockText(why){
    return why === 'app_check' ? 'Opens when your app is on your phone: a preview in your browser first, TestFlight after. We email you.'
      : why === 'approved' ? 'Opens once you approve your app in step 3.'
      : why === 'uat' ? 'Opens when the real thing is up: your address, your payments, the app on your phone. We email you.'
      : why === 'needs' ? 'Opens when the steps before it are done.' : 'Not yet.';
  }
  function stageLine(acct){
    var s = acct.stage;
    return s === 'setup' ? 'Steps 1 and 2 are yours. Step 1 starts our drafting.'
      : s === 'drafting' ? 'We are putting your menu into your app and a preview up. Step 3 opens when it is on your phone; we email you.'
      : s === 'building' ? 'We are building your app. Step 3 opens when it is on your phone; we email you.'
      : s === 'app_check' ? 'Your app is on your phone: try it in step 3, your menu first.'
      : s === 'approved' ? 'Approved. Payments and your own accounts next; the final test once the real thing is up.'
      : s === 'uat' ? 'Final test: you and our tester go through step 6 on the real thing.'
      : s === 'uat_passed' ? 'Final test passed. Launch is next.'
      : s === 'live' ? 'Live.' : '';
  }
  return { render: render, renderReview: renderReview, stepState: stepState, lockText: lockText, stageLine: stageLine, stageRank: stageRank, el: el };
})();
