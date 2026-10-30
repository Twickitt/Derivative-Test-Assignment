/**
 * Интерфейс тренажёра: экраны, сессии, обратная связь, диагностика.
 */
(function (global) {
  'use strict';

  var M = global.M, TASKS = global.TASKS, PROGRESS = global.PROGRESS;
  var RULES = TASKS.RULES, SECTIONS = TASKS.SECTIONS;
  var PRIME = '′';
  var KEYS = ['1', '2', '3', '4'];
  var MARATHON_LEN = 10;

  function $(id) { return document.getElementById(id); }

  var S = {
    mode: null,            // 'practice' | 'marathon' | 'mistakes'
    filter: null,          // {section} | {rule} | null
    label: '',
    queue: [],             // очередь заданий в работе над ошибками
    total: 0,
    task: null,
    answered: false,
    picked: null,
    hinted: false,
    streak: 0,
    lastTpl: null,
    sess: null             // {n, ok, hinted, rules:{id:{n,ok}}, startedAt}
  };

  // ======================= экраны =======================

  var SCREENS = ['home', 'task', 'result', 'ref'];

  function show(name) {
    SCREENS.forEach(function (k) { $('screen-' + k).hidden = (k !== name); });
    if (name === 'home') renderHome();
    if (name === 'ref') renderRef();
    global.scrollTo(0, 0);
  }

  // ======================= главная =======================

  function pct(ok, n) { return n ? Math.round(100 * ok / n) : 0; }

  /** Сколько подсказок в среднем приходится на 10 заданий. */
  function perTen(part, total) {
    if (!total) return '0';
    var v = Math.round(part * 100 / total) / 10;
    return String(v).replace('.', ',');
  }

  function renderHome() {
    var p = PROGRESS.load();

    // карточки разделов
    var html = '';
    SECTIONS.forEach(function (s) {
      var st = p.bySection[s.id];
      var acc = st && st.n >= 3 ? pct(st.ok, st.n) + '% верно' : '';
      html += '<button class="card-btn" type="button" data-section="' + s.id + '">' +
        '<span class="card-top">' +
        '<span class="card-title">' + s.title + '</span>' +
        '<span class="tag' + (s.level === 'ЕГЭ' ? ' tag-ege' : '') + '">' + s.level + '</span>' +
        (acc ? '<span class="card-acc">' + acc + '</span>' : '') +
        '</span>' +
        '<span class="card-hint">' + s.hint + '</span>' +
        '</button>';
    });
    $('sectionCards').innerHTML = html;
    renderMistakesCard();

    // прогресс
    var block = $('progressBlock');
    if (!p.total) { block.hidden = true; return; }
    block.hidden = false;

    $('statRow').innerHTML =
      stat(p.total, 'заданий решено') +
      stat(pct(p.correct, p.total) + '%', 'верных ответов') +
      stat(p.bestStreak, 'лучшая серия') +
      // Среднее показываем, когда накопилась осмысленная выборка:
      // на двух-трёх заданиях оно скачет от 0 до 10.
      (p.total >= 10
        ? stat(perTen(p.hints, p.total), 'взято подсказок на 10 заданий')
        : stat(p.hints, 'взято подсказок'));

    var weak = PROGRESS.weakRules(p);
    var out = '';
    if (weak.length) {
      var w = weak[0];
      out += '<p class="weak-note">' +
        '<span>Наибольшее число ошибок: <strong>' + RULES[w.id].name + '</strong>. ' +
        'Верно ' + w.ok + ' из ' + w.n + '.</span>' +
        '<button class="btn btn-primary btn-sm" type="button" data-rule="' + w.id + '">Отработать правило</button>' +
        '</p>';
    }

    var ids = Object.keys(p.byRule).filter(function (id) { return RULES[id]; });
    ids.sort(function (a, b) {
      return (p.byRule[a].ok / p.byRule[a].n) - (p.byRule[b].ok / p.byRule[b].n);
    });
    if (ids.length) {
      out += '<h3>По правилам</h3><div class="bars">';
      ids.forEach(function (id) {
        var r = p.byRule[id];
        var acc = pct(r.ok, r.n);
        var weakCls = (r.n >= 3 && acc < 75) ? ' is-weak' : '';
        out += '<div class="bar-row">' +
          '<span class="bar-label">' + RULES[id].name + '</span>' +
          '<span class="bar-track"><span class="bar-fill' + weakCls + '" style="width:' + Math.max(acc, 3) + '%"></span></span>' +
          '<span class="bar-val">' + r.ok + '/' + r.n + '</span>' +
          '</div>';
      });
      out += '</div>';
    }
    $('weakBlock').innerHTML = out;
  }

  function stat(value, label) {
    return '<div class="stat"><b>' + value + '</b><span>' + label + '</span></div>';
  }

  function plural(n, one, few, many) {
    var a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b > 1 && b < 5) return few;
    if (b === 1) return one;
    return many;
  }

  /** Карточка «Работа над ошибками» — только когда ошибки есть. */
  function renderMistakesCard() {
    var n = PROGRESS.mistakeCount();
    var box = $('mistakesCard');
    if (!n) { box.innerHTML = ''; return; }
    box.innerHTML =
      '<button class="card-btn card-mistakes" type="button" id="startMistakes">' +
      '<span class="card-top">' +
      '<span class="card-title">Работа над ошибками</span>' +
      '<span class="tag tag-mistakes">' + n + ' ' + plural(n, 'задание', 'задания', 'заданий') + '</span>' +
      '</span>' +
      '<span class="card-hint">Задания с неверным ответом возвращаются с теми же числами. Решённое верно уходит из списка.</span>' +
      '</button>';
  }

  // ======================= справочник =======================

  function renderRef() {
    var order = ['konst', 'power', 'sum', 'product', 'quotient', 'chain', 'trig', 'expo', 'log', 'root', 'apply'];
    $('refList').innerHTML = order.map(function (id) {
      var r = RULES[id];
      // В подсказке во время решения показывается только основная формула,
      // в справочнике — вместе с частными случаями.
      var lines = [r.formula].concat(r.more || []).map(function (line) {
        return '<div class="ref-line">' + line + '</div>';
      }).join('');
      return '<div class="ref-item"><h3>' + r.name + '</h3>' +
        '<div class="ref-formula">' + lines + '</div></div>';
    }).join('');
  }

  // ======================= сессия =======================

  function newSession() {
    return { n: 0, ok: 0, hinted: 0, rules: {}, startedAt: Date.now() };
  }

  function startPractice(filter, label) {
    S.mode = 'practice';
    S.filter = filter || null;
    S.label = label || 'Тренировка';
    S.sess = newSession();
    S.streak = 0;
    S.lastTpl = null;
    show('task');
    nextTask();
  }

  function startMarathon() {
    S.mode = 'marathon';
    S.filter = null;
    S.label = 'Марафон';
    S.sess = newSession();
    S.streak = 0;
    S.lastTpl = null;
    show('task');
    nextTask();
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function startMistakes() {
    var list = PROGRESS.mistakes();
    if (!list.length) { show('home'); return; }
    // Варианты перемешиваем заново, чтобы не запоминалась позиция ответа
    S.queue = shuffle(list).map(function (t) {
      if (t.options) t.options = shuffle(t.options);
      return t;
    });
    S.mode = 'mistakes';
    S.filter = null;
    S.label = 'Работа над ошибками';
    S.total = S.queue.length;
    S.sess = newSession();
    S.streak = 0;
    S.lastTpl = null;
    show('task');
    nextTask();
  }

  function nextTask() {
    if (S.mode === 'mistakes') {
      if (!S.queue.length) { finish(); return; }
      S.task = S.queue.shift();
    } else {
      S.task = TASKS.newTask(S.filter, S.lastTpl);
      S.lastTpl = S.task.tplId;
    }
    S.answered = false;
    S.picked = null;
    S.hinted = false;
    renderTask();
  }

  // ======================= задание =======================

  function renderTask() {
    var t = S.task;

    $('taskMode').textContent = S.label;
    if (S.mode === 'marathon' || S.mode === 'mistakes') {
      var len = S.mode === 'marathon' ? MARATHON_LEN : S.total;
      $('taskCounter').textContent = 'Задание ' + (S.sess.n + 1) + ' из ' + len;
      $('progressFill').parentElement.hidden = false;
      $('progressFill').style.width = (100 * S.sess.n / len) + '%';
    } else {
      $('taskCounter').textContent = S.sess.n
        ? 'Верно: ' + S.sess.ok + ' из ' + S.sess.n
        : 'Количество заданий не ограничено';
      $('progressFill').parentElement.hidden = true;
    }

    $('taskPrompt').textContent = t.prompt;
    if (t.graph) {
      $('taskFormula').innerHTML = t.graph;
      $('taskFormula').removeAttribute('aria-label');
    } else {
      $('taskFormula').innerHTML = t.fxLabel + ' = ' + t.fxHtml;
      $('taskFormula').setAttribute('aria-label', 'Функция: ' + t.fxPlain);
    }

    $('hintArea').innerHTML = '';
    $('hintBtn').hidden = false;
    var fb = $('feedback');
    fb.hidden = true;
    fb.innerHTML = '';

    if (t.kind === 'choice') {
      var html = '<div class="options" role="group" aria-label="Варианты ответа">';
      t.options.forEach(function (o, i) {
        html += '<button class="opt" type="button" data-i="' + i + '" ' +
          'aria-label="Вариант ' + KEYS[i] + ': ' + M.plain(o.e) + '">' +
          '<span class="opt-key" aria-hidden="true">' + KEYS[i] + '</span>' +
          '<span class="opt-math">' + M.html(o.e) + '</span>' +
          '</button>';
      });
      html += '</div>';
      $('answerArea').innerHTML = html;
      setAction('Проверить', true);
    } else {
      $('answerArea').innerHTML =
        '<div class="num-form">' +
        '<input class="num-input" id="numInput" type="text" inputmode="decimal" autocomplete="off" ' +
        'spellcheck="false" placeholder="?" aria-label="Ваш ответ">' +
        '<button class="btn btn-outline" type="button" id="signBtn" aria-label="Изменить знак ответа">±</button>' +
        '<p class="num-hint">' + S.task.answerHint + '. Десятичная часть отделяется запятой или точкой.</p>' +
        '</div>';
      setAction('Проверить', false);
      var inp = $('numInput');
      inp.addEventListener('input', function () {
        $('actionBtn').disabled = !inp.value.trim();
        inp.classList.remove('is-wrong');
        if ($('hintArea').querySelector('[data-validation]')) $('hintArea').innerHTML = '';
      });
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); onAction(); }
      });
      $('signBtn').addEventListener('click', function () {
        var v = inp.value.trim();
        inp.value = v.charAt(0) === '-' ? v.slice(1) : '-' + v;
        $('actionBtn').disabled = !inp.value.trim();
        inp.focus();
      });
      $('actionBtn').disabled = true;
      if (!isTouch()) inp.focus();
    }
  }

  function setAction(text, disabled) {
    var b = $('actionBtn');
    b.textContent = text;
    b.disabled = !!disabled;
  }

  function isTouch() {
    return global.matchMedia && global.matchMedia('(hover: none)').matches;
  }

  function pickOption(i) {
    if (S.answered) return;
    S.picked = i;
    var opts = $('answerArea').querySelectorAll('.opt');
    for (var k = 0; k < opts.length; k++) {
      opts[k].classList.toggle('is-picked', k === i);
      opts[k].setAttribute('aria-pressed', k === i ? 'true' : 'false');
    }
    setAction('Проверить', false);
  }

  function showHint() {
    var area = $('hintArea');
    if (area.innerHTML) { area.innerHTML = ''; return; }
    S.hinted = true;
    var rows = S.task.rules.filter(function (id) { return RULES[id]; }).map(function (id) {
      return '<div class="hint-rule"><b>' + RULES[id].name + '</b>' +
        '<span class="hint-formula">' + RULES[id].formula + '</span></div>';
    }).join('');
    area.innerHTML = '<div class="hint-card"><h4>Применяемые правила</h4>' + rows + '</div>';
  }

  // ======================= проверка =======================

  function parseNumber(raw) {
    var s = String(raw).trim()
      .replace(/\s+/g, '')
      .replace(/,/g, '.')
      .replace(/[−–—]/g, '-');
    if (!/^[-+]?\d*\.?\d+$/.test(s)) return NaN;
    return parseFloat(s);
  }

  function onAction() {
    if (!S.answered) { check(); return; }
    if (S.mode === 'marathon' && S.sess.n >= MARATHON_LEN) { finish(); return; }
    if (S.mode === 'mistakes' && !S.queue.length) { finish(); return; }
    nextTask();
  }

  function check() {
    var t = S.task, ok, mistake = null, given = null;

    if (t.kind === 'choice') {
      if (S.picked === null) return;
      var opt = t.options[S.picked];
      ok = !!opt.correct;
      if (!ok) mistake = opt.why;
      given = M.html(opt.e);
    } else {
      var inp = $('numInput');
      var v = parseNumber(inp.value);
      if (isNaN(v)) {
        inp.classList.add('is-wrong');
        inp.focus();
        $('hintArea').innerHTML = '<div class="hint-card" data-validation><h4>Некорректная запись</h4>' +
          '<div class="hint-rule">Введите число, например 12 или −3.</div></div>';
        return;
      }
      ok = Math.abs(v - t.answerNum) < 1e-6;
      given = M.fmtNum(v);
      inp.disabled = true;
      inp.classList.remove('is-wrong');
      inp.classList.add(ok ? 'is-correct' : 'is-wrong');
      var sb = $('signBtn'); if (sb) sb.disabled = true;
    }

    S.answered = true;
    S.streak = ok ? S.streak + 1 : 0;
    S.sess.n += 1;
    if (ok) S.sess.ok += 1;
    if (S.hinted) S.sess.hinted += 1;
    t.rules.forEach(function (id) {
      if (!S.sess.rules[id]) S.sess.rules[id] = { n: 0, ok: 0 };
      S.sess.rules[id].n += 1;
      if (ok) S.sess.rules[id].ok += 1;
    });
    PROGRESS.record(t, ok, S.streak, S.hinted);
    if (ok) PROGRESS.clearMistake(t);
    else PROGRESS.addMistake(t);

    if (t.kind === 'choice') lockOptions();
    renderFeedback(ok, mistake, given);

    if (S.mode === 'marathon' || S.mode === 'mistakes') {
      var len = S.mode === 'marathon' ? MARATHON_LEN : S.total;
      var last = S.mode === 'marathon' ? S.sess.n >= MARATHON_LEN : !S.queue.length;
      $('progressFill').style.width = (100 * S.sess.n / len) + '%';
      $('taskCounter').textContent = 'Задание ' + S.sess.n + ' из ' + len;
      setAction(last ? 'Посмотреть итоги' : 'Следующее задание', false);
    } else {
      $('taskCounter').textContent = 'Верно: ' + S.sess.ok + ' из ' + S.sess.n;
      setAction('Следующее задание', false);
    }
  }

  function lockOptions() {
    var opts = $('answerArea').querySelectorAll('.opt');
    for (var i = 0; i < opts.length; i++) {
      var o = opts[i];
      o.disabled = true;
      o.classList.remove('is-picked');
      var isCorrect = S.task.options[i].correct;
      if (isCorrect) { o.classList.add('is-correct'); o.insertAdjacentHTML('beforeend', '<span class="opt-mark">✓</span>'); }
      else if (i === S.picked) { o.classList.add('is-wrong'); o.insertAdjacentHTML('beforeend', '<span class="opt-mark">✕</span>'); }
      else { o.classList.add('is-dim'); }
    }
  }

  function renderFeedback(ok, mistake, given) {
    var t = S.task;
    var head = '<div class="fb-head">' +
      '<span class="fb-ico" aria-hidden="true">' + (ok ? '✓' : '!') + '</span>' +
      '<div><p class="fb-title">' + (ok ? 'Ответ верный' : 'Ответ неверный') + '</p>';

    if (ok) {
      head += '<p class="fb-text">Производная: <span class="fb-answer">' + t.answerHtml + '</span>' +
        (S.streak >= 3 ? '. Верных ответов подряд: ' + S.streak : '') + '</p>';
      if (S.hinted) {
        head += '<p class="fb-text">Правило было открыто. Рекомендуется решить аналогичное задание без обращения к справочнику.</p>';
      }
    } else {
      head += '<p class="fb-text">Ваш ответ: <span class="fb-answer">' + given + '</span>. ' +
        'Верный ответ: <span class="fb-answer">' + t.answerHtml + '</span></p>';
      if (mistake) {
        head += '<p class="fb-text"><span class="mistake">Причина ошибки:</span> ' + mistake + '</p>';
      }
    }
    head += '</div></div>';

    var stepsHtml = t.steps.map(function (s) {
      return '<li><p class="step-title">' + s.title + '</p><div class="step-math">' + s.math + '</div></li>';
    }).join('');

    var expanded = !ok;
    var body = '<div class="fb-body">' +
      '<button class="steps-toggle" type="button" id="stepsToggle" aria-expanded="' + expanded + '" aria-controls="stepsList">' +
      '<span class="caret" aria-hidden="true">▸</span>' +
      '<span>' + (expanded ? 'Решение по шагам' : 'Показать решение по шагам') + '</span></button>' +
      '<ol class="steps" id="stepsList"' + (expanded ? '' : ' hidden') + '>' + stepsHtml + '</ol>' +
      '<div class="rules-used">' + t.rules.filter(function (id) { return RULES[id]; }).map(function (id) {
        return '<span class="rule-chip">' + RULES[id].name + '</span>';
      }).join('') + '</div>' +
      '</div>';

    var fb = $('feedback');
    fb.className = 'feedback ' + (ok ? 'ok' : 'bad');
    fb.innerHTML = head + body;
    fb.hidden = false;

    $('stepsToggle').addEventListener('click', function () {
      var list = $('stepsList');
      var open = list.hidden;
      list.hidden = !open;
      this.setAttribute('aria-expanded', String(open));
      this.querySelector('span:last-child').textContent = open ? 'Решение по шагам' : 'Показать решение по шагам';
    });

    if (!ok) fb.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  // ======================= итоги =======================

  function finish() {
    var sess = S.sess;
    var total = sess.n, ok = sess.ok;
    var secs = Math.round((Date.now() - sess.startedAt) / 1000);

    if (S.mode === 'marathon') {
      PROGRESS.addMarathon({ date: Date.now(), ok: ok, total: total, secs: secs });
      $('resultKicker').textContent = 'Марафон завершён';
    } else if (S.mode === 'mistakes') {
      $('resultKicker').textContent = 'Работа над ошибками завершена';
    } else {
      $('resultKicker').textContent = 'Тренировка завершена';
    }

    var share = total ? ok / total : 0;
    var title = share >= 0.9 ? 'Отличный результат' :
      share >= 0.7 ? 'Хороший результат' :
        share >= 0.5 ? 'Удовлетворительный результат' : 'Требуется дополнительная отработка';
    $('resultTitle').textContent = title;
    $('resultScore').innerHTML = ok + ' <small>из ' + total + ' верно</small>';

    var mm = Math.floor(secs / 60), ss = secs % 60;
    var timeStr = mm ? mm + ' мин ' + ss + ' с' : ss + ' с';
    $('resultLead').textContent = 'Затрачено времени: ' + timeStr +
      (sess.hinted ? '. Обращений к справочнику: ' + sess.hinted + '.' : '.');

    // разбор по правилам + рекомендация
    var ids = Object.keys(sess.rules).filter(function (id) { return RULES[id]; });
    ids.sort(function (a, b) {
      return (sess.rules[a].ok / sess.rules[a].n) - (sess.rules[b].ok / sess.rules[b].n);
    });

    var out = '';
    if (ids.length) {
      out += '<div class="result-block"><h2>Результаты по правилам</h2><div class="bars">';
      ids.forEach(function (id) {
        var r = sess.rules[id];
        var acc = pct(r.ok, r.n);
        out += '<div class="bar-row">' +
          '<span class="bar-label">' + RULES[id].name + '</span>' +
          '<span class="bar-track"><span class="bar-fill' + (acc < 75 ? ' is-weak' : '') + '" style="width:' + Math.max(acc, 3) + '%"></span></span>' +
          '<span class="bar-val">' + r.ok + '/' + r.n + '</span>' +
          '</div>';
      });
      out += '</div>';

      var worst = ids[0];
      if (sess.rules[worst].ok < sess.rules[worst].n) {
        out += '<p class="weak-note" style="margin-top:1rem;margin-bottom:0">' +
          '<span>Наибольшее число ошибок: <strong>' + RULES[worst].name + '</strong>.</span>' +
          '<button class="btn btn-primary btn-sm" type="button" data-rule="' + worst + '">Отработать правило</button>' +
          '</p>';
      } else {
        out += '<p class="muted" style="margin:1rem 0 0">Ошибок нет. Можно переходить к более сложному разделу.</p>';
      }
      out += '</div>';
    }
    $('resultBreakdown').innerHTML = out;
    show('result');
  }

  // ======================= тема =======================

  var THEME_KEY = 'derivTrainer.theme';

  function setTheme(dark) {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    $('themeIcon').textContent = dark ? '☀' : '☽';
    $('themeBtn').title = dark ? 'Светлая тема' : 'Тёмная тема';
    $('themeBtn').setAttribute('aria-label', dark ? 'Включить светлую тему' : 'Включить тёмную тему');
    try { global.localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light'); } catch (e) { }
  }

  function initTheme() {
    var saved = null;
    try { saved = global.localStorage.getItem(THEME_KEY); } catch (e) { }
    var dark = saved
      ? saved === 'dark'
      : !!(global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)').matches);
    setTheme(dark);
  }

  // ======================= события =======================

  function init() {
    initTheme();
    $('statTypes').textContent = TASKS.count;
    $('statTypesLabel').textContent =
      plural(TASKS.count, 'тип заданий', 'типа заданий', 'типов заданий');

    $('themeBtn').addEventListener('click', function () {
      setTheme(document.documentElement.getAttribute('data-theme') !== 'dark');
    });

    $('startMixed').addEventListener('click', function () { startPractice(null, 'Все разделы'); });
    $('startMarathon').addEventListener('click', startMarathon);

    $('sectionCards').addEventListener('click', function (e) {
      var b = e.target.closest('[data-section]');
      if (!b) return;
      var id = b.getAttribute('data-section');
      var s = SECTIONS.filter(function (x) { return x.id === id; })[0];
      startPractice({ section: id }, s ? s.title : 'Тренировка');
    });

    // «Тренировать это правило» — и на главной, и в итогах
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-rule]');
      if (!b) return;
      var id = b.getAttribute('data-rule');
      startPractice({ rule: id }, RULES[id] ? RULES[id].name : 'Тренировка');
    });

    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-nav]');
      if (!b) return;
      show(b.getAttribute('data-nav'));
    });

    $('answerArea').addEventListener('click', function (e) {
      var b = e.target.closest('.opt');
      if (!b || b.disabled) return;
      pickOption(parseInt(b.getAttribute('data-i'), 10));
    });

    $('actionBtn').addEventListener('click', onAction);
    $('hintBtn').addEventListener('click', showHint);

    $('exitBtn').addEventListener('click', function () {
      if (S.sess && S.sess.n > 0) finish();
      else show('home');
    });

    $('againBtn').addEventListener('click', function () {
      if (S.mode === 'marathon') startMarathon();
      else if (S.mode === 'mistakes') startMistakes();
      else startPractice(S.filter, S.label);
    });

    $('mistakesCard').addEventListener('click', function (e) {
      if (e.target.closest('#startMistakes')) startMistakes();
    });

    $('resetBtn').addEventListener('click', function () {
      if (global.confirm('Сбросить всю статистику решений? Это действие нельзя отменить.')) {
        PROGRESS.reset();
        renderHome();
      }
    });

    document.addEventListener('keydown', function (e) {
      if ($('screen-task').hidden) return;
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) {
        return; // в поле ввода свои обработчики
      }
      if (!S.answered && S.task && S.task.kind === 'choice') {
        var i = KEYS.indexOf(e.key);
        if (i !== -1 && i < S.task.options.length) {
          e.preventDefault();
          pickOption(i);
          return;
        }
      }
      if (e.key === 'Enter' || e.key === ' ') {
        if (document.activeElement && document.activeElement.classList.contains('opt')) return;
        e.preventDefault();
        if (!$('actionBtn').disabled) onAction();
      }
    });

    show('home');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
