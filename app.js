/* Pitch Tracker — a dependency-free PWA for tracking Little League pitch counts.
 * All data lives in localStorage so it persists across sessions on the device. */

(function () {
  'use strict';

  var STORAGE_KEY = 'pitchTracker.v1';

  // Standard Little League (ages 9-12 / Majors) pitch-count rest rules, used as
  // the default. Each rule: throwing at least `minPitches` in an outing requires
  // `restDays` calendar days of rest before pitching again. Editable in the app.
  var DEFAULT_RULES = [
    { minPitches: 1,  restDays: 0 },
    { minPitches: 21, restDays: 1 },
    { minPitches: 36, restDays: 2 },
    { minPitches: 51, restDays: 3 },
    { minPitches: 66, restDays: 4 }
  ];

  // ---- State ----------------------------------------------------------------

  var state = load();
  var activeTab = 'track';

  function defaultState() {
    return {
      players: [],          // { id, name }
      outings: [],          // { id, playerId, date (YYYY-MM-DD), pitches }
      rules: clone(DEFAULT_RULES),
      live: null            // { playerId, count } — in-progress outing
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      var parsed = JSON.parse(raw);
      var s = defaultState();
      if (Array.isArray(parsed.players)) s.players = parsed.players;
      if (Array.isArray(parsed.outings)) s.outings = parsed.outings;
      if (Array.isArray(parsed.rules) && parsed.rules.length) s.rules = parsed.rules;
      if (parsed.live && parsed.live.playerId) s.live = parsed.live;
      return s;
    } catch (e) {
      return defaultState();
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      toast('Could not save — storage full?');
    }
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  // ---- Date helpers (local time) --------------------------------------------

  function todayStr() {
    var d = new Date();
    return ymd(d);
  }
  function ymd(d) {
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }
  function parseYmd(s) {
    var p = s.split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }
  function daysBetween(aStr, bStr) {
    var a = parseYmd(aStr), b = parseYmd(bStr);
    return Math.round((b - a) / 86400000);
  }
  function addDays(dStr, n) {
    var d = parseYmd(dStr);
    d.setDate(d.getDate() + n);
    return ymd(d);
  }
  function prettyDate(s) {
    var d = parseYmd(s);
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }

  // ---- Rules / availability logic -------------------------------------------

  // Rest days required for a given pitch count, per the configured rules.
  function restDaysFor(pitches) {
    var rest = 0;
    var sorted = state.rules.slice().sort(function (a, b) { return a.minPitches - b.minPitches; });
    for (var i = 0; i < sorted.length; i++) {
      if (pitches >= sorted[i].minPitches) rest = sorted[i].restDays;
    }
    return rest;
  }

  // Availability for a player as of `asOf` (YYYY-MM-DD). The most recent outing
  // governs: required rest days are counted as full days after the outing.
  function availability(playerId, asOf) {
    var outings = state.outings
      .filter(function (o) { return o.playerId === playerId; })
      .sort(function (a, b) { return a.date < b.date ? 1 : -1; }); // newest first

    if (!outings.length) return { available: true, lastOuting: null };

    var last = outings[0];
    var rest = restDaysFor(last.pitches);
    var availableOn = addDays(last.date, rest + 1); // first day they may pitch again
    var available = daysBetween(asOf, availableOn) <= 0; // asOf >= availableOn

    return {
      available: available,
      lastOuting: last,
      restDays: rest,
      availableOn: availableOn,
      outings: outings
    };
  }

  function totalPitches(playerId) {
    return state.outings
      .filter(function (o) { return o.playerId === playerId; })
      .reduce(function (sum, o) { return sum + o.pitches; }, 0);
  }

  // ---- Rendering ------------------------------------------------------------

  var viewEl = document.getElementById('view');

  function render() {
    if (activeTab === 'track') viewEl.innerHTML = renderTrack();
    else if (activeTab === 'status') viewEl.innerHTML = renderStatus();
    else if (activeTab === 'roster') viewEl.innerHTML = renderRoster();
    else if (activeTab === 'rules') viewEl.innerHTML = renderRules();

    document.querySelectorAll('.tab').forEach(function (t) {
      t.classList.toggle('active', t.dataset.tab === activeTab);
    });
    wireView();
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function sortedPlayers() {
    return state.players.slice().sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
  }

  // ---- Track view -----------------------------------------------------------

  function renderTrack() {
    if (!state.players.length) {
      return '<div class="card"><div class="empty">No players yet.<br>Add your team on the <strong>Roster</strong> tab to get started.</div></div>';
    }

    var today = todayStr();
    var live = state.live;
    var selectedId = live ? live.playerId : null;
    var count = live ? live.count : 0;

    var chips = sortedPlayers().map(function (p) {
      var av = availability(p.id, today);
      var cls = 'chip' + (p.id === selectedId ? ' selected' : '') + (av.available ? '' : ' resting');
      var dot = '<span class="dot ' + (av.available ? 'ok' : 'rest') + '"></span>';
      return '<button class="' + cls + '" data-pick="' + p.id + '">' + dot + esc(p.name) + '</button>';
    }).join('');

    var counterBlock = '';
    if (selectedId) {
      var player = playerById(selectedId);
      var rest = restDaysFor(count);
      var note = '';
      if (count > 0) {
        if (rest === 0) note = '<div class="rest-note">No rest required at this count</div>';
        else {
          var availOn = prettyDate(addDays(today, rest + 1));
          var cls = rest >= 3 ? 'over' : 'warn';
          note = '<div class="rest-note ' + cls + '">⏸ ' + rest + ' day' + (rest === 1 ? '' : 's') +
                 ' rest → next eligible ' + availOn + '</div>';
        }
      }
      counterBlock =
        '<div class="card">' +
          '<div class="counter">' +
            '<div class="name">' + esc(player ? player.name : '') + '</div>' +
            '<div class="big-num" id="bigNum">' + count + '</div>' +
            '<div class="label">Pitches</div>' +
          '</div>' +
          note +
          '<div class="count-controls">' +
            '<button class="big minus" data-step="-1">–</button>' +
            '<button class="big plus" data-step="1">+</button>' +
          '</div>' +
          '<div class="row mt">' +
            '<button class="btn block" id="saveOuting">Save outing</button>' +
            '<button class="btn secondary" id="cancelLive" style="flex:0 0 auto">Clear</button>' +
          '</div>' +
        '</div>';
    }

    return '' +
      '<div class="card">' +
        '<h2>Select pitcher</h2>' +
        '<div class="pitcher-pick">' + chips + '</div>' +
        '<div class="hint">Tap a player to start counting. <span class="dot ok"></span> available · <span class="dot rest"></span> resting</div>' +
      '</div>' +
      counterBlock;
  }

  // ---- Status view ----------------------------------------------------------

  function renderStatus() {
    if (!state.players.length) {
      return '<div class="card"><div class="empty">No players yet. Add your team on the <strong>Roster</strong> tab.</div></div>';
    }
    var today = todayStr();

    var rows = sortedPlayers().map(function (p) {
      var av = availability(p.id, today);
      var badge, sub;
      if (av.available) {
        badge = '<span class="badge ok">Available</span>';
        sub = av.lastOuting
          ? 'Last: ' + av.lastOuting.pitches + ' pitches · ' + prettyDate(av.lastOuting.date)
          : 'No outings yet';
      } else {
        var daysLeft = daysBetween(today, av.availableOn);
        badge = '<span class="badge rest">Rest ' + daysLeft + 'd</span>';
        sub = 'Threw ' + av.lastOuting.pitches + ' on ' + prettyDate(av.lastOuting.date) +
              ' → eligible ' + prettyDate(av.availableOn);
      }
      return '<li>' +
        '<div class="grow"><div class="name">' + esc(p.name) + '</div><div class="sub">' + sub + '</div></div>' +
        badge +
      '</li>';
    }).join('');

    var recent = state.outings.slice().sort(function (a, b) {
      return a.date < b.date ? 1 : (a.date > b.date ? -1 : 0);
    }).slice(0, 15);

    var history = '';
    if (recent.length) {
      history = '<div class="section-title">Recent outings</div><ul class="list">' +
        recent.map(function (o) {
          var p = playerById(o.playerId);
          return '<li>' +
            '<div class="grow"><div class="name">' + esc(p ? p.name : 'Unknown') + '</div>' +
            '<div class="sub">' + o.pitches + ' pitches · ' + prettyDate(o.date) + '</div></div>' +
            '<button class="icon-btn" data-del-outing="' + o.id + '" title="Delete">🗑</button>' +
          '</li>';
        }).join('') +
      '</ul>';
    }

    return '<div class="section-title">Team availability · ' + prettyDate(today) + '</div>' +
      '<ul class="list">' + rows + '</ul>' + history;
  }

  // ---- Roster view ----------------------------------------------------------

  function renderRoster() {
    var list = sortedPlayers().map(function (p) {
      return '<li>' +
        '<div class="grow"><div class="name">' + esc(p.name) + '</div>' +
        '<div class="sub">' + totalPitches(p.id) + ' total pitches logged</div></div>' +
        '<button class="icon-btn" data-edit="' + p.id + '" title="Rename">✏️</button>' +
        '<button class="icon-btn" data-del-player="' + p.id + '" title="Remove">🗑</button>' +
      '</li>';
    }).join('');

    var listBlock = state.players.length
      ? '<ul class="list">' + list + '</ul>'
      : '<div class="empty">No players yet.</div>';

    return '<div class="card">' +
        '<h2>Add players</h2>' +
        '<label class="field"><span>Name(s) — separate multiple with commas or new lines</span>' +
        '<input type="text" id="newName" placeholder="e.g. Alex, Sam, Jordan" autocomplete="off" /></label>' +
        '<button class="btn block" id="addPlayer">Add to roster</button>' +
      '</div>' +
      '<div class="section-title">Team (' + state.players.length + ')</div>' +
      listBlock;
  }

  // ---- Rules view -----------------------------------------------------------

  function renderRules() {
    var sorted = state.rules.slice().sort(function (a, b) { return a.minPitches - b.minPitches; });
    var rows = sorted.map(function (r, i) {
      return '<div class="rule-row" data-rule="' + i + '">' +
        '<span class="unit">≥</span>' +
        '<input type="number" inputmode="numeric" min="1" value="' + r.minPitches + '" data-field="minPitches" />' +
        '<span class="unit">pitches →</span>' +
        '<input type="number" inputmode="numeric" min="0" value="' + r.restDays + '" data-field="restDays" />' +
        '<span class="unit">days rest</span>' +
        '<button class="icon-btn" data-del-rule="' + i + '" title="Remove">🗑</button>' +
      '</div>';
    }).join('');

    return '<div class="card">' +
        '<h2>Rest rules</h2>' +
        '<div class="hint">A pitcher who throws at least the listed number of pitches in an outing must rest that many calendar days before pitching again. The highest threshold met applies.</div>' +
        rows +
        '<div class="row mt">' +
          '<button class="btn secondary" id="addRule">+ Add rule</button>' +
          '<button class="btn secondary" id="resetRules">Little League defaults</button>' +
        '</div>' +
      '</div>' +
      '<div class="card">' +
        '<h2>Data</h2>' +
        '<div class="hint">Everything is stored on this device only.</div>' +
        '<button class="btn danger block" id="clearAll">Erase all data</button>' +
      '</div>';
  }

  // ---- Event wiring ---------------------------------------------------------

  function playerById(id) {
    for (var i = 0; i < state.players.length; i++) if (state.players[i].id === id) return state.players[i];
    return null;
  }

  function wireView() {
    // Track: pick pitcher
    viewEl.querySelectorAll('[data-pick]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.dataset.pick;
        if (state.live && state.live.playerId === id) return; // already selected
        // Preserve in-progress count only if switching to same player; otherwise reset
        state.live = { playerId: id, count: 0 };
        save();
        render();
      });
    });

    // Track: +/- stepper
    viewEl.querySelectorAll('[data-step]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!state.live) return;
        var step = Number(btn.dataset.step);
        state.live.count = Math.max(0, state.live.count + step);
        save();
        render(); // re-render to refresh the count and the rest-day note
      });
    });

    var saveBtn = document.getElementById('saveOuting');
    if (saveBtn) saveBtn.addEventListener('click', function () {
      if (!state.live) return;
      if (state.live.count <= 0) { toast('Count is 0 — nothing to save'); return; }
      var p = playerById(state.live.playerId);
      state.outings.push({
        id: uid(),
        playerId: state.live.playerId,
        date: todayStr(),
        pitches: state.live.count
      });
      var n = state.live.count;
      state.live = null;
      save();
      render();
      toast('Saved ' + n + ' pitches for ' + (p ? p.name : 'player'));
    });

    var cancelBtn = document.getElementById('cancelLive');
    if (cancelBtn) cancelBtn.addEventListener('click', function () {
      state.live = null;
      save();
      render();
    });

    // Roster: add player(s)
    var addBtn = document.getElementById('addPlayer');
    if (addBtn) {
      var input = document.getElementById('newName');
      var doAdd = function () {
        var raw = (input.value || '').trim();
        if (!raw) return;
        var names = raw.split(/[,\n]/).map(function (s) { return s.trim(); }).filter(Boolean);
        var added = 0;
        names.forEach(function (name) {
          var exists = state.players.some(function (p) { return p.name.toLowerCase() === name.toLowerCase(); });
          if (!exists) { state.players.push({ id: uid(), name: name }); added++; }
        });
        save();
        render();
        if (added) toast('Added ' + added + ' player' + (added === 1 ? '' : 's'));
      };
      addBtn.addEventListener('click', doAdd);
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') doAdd(); });
    }

    // Roster: edit / delete
    viewEl.querySelectorAll('[data-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var p = playerById(btn.dataset.edit);
        if (!p) return;
        var name = prompt('Rename player', p.name);
        if (name && name.trim()) { p.name = name.trim(); save(); render(); }
      });
    });
    viewEl.querySelectorAll('[data-del-player]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var p = playerById(btn.dataset.delPlayer);
        if (!p) return;
        if (!confirm('Remove ' + p.name + ' and their pitch history?')) return;
        state.players = state.players.filter(function (x) { return x.id !== p.id; });
        state.outings = state.outings.filter(function (o) { return o.playerId !== p.id; });
        if (state.live && state.live.playerId === p.id) state.live = null;
        save();
        render();
      });
    });

    // Status: delete outing
    viewEl.querySelectorAll('[data-del-outing]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.dataset.delOuting;
        if (!confirm('Delete this outing?')) return;
        state.outings = state.outings.filter(function (o) { return o.id !== id; });
        save();
        render();
      });
    });

    // Rules: edit fields
    viewEl.querySelectorAll('.rule-row').forEach(function (rowEl) {
      var idx = Number(rowEl.dataset.rule);
      var sorted = state.rules.slice().sort(function (a, b) { return a.minPitches - b.minPitches; });
      rowEl.querySelectorAll('input').forEach(function (inp) {
        inp.addEventListener('change', function () {
          var field = inp.dataset.field;
          var val = Math.max(field === 'minPitches' ? 1 : 0, parseInt(inp.value, 10) || 0);
          // Map sorted index back to the actual rule object
          var target = sorted[idx];
          var real = state.rules.indexOf(target);
          if (real >= 0) { state.rules[real][field] = val; save(); render(); }
        });
      });
    });
    viewEl.querySelectorAll('[data-del-rule]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = Number(btn.dataset.delRule);
        var sorted = state.rules.slice().sort(function (a, b) { return a.minPitches - b.minPitches; });
        var target = sorted[idx];
        state.rules = state.rules.filter(function (r) { return r !== target; });
        save();
        render();
      });
    });

    var addRule = document.getElementById('addRule');
    if (addRule) addRule.addEventListener('click', function () {
      var maxMin = state.rules.reduce(function (m, r) { return Math.max(m, r.minPitches); }, 0);
      state.rules.push({ minPitches: maxMin + 15, restDays: 1 });
      save();
      render();
    });

    var resetRules = document.getElementById('resetRules');
    if (resetRules) resetRules.addEventListener('click', function () {
      if (!confirm('Reset rules to Little League (Majors) defaults?')) return;
      state.rules = clone(DEFAULT_RULES);
      save();
      render();
    });

    var clearAll = document.getElementById('clearAll');
    if (clearAll) clearAll.addEventListener('click', function () {
      if (!confirm('Erase ALL players, outings and rules? This cannot be undone.')) return;
      state = defaultState();
      save();
      render();
      toast('All data erased');
    });
  }

  // ---- Toast ----------------------------------------------------------------

  var toastEl = null, toastTimer = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1800);
  }

  // ---- Tabs + boot ----------------------------------------------------------

  document.getElementById('tabbar').addEventListener('click', function (e) {
    var btn = e.target.closest('.tab');
    if (!btn) return;
    activeTab = btn.dataset.tab;
    render();
  });

  render();

  // Register service worker for offline / installable use.
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* offline support optional */ });
    });
  }
})();
