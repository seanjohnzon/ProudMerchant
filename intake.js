/* The intake renderer: one section = named boxes marked Required or Optional, saving as he types.
   Shared by the step page. Needs PM (pm.js) and an account from get_account. */
window.Intake = (function(){
  function el(tag, cls, text){ var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function val(state, s, f){ if (f.sameAs && state[s.id + '.' + f.id + '.same'] === '1') return (state[s.id + '.' + f.sameAs] || '').trim(); return (state[s.id + '.' + f.id] || '').trim(); }
  function filled(state, s, f){ var v = val(state, s, f); return f.want ? v === f.want : v !== ''; }
  function shown(state, s, f){ return !f.when || (state[s.id + '.' + f.when[0]] || '') === f.when[1]; }
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
          var have = el('p', 'have', state[key] ? 'Uploaded: ' + state[key] : ''); wrap.appendChild(have);
          var pick = el('label', 'pick', state[key] ? (f.multi ? 'Add more' : 'Replace') : (f.multi ? 'Choose photos' : 'Choose a file'));
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
              have.textContent = 'Uploaded: ' + state[key]; pick.firstChild.textContent = f.multi ? 'Add more' : 'Replace'; inp.value = '';
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

  // One step's state from its sections. Returns {status:'done'|'pending'|'locked'|'todo', left:n, done:k, total:m}
  function stepState(acct, step){
    var state = acct.answers || {}, tasks = acct.tasks || {}, bySec = {};
    (acct.template.sections || []).forEach(function(s){ bySec[s.id] = s; });
    if (step.review){
      var items = acct.review || [];
      if (acct.stage === 'setup' || acct.stage === 'building' || !items.length) return { status: 'locked', left: 0, done: 0, total: 0 };
      var okd = items.filter(function(i){ return i.ok; }).length;
      return { status: okd === items.length ? 'done' : 'todo', left: items.length - okd, done: okd, total: items.length };
    }
    var done = 0, total = 0, left = 0, pend = false;
    step.sections.forEach(function(id){
      var s = bySec[id]; if (!s) return; var st = statusOf(tasks, state, s);
      if (st === 'optional' || st === 'added') return;
      total++; if (st === 'done') done++; else if (st === 'pending') pend = true; else left += parseInt(st, 10) || 0;
    });
    return { status: done === total ? 'done' : (pend && left === 0 ? 'pending' : 'todo'), left: left, done: done, total: total };
  }
  return { render: render, stepState: stepState, el: el };
})();
