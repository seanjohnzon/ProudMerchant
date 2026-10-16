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
  function stamp(){ var d = new Date(); return 'Saved ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); }
  function renderReview(host, acct, step, savingEl, onChange){
    var kind = step.review, uat = kind === 'uat', items = listItems(acct, step), state = acct.answers || {}, timers = {}, cards = {};
    var YES = uat ? 'pass' : 'good', NO = uat ? 'fail' : 'change', yesWord = uat ? 'Pass' : 'Looks good', noWord = uat ? 'Fail' : 'Change';
    function good(i){ return i.result === YES; }
    function count(list){ list = list || items; var ok = list.filter(good).length, bad = list.filter(function(i){ return i.result === NO; }).length; return { ok: ok, n: list.length, fail: bad }; }
    function busy(t){ savingEl.className = 'saving'; savingEl.textContent = t; }
    function saved(line){ savingEl.textContent = 'Saved.'; setTimeout(function(){ if (savingEl.textContent === 'Saved.') savingEl.textContent = ''; }, 1500); if (line){ line.textContent = stamp(); line.className = 'stamp ok'; } paintCats(); if (onChange) onChange(count()); }
    function failed(err, line){ savingEl.className = 'saving err'; savingEl.textContent = 'Not saved: ' + err.message; if (line){ line.textContent = 'Not saved. Check your connection and press Save.'; line.className = 'stamp err'; } }
    function paintItem(it){ var c = cards[it.item_id], done = good(it); c.card.classList.toggle('ok', done); c.card.classList.toggle('fail', it.result === NO);
      c.yes.setAttribute('aria-pressed', String(it.result === YES)); c.no.setAttribute('aria-pressed', String(it.result === NO));
      c.btns.hidden = done; c.tick.hidden = !done;
      c.note.hidden = done || !(it.result === NO || (it.note || '').trim() || it.reply); }
    function applyList(list){ (list || []).forEach(function(r){ items.forEach(function(it){ if (it.item_id === r.item_id){ it.ok = r.ok; it.note = r.note; if (r.result !== undefined) it.result = r.result; paintItem(it); } }); }); paintCats(); }
    function catOf(i){ return kind === 'app' && i.kind === 'menu' ? 'Menu' : String(i.section || 'Checks').split(' · ')[0]; }
    function subOf(i){ return kind === 'app' && i.kind === 'menu' ? i.section : (String(i.section || '').split(' · ')[1] || ''); }
    var ORDER = ['Home', 'Menu', 'Rewards', 'Orders', 'Account'];
    var cats = []; items.forEach(function(i){ var c = catOf(i); if (cats.indexOf(c) < 0) cats.push(c); });
    if (!uat) cats.sort(function(a, b){ var x = ORDER.indexOf(a), y = ORDER.indexOf(b); return (x < 0 ? 99 : x) - (y < 0 ? 99 : y); });
    var catEls = {};
    function paintCats(){
      cats.forEach(function(c){
        var mine = items.filter(function(i){ return catOf(i) === c; }), k = count(mine), e = catEls[c];
        var left = k.n - k.ok - k.fail;
        e.chip.textContent = k.ok === k.n ? 'Done' : (k.fail ? k.fail + (uat ? ' fail' : (k.fail === 1 ? ' change' : ' changes')) + (left ? ' · ' : '') : '') + (left ? left + ' left' : '');
        e.chip.className = 'chip' + (k.ok === k.n ? ' ok' : k.fail ? ' bad' : ' todo');
        e.box.classList.toggle('ok', k.ok === k.n); e.box.classList.toggle('fail', !!k.fail);
      });
    }
    // A notes box with its own Save and a "Saved" line.
    function notesBox(parent, key, part, placeholder, cls){
      var wrap = el('div', 'nbox');
      if (state[key.replace('.notes', '.notes_reply')]){ var nr = el('div', 'reply'); nr.appendChild(el('b', '', 'Us: ')); nr.appendChild(document.createTextNode(state[key.replace('.notes', '.notes_reply')])); wrap.appendChild(nr); }
      var ta = el('textarea'); ta.className = cls; ta.placeholder = placeholder; ta.value = state[key] || ''; wrap.appendChild(ta);
      var row = el('div', 'srow'); var sb = el('button', 'savebtn', 'Save'); sb.type = 'button'; var line = el('span', 'stamp', state[key] ? 'Saved' : ''); row.appendChild(sb); row.appendChild(line); wrap.appendChild(row);
      var t; function send(){ clearTimeout(t); busy('Saving…'); PM.rpc('save_notes', { p_kind: kind, p_section: part, p_text: ta.value }).then(function(){ saved(line); }).catch(function(e){ failed(e, line); }); }
      ta.addEventListener('input', function(){ state[key] = ta.value; line.textContent = 'Typing…'; line.className = 'stamp'; clearTimeout(t); t = setTimeout(send, 900); });
      sb.addEventListener('click', send);
      parent.appendChild(wrap);
    }

    var pre = uat ? 'uat.' : 'app.', links = [];
    [['web', uat ? 'Website' : 'Browser'], ['testflight', 'iPhone'], ['store', 'Stores'], ['android', 'Android']].forEach(function(p){
      var v = (state[pre + p[0]] || '').trim(); if (!v) return;
      if (/^https?:\/\//.test(v)){ var a = el('a', '', p[1]); a.href = v; a.target = '_blank'; a.rel = 'noopener'; links.push(a); }
      else { var sp = el('span', ''); sp.appendChild(el('b', '', p[1] + ': ')); sp.appendChild(document.createTextNode(v)); links.push(sp); }
    });
    var where = el('p', 'where');
    if (links.length){ links.forEach(function(l, n){ if (n) where.appendChild(document.createTextNode(' · ')); where.appendChild(l); }); }
    else where.textContent = uat ? 'The links come with the email that says the final test is on.' : 'The link comes with the email that says your app is ready.';
    host.appendChild(where);
    host.appendChild(el('p', 'how', uat ? 'Real card, real orders; refund them after. Tap a part, Pass or Fail each line.' : 'Tap a part. Each line is how your app works now: Looks good, or Change and tell us what instead. Your own notes under every part.'));

    cats.forEach(function(c){
      var mine = items.filter(function(i){ return catOf(i) === c; });
      var box = el('details', 'cat'); var sum = el('summary'); sum.appendChild(el('span', 'name', c)); var chip = el('span', 'chip'); sum.appendChild(chip); box.appendChild(sum);
      var body = el('div', 'cat-body'); box.appendChild(body);
      catEls[c] = { box: box, chip: chip };
      if (mine.length > 1 && !uat){
        var all = el('button', 'okb all', 'All of these look good'); all.type = 'button';
        all.addEventListener('click', function(){
          busy('Saving…');
          var groups = {}; mine.forEach(function(i){ var g = i.kind + '|' + (i.section || ''); groups[g] = groups[g] || i; });
          Object.keys(groups).reduce(function(pr, g){ return pr.then(function(){ var i = groups[g]; return PM.rpc('save_review_all', { p_kind: i.kind, p_section: i.section || null }).then(applyList); }); }, Promise.resolve()).then(function(){ saved(); }).catch(function(e){ failed(e); });
        });
        body.appendChild(all);
      }
      var lastSub = null;
      mine.forEach(function(it){
        var sub = subOf(it); if (sub && sub !== lastSub){ body.appendChild(el('h3', 'sub', sub)); lastSub = sub; }
        var card = el('div', 'line');
        var top = el('div', 'top'); var nm = el('button', 'nm', it.name); nm.type = 'button'; top.appendChild(nm);
        var btns = el('div', 'btns'), yb = el('button', 'okb', yesWord), nb = el('button', 'okb failb', noWord); yb.type = 'button'; nb.type = 'button'; btns.appendChild(yb); btns.appendChild(nb); top.appendChild(btns);
        var tick = el('button', 'tick', '✓ ' + yesWord); tick.type = 'button'; tick.title = 'Tap to change your mind'; top.appendChild(tick);
        card.appendChild(top);
        var det = el('div', 'det'); det.hidden = true;
        String(it.detail || '').split('\n').forEach(function(line){
          if (!line.trim()) return; var p = el('p', 'd'), m = line.match(/^([A-Z][^:]{1,28}):\s*(.*)$/);
          if (m){ p.appendChild(el('span', 'k', m[1] + ': ')); p.appendChild(document.createTextNode(m[2])); } else p.textContent = line;
          det.appendChild(p);
        });
        if (uat && it.t_result){ var tr = el('p', 'd tester'); tr.appendChild(el('b', '', 'Our tester: ' + (it.t_result === 'pass' ? 'Pass' : 'Fail'))); if (it.t_note) tr.appendChild(document.createTextNode(' · ' + it.t_note)); det.appendChild(tr); }
        card.appendChild(det);
        nm.addEventListener('click', function(){ det.hidden = !det.hidden; });
        var nwrap = el('div', 'nwrap');
        if (it.reply){ var rp = el('div', 'reply'); rp.appendChild(el('b', '', 'Us: ')); rp.appendChild(document.createTextNode(it.reply)); nwrap.appendChild(rp); }
        var ta = el('textarea'); ta.placeholder = uat ? 'What happened.' : 'What instead? More, less, different: say it however it comes.'; ta.value = it.note || ''; nwrap.appendChild(ta);
        var srow = el('div', 'srow'); var sb = el('button', 'savebtn', 'Save'); sb.type = 'button'; var line = el('span', 'stamp', it.note ? 'Saved' : ''); srow.appendChild(sb); srow.appendChild(line); nwrap.appendChild(srow);
        card.appendChild(nwrap);
        cards[it.item_id] = { card: card, yes: yb, no: nb, note: nwrap, btns: btns, tick: tick };
        tick.addEventListener('click', function(){ it.result = ''; paintItem(it); later(); });
        function send(){ clearTimeout(timers[it.item_id]); busy('Saving…'); PM.rpc('save_uat', { p_item: it.item_id, p_result: it.result || '', p_note: ta.value }).then(function(){ saved(ta.value || it.result === NO ? line : null); }).catch(function(e){ failed(e, line); }); }
        function later(){ clearTimeout(timers[it.item_id]); timers[it.item_id] = setTimeout(send, 600); }
        yb.addEventListener('click', function(){ it.result = it.result === YES ? '' : YES; paintItem(it); later(); });
        nb.addEventListener('click', function(){ it.result = it.result === NO ? '' : NO; paintItem(it); later(); if (it.result === NO) ta.focus(); });
        ta.addEventListener('input', function(){ it.note = ta.value; line.textContent = 'Typing…'; line.className = 'stamp'; later(); });
        sb.addEventListener('click', send);
        paintItem(it);
        body.appendChild(card);
      });
      var sl = slug(c);
      body.appendChild(el('h3', 'sub', 'Your notes on ' + c.toLowerCase()));
      notesBox(body, kind + '.notes.' + sl, sl, 'Anything about ' + c.toLowerCase() + ': what to add, remove or change. As you go.', 'missing part');
      host.appendChild(box);
    });
    paintCats();
    var notes = el('details', 'cat open-note'); var ns = el('summary'); ns.appendChild(el('span', 'name', 'Anything else')); notes.appendChild(ns);
    var nb2 = el('div', 'cat-body'); notes.appendChild(nb2);
    notesBox(nb2, kind + '.notes', '', 'Whatever the parts above do not cover. Paste your own notes here as they are.', 'missing notes');
    host.appendChild(notes);
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
      var okd = items.filter(function(i){ return i.result === (step.review === 'uat' ? 'pass' : 'good'); }).length;
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
