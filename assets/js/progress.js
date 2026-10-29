/**
 * Прогресс и диагностика слабых мест.
 * Хранится в localStorage; любое обращение обёрнуто в try/catch,
 * чтобы сайт работал и в приватном режиме, и при запрете хранилища.
 */
(function (global) {
  'use strict';

  var KEY = 'derivTrainer.v1';

  function fresh() {
    return {
      total: 0,        // сколько заданий проверено
      correct: 0,      // сколько верно
      hints: 0,        // сколько раз смотрели правило
      bestStreak: 0,   // лучшая серия верных ответов
      byRule: {},      // { ruleId: {n, ok} }
      bySection: {},   // { sectionId: {n, ok} }
      marathons: []    // последние результаты марафона
    };
  }

  function load() {
    try {
      var raw = global.localStorage.getItem(KEY);
      if (!raw) return fresh();
      var p = JSON.parse(raw);
      var base = fresh();
      if (!p || typeof p !== 'object') return base;
      base.total = p.total || 0;
      base.correct = p.correct || 0;
      base.hints = p.hints || 0;
      base.bestStreak = p.bestStreak || 0;
      base.byRule = p.byRule || {};
      base.bySection = p.bySection || {};
      base.marathons = Array.isArray(p.marathons) ? p.marathons : [];
      return base;
    } catch (e) {
      return fresh();
    }
  }

  function save(p) {
    try {
      global.localStorage.setItem(KEY, JSON.stringify(p));
    } catch (e) { /* хранилище недоступно — просто не сохраняем */ }
  }

  function bump(map, key, ok) {
    if (!map[key]) map[key] = { n: 0, ok: 0 };
    map[key].n += 1;
    if (ok) map[key].ok += 1;
  }

  /** Записать результат одного задания. */
  function record(task, ok, streak, hinted) {
    var p = load();
    p.total += 1;
    if (ok) p.correct += 1;
    if (hinted) p.hints += 1;
    if (streak > p.bestStreak) p.bestStreak = streak;
    bump(p.bySection, task.section, ok);
    for (var i = 0; i < task.rules.length; i++) bump(p.byRule, task.rules[i], ok);
    save(p);
    return p;
  }

  function addMarathon(res) {
    var p = load();
    p.marathons.unshift(res);
    p.marathons = p.marathons.slice(0, 5);
    save(p);
    return p;
  }

  /**
   * Слабые места: правила, где есть статистика и доля верных ниже порога.
   * Сортировка — от самого слабого.
   */
  function weakRules(p, minAttempts) {
    minAttempts = minAttempts || 3;
    var out = [];
    Object.keys(p.byRule).forEach(function (id) {
      var r = p.byRule[id];
      if (r.n < minAttempts) return;
      var acc = r.ok / r.n;
      if (acc >= 0.75) return;
      out.push({ id: id, n: r.n, ok: r.ok, acc: acc });
    });
    out.sort(function (a, b) { return a.acc - b.acc; });
    return out;
  }

  function strongRules(p, minAttempts) {
    minAttempts = minAttempts || 3;
    var out = [];
    Object.keys(p.byRule).forEach(function (id) {
      var r = p.byRule[id];
      if (r.n < minAttempts) return;
      var acc = r.ok / r.n;
      if (acc < 0.75) return;
      out.push({ id: id, n: r.n, ok: r.ok, acc: acc });
    });
    out.sort(function (a, b) { return b.acc - a.acc; });
    return out;
  }

  function reset() {
    try { global.localStorage.removeItem(KEY); } catch (e) { }
    return fresh();
  }

  global.PROGRESS = {
    load: load,
    record: record,
    addMarathon: addMarathon,
    weakRules: weakRules,
    strongRules: strongRules,
    reset: reset
  };
})(window);
