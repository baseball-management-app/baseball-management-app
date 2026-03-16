(function () {
  const data = {
    currentUser: { name: '', role: '', team: '' },
    players: [],
    games: [],
    notifications: [],
    monthlyTrend: [],
    velocityTrend: [],
    ...(window.AppData || {}),
  };
  const analysis = window.Analysis;

  function qs(id) { return document.getElementById(id); }
  function fmt3(n) { return Number(n || 0).toFixed(3); }

  function setupNav() {
    const page = document.body.dataset.page;
    document.querySelectorAll('.bottom-nav a').forEach((a) => {
      if (a.dataset.page === page) a.classList.add('active');
    });
  }

  function bindLogin() {
    const loginForm = qs('loginForm');
    if (!loginForm) return;

    const registerForm = qs('registerForm');
    const authMessage = qs('authMessage');
    const tabs = document.querySelectorAll('[data-auth-tab]');
    const panels = document.querySelectorAll('[data-auth-panel]');

    function switchAuthTab(name) {
      tabs.forEach((tab) => {
        const active = tab.dataset.authTab === name;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      panels.forEach((panel) => {
        panel.hidden = panel.dataset.authPanel !== name;
      });
      if (authMessage) authMessage.textContent = '';
    }

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => switchAuthTab(tab.dataset.authTab));
    });

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(loginForm);
      const email = String(fd.get('email') || '').trim().toLowerCase();
      const password = String(fd.get('password') || '');

      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password }),
        });
        const result = await res.json();

        if (!res.ok) {
          if (authMessage) authMessage.textContent = result.message || 'ログインに失敗しました。';
          return;
        }

        if (authMessage) authMessage.textContent = result.message || 'ログインに成功しました。';
        window.location.href = 'index.html';
      } catch (error) {
        console.error(error);
        if (authMessage) authMessage.textContent = 'サーバー通信に失敗しました。';
      }
    });

    if (registerForm) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(registerForm);
        const name = String(fd.get('name') || '').trim();
        const email = String(fd.get('email') || '').trim().toLowerCase();
        const password = String(fd.get('password') || '');
        const passwordConfirm = String(fd.get('passwordConfirm') || '');

        if (password !== passwordConfirm) {
          if (authMessage) authMessage.textContent = '確認用パスワードが一致しません。';
          return;
        }

        try {
          const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name, email, password }),
          });
          const result = await res.json();

          if (!res.ok) {
            if (authMessage) authMessage.textContent = result.message || '新規登録に失敗しました。';
            return;
          }

          registerForm.reset();
          if (authMessage) authMessage.textContent = result.message || '新規登録が完了しました。';
          window.location.href = 'index.html';
        } catch (error) {
          console.error(error);
          if (authMessage) authMessage.textContent = 'サーバー通信に失敗しました。';
        }
      });
    }
  }

  function renderHome() {
    const homeRoot = qs('homeRoot');
    if (!homeRoot) return;

    const recentGame = qs('recentGame');
    const notificationsRoot = qs('notifications');
    const personalStatsRoot = qs('personalStats');
    const teamStatsRoot = qs('teamStats');

    const recent = data.games[0];
    if (recentGame) {
      recentGame.textContent = recent
        ? `${recent.date} vs ${recent.opponent} (${recent.score})`
        : '試合データがまだありません';
    }

    if (notificationsRoot) {
      notificationsRoot.innerHTML = data.notifications.length
        ? data.notifications.map((n) => `<li>${n}</li>`).join('')
        : '<li>通知データがまだありません</li>';
    }

    if (!data.players.length) {
      if (personalStatsRoot) personalStatsRoot.innerHTML = '<div class="small">個人成績データがまだありません</div>';
      if (teamStatsRoot) teamStatsRoot.innerHTML = '<div class="small">チーム成績データがまだありません</div>';
      return;
    }

    const b = analysis.batting(data.players[0].batting || {});
    if (personalStatsRoot) {
      personalStatsRoot.innerHTML = statCards([
        ['打率', fmt3(b.avg)], ['出塁率', fmt3(b.obp)], ['長打率', fmt3(b.slg)], ['OPS', fmt3(b.ops)],
      ]);
    }

    const t = analysis.team(data.players);
    if (teamStatsRoot) {
      teamStatsRoot.innerHTML = statCards([
        ['チーム打率', fmt3(t.avg)], ['チームOPS', fmt3(t.ops)], ['チーム防御率', fmt3(t.era)], ['奪三振率', fmt3(t.kRate)],
      ]);
    }

    const conditionBtn = qs('goCondition');
    if (conditionBtn) {
      conditionBtn.addEventListener('click', () => { window.location.href = 'condition.html'; });
    }
  }

  function statCards(items) {
    return `<div class="grid">${items.map((s) => `<div class="stat-card"><div class="stat-label">${s[0]}</div><div class="stat-value">${s[1]}</div></div>`).join('')}</div>`;
  }

  function renderPlayers() {
    const root = qs('playersList');
    if (!root) return;
    const search = qs('playerSearch');

    function draw() {
      const keyword = (search.value || '').trim();
      const list = data.players.filter((p) => p.name.includes(keyword) || String(p.number).includes(keyword) || p.pos.includes(keyword));
      root.innerHTML = list.map((p) => `
        <button class="list-item button-ghost player-item" data-id="${p.id}">
          <div><strong>${p.name}</strong> <span class="tag">#${p.number}</span></div>
          <div class="meta">${p.pos} / ${p.throwsBats}</div>
        </button>`).join('');
      root.querySelectorAll('.player-item').forEach((btn) => {
        btn.addEventListener('click', () => {
          localStorage.setItem('selectedPlayerId', btn.dataset.id);
          window.location.href = 'player-detail.html';
        });
      });
    }

    search.addEventListener('input', draw);
    draw();
  }

  function renderPlayerDetail() {
    if (!qs('playerDetailRoot')) return;
    if (!data.players.length) {
      qs('playerName').textContent = '選手データがまだありません';
      qs('playerMeta').textContent = '選手データがまだありません';
      qs('playerBatting').innerHTML = '<div class="small">打者データがまだありません</div>';
      qs('playerPitching').innerHTML = '<div class="small">投手データがまだありません</div>';
      qs('playerConditions').innerHTML = '<div class="small">コンディションデータがまだありません</div>';
      return;
    }

    const selected = Number(localStorage.getItem('selectedPlayerId')) || data.players[0].id;
    const player = data.players.find((p) => p.id === selected) || data.players[0];
    qs('playerName').textContent = `${player.name} #${player.number}`;
    qs('playerMeta').textContent = `${player.pos} / ${player.throwsBats} / ${player.age}歳`;

    const tabs = document.querySelectorAll('[data-tab-btn]');
    const sections = document.querySelectorAll('[data-tab]');
    function activate(name) {
      tabs.forEach((t) => t.classList.toggle('active', t.dataset.tabBtn === name));
      sections.forEach((s) => s.style.display = s.dataset.tab === name ? 'block' : 'none');
    }

    const b = analysis.batting(player.batting || {});
    qs('playerBatting').innerHTML = statCards([
      ['打率', fmt3(b.avg)], ['出塁率', fmt3(b.obp)], ['長打率', fmt3(b.slg)], ['OPS', fmt3(b.ops)], ['安打', player.batting.hits], ['打点', player.batting.rbi]
    ]);
    const p = analysis.pitching(player.pitching || {});
    qs('playerPitching').innerHTML = statCards([
      ['防御率', fmt3(p.era)], ['WHIP', fmt3(p.whip)], ['奪三振', player.pitching.so || 0], ['被安打', player.pitching.h || 0]
    ]);
    qs('playerConditions').innerHTML = (player.conditions || []).length
      ? player.conditions.map((c) => `<div class="list-item">${c.date} / 疲労:${c.fatigue} / 体調:${c.health} / 体重:${c.weight}kg</div>`).join('')
      : '<div class="small">コンディションデータがまだありません</div>';

    tabs.forEach((t) => t.addEventListener('click', () => activate(t.dataset.tabBtn)));
    activate('batting');
  }

  function renderGames() {
    const root = qs('gamesList');
    if (!root) return;
    if (!data.games.length) {
      root.innerHTML = '<div class="card"><div class="small">試合データがまだありません</div></div>';
      return;
    }

    root.innerHTML = data.games.map((g) => `
      <button class="list-item button-ghost game-item" data-id="${g.id}">
        <div><strong>${g.date}</strong> vs ${g.opponent}</div>
        <div class="meta">${g.type} / <span class="${g.result === '勝ち' ? 'result-win' : 'result-loss'}">${g.result}</span> / ${g.score}</div>
      </button>
    `).join('');
    root.querySelectorAll('.game-item').forEach((b) => b.addEventListener('click', () => {
      localStorage.setItem('selectedGameId', b.dataset.id);
      window.location.href = 'game-detail.html';
    }));
  }

  function renderGameDetail() {
    if (!qs('gameDetailRoot')) return;
    if (!data.games.length) {
      qs('gameInfo').textContent = '試合データがまだありません';
      qs('battingRecords').innerHTML = '<div class="small">打席データがまだありません</div>';
      qs('pitchingRecords').innerHTML = '<div class="small">投球データがまだありません</div>';
      return;
    }

    const selected = Number(localStorage.getItem('selectedGameId')) || data.games[0].id;
    const game = data.games.find((g) => g.id === selected) || data.games[0];
    qs('gameInfo').textContent = `${game.date} ${game.type} vs ${game.opponent} (${game.result} ${game.score})`;
    qs('battingRecords').innerHTML = (game.battingRecords || []).length ? game.battingRecords.map((r) => `<div class="list-item">${r.batter} / ${r.result} / ${r.pitchType} / ${r.direction}</div>`).join('') : '<div class="small">打席データがまだありません</div>';
    qs('pitchingRecords').innerHTML = (game.pitchingRecords || []).length ? game.pitchingRecords.map((r) => `<div class="list-item">${r.pitcher} ${r.inning}回 / ${r.pitches}球 / 失点${r.r}</div>`).join('') : '<div class="small">投球データがまだありません</div>';
    const goBattingInput = qs('goBattingInput');
    if (goBattingInput) goBattingInput.addEventListener('click', () => window.location.href = 'batting-input.html');
    const goPitchingInput = qs('goPitchingInput');
    if (goPitchingInput) goPitchingInput.addEventListener('click', () => window.location.href = 'pitching-input.html');
  }

  function bindSelectChips() {
    document.querySelectorAll('.segmented').forEach((seg) => {
      seg.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        seg.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        const target = seg.dataset.target;
        if (target) qs(target).value = chip.dataset.value || chip.textContent.trim();
      });
    });
  }

  function saveLocal(formId, key, msgId) {
    const form = qs(formId);
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const obj = Object.fromEntries(fd.entries());
      const saved = JSON.parse(localStorage.getItem(key) || '[]');
      saved.push({ ...obj, savedAt: new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(saved));
      qs(msgId).textContent = '仮保存しました（localStorage）';
      form.reset();
      form.querySelectorAll('.chip.active').forEach((c) => c.classList.remove('active'));
    });
  }

  function fillSelect(id, values) {
    const sel = qs(id);
    if (!sel) return;
    sel.innerHTML = values.map((v) => `<option value="${v}">${v}</option>`).join('');
  }

  function renderInputs() {
    fillSelect('batterSelect', data.players.map((p) => p.name));
    fillSelect('pitcherSelect', data.players.filter((p) => p.pos.includes('投手')).map((p) => p.name));
    bindSelectChips();
    saveLocal('battingForm', 'battingInputs', 'battingMessage');
    saveLocal('pitchingForm', 'pitchingInputs', 'pitchingMessage');
    saveLocal('conditionForm', 'conditionInputs', 'conditionMessage');
  }

  function renderBatterAnalysis() {
    if (!qs('batterAnalysisRoot')) return;
    if (!data.players.length || !data.players[0].batting) {
      qs('batterStats').innerHTML = '<div class="small">打者データがまだありません</div>';
      qs('batterTrend').innerHTML = '<div class="small">打者推移データがまだありません</div>';
      return;
    }

    const b = analysis.batting(data.players[0].batting);
    const s = data.players[0].batting;
    qs('batterStats').innerHTML = statCards([
      ['打率', fmt3(b.avg)], ['出塁率', fmt3(b.obp)], ['長打率', fmt3(b.slg)], ['OPS', fmt3(b.ops)],
      ['打席', s.pa], ['打数', s.ab], ['安打', s.hits], ['二塁打', s.doubles], ['三塁打', s.triples], ['本塁打', s.hr], ['打点', s.rbi], ['三振', s.so], ['四球', s.bb], ['死球', s.hbp], ['犠打', s.sh], ['犠飛', s.sf]
    ]);
    qs('batterTrend').innerHTML = data.monthlyTrend.length
      ? trendTable(data.monthlyTrend, ['month', 'avg', 'obp', 'slg'])
      : '<div class="small">打者推移データがまだありません</div>';
  }

  function renderPitcherAnalysis() {
    if (!qs('pitcherAnalysisRoot')) return;
    if (!data.players.length) {
      qs('pitcherStats').innerHTML = '<div class="small">投手データがまだありません</div>';
      qs('velocityTrend').innerHTML = '<div class="small">球速推移データがまだありません</div>';
      return;
    }

    const pitcher = data.players.find((p) => p.pitching && (p.pos || '').includes('投手')) || data.players[0];
    const pRaw = pitcher.pitching || {};
    const p = analysis.pitching(pRaw);
    qs('pitcherStats').innerHTML = statCards([
      ['防御率', fmt3(p.era)], ['勝数', 4], ['敗数', 2], ['投球回', pRaw.ip], ['奪三振', pRaw.so], ['四球', pRaw.bb], ['被安打', pRaw.h], ['被本塁打', pRaw.hr], ['失点', pRaw.runs], ['自責点', pRaw.er], ['WHIP', fmt3(p.whip)], ['1試合平均投球数', pRaw.pitchesAvg]
    ]);
    qs('velocityTrend').innerHTML = data.velocityTrend.length
      ? trendTable(data.velocityTrend, ['game', 'max', 'avg'])
      : '<div class="small">球速推移データがまだありません</div>';
  }

  function renderTeamAnalysis() {
    if (!qs('teamAnalysisRoot')) return;
    if (!data.players.length) {
      qs('teamAnalysisStats').innerHTML = '<div class="small">チーム成績データがまだありません</div>';
      return;
    }

    const t = analysis.team(data.players);
    qs('teamAnalysisStats').innerHTML = statCards([
      ['チーム打率', fmt3(t.avg)], ['チーム出塁率', fmt3(t.obp)], ['チーム長打率', fmt3(t.slg)], ['チームOPS', fmt3(t.ops)], ['総得点', t.totalRuns], ['三振率', fmt3(t.soRate)], ['四球率', fmt3(t.bbRate)], ['チーム防御率', fmt3(t.era)], ['総失点', t.totalRuns], ['総自責点', t.totalEr], ['奪三振率', fmt3(t.kRate)], ['被安打率', fmt3(t.hRate)]
    ]);
  }

  function trendTable(rows, keys) {
    return `<div class="table-wrap"><table class="table"><thead><tr>${keys.map((k) => `<th>${k}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${keys.map((k) => `<td>${r[k]}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  function renderSettings() {
    if (!qs('settingsRoot')) return;
    qs('profileName').textContent = data.currentUser.name;
    qs('profileRole').textContent = data.currentUser.role;
    qs('profileTeam').textContent = data.currentUser.team;
    const logoutBtn = qs('logoutBtn');
    if (!logoutBtn) return;
    logoutBtn.addEventListener('click', async () => {
      try {
        await fetch('/api/logout', { method: 'POST', credentials: 'include' });
      } catch (error) {
        console.error(error);
      }
      window.location.href = 'login.html';
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupNav();
    bindLogin();
    renderHome();
    renderPlayers();
    renderPlayerDetail();
    renderGames();
    renderGameDetail();
    renderInputs();
    renderBatterAnalysis();
    renderPitcherAnalysis();
    renderTeamAnalysis();
    renderSettings();
  });
})();
