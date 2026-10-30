/**
 * Математическое ядро тренажёра.
 *
 * Формулы хранятся как дерево выражений, а не как строки. Это даёт три вещи:
 *  1) красивый рендер в HTML (дроби, корни, степени) без внешних библиотек;
 *  2) численную проверку — чтобы неверные варианты ответа гарантированно
 *     не совпадали с правильным;
 *  3) один и тот же объект можно показать и в задании, и в пошаговом разборе.
 */
(function (global) {
  'use strict';

  var MINUS = '−'; // настоящий математический минус
  var NBSP = ' ';  // тонкий пробел

  // ---------- конструкторы узлов ----------

  function num(v) { return { t: 'n', v: v }; }
  var X = { t: 'x' };
  function V(name) { return { t: 'x', name: name }; } // другая буква в табличных формулах
  function add() { return { t: 'add', xs: flatten(arguments) }; }
  function mul() { return { t: 'mul', xs: flatten(arguments) }; }
  function div(a, b) { return { t: 'div', a: a, b: b }; }
  function pow(a, b) { return { t: 'pow', a: a, b: typeof b === 'number' ? num(b) : b }; }
  function neg(a) { return { t: 'neg', a: a }; }
  function fn(f, a, base) {
    var node = { t: 'f', f: f, a: a };
    if (base !== undefined) node.base = base;   // для log по основанию
    return node;
  }

  function flatten(args) {
    var out = [];
    for (var i = 0; i < args.length; i++) {
      var a = args[i];
      if (Array.isArray(a)) out = out.concat(a);
      else out.push(a);
    }
    return out;
  }

  // Часто встречающиеся сокращения
  function sin(a) { return fn('sin', a); }
  function cos(a) { return fn('cos', a); }
  function tg(a) { return fn('tg', a); }
  function ln(a) { return fn('ln', a); }
  function logb(base, a) { return fn('log', a, base); }   // log по основанию
  function exp(a) { return fn('exp', a); }       // e^a
  function sqrt(a) { return fn('sqrt', a); }
  function lin(a, b) {                            // a·x + b, аккуратно по краям
    if (a === 0) return num(b);
    var ax = a === 1 ? X : (a === -1 ? neg(X) : mul(num(a), X));
    if (b === 0) return ax;
    return add(ax, num(b));
  }
  function coef(a, e) {                           // a·e без мусора вида 1·e
    if (a === 1) return e;
    if (a === -1) return neg(e);
    return mul(num(a), e);
  }
  function powx(a, n) {                           // a·x^n
    if (n === 0) return num(a);
    if (n === 1) return coef(a, X);
    return coef(a, pow(X, n));
  }

  // ---------- вычисление ----------

  function evalExpr(e, x) {
    switch (e.t) {
      case 'n': return e.v;
      case 'x': return x;
      case 'neg': return -evalExpr(e.a, x);
      case 'add': {
        var s = 0;
        for (var i = 0; i < e.xs.length; i++) s += evalExpr(e.xs[i], x);
        return s;
      }
      case 'mul': {
        var p = 1;
        for (var j = 0; j < e.xs.length; j++) p *= evalExpr(e.xs[j], x);
        return p;
      }
      case 'div': {
        var b = evalExpr(e.b, x);
        if (!isFinite(b) || Math.abs(b) < 1e-12) return NaN;
        return evalExpr(e.a, x) / b;
      }
      case 'pow': return Math.pow(evalExpr(e.a, x), evalExpr(e.b, x));
      case 'f': {
        var a = evalExpr(e.a, x);
        if (!isFinite(a)) return NaN;
        switch (e.f) {
          case 'sin': return Math.sin(a);
          case 'cos': return Math.cos(a);
          case 'tg': {
            var c = Math.cos(a);
            return Math.abs(c) < 1e-9 ? NaN : Math.sin(a) / c;
          }
          case 'ctg': {
            var s2 = Math.sin(a);
            return Math.abs(s2) < 1e-9 ? NaN : Math.cos(a) / s2;
          }
          case 'ln': return a > 0 ? Math.log(a) : NaN;
          case 'log': return a > 0 ? Math.log(a) / Math.log(e.base) : NaN;
          case 'exp': return Math.exp(a);
          case 'sqrt': return a >= 0 ? Math.sqrt(a) : NaN;
        }
        return NaN;
      }
    }
    return NaN;
  }

  // Точки специально «некруглые»: на них случайное совпадение двух разных
  // выражений практически исключено.
  var SAMPLES = [0.37, 0.61, 1.23, 1.87, 2.41, 3.11, 4.07, 0.13, 5.63, 2.03, 6.21, 0.87];

  /** Численно равны ли два выражения (для фильтрации дистракторов). */
  function sameValue(a, b) {
    var seen = 0;
    for (var i = 0; i < SAMPLES.length; i++) {
      var x = SAMPLES[i];
      var va = evalExpr(a, x), vb = evalExpr(b, x);
      if (!isFinite(va) || !isFinite(vb)) continue;
      seen++;
      var scale = Math.max(1, Math.abs(va), Math.abs(vb));
      if (Math.abs(va - vb) / scale > 1e-7) return false;
    }
    return seen >= 3;
  }

  // ---------- форматирование чисел ----------

  function fmtNum(v) {
    var s;
    if (Number.isInteger(v)) s = String(v);
    else s = String(Math.round(v * 1e6) / 1e6).replace('.', ',');
    return s.replace('-', MINUS);
  }

  // ---------- рендер в HTML ----------

  var P_ADD = 1, P_MUL = 2, P_FN = 3, P_POW = 4, P_ATOM = 5;

  function isAtom(e) {
    return e.t === 'x' || (e.t === 'n' && e.v >= 0);
  }

  /** Выносит минус наружу, чтобы в сумме печаталось «− 3x», а не «+ (−3x)». */
  function splitSign(e) {
    if (e.t === 'neg') return { sign: -1, e: e.a };
    if (e.t === 'n' && e.v < 0) return { sign: -1, e: num(-e.v) };
    if (e.t === 'mul' && e.xs.length && e.xs[0].t === 'n' && e.xs[0].v < 0) {
      var xs = e.xs.slice();
      if (xs[0].v === -1) xs.shift();
      else xs[0] = num(-xs[0].v);
      return { sign: -1, e: xs.length === 1 ? xs[0] : { t: 'mul', xs: xs } };
    }
    if (e.t === 'div') {
      var s = splitSign(e.a);
      if (s.sign < 0) return { sign: -1, e: div(s.e, e.b) };
    }
    return { sign: 1, e: e };
  }

  function wrap(html, need) {
    return need ? '(' + html + ')' : html;
  }

  function render(e, parentPrec) {
    switch (e.t) {
      case 'n': {
        var neg1 = e.v < 0;
        return wrap(fmtNum(e.v), neg1 && parentPrec >= P_MUL);
      }
      case 'x':
        return '<i>' + (e.name || 'x') + '</i>';
      case 'neg':
        return wrap(MINUS + render(e.a, P_MUL), parentPrec >= P_MUL);
      case 'add': {
        var out = '';
        for (var i = 0; i < e.xs.length; i++) {
          var s = splitSign(e.xs[i]);
          if (i === 0) out += (s.sign < 0 ? MINUS : '') + render(s.e, P_ADD);
          else out += ' ' + (s.sign < 0 ? MINUS : '+') + ' ' + render(s.e, P_ADD);
        }
        return wrap(out, parentPrec > P_ADD);
      }
      case 'mul': {
        var parts = [];
        for (var j = 0; j < e.xs.length; j++) {
          var f = e.xs[j];
          if (f.t === 'n' && f.v === 1 && e.xs.length > 1) continue;
          parts.push(f);
        }
        var html = '';
        for (var k = 0; k < parts.length; k++) {
          if (k > 0) html += separator(parts[k - 1], parts[k]);
          // Минус у первого множителя пишем без скобок: −3x, а не (−3)x
          if (k === 0 && parts[k].t === 'n' && parts[k].v < 0) html += fmtNum(parts[k].v);
          else if (k === 0 && parts[k].t === 'neg') html += MINUS + render(parts[k].a, P_MUL);
          else html += render(parts[k], P_MUL);
        }
        return wrap(html, parentPrec > P_MUL);
      }
      case 'div':
        return '<span class="frac"><span class="frac-n">' + render(e.a, P_ADD) +
          '</span><span class="frac-d">' + render(e.b, P_ADD) + '</span></span>';
      case 'pow': {
        // cos²x красивее, чем (cos x)²
        if (e.a.t === 'f' && e.a.f !== 'exp' && e.a.f !== 'sqrt') {
          return fname(e.a.f) + '<sup>' + render(e.b, P_ADD) + '</sup>' + fnArg(e.a.a);
        }
        var base = isAtom(e.a) ? render(e.a, P_POW) : '(' + render(e.a, P_ADD) + ')';
        return base + '<sup>' + render(e.b, P_ADD) + '</sup>';
      }
      case 'f': {
        if (e.f === 'exp') {
          return '<i>e</i><sup>' + render(e.a, P_ADD) + '</sup>';
        }
        if (e.f === 'log') {
          return wrap('<span class="fname">log</span><sub>' + fmtNum(e.base) + '</sub>' + fnArg(e.a),
            parentPrec >= P_POW);
        }
        if (e.f === 'sqrt') {
          return '<span class="rad"><span class="rad-sign">√</span>' +
            '<span class="rad-body">' + render(e.a, P_ADD) + '</span></span>';
        }
        return wrap(fname(e.f) + fnArg(e.a), parentPrec >= P_POW);
      }
    }
    return '?';
  }

  function fname(f) {
    return '<span class="fname">' + f + '</span>';
  }

  function fnArg(a) {
    if (isAtom(a) || a.t === 'pow') return NBSP + render(a, P_ATOM);
    return '(' + render(a, P_ADD) + ')';
  }

  /** Нужна ли точка умножения между двумя множителями. */
  function separator(left, right) {
    var leftIsNum = left.t === 'n';
    var rightIsNum = right.t === 'n' || (right.t === 'neg');
    if (leftIsNum && !rightIsNum) return '';
    return '<span class="mdot">·</span>';
  }

  function html(e) {
    return render(e, P_ADD);
  }

  // ---------- текстовый вид (для скринридеров и подписей) ----------

  function plain(e) {
    switch (e.t) {
      case 'n': return fmtNum(e.v);
      case 'x': return 'x';
      case 'neg': return 'минус ' + plain(e.a);
      case 'add': {
        var out = '';
        for (var i = 0; i < e.xs.length; i++) {
          var s = splitSign(e.xs[i]);
          out += (i === 0 ? (s.sign < 0 ? 'минус ' : '') : (s.sign < 0 ? ' минус ' : ' плюс ')) + plain(s.e);
        }
        return out;
      }
      case 'mul': return e.xs.map(plain).join(' умножить на ');
      case 'div': return '(' + plain(e.a) + ') делить на (' + plain(e.b) + ')';
      case 'pow': return plain(e.a) + ' в степени ' + plain(e.b);
      case 'f':
        if (e.f === 'exp') return 'e в степени ' + plain(e.a);
        if (e.f === 'log') return 'логарифм по основанию ' + fmtNum(e.base) + ' от ' + plain(e.a);
        if (e.f === 'sqrt') return 'корень из ' + plain(e.a);
        return e.f + ' от ' + plain(e.a);
    }
    return '';
  }

  global.M = {
    num: num, X: X, V: V, add: add, mul: mul, div: div, pow: pow, neg: neg, fn: fn,
    sin: sin, cos: cos, tg: tg, ln: ln, logb: logb, exp: exp, sqrt: sqrt,
    lin: lin, coef: coef, powx: powx,
    evalExpr: evalExpr, sameValue: sameValue,
    html: html, plain: plain, fmtNum: fmtNum,
    MINUS: MINUS
  };
})(window);
