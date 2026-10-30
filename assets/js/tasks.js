/**
 * Генераторы заданий.
 *
 * Каждый шаблон умеет три вещи:
 *   - породить функцию со случайными коэффициентами,
 *   - собрать пошаговый разбор ИМЕННО для этих чисел,
 *   - выдать неверные варианты ответа, каждый из которых соответствует
 *     конкретной типичной ошибке ученика.
 *
 * Поэтому ученик, выбрав неверный вариант, видит не «неправильно»,
 * а название своей ошибки.
 */
(function (global) {
  'use strict';

  var M = global.M;
  var PRIME = '′';

  // ---------- мелкие помощники ----------

  function ri(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(arr) { return arr[ri(0, arr.length - 1)]; }
  function sgn() { return Math.random() < 0.5 ? -1 : 1; }
  function nzi(a, b) { return ri(a, b) * sgn(); }           // ненулевое со случайным знаком
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function d(e) { return '(' + M.html(e) + ')' + PRIME; }     // (выражение)′
  function frac(n, dd) {                                       // готовая дробь из HTML-кусков
    return '<span class="frac"><span class="frac-n">' + n + '</span><span class="frac-d">' + dd + '</span></span>';
  }

  /** Дробь p/q в сокращённом виде; целое — числом. Чтобы неверный вариант
   *  не выдавал себя несокращённой записью вроде −2/2. */
  function ratio(p, q) {
    if (q < 0) { p = -p; q = -q; }
    var a = Math.abs(p), b = q;
    while (b) { var t = a % b; a = b; b = t; }
    var g = a || 1;
    p /= g; q /= g;
    return q === 1 ? M.num(p) : M.div(M.num(p), M.num(q));
  }
  function h(e) { return M.html(e); }
  function st(title, math) { return { title: title, math: math }; }

  /**
   * График функции на отрезке в виде SVG-строки.
   * Цвета берутся из currentColor и переменных темы, поэтому рисунок
   * одинаково читается в светлой и тёмной теме.
   */
  function plotSvg(fn, x0, x1) {
    var W = 420, H = 250, pad = 22, N = 260;
    var xs = [], ys = [], i, v;
    for (i = 0; i <= N; i++) {
      v = x0 + (x1 - x0) * i / N;
      xs.push(v); ys.push(fn(v));
    }
    var ymin = Math.min.apply(null, ys), ymax = Math.max.apply(null, ys);
    var span = Math.max(ymax - ymin, 1e-6);
    ymin -= span * 0.12; ymax += span * 0.12;
    if (ymin > 0) ymin = -span * 0.1;
    if (ymax < 0) ymax = span * 0.1;

    var sx = function (a) { return pad + (a - x0) / (x1 - x0) * (W - 2 * pad); };
    var sy = function (a) { return H - pad - (a - ymin) / (ymax - ymin) * (H - 2 * pad); };

    var pts = [];
    for (i = 0; i <= N; i++) pts.push(sx(xs[i]).toFixed(1) + ',' + sy(ys[i]).toFixed(1));

    var axisY = sy(0), grid = '', ticks = '';
    for (var g = Math.ceil(x0); g <= Math.floor(x1); g++) {
      var gx = sx(g).toFixed(1);
      grid += '<line class="g-grid" x1="' + gx + '" y1="' + pad + '" x2="' + gx + '" y2="' + (H - pad) + '"/>';
      if (g !== 0) {
        ticks += '<text class="g-tick" x="' + gx + '" y="' + (axisY + 15).toFixed(1) + '">' + M.fmtNum(g) + '</text>';
      }
    }
    return '<svg class="plot" viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" ' +
      'role="img" aria-label="График производной функции">' +
      grid +
      '<line class="g-axis" x1="' + pad + '" y1="' + axisY.toFixed(1) + '" x2="' + (W - pad) + '" y2="' + axisY.toFixed(1) + '"/>' +
      '<line class="g-axis" x1="' + sx(0).toFixed(1) + '" y1="' + pad + '" x2="' + sx(0).toFixed(1) + '" y2="' + (H - pad) + '"/>' +
      ticks +
      '<polyline class="g-curve" points="' + pts.join(' ') + '"/>' +
      '</svg>';
  }

  // ---------- правила (для подсказок, диагностики и справочника) ----------

  var RULES = {
    konst: { name: 'Константа и множитель', formula: '(C)′ = 0, (C·u)′ = C·u′' },
    power: {
      name: 'Степень', formula: '(xⁿ)′ = n·xⁿ⁻¹, (x)′ = 1',
      more: [
        '(1/x)′ = −1/x², (1/xⁿ)′ = −n/xⁿ⁺¹',
        'Дробь удобно переписать степенью: 1/xⁿ = x⁻ⁿ'
      ]
    },
    sum: { name: 'Сумма и разность', formula: '(u ± v)′ = u′ ± v′' },
    product: { name: 'Произведение', formula: '(u·v)′ = u′v + uv′' },
    quotient: { name: 'Частное', formula: '(u / v)′ = (u′v − uv′) / v²' },
    chain: {
      name: 'Сложная функция', formula: '(f(g(x)))′ = f′(g(x))·g′(x)',
      more: [
        '(gⁿ)′ = n·gⁿ⁻¹·g′',
        '(sin g)′ = cos g·g′, (cos g)′ = −sin g·g′',
        '(tg g)′ = g′ / cos²g, (ctg g)′ = −g′ / sin²g',
        '(eᵍ)′ = eᵍ·g′, (ln g)′ = g′ / g',
        '(√g)′ = g′ / (2√g)'
      ]
    },
    trig: { name: 'Тригонометрия', formula: '(sin x)′ = cos x, (cos x)′ = −sin x, (tg x)′ = 1 / cos²x, (ctg x)′ = −1 / sin²x' },
    expo: { name: 'Показательная', formula: '(eˣ)′ = eˣ, (aˣ)′ = aˣ·ln a' },
    log: { name: 'Логарифм', formula: '(ln x)′ = 1 / x, (log<sub>a</sub> x)′ = 1 / (x·ln a)' },
    root: { name: 'Корень', formula: '(√x)′ = 1 / (2√x)' },
    apply: {
      name: 'Применение производной', formula: 'Угловой коэффициент касательной: k = f′(x₀)',
      more: [
        'Уравнение касательной: y = f(x₀) + f′(x₀)(x − x₀)',
        'В точке экстремума f′(x) = 0',
        'Если f′ > 0, функция возрастает; если f′ < 0, убывает',
        'Знак f′ меняется с «+» на «−» в точке максимума и с «−» на «+» в точке минимума',
        'Наибольшее и наименьшее значение на отрезке: сравниваем значения в критических точках и на концах',
        'Скорость есть производная пути: v(t) = s′(t)'
      ]
    }
  };

  /**
   * Порядок разделов — по возрастанию сложности. Он же задаёт порядок
   * изучения: раздел не должен требовать правил, которые вводятся позже.
   * Поэтому элементарные функции идут раньше произведения и частного:
   * задания вида x²·sin x опираются на табличную производную синуса.
   */
  var SECTIONS = [
    { id: 'basic', title: 'Базовые правила', hint: 'Степень, корень, постоянный множитель, сумма и разность', level: 'Просто' },
    { id: 'funcs', title: 'Элементарные функции', hint: 'Табличные производные: sin, cos, tg, eˣ, aˣ, ln', level: 'Просто' },
    { id: 'product', title: 'Произведение и частное', hint: 'Формулы (uv)′ и (u/v)′', level: 'Средне' },
    { id: 'chain', title: 'Сложная функция', hint: 'Цепное правило: источник наибольшего числа ошибок', level: 'Сложно' },
    { id: 'apply', title: 'Применение', hint: 'Значение в точке, касательная, экстремумы, график производной', level: 'ЕГЭ' }
  ];

  /**
   * Какие правила вводит каждый раздел. Используется проверкой
   * согласованности: задание может опираться только на правила своего
   * раздела и всех предыдущих.
   */
  var SECTION_RULES = {
    basic: ['konst', 'power', 'sum', 'root'],
    funcs: ['trig', 'expo', 'log'],
    product: ['product', 'quotient'],
    chain: ['chain'],
    apply: ['apply']
  };

  // ---------- шаблоны ----------

  var T = [];

  // --- Раздел 1: базовые правила ---

  T.push({
    id: 'lin', section: 'basic', rules: ['konst', 'power'], weight: 1,
    gen: function () {
      var a = nzi(2, 9), b = nzi(1, 9);
      var ax = M.coef(a, M.X);
      var f = M.add(ax, M.num(b));
      return {
        kind: 'choice',
        prompt: 'Найдите производную функции',
        fx: f,
        answer: M.num(a),
        wrong: [
          { e: ax, why: 'Производная x равна 1, поэтому x в ответе не остаётся: (' + h(ax) + ')' + PRIME + ' = ' + a + '·1 = ' + a + '.' },
          { e: M.num(a + b), why: 'Производная числа равна нулю, поэтому свободный член исчезает и не складывается с коэффициентом.' },
          { e: M.num(1), why: 'Постоянный множитель сохраняется: (C·x)' + PRIME + ' = C·(x)' + PRIME + ' = C.' }
        ],
        steps: [
          st('Производная суммы равна сумме производных',
            'f' + PRIME + '(x) = ' + d(ax) + ' + ' + d(M.num(b))),
          st('Постоянный множитель выносим, а (x)' + PRIME + ' = 1',
            d(ax) + ' = ' + a + '·(x)' + PRIME + ' = ' + a),
          st('Производная константы равна нулю',
            d(M.num(b)) + ' = 0'),
          st('Складываем', 'f' + PRIME + '(x) = ' + h(M.num(a)))
        ]
      };
    }
  });

  T.push({
    id: 'powmono', section: 'basic', rules: ['power', 'konst'], weight: 3,
    gen: function () {
      var a = nzi(2, 9), n = ri(2, 6);
      var f = M.powx(a, n);
      return {
        kind: 'choice',
        prompt: 'Найдите производную функции',
        fx: f,
        answer: M.powx(a * n, n - 1),
        wrong: [
          { e: M.powx(a, n - 1), why: 'Показатель уменьшен, но умножение на него не выполнено. По правилу степени множитель n обязателен: (xⁿ)' + PRIME + ' = n·xⁿ⁻¹.' },
          { e: M.powx(a * n, n), why: 'Умножение на показатель выполнено, но сам показатель не уменьшен на единицу.' },
          { e: M.powx(n, n - 1), why: 'Утрачен постоянный множитель ' + a + ': он выносится за знак производной и остаётся в ответе.' },
          { e: M.powx(a * (n - 1), n - 1), why: 'Умножение выполняется на исходный показатель n = ' + n + ', а не на уменьшенный.' }
        ],
        steps: [
          st('Постоянный множитель выносим за знак производной',
            'f' + PRIME + '(x) = ' + a + '·' + d(M.pow(M.X, n))),
          st('Правило степени: (xⁿ)' + PRIME + ' = n·xⁿ⁻¹',
            d(M.pow(M.X, n)) + ' = ' + h(M.powx(n, n - 1))),
          st('Перемножаем коэффициенты',
            'f' + PRIME + '(x) = ' + a + '·' + n + '·' + h(M.pow(M.X, n - 1)) + ' = ' + h(M.powx(a * n, n - 1)))
        ]
      };
    }
  });

  T.push({
    id: 'polysum', section: 'basic', rules: ['sum', 'power', 'konst'], weight: 3,
    gen: function () {
      var a = nzi(2, 6), n = ri(2, 4), b = nzi(2, 9), c = nzi(1, 9);
      var f = M.add(M.powx(a, n), M.coef(b, M.X), M.num(c));
      var ans = M.add(M.powx(a * n, n - 1), M.num(b));
      return {
        kind: 'choice',
        prompt: 'Найдите производную функции',
        fx: f,
        answer: ans,
        wrong: [
          { e: M.add(M.powx(a * n, n - 1), M.num(b), M.num(c)), why: 'Свободный член ' + h(M.num(c)) + ' должен исчезнуть: производная любого числа равна нулю.' },
          { e: M.add(M.powx(a * n, n), M.num(b)), why: 'В первом слагаемом показатель не уменьшен на единицу.' },
          { e: M.add(M.powx(a, n - 1), M.num(b)), why: 'В первом слагаемом забыли умножить на показатель ' + n + '.' },
          { e: M.add(M.powx(a * n, n - 1), M.coef(b, M.X)), why: 'Слагаемое ' + h(M.coef(b, M.X)) + ' не продифференцировано: (' + h(M.coef(b, M.X)) + ')' + PRIME + ' = ' + b + '.' }
        ],
        steps: [
          st('Дифференцируем каждое слагаемое отдельно',
            'f' + PRIME + '(x) = ' + d(M.powx(a, n)) + ' + ' + d(M.coef(b, M.X)) + ' + ' + d(M.num(c))),
          st('Первое слагаемое — правило степени',
            d(M.powx(a, n)) + ' = ' + a + '·' + n + '·' + h(M.pow(M.X, n - 1)) + ' = ' + h(M.powx(a * n, n - 1))),
          st('Второе слагаемое линейно, третье — константа',
            d(M.coef(b, M.X)) + ' = ' + b + ', ' + d(M.num(c)) + ' = 0'),
          st('Записываем ответ', 'f' + PRIME + '(x) = ' + h(ans))
        ]
      };
    }
  });

  T.push({
    id: 'recip', section: 'basic', rules: ['power', 'konst'], weight: 2,
    gen: function () {
      var a = nzi(2, 9), n = ri(1, 3);
      var den = n === 1 ? M.X : M.pow(M.X, n);
      var f = M.div(M.num(a), den);
      var asPow = M.coef(a, M.pow(M.X, M.num(-n)));
      var ans = M.div(M.num(-a * n), M.pow(M.X, n + 1));
      return {
        kind: 'choice',
        prompt: 'Найдите производную функции',
        fx: f,
        answer: ans,
        wrong: [
          { e: M.div(M.num(a * n), M.pow(M.X, n + 1)), why: 'Пропущен знак минус. Показатель отрицательный (−' + n + '), множитель перед степенью тоже получается отрицательным.' },
          { e: M.div(M.num(-a * n), n === 1 ? M.X : M.pow(M.X, n)), why: 'Показатель в знаменателе не изменился. Из −' + n + ' вычитаем 1, получаем −' + (n + 1) + ', то есть x в степени ' + (n + 1) + ' внизу.' },
          { e: M.div(M.num(-a), M.pow(M.X, n + 1)), why: 'Не выполнено умножение на показатель: множитель ' + n + ' обязателен.' },
          { e: M.div(M.num(a), M.pow(M.X, n + 1)), why: 'Отсутствуют знак минус и множитель ' + n + '.' }
        ],
        steps: [
          st('Переписываем дробь как степень с отрицательным показателем',
            'f(x) = ' + h(f) + ' = ' + h(asPow)),
          st('Правило степени работает и для отрицательных показателей',
            d(M.pow(M.X, M.num(-n))) + ' = ' + h(M.coef(-n, M.pow(M.X, M.num(-n - 1))))),
          st('Умножаем на коэффициент',
            'f' + PRIME + '(x) = ' + h(M.coef(-a * n, M.pow(M.X, M.num(-n - 1))))),
          st('Возвращаемся к обычной дроби',
            'f' + PRIME + '(x) = ' + h(ans))
        ]
      };
    }
  });

  T.push({
    id: 'sqrtbasic', section: 'basic', rules: ['root', 'power'], weight: 2,
    gen: function () {
      var a = ri(2, 9), c = nzi(1, 9);
      var root = M.coef(a, M.sqrt(M.X));
      var f = M.add(root, M.num(c));
      var half = M.div(M.num(1), M.num(2));
      var ans = M.div(M.num(a), M.mul(M.num(2), M.sqrt(M.X)));
      return {
        kind: 'choice',
        prompt: 'Найдите производную функции',
        fx: f,
        answer: ans,
        wrong: [
          { e: M.add(M.div(M.num(a), M.mul(M.num(2), M.sqrt(M.X))), M.num(c)), why: 'Свободный член ' + h(M.num(c)) + ' должен исчезнуть: производная числа равна нулю.' },
          { e: M.div(M.num(a), M.sqrt(M.X)), why: 'Утрачен множитель ½. Показатель корня равен ½, и именно он выходит вперёд.' },
          { e: M.div(M.num(1), M.mul(M.num(2), M.sqrt(M.X))), why: 'Утрачен коэффициент ' + a + ': постоянный множитель сохраняется.' },
          { e: M.div(M.num(a), M.mul(M.num(2), M.X)), why: 'В знаменателе сохраняется корень: x⁻¹⁄² = 1/√x, а не 1/x.' },
          { e: M.div(M.mul(M.num(a), M.sqrt(M.X)), M.num(2)), why: 'Степень стала отрицательной, поэтому корень уходит в знаменатель.' }
        ],
        steps: [
          st('Свободный член исчезает: производная числа равна нулю',
            'f' + PRIME + '(x) = ' + d(root) + ' + ' + d(M.num(c)) + ' = ' + d(root)),
          st('Корень — это степень ½',
            h(root) + ' = ' + h(M.coef(a, M.pow(M.X, half)))),
          st('Правило степени: показатель выходит вперёд и уменьшается на 1',
            d(M.pow(M.X, half)) + ' = ' + h(M.mul(half, M.pow(M.X, M.div(M.num(-1), M.num(2)))))),
          st('Отрицательная степень — это дробь, а x⁻¹⁄² = 1/√x',
            h(M.pow(M.X, M.div(M.num(-1), M.num(2)))) + ' = ' + h(M.div(M.num(1), M.sqrt(M.X)))),
          st('Учитываем коэффициент', 'f' + PRIME + '(x) = ' + h(ans))
        ]
      };
    }
  });

  T.push({
    id: 'basicmix', section: 'basic', rules: ['sum', 'power'], weight: 3,
    gen: function () {
      // Степень плюс второе слагаемое другого вида: корень или дробь
      var a = nzi(2, 6), n = ri(2, 4), b = nzi(2, 9);
      var kind = pick(['sqrt', 'inv', 'inv2']);
      var u2, d2, rule2, wrongTail, tailWhy;
      if (kind === 'sqrt') {
        u2 = M.coef(b, M.sqrt(M.X));
        d2 = M.div(M.num(b), M.mul(M.num(2), M.sqrt(M.X)));
        wrongTail = M.div(M.num(b), M.sqrt(M.X));
        tailWhy = 'Во втором слагаемом утрачен множитель ½: (√x)' + PRIME + ' = 1/(2√x).';
        rule2 = 'root';
      } else if (kind === 'inv') {
        u2 = M.div(M.num(b), M.X);
        d2 = M.div(M.num(-b), M.pow(M.X, 2));
        wrongTail = M.div(M.num(b), M.pow(M.X, 2));
        tailWhy = 'Во втором слагаемом пропущен знак минус: показатель отрицательный.';
        rule2 = 'power';
      } else {
        u2 = M.div(M.num(b), M.pow(M.X, 2));
        d2 = M.div(M.num(-2 * b), M.pow(M.X, 3));
        wrongTail = M.div(M.num(-b), M.pow(M.X, 3));
        tailWhy = 'Во втором слагаемом не выполнено умножение на показатель 2.';
        rule2 = 'power';
      }
      var f = M.add(M.powx(a, n), u2);
      var ans = M.add(M.powx(a * n, n - 1), d2);
      return {
        kind: 'choice',
        rules: ['sum', 'power', rule2],
        prompt: 'Найдите производную функции',
        fx: f,
        answer: ans,
        wrong: [
          { e: M.add(M.powx(a * n, n - 1), u2), why: 'Второе слагаемое не продифференцировано.' },
          { e: M.add(M.powx(a, n - 1), d2), why: 'В первом слагаемом не выполнено умножение на показатель ' + n + '.' },
          { e: M.add(M.powx(a * n, n - 1), wrongTail), why: tailWhy },
          { e: M.add(M.powx(a * n, n), d2), why: 'В первом слагаемом показатель не уменьшен на единицу.' }
        ],
        steps: [
          st('Дифференцируем каждое слагаемое отдельно',
            'f' + PRIME + '(x) = ' + d(M.powx(a, n)) + ' + ' + d(u2)),
          st('Первое слагаемое — правило степени',
            d(M.powx(a, n)) + ' = ' + h(M.powx(a * n, n - 1))),
          st('Второе слагаемое',
            d(u2) + ' = ' + h(d2)),
          st('Записываем ответ', 'f' + PRIME + '(x) = ' + h(ans))
        ]
      };
    }
  });

  // --- Раздел 2: произведение и частное ---

  T.push({
    id: 'prodlin', section: 'product', rules: ['product'], weight: 3,
    gen: function () {
      var a = nzi(1, 4), b = nzi(1, 6), c = nzi(1, 4), dd = nzi(1, 6);
      var u = M.lin(a, b), v = M.lin(c, dd);
      var f = M.mul(u, v);
      var k1 = 2 * a * c, k0 = a * dd + b * c;
      var ans = k0 === 0 ? M.coef(k1, M.X) : M.add(M.coef(k1, M.X), M.num(k0));
      return {
        kind: 'choice',
        prompt: 'Найдите производную функции',
        fx: f,
        answer: ans,
        wrong: [
          { e: M.num(a * c), why: 'Производная произведения не равна произведению производных. Применяется формула (uv)' + PRIME + ' = u' + PRIME + 'v + uv' + PRIME + '.' },
          { e: M.num(a * dd - b * c), why: 'Между слагаемыми указан минус: это формула производной частного. В правиле произведения стоит плюс.' },
          { e: M.coef(k1, M.X), why: 'Утрачен свободный член: a·d + b·c = ' + k0 + '.' },
          { e: k0 === 0 ? M.coef(a * c, M.X) : M.add(M.coef(a * c, M.X), M.num(k0)), why: 'При x складываются два одинаковых слагаемых a·c·x, поэтому коэффициент равен 2·a·c = ' + k1 + '.' }
        ],
        steps: [
          st('Обозначим множители',
            'u = ' + h(u) + ', v = ' + h(v)),
          st('Их производные',
            'u' + PRIME + ' = ' + a + ', v' + PRIME + ' = ' + c),
          st('Подставляем в формулу (u·v)' + PRIME + ' = u' + PRIME + 'v + uv' + PRIME,
            'f' + PRIME + '(x) = ' + a + '·(' + h(v) + ') + (' + h(u) + ')·' + c),
          st('Раскрываем скобки и приводим подобные',
            'f' + PRIME + '(x) = ' + h(ans))
        ]
      };
    }
  });

  T.push({
    id: 'prodfn', section: 'product', rules: ['product'], weight: 3,
    gen: function () {
      var kind = pick(['sin', 'cos', 'exp', 'ln']);
      var k = ri(1, 9);

      if (kind === 'ln') {
        // f = k·x·ln x  →  f′ = k·ln x + k
        var f0 = k === 1 ? M.mul(M.X, M.ln(M.X)) : M.mul(M.num(k), M.X, M.ln(M.X));
        var u0 = k === 1 ? 'x' : M.fmtNum(k) + 'x';
        var ans0 = M.add(M.coef(k, M.ln(M.X)), M.num(k));
        return {
          kind: 'choice', rules: ['product', 'log'],
          prompt: 'Найдите производную функции',
          fx: f0,
          answer: ans0,
          wrong: [
            { e: M.div(M.num(k), M.X), why: 'Приведено произведение производных u' + PRIME + '·v' + PRIME + '. Нужна формула (uv)' + PRIME + ' = u' + PRIME + 'v + uv' + PRIME + '.' },
            { e: M.coef(k, M.ln(M.X)), why: 'Утрачено второе слагаемое: ' + u0 + '·(ln x)' + PRIME + ' = ' + u0 + '·(1/x) = ' + k + '.' },
            { e: M.add(M.coef(k, M.ln(M.X)), M.div(M.num(k), M.X)), why: 'Во втором слагаемом x сокращается: ' + u0 + '·(1/x) = ' + k + ', дробь не остаётся.' }
          ],
          steps: [
            st('Обозначим множители', 'u = ' + u0 + ', v = ln x'),
            st('Их производные', 'u' + PRIME + ' = ' + k + ', v' + PRIME + ' = ' + h(M.div(M.num(1), M.X))),
            st('Подставляем в формулу произведения',
              'f' + PRIME + '(x) = ' + k + '·ln x + ' + u0 + '·' + h(M.div(M.num(1), M.X))),
            st('Во втором слагаемом x сокращается',
              'f' + PRIME + '(x) = ' + h(ans0))
          ]
        };
      }

      var n = ri(2, 4);
      var u = M.powx(k, n);              // k·xⁿ
      var du = M.powx(k * n, n - 1);     // k·n·xⁿ⁻¹
      var v, vName, dvHtml, term2, prodWrong, flippedTerm2, extraRule;

      if (kind === 'sin') {
        v = M.sin(M.X); vName = 'sin x'; dvHtml = 'cos x'; extraRule = 'trig';
        term2 = M.mul(u, M.cos(M.X));
        prodWrong = M.mul(du, M.cos(M.X));
        flippedTerm2 = M.neg(M.mul(u, M.cos(M.X)));
      } else if (kind === 'cos') {
        v = M.cos(M.X); vName = 'cos x'; dvHtml = '−sin x'; extraRule = 'trig';
        term2 = M.neg(M.mul(u, M.sin(M.X)));
        prodWrong = M.neg(M.mul(du, M.sin(M.X)));
        flippedTerm2 = M.mul(u, M.sin(M.X));
      } else {
        v = M.exp(M.X); vName = 'eˣ'; dvHtml = 'eˣ'; extraRule = 'expo';
        term2 = M.mul(u, M.exp(M.X));
        prodWrong = M.mul(du, M.exp(M.X));
        flippedTerm2 = null;
      }

      var f = M.mul(u, v);
      var term1 = M.mul(du, v);
      var ans = M.add(term1, term2);
      var dvShown = dvHtml.charAt(0) === '−' ? '(' + dvHtml + ')' : dvHtml;

      var wrong = [
        { e: prodWrong, why: 'Производная произведения вычислена как произведение производных. Верная формула: (uv)' + PRIME + ' = u' + PRIME + 'v + uv' + PRIME + '.' },
        { e: term2, why: 'Утрачено первое слагаемое u' + PRIME + 'v = ' + h(term1) + '.' },
        { e: term1, why: 'Утрачено второе слагаемое uv' + PRIME + ' = ' + h(term2) + '.' }
      ];
      if (flippedTerm2) {
        wrong.unshift({
          e: M.add(term1, flippedTerm2),
          why: kind === 'cos'
            ? 'Нарушен знак: (cos x)' + PRIME + ' = −sin x, минус потерян.'
            : 'Лишний минус: (sin x)' + PRIME + ' = cos x, знак не меняется.'
        });
      }
      return {
        kind: 'choice',
        rules: ['product', extraRule],
        prompt: 'Найдите производную функции',
        fx: f,
        answer: ans,
        wrong: wrong,
        steps: [
          st('Обозначим множители', 'u = ' + h(u) + ', v = ' + vName),
          st('Их производные', 'u' + PRIME + ' = ' + h(du) + ', v' + PRIME + ' = ' + dvHtml),
          st('Подставляем в формулу (u·v)' + PRIME + ' = u' + PRIME + 'v + uv' + PRIME,
            'f' + PRIME + '(x) = ' + h(du) + '·' + vName + ' + ' + h(u) + '·' + dvShown),
          st('Приводим знаки', 'f' + PRIME + '(x) = ' + h(ans))
        ]
      };
    }
  });

  T.push({
    id: 'quotlin', section: 'product', rules: ['quotient'], weight: 3,
    gen: function () {
      var a, b, c, dd, det;
      do {
        a = nzi(1, 5); b = nzi(1, 6); c = nzi(1, 4); dd = nzi(1, 6);
        det = a * dd - b * c;
      } while (det === 0);
      var u = M.lin(a, b), v = M.lin(c, dd);
      var f = M.div(u, v);
      var v2 = M.pow(v, 2);
      var ans = M.div(M.num(det), v2);
      return {
        kind: 'choice',
        prompt: 'Найдите производную функции',
        fx: f,
        answer: ans,
        wrong: [
          { e: ratio(a, c), why: 'Производная частного не равна частному производных. Применяется формула (u/v)' + PRIME + ' = (u' + PRIME + 'v − uv' + PRIME + ') / v².' },
          { e: M.div(M.num(-det), v2), why: 'Нарушен порядок в числителе: сначала u' + PRIME + 'v, потом вычитаем uv' + PRIME + '.' },
          { e: M.div(M.num(det), v), why: 'Знаменатель возводится в квадрат.' },
          { e: M.div(M.num(a * dd + b * c), v2), why: 'В числителе формулы стоит минус, а не плюс.' }
        ],
        steps: [
          st('Обозначим числитель и знаменатель',
            'u = ' + h(u) + ', v = ' + h(v)),
          st('Их производные',
            'u' + PRIME + ' = ' + a + ', v' + PRIME + ' = ' + c),
          st('Подставляем в формулу (u/v)' + PRIME + ' = (u' + PRIME + 'v − uv' + PRIME + ') / v²',
            'f' + PRIME + '(x) = ' + h(M.div(M.add(M.mul(M.num(a), v), M.neg(M.mul(u, M.num(c)))), v2))),
          st('Раскрываем числитель: слагаемые с x сокращаются',
            a + '·(' + h(v) + ') − ' + c + '·(' + h(u) + ') = ' + M.fmtNum(det)),
          st('Ответ', 'f' + PRIME + '(x) = ' + h(ans))
        ]
      };
    }
  });

  T.push({
    id: 'quotfn', section: 'product', rules: ['quotient'], weight: 2,
    gen: function () {
      var kind = pick(['sin', 'cos', 'exp', 'ln']);
      var k = ri(1, 9);
      var x2 = M.pow(M.X, 2);
      var u, du, kdu, uName, extra, inner, innerSwapped;

      if (kind === 'cos') {
        u = M.cos(M.X); du = M.neg(M.sin(M.X)); uName = 'cos x'; extra = 'trig';
        kdu = M.neg(M.coef(k, M.sin(M.X)));
        inner = M.add(M.neg(M.mul(M.X, M.sin(M.X))), M.neg(M.cos(M.X)));
        innerSwapped = M.add(M.cos(M.X), M.mul(M.X, M.sin(M.X)));
      } else if (kind === 'sin') {
        u = M.sin(M.X); du = M.cos(M.X); uName = 'sin x'; extra = 'trig';
        kdu = M.coef(k, M.cos(M.X));
        inner = M.add(M.mul(M.X, M.cos(M.X)), M.neg(M.sin(M.X)));
        innerSwapped = M.add(M.sin(M.X), M.neg(M.mul(M.X, M.cos(M.X))));
      } else if (kind === 'exp') {
        u = M.exp(M.X); du = M.exp(M.X); uName = 'eˣ'; extra = 'expo';
        kdu = M.coef(k, M.exp(M.X));
        inner = M.add(M.mul(M.X, M.exp(M.X)), M.neg(M.exp(M.X)));
        innerSwapped = M.add(M.exp(M.X), M.neg(M.mul(M.X, M.exp(M.X))));
      } else {
        u = M.ln(M.X); du = M.div(M.num(1), M.X); uName = 'ln x'; extra = 'log';
        kdu = M.div(M.num(k), M.X);
        inner = M.add(M.num(1), M.neg(M.ln(M.X)));
        innerSwapped = M.add(M.ln(M.X), M.num(-1));
      }

      var ku = M.coef(k, u);                                   // k·u
      var f = M.div(ku, M.X);
      var numer = k === 1 ? inner : M.mul(M.num(k), inner);    // k(…) — скобка не раскрывается
      var ans = M.div(numer, x2);
      var swapped = M.div(k === 1 ? innerSwapped : M.mul(M.num(k), innerSwapped), x2);

      return {
        kind: 'choice',
        rules: ['quotient', extra],
        prompt: 'Найдите производную функции',
        fx: f,
        answer: ans,
        wrong: [
          { e: kdu, why: 'Производная частного не равна частному производных: u' + PRIME + '/v' + PRIME + ' здесь не работает.' },
          { e: swapped, why: 'Нарушен порядок в числителе: верная запись u' + PRIME + 'v − uv' + PRIME + '.' },
          { e: M.div(numer, M.X), why: 'Знаменатель возводится в квадрат: v² = x².' }
        ],
        steps: [
          st('Обозначим числитель и знаменатель', 'u = ' + h(ku) + ', v = x'),
          st('Их производные', 'u' + PRIME + ' = ' + h(kdu) + ', v' + PRIME + ' = 1'),
          st('Подставляем в формулу (u/v)' + PRIME + ' = (u' + PRIME + 'v − uv' + PRIME + ') / v²',
            'f' + PRIME + '(x) = ' + frac(h(kdu) + '·x − ' + h(ku) + '·1', h(x2))),
          st('Упрощаем числитель', 'f' + PRIME + '(x) = ' + h(ans))
        ]
      };
    }
  });

  T.push({
    id: 'prodtrig', section: 'product', rules: ['product', 'trig'], weight: 3,
    gen: function () {
      var kind = pick(['expsin', 'expcos', 'sincos', 'xtg']);
      var ex = M.exp(M.X), sx = M.sin(M.X), cx = M.cos(M.X);
      var cos2 = M.pow(cx, 2);

      if (kind === 'expsin' || kind === 'expcos') {
        var isSin = kind === 'expsin';
        var v = isSin ? sx : cx;
        var t1 = M.mul(ex, v);
        var t2 = isSin ? M.mul(ex, cx) : M.neg(M.mul(ex, sx));
        var ansE = M.add(t1, t2);
        return {
          kind: 'choice', rules: ['product', 'trig', 'expo'],
          prompt: 'Найдите производную функции',
          fx: M.mul(ex, v),
          answer: ansE,
          wrong: [
            { e: M.mul(ex, isSin ? cx : M.neg(sx)), why: 'Производная произведения вычислена как произведение производных. Верная формула: (uv)' + PRIME + ' = u' + PRIME + 'v + uv' + PRIME + '.' },
            {
              e: M.add(t1, isSin ? M.neg(M.mul(ex, cx)) : M.mul(ex, sx)),
              why: isSin
                ? 'Лишний знак минус: (sin x)' + PRIME + ' = cos x.'
                : 'Пропущен знак минус: (cos x)' + PRIME + ' = −sin x.'
            },
            { e: t1, why: 'Утрачено второе слагаемое uv' + PRIME + ' = ' + h(t2) + '.' },
            { e: t2, why: 'Утрачено первое слагаемое u' + PRIME + 'v = ' + h(t1) + '.' }
          ],
          steps: [
            st('Обозначим множители', 'u = eˣ, v = ' + (isSin ? 'sin x' : 'cos x')),
            st('Их производные', 'u' + PRIME + ' = eˣ, v' + PRIME + ' = ' + (isSin ? 'cos x' : '−sin x')),
            st('Подставляем в формулу (u·v)' + PRIME + ' = u' + PRIME + 'v + uv' + PRIME,
              'f' + PRIME + '(x) = ' + h(t1) + ' + eˣ·(' + (isSin ? 'cos x' : '−sin x') + ')'),
            st('Приводим знаки', 'f' + PRIME + '(x) = ' + h(ansE))
          ]
        };
      }

      if (kind === 'sincos') {
        var ansC = M.add(cos2, M.neg(M.pow(sx, 2)));
        return {
          kind: 'choice', rules: ['product', 'trig'],
          prompt: 'Найдите производную функции',
          fx: M.mul(sx, cx),
          answer: ansC,
          wrong: [
            { e: M.neg(M.mul(cx, sx)), why: 'Производная произведения вычислена как произведение производных: cos x·(−sin x).' },
            { e: M.add(cos2, M.pow(sx, 2)), why: 'Пропущен знак минус: (cos x)' + PRIME + ' = −sin x, поэтому второе слагаемое отрицательное.' },
            { e: cos2, why: 'Утрачено второе слагаемое uv' + PRIME + ' = −sin²x.' },
            { e: M.add(M.pow(sx, 2), M.neg(cos2)), why: 'Слагаемые переставлены местами вместе со знаком.' }
          ],
          steps: [
            st('Обозначим множители', 'u = sin x, v = cos x'),
            st('Их производные', 'u' + PRIME + ' = cos x, v' + PRIME + ' = −sin x'),
            st('Подставляем в формулу произведения',
              'f' + PRIME + '(x) = cos x·cos x + sin x·(−sin x)'),
            st('Записываем ответ', 'f' + PRIME + '(x) = ' + h(ansC))
          ]
        };
      }

      // x · tg x
      var tt = M.tg(M.X);
      var t2x = M.div(M.X, cos2);
      var ansT = M.add(tt, t2x);
      return {
        kind: 'choice', rules: ['product', 'trig'],
        prompt: 'Найдите производную функции',
        fx: M.mul(M.X, tt),
        answer: ansT,
        wrong: [
          { e: M.div(M.num(1), cos2), why: 'Производная произведения вычислена как произведение производных.' },
          { e: tt, why: 'Утрачено второе слагаемое uv' + PRIME + ' = ' + h(t2x) + '.' },
          { e: M.add(tt, M.div(M.X, cx)), why: 'Косинус в знаменателе стоит в квадрате.' },
          { e: M.add(tt, M.div(M.num(1), cos2)), why: 'Не учтён множитель x: второе слагаемое равно x·(tg x)' + PRIME + '.' }
        ],
        steps: [
          st('Обозначим множители', 'u = x, v = tg x'),
          st('Их производные', 'u' + PRIME + ' = 1, v' + PRIME + ' = ' + h(M.div(M.num(1), cos2))),
          st('Подставляем в формулу произведения',
            'f' + PRIME + '(x) = 1·tg x + x·' + h(M.div(M.num(1), cos2))),
          st('Записываем ответ', 'f' + PRIME + '(x) = ' + h(ansT))
        ]
      };
    }
  });

  // --- Раздел 3: сложная функция ---

  T.push({
    id: 'chainpow', section: 'chain', rules: ['chain', 'power'], weight: 3,
    gen: function () {
      var a = nzi(2, 5), b = nzi(1, 7), n = ri(2, 5);
      var g = M.lin(a, b);
      var f = M.pow(g, n);
      var ans = M.coef(n * a, M.pow(g, n - 1));
      return {
        kind: 'choice',
        prompt: 'Найдите производную функции',
        fx: f,
        answer: ans,
        wrong: [
          { e: M.coef(n, M.pow(g, n - 1)), why: 'Не учтена производная внутренней функции. g(x) = ' + h(g) + ', g' + PRIME + '(x) = ' + a + ' Умножение на неё обязательно.' },
          { e: M.coef(n * a, M.pow(g, n)), why: 'Показатель не уменьшен на единицу.' },
          { e: M.coef(a, M.pow(g, n - 1)), why: 'Не выполнено умножение на показатель n = ' + n + '.' },
          { e: M.coef(n * a, M.pow(M.X, n - 1)), why: 'Внутренняя функция сохраняется в основании степени и не заменяется на x.' }
        ],
        steps: [
          st('Сложная функция: внешняя функция — степень, внутренняя — выражение в скобках',
            'g(x) = ' + h(g) + ', f(x) = g(x)' + (n === 2 ? '²' : 'ⁿ') + ', n = ' + n),
          st('Цепное правило: производная внешней, затем умножаем на производную внутренней',
            'f' + PRIME + '(x) = ' + n + '·(' + h(g) + ')' + (n - 1 === 1 ? '' : '<sup>' + (n - 1) + '</sup>') + '·g' + PRIME + '(x)'),
          st('Производная внутренней функции',
            'g' + PRIME + '(x) = ' + d(g) + ' = ' + a),
          st('Перемножаем числовые множители',
            'f' + PRIME + '(x) = ' + h(ans))
        ]
      };
    }
  });

  T.push({
    id: 'chaintrig', section: 'chain', rules: ['chain', 'trig'], weight: 3,
    gen: function () {
      var a = nzi(2, 5), b = nzi(1, 6);
      var g = M.lin(a, b);
      var isSin = Math.random() < 0.5;
      var f = isSin ? M.sin(g) : M.cos(g);
      var ans = isSin ? M.coef(a, M.cos(g)) : M.coef(-a, M.sin(g));
      var wrong = isSin
        ? [
          { e: M.cos(g), why: 'Не выполнено умножение на производную внутренней функции: g' + PRIME + '(x) = ' + a + '.' },
          { e: M.coef(a, M.sin(g)), why: 'Производная синуса равна косинусу: функция изменяется.' },
          { e: M.coef(-a, M.cos(g)), why: 'Добавлен лишний знак минус: он появляется у производной косинуса.' }
        ]
        : [
          { e: M.coef(a, M.sin(g)), why: 'Пропущен знак минус: (cos t)' + PRIME + ' = −sin t.' },
          { e: M.neg(M.sin(g)), why: 'Не выполнено умножение на производную внутренней функции: g' + PRIME + '(x) = ' + a + '.' },
          { e: M.coef(-a, M.cos(g)), why: 'Производная косинуса равна синусу со знаком минус: функция изменяется.' }
        ];
      return {
        kind: 'choice',
        prompt: 'Найдите производную функции',
        fx: f,
        answer: ans,
        wrong: wrong,
        steps: [
          st('Внутренняя функция — аргумент под знаком ' + (isSin ? 'синуса' : 'косинуса'),
            'g(x) = ' + h(g) + ', g' + PRIME + '(x) = ' + a),
          st('Производная внешней функции',
            isSin ? '(sin t)' + PRIME + ' = cos t' : '(cos t)' + PRIME + ' = −sin t'),
          st('Цепное правило: умножаем на производную внутренней',
            'f' + PRIME + '(x) = ' + (isSin ? '' : '−') + h(isSin ? M.cos(g) : M.sin(g)) + '·' + M.fmtNum(a)),
          st('Ответ', 'f' + PRIME + '(x) = ' + h(ans))
        ]
      };
    }
  });

  T.push({
    id: 'chainexp', section: 'chain', rules: ['chain', 'expo'], weight: 3,
    gen: function () {
      var a = nzi(2, 5), b = nzi(1, 6);
      var g = M.lin(a, b);
      var f = M.exp(g);
      var ans = M.coef(a, M.exp(g));
      return {
        kind: 'choice',
        prompt: 'Найдите производную функции',
        fx: f,
        answer: ans,
        wrong: [
          { e: f, why: 'Не учтён множитель g' + PRIME + '(x) = ' + a + '. Без внутренней производной формула верна только для eˣ.' },
          { e: M.mul(g, M.exp(g)), why: 'Выполнено умножение на саму внутреннюю функцию вместо её производной: g' + PRIME + '(x) = ' + a + '.' },
          { e: M.coef(a, M.exp(M.X)), why: 'Показатель степени сохраняется целиком: e в степени ' + h(g) + '.' }
        ],
        steps: [
          st('Внутренняя функция — показатель степени',
            'g(x) = ' + h(g) + ', g' + PRIME + '(x) = ' + a),
          st('Производная внешней функции: экспонента не меняется',
            '(eᵗ)' + PRIME + ' = eᵗ'),
          st('Цепное правило',
            'f' + PRIME + '(x) = ' + h(f) + '·' + M.fmtNum(a) + ' = ' + h(ans))
        ]
      };
    }
  });

  T.push({
    id: 'chainlog', section: 'chain', rules: ['chain', 'log'], weight: 3,
    gen: function () {
      // Коэффициент положительный: иначе область определения ln(ax+b)
      // уезжает в отрицательные x, а это лишняя сложность для школьной задачи.
      var a = ri(2, 6), b = ri(1, 7);
      var g = M.lin(a, b);
      var f = M.ln(g);
      var ans = M.div(M.num(a), g);
      return {
        kind: 'choice',
        prompt: 'Найдите производную функции',
        fx: f,
        answer: ans,
        wrong: [
          { e: M.div(M.num(1), g), why: 'Не учтена производная внутренней функции: в числителе должно стоять g' + PRIME + '(x) = ' + a + '.' },
          { e: M.div(M.num(1), M.X), why: 'Приведена производная ln x. Под логарифмом стоит ' + h(g) + ', и она сохраняется в знаменателе.' },
          { e: M.div(g, M.num(a)), why: 'Дробь перевёрнута: (ln g)' + PRIME + ' = g' + PRIME + ' / g.' },
          { e: M.div(M.num(a), M.X), why: 'В знаменателе остаётся вся внутренняя функция ' + h(g) + ', а не просто x.' }
        ],
        steps: [
          st('Внутренняя функция — выражение под логарифмом',
            'g(x) = ' + h(g) + ', g' + PRIME + '(x) = ' + a),
          st('Производная внешней функции',
            '(ln t)' + PRIME + ' = ' + h(M.div(M.num(1), M.V('t')))),
          st('Цепное правило: 1/g умножаем на g' + PRIME,
            'f' + PRIME + '(x) = ' + h(M.div(M.num(1), g)) + '·' + M.fmtNum(a) + ' = ' + h(ans))
        ]
      };
    }
  });

  T.push({
    id: 'chainsqrt', section: 'chain', rules: ['chain', 'root'], weight: 2,
    gen: function () {
      var a = ri(2, 6), b = ri(1, 7) * (Math.random() < 0.4 ? -1 : 1);
      var g = M.lin(a, b);
      var f = M.sqrt(g);
      var ans = M.div(M.num(a), M.mul(M.num(2), M.sqrt(g)));
      return {
        kind: 'choice',
        prompt: 'Найдите производную функции',
        fx: f,
        answer: ans,
        wrong: [
          { e: M.div(M.num(1), M.mul(M.num(2), M.sqrt(g))), why: 'Не учтена производная внутренней функции: g' + PRIME + '(x) = ' + a + '.' },
          { e: M.div(M.num(a), M.sqrt(g)), why: 'Утрачен множитель ½ из формулы (√t)' + PRIME + ' = 1/(2√t).' },
          { e: M.div(M.num(a), M.mul(M.num(2), g)), why: 'Корень в знаменателе сохраняется.' }
        ],
        steps: [
          st('Внутренняя функция — выражение под корнем',
            'g(x) = ' + h(g) + ', g' + PRIME + '(x) = ' + a),
          st('Производная внешней функции',
            '(√t)' + PRIME + ' = ' + h(M.div(M.num(1), M.mul(M.num(2), M.sqrt(M.V('t')))))),
          st('Цепное правило',
            'f' + PRIME + '(x) = ' + h(M.div(M.num(1), M.mul(M.num(2), M.sqrt(g)))) + '·' + M.fmtNum(a) + ' = ' + h(ans))
        ]
      };
    }
  });

  T.push({
    id: 'chaintg', section: 'chain', rules: ['chain', 'trig'], weight: 2,
    gen: function () {
      var a = nzi(2, 5), b = nzi(1, 6);
      var g = M.lin(a, b);
      var cos2 = M.pow(M.cos(g), 2), sin2 = M.pow(M.sin(g), 2);
      var ans = M.div(M.num(a), cos2);
      return {
        kind: 'choice',
        prompt: 'Найдите производную функции',
        fx: M.tg(g),
        answer: ans,
        wrong: [
          { e: M.div(M.num(1), cos2), why: 'Не учтена производная внутренней функции: g' + PRIME + '(x) = ' + a + '.' },
          { e: M.div(M.num(-a), sin2), why: 'Приведена производная котангенса: (ctg t)' + PRIME + ' = −1/sin²t.' },
          { e: M.div(M.num(a), M.cos(g)), why: 'Косинус в знаменателе стоит в квадрате.' },
          { e: M.div(M.num(a), M.pow(M.cos(M.X), 2)), why: 'Внутренняя функция сохраняется и под знаком косинуса.' }
        ],
        steps: [
          st('Внутренняя функция — аргумент тангенса',
            'g(x) = ' + h(g) + ', g' + PRIME + '(x) = ' + M.fmtNum(a)),
          st('Табличная производная тангенса',
            '(tg t)' + PRIME + ' = ' + h(M.div(M.num(1), M.pow(M.cos(M.V('t')), 2)))),
          st('Цепное правило',
            'f' + PRIME + '(x) = ' + h(M.div(M.num(1), cos2)) + '·' + M.fmtNum(a) + ' = ' + h(ans))
        ]
      };
    }
  });

  T.push({
    id: 'chainquad', section: 'chain', rules: ['chain', 'power'], weight: 4,
    gen: function () {
      // Внутренняя функция квадратичная: g(x) = a·x² + b, g′(x) = 2a·x
      var kind = pick(['pow', 'exp', 'ln', 'sqrt']);
      var positive = kind === 'ln' || kind === 'sqrt';
      var a = positive ? ri(1, 4) : nzi(1, 4);
      var b = positive ? ri(1, 9) : nzi(1, 9);
      var g = M.add(M.powx(a, 2), M.num(b));
      var dg = M.powx(2 * a, 1);

      if (kind === 'pow') {
        var n = ri(2, 3);
        var ansP = M.mul(M.powx(2 * a * n, 1), M.pow(g, n - 1));
        return {
          kind: 'choice', rules: ['chain', 'power'],
          prompt: 'Найдите производную функции',
          fx: M.pow(g, n),
          answer: ansP,
          wrong: [
            { e: M.coef(n, M.pow(g, n - 1)), why: 'Не учтена производная внутренней функции: g' + PRIME + '(x) = ' + h(dg) + '.' },
            { e: M.mul(M.powx(2 * a * n, 1), M.pow(g, n)), why: 'Показатель не уменьшен на единицу.' },
            { e: M.mul(dg, M.pow(g, n - 1)), why: 'Не выполнено умножение на показатель n = ' + n + '.' }
          ],
          steps: [
            st('Внутренняя функция — выражение в скобках',
              'g(x) = ' + h(g) + ', g' + PRIME + '(x) = ' + h(dg)),
            st('Цепное правило для степени',
              'f' + PRIME + '(x) = ' + n + '·(' + h(g) + ')<sup>' + (n - 1) + '</sup>·' + h(dg)),
            st('Перемножаем числовые множители',
              'f' + PRIME + '(x) = ' + h(ansP))
          ]
        };
      }
      if (kind === 'exp') {
        var ansE = M.mul(M.powx(2 * a, 1), M.exp(g));
        return {
          kind: 'choice', rules: ['chain', 'expo'],
          prompt: 'Найдите производную функции',
          fx: M.exp(g),
          answer: ansE,
          wrong: [
            { e: M.exp(g), why: 'Не учтён множитель g' + PRIME + '(x) = ' + h(dg) + '. Без него формула верна только для eˣ.' },
            { e: M.mul(g, M.exp(g)), why: 'Выполнено умножение на саму внутреннюю функцию вместо её производной.' },
            { e: M.mul(M.powx(2 * a, 1), M.exp(M.X)), why: 'Показатель степени сохраняется целиком.' }
          ],
          steps: [
            st('Внутренняя функция — показатель степени',
              'g(x) = ' + h(g) + ', g' + PRIME + '(x) = ' + h(dg)),
            st('Экспонента не меняется', '(eᵗ)' + PRIME + ' = eᵗ'),
            st('Цепное правило',
              'f' + PRIME + '(x) = ' + h(M.exp(g)) + '·' + h(dg) + ' = ' + h(ansE))
          ]
        };
      }
      if (kind === 'ln') {
        var ansL = M.div(dg, g);
        return {
          kind: 'choice', rules: ['chain', 'log'],
          prompt: 'Найдите производную функции',
          fx: M.ln(g),
          answer: ansL,
          wrong: [
            { e: M.div(M.num(1), g), why: 'Не учтена производная внутренней функции: в числителе должно стоять g' + PRIME + '(x) = ' + h(dg) + '.' },
            { e: M.div(M.num(1), M.X), why: 'Приведена производная ln x. Под логарифмом стоит ' + h(g) + '.' },
            { e: M.div(g, dg), why: 'Дробь перевёрнута: (ln g)' + PRIME + ' = g' + PRIME + ' / g.' }
          ],
          steps: [
            st('Внутренняя функция — выражение под логарифмом',
              'g(x) = ' + h(g) + ', g' + PRIME + '(x) = ' + h(dg)),
            st('Табличная производная логарифма',
              '(ln t)' + PRIME + ' = ' + h(M.div(M.num(1), M.V('t')))),
            st('Цепное правило',
              'f' + PRIME + '(x) = ' + h(ansL))
          ]
        };
      }
      // sqrt: (√g)′ = g′/(2√g) = a·x/√g
      var ansS = M.div(M.powx(a, 1), M.sqrt(g));
      return {
        kind: 'choice', rules: ['chain', 'root'],
        prompt: 'Найдите производную функции',
        fx: M.sqrt(g),
        answer: ansS,
        wrong: [
          { e: M.div(M.num(1), M.mul(M.num(2), M.sqrt(g))), why: 'Не учтена производная внутренней функции: g' + PRIME + '(x) = ' + h(dg) + '.' },
          { e: M.div(dg, M.sqrt(g)), why: 'Утрачен множитель ½ из формулы (√t)' + PRIME + ' = 1/(2√t).' },
          { e: M.div(M.powx(a, 1), g), why: 'Корень в знаменателе сохраняется.' }
        ],
        steps: [
          st('Внутренняя функция — выражение под корнем',
            'g(x) = ' + h(g) + ', g' + PRIME + '(x) = ' + h(dg)),
          st('Табличная производная корня',
            '(√t)' + PRIME + ' = ' + h(M.div(M.num(1), M.mul(M.num(2), M.sqrt(M.V('t')))))),
          st('Цепное правило и сокращение на 2',
            'f' + PRIME + '(x) = ' + h(M.div(dg, M.mul(M.num(2), M.sqrt(g)))) + ' = ' + h(ansS))
        ]
      };
    }
  });

  T.push({
    id: 'chaintrigpow', section: 'chain', rules: ['chain', 'trig'], weight: 2,
    gen: function () {
      // Степень тригонометрической функции: (sinⁿx)′ = n·sinⁿ⁻¹x·cos x
      var isSin = Math.random() < 0.5;
      var n = ri(2, 3);
      var base = isSin ? M.sin(M.X) : M.cos(M.X);
      var inner = isSin ? M.cos(M.X) : M.sin(M.X);
      var low = n - 1 === 1 ? base : M.pow(base, n - 1);
      var ans = isSin
        ? M.mul(M.coef(n, low), inner)
        : M.neg(M.mul(M.coef(n, low), inner));
      return {
        kind: 'choice',
        prompt: 'Найдите производную функции',
        fx: M.pow(base, n),
        answer: ans,
        wrong: [
          { e: M.coef(n, low), why: 'Не учтена производная внутренней функции: (' + (isSin ? 'sin x' : 'cos x') + ')' + PRIME + ' = ' + (isSin ? 'cos x' : '−sin x') + '.' },
          {
            e: isSin ? M.neg(M.mul(M.coef(n, low), inner)) : M.mul(M.coef(n, low), inner),
            why: isSin
              ? 'Лишний знак минус: минус появляется у производной косинуса.'
              : 'Пропущен знак минус: (cos x)' + PRIME + ' = −sin x.'
          },
          { e: M.mul(M.coef(n, M.pow(base, n)), inner), why: 'Показатель не уменьшен на единицу.' },
          { e: M.mul(M.coef(n, low), base), why: 'Внутренняя производная меняет функцию: синус переходит в косинус, а косинус в синус.' }
        ],
        steps: [
          st('Внешняя функция — степень, внутренняя — ' + (isSin ? 'синус' : 'косинус'),
            'f(x) = (' + (isSin ? 'sin x' : 'cos x') + ')<sup>' + n + '</sup>'),
          st('Цепное правило для степени',
            'f' + PRIME + '(x) = ' + n + '·(' + (isSin ? 'sin x' : 'cos x') + ')<sup>' + (n - 1) + '</sup>·(' + (isSin ? 'sin x' : 'cos x') + ')' + PRIME),
          st('Производная внутренней функции',
            '(' + (isSin ? 'sin x' : 'cos x') + ')' + PRIME + ' = ' + (isSin ? 'cos x' : '−sin x')),
          st('Собираем ответ', 'f' + PRIME + '(x) = ' + h(ans))
        ]
      };
    }
  });

  // --- Раздел 4: элементарные функции ---

  T.push({
    id: 'triglin', section: 'funcs', rules: ['trig', 'sum'], weight: 3,
    gen: function () {
      var a = nzi(2, 8), b = nzi(2, 8);
      var f = M.add(M.coef(a, M.sin(M.X)), M.coef(b, M.cos(M.X)));
      var ans = M.add(M.coef(a, M.cos(M.X)), M.coef(-b, M.sin(M.X)));
      return {
        kind: 'choice',
        prompt: 'Найдите производную функции',
        fx: f,
        answer: ans,
        wrong: [
          { e: M.add(M.coef(a, M.cos(M.X)), M.coef(b, M.sin(M.X))), why: 'Нарушен знак: (cos x)' + PRIME + ' = −sin x, минус потерян.' },
          { e: M.add(M.coef(-a, M.sin(M.X)), M.coef(b, M.cos(M.X))), why: 'Производные синуса и косинуса переставлены местами.' },
          { e: M.coef(a, M.cos(M.X)), why: 'Утрачено второе слагаемое.' },
          { e: M.add(M.coef(a, M.sin(M.X)), M.coef(-b, M.cos(M.X))), why: 'Сами функции не изменены: синус переходит в косинус, а косинус в синус.' }
        ],
        steps: [
          st('Дифференцируем каждое слагаемое',
            'f' + PRIME + '(x) = ' + a + '·(sin x)' + PRIME + ' + ' + M.fmtNum(b) + '·(cos x)' + PRIME),
          st('Табличные производные',
            '(sin x)' + PRIME + ' = cos x, (cos x)' + PRIME + ' = −sin x'),
          st('Подставляем табличные производные и учитываем знак',
            'f' + PRIME + '(x) = ' + h(ans))
        ]
      };
    }
  });

  T.push({
    id: 'expmix', section: 'funcs', rules: ['expo', 'power', 'sum'], weight: 2,
    gen: function () {
      var a = nzi(2, 7), b = nzi(2, 6), n = ri(2, 4);
      var f = M.add(M.coef(a, M.exp(M.X)), M.powx(b, n));
      var ans = M.add(M.coef(a, M.exp(M.X)), M.powx(b * n, n - 1));
      return {
        kind: 'choice',
        prompt: 'Найдите производную функции',
        fx: f,
        answer: ans,
        wrong: [
          { e: M.add(M.coef(a, M.exp(M.X)), M.powx(b * n, n)), why: 'Во втором слагаемом показатель не уменьшен на единицу.' },
          { e: M.add(M.exp(M.X), M.powx(b * n, n - 1)), why: 'Утрачен коэффициент ' + a + ' перед eˣ.' },
          { e: M.add(M.coef(a, M.exp(M.X)), M.powx(b, n - 1)), why: 'Во втором слагаемом забыли умножить на показатель ' + n + '.' },
          { e: M.add(M.coef(a, M.exp(M.X)), M.powx(b, n)), why: 'Второе слагаемое не продифференцировано.' }
        ],
        steps: [
          st('Дифференцируем по слагаемым',
            'f' + PRIME + '(x) = ' + a + '·(eˣ)' + PRIME + ' + ' + d(M.powx(b, n))),
          st('Экспонента не меняется',
            '(eˣ)' + PRIME + ' = eˣ'),
          st('Второе слагаемое — правило степени',
            d(M.powx(b, n)) + ' = ' + h(M.powx(b * n, n - 1))),
          st('Ответ', 'f' + PRIME + '(x) = ' + h(ans))
        ]
      };
    }
  });

  T.push({
    id: 'apow', section: 'funcs', rules: ['expo'], weight: 2,
    gen: function () {
      var a = pick([2, 3, 5, 7]), c = nzi(2, 8);
      var ax = M.pow(M.num(a), M.X);
      var f = M.add(ax, M.coef(c, M.X));
      var ans = M.add(M.mul(ax, M.ln(M.num(a))), M.num(c));
      return {
        kind: 'choice',
        prompt: 'Найдите производную функции',
        fx: f,
        answer: ans,
        wrong: [
          { e: M.add(ax, M.num(c)), why: 'Не учтён множитель ln ' + a + '. Без него формула верна только для основания e.' },
          { e: M.add(M.mul(M.X, M.pow(M.num(a), M.add(M.X, M.num(-1)))), M.num(c)), why: 'К показательной функции применено правило степени. Переменная находится в показателе, а не в основании.' },
          { e: M.add(M.div(ax, M.ln(M.num(a))), M.num(c)), why: 'ln ' + a + ' — множитель, а не делитель.' },
          { e: M.add(M.mul(ax, M.ln(M.X)), M.num(c)), why: 'В формуле стоит ln основания (число), а не ln x.' }
        ],
        steps: [
          st('Формула производной показательной функции',
            '(aˣ)' + PRIME + ' = aˣ·ln a'),
          st('Подставляем основание a = ' + a,
            d(ax) + ' = ' + h(M.mul(ax, M.ln(M.num(a))))),
          st('Второе слагаемое линейно',
            d(M.coef(c, M.X)) + ' = ' + M.fmtNum(c)),
          st('Ответ', 'f' + PRIME + '(x) = ' + h(ans))
        ]
      };
    }
  });

  T.push({
    id: 'logmix', section: 'funcs', rules: ['log', 'power', 'sum'], weight: 2,
    gen: function () {
      var a = nzi(2, 8), b = nzi(2, 6), n = ri(2, 4);
      var f = M.add(M.coef(a, M.ln(M.X)), M.powx(b, n));
      var ans = M.add(M.div(M.num(a), M.X), M.powx(b * n, n - 1));
      return {
        kind: 'choice',
        prompt: 'Найдите производную функции',
        fx: f,
        answer: ans,
        wrong: [
          { e: M.add(M.div(M.num(-a), M.pow(M.X, 2)), M.powx(b * n, n - 1)), why: 'Приведена производная функции 1/x, а не ln x. Верная формула: (ln x)' + PRIME + ' = 1/x.' },
          { e: M.add(M.div(M.num(1), M.X), M.powx(b * n, n - 1)), why: 'Утрачен коэффициент ' + a + ' перед логарифмом.' },
          { e: M.add(M.div(M.num(a), M.X), M.powx(b * n, n)), why: 'Во втором слагаемом показатель не уменьшен.' },
          { e: M.add(M.div(M.num(a), M.X), M.powx(b, n)), why: 'Второе слагаемое не продифференцировано.' }
        ],
        steps: [
          st('Дифференцируем по слагаемым',
            'f' + PRIME + '(x) = ' + M.fmtNum(a) + '·(ln x)' + PRIME + ' + ' + d(M.powx(b, n))),
          st('Табличная производная логарифма',
            '(ln x)' + PRIME + ' = ' + h(M.div(M.num(1), M.X))),
          st('Второе слагаемое — правило степени',
            d(M.powx(b, n)) + ' = ' + h(M.powx(b * n, n - 1))),
          st('Ответ', 'f' + PRIME + '(x) = ' + h(ans))
        ]
      };
    }
  });

  T.push({
    id: 'tgx', section: 'funcs', rules: ['trig'], weight: 2,
    gen: function () {
      var a = nzi(2, 7), b = nzi(2, 9);
      var f = M.add(M.coef(a, M.tg(M.X)), M.coef(b, M.X));
      var cos2 = M.pow(M.cos(M.X), 2);
      var sin2 = M.pow(M.sin(M.X), 2);
      var ans = M.add(M.div(M.num(a), cos2), M.num(b));
      return {
        kind: 'choice',
        prompt: 'Найдите производную функции',
        fx: f,
        answer: ans,
        wrong: [
          { e: M.add(M.div(M.num(a), sin2), M.num(b)), why: 'В знаменателе стоит косинус: (tg x)' + PRIME + ' = 1/cos²x. С синусом получается производная котангенса.' },
          { e: M.add(M.div(M.num(-a), sin2), M.num(b)), why: 'Приведена производная котангенса: (ctg x)' + PRIME + ' = −1/sin²x.' },
          { e: M.add(M.div(M.num(a), M.cos(M.X)), M.num(b)), why: 'Косинус в знаменателе стоит в квадрате.' },
          { e: M.add(M.div(M.num(a), cos2), M.coef(b, M.X)), why: 'Слагаемое ' + h(M.coef(b, M.X)) + ' не продифференцировано.' }
        ],
        steps: [
          st('Дифференцируем по слагаемым',
            'f' + PRIME + '(x) = ' + M.fmtNum(a) + '·(tg x)' + PRIME + ' + ' + d(M.coef(b, M.X))),
          st('Табличная производная тангенса',
            '(tg x)' + PRIME + ' = ' + h(M.div(M.num(1), cos2))),
          st('Линейное слагаемое',
            d(M.coef(b, M.X)) + ' = ' + M.fmtNum(b)),
          st('Ответ', 'f' + PRIME + '(x) = ' + h(ans))
        ]
      };
    }
  });

  T.push({
    id: 'mixfuncs', section: 'funcs', rules: ['sum', 'trig'], weight: 4,
    gen: function () {
      // Сумма двух разных элементарных функций: даёт много различных форм
      var sin2 = M.pow(M.sin(M.X), 2), cos2 = M.pow(M.cos(M.X), 2);
      var pool = [
        { u: M.sin(M.X), d: M.cos(M.X), name: 'sin x', dName: 'cos x', rule: 'trig' },
        { u: M.cos(M.X), d: M.neg(M.sin(M.X)), dWrong: M.sin(M.X), name: 'cos x', dName: '−sin x', rule: 'trig' },
        { u: M.tg(M.X), d: M.div(M.num(1), cos2), name: 'tg x', dName: h(M.div(M.num(1), cos2)), rule: 'trig' },
        { u: M.fn('ctg', M.X), d: M.div(M.num(-1), sin2), dWrong: M.div(M.num(1), sin2), name: 'ctg x', dName: h(M.div(M.num(-1), sin2)), rule: 'trig' },
        { u: M.exp(M.X), d: M.exp(M.X), name: 'eˣ', dName: 'eˣ', rule: 'expo' },
        { u: M.ln(M.X), d: M.div(M.num(1), M.X), name: 'ln x', dName: h(M.div(M.num(1), M.X)), rule: 'log' },
        { u: M.sqrt(M.X), d: M.div(M.num(1), M.mul(M.num(2), M.sqrt(M.X))), name: '√x', dName: h(M.div(M.num(1), M.mul(M.num(2), M.sqrt(M.X)))), rule: 'root' }
      ];
      var i = ri(0, pool.length - 1), j;
      do { j = ri(0, pool.length - 1); } while (j === i);
      var p1 = pool[i], p2 = pool[j];
      var a = nzi(2, 9), b = nzi(2, 9);

      // Коэффициент вносим так, чтобы минус и дроби выглядели привычно
      function scaled(k, e) {
        if (e.t === 'neg') return M.neg(M.coef(k, e.a));
        if (e.t === 'div' && e.a.t === 'n') return M.div(M.num(e.a.v * k), e.b);
        return M.coef(k, e);
      }

      var f = M.add(M.coef(a, p1.u), M.coef(b, p2.u));
      var ans = M.add(scaled(a, p1.d), scaled(b, p2.d));

      var wrong = [
        { e: M.add(M.coef(a, p1.u), scaled(b, p2.d)), why: 'Первое слагаемое не продифференцировано.' },
        { e: M.add(scaled(a, p1.d), M.coef(b, p2.u)), why: 'Второе слагаемое не продифференцировано.' },
        { e: M.add(scaled(a, p2.d), scaled(b, p1.d)), why: 'Производные слагаемых переставлены местами.' }
      ];
      if (p1.dWrong) {
        wrong.unshift({
          e: M.add(scaled(a, p1.dWrong), scaled(b, p2.d)),
          why: 'В первом слагаемом пропущен знак минус: (' + p1.name + ')' + PRIME + ' = ' + p1.dName + '.'
        });
      } else if (p2.dWrong) {
        wrong.unshift({
          e: M.add(scaled(a, p1.d), scaled(b, p2.dWrong)),
          why: 'Во втором слагаемом пропущен знак минус: (' + p2.name + ')' + PRIME + ' = ' + p2.dName + '.'
        });
      } else {
        wrong.push({
          e: M.add(scaled(1, p1.d), scaled(b, p2.d)),
          why: 'В первом слагаемом утрачен коэффициент ' + M.fmtNum(a) + '.'
        });
      }

      var rules = ['sum'];
      [p1.rule, p2.rule].forEach(function (r) { if (rules.indexOf(r) === -1) rules.push(r); });

      return {
        kind: 'choice',
        rules: rules,
        prompt: 'Найдите производную функции',
        fx: f,
        answer: ans,
        wrong: wrong,
        steps: [
          st('Дифференцируем каждое слагаемое отдельно',
            'f' + PRIME + '(x) = ' + M.fmtNum(a) + '·(' + p1.name + ')' + PRIME + ' + ' + M.fmtNum(b) + '·(' + p2.name + ')' + PRIME),
          st('Табличные производные',
            '(' + p1.name + ')' + PRIME + ' = ' + p1.dName + ', (' + p2.name + ')' + PRIME + ' = ' + p2.dName),
          st('Подставляем и учитываем коэффициенты',
            'f' + PRIME + '(x) = ' + h(ans))
        ]
      };
    }
  });

  T.push({
    id: 'ctgx', section: 'funcs', rules: ['trig'], weight: 2,
    gen: function () {
      var a = nzi(2, 7), b = nzi(2, 9);
      var sin2 = M.pow(M.sin(M.X), 2), cos2 = M.pow(M.cos(M.X), 2);
      var f = M.add(M.coef(a, M.fn('ctg', M.X)), M.coef(b, M.X));
      var ans = M.add(M.div(M.num(-a), sin2), M.num(b));
      return {
        kind: 'choice',
        prompt: 'Найдите производную функции',
        fx: f,
        answer: ans,
        wrong: [
          { e: M.add(M.div(M.num(a), sin2), M.num(b)), why: 'Пропущен знак минус: (ctg x)' + PRIME + ' = −1/sin²x.' },
          { e: M.add(M.div(M.num(a), cos2), M.num(b)), why: 'Приведена производная тангенса: (tg x)' + PRIME + ' = 1/cos²x.' },
          { e: M.add(M.div(M.num(-a), M.sin(M.X)), M.num(b)), why: 'Синус в знаменателе стоит в квадрате.' },
          { e: M.add(M.div(M.num(-a), sin2), M.coef(b, M.X)), why: 'Слагаемое ' + h(M.coef(b, M.X)) + ' не продифференцировано.' }
        ],
        steps: [
          st('Дифференцируем по слагаемым',
            'f' + PRIME + '(x) = ' + M.fmtNum(a) + '·(ctg x)' + PRIME + ' + ' + d(M.coef(b, M.X))),
          st('Табличная производная котангенса',
            '(ctg x)' + PRIME + ' = ' + h(M.div(M.num(-1), sin2))),
          st('Линейное слагаемое', d(M.coef(b, M.X)) + ' = ' + M.fmtNum(b)),
          st('Ответ', 'f' + PRIME + '(x) = ' + h(ans))
        ]
      };
    }
  });

  T.push({
    id: 'logbase', section: 'funcs', rules: ['log'], weight: 2,
    gen: function () {
      // Логарифм по произвольному основанию: (log_a x)′ = 1 / (x·ln a)
      var base = pick([2, 3, 5, 7]);
      var a = nzi(2, 9);
      var f = M.coef(a, M.logb(base, M.X));
      var lnBase = M.ln(M.num(base));
      var ans = M.div(M.num(a), M.mul(M.X, lnBase));
      return {
        kind: 'choice',
        prompt: 'Найдите производную функции',
        fx: f,
        answer: ans,
        wrong: [
          { e: M.div(M.num(a), M.X), why: 'Не учтён множитель ln ' + base + ' в знаменателе: (log<sub>' + base + '</sub> x)' + PRIME + ' = 1 / (x·ln ' + base + ').' },
          { e: M.mul(M.div(M.num(a), M.X), lnBase), why: 'ln ' + base + ' стоит в знаменателе, а не в числителе.' },
          { e: M.div(M.num(a), M.mul(M.X, M.ln(M.X))), why: 'В формуле ln основания (число), а не ln x.' },
          { e: M.div(M.num(a), M.mul(M.X, M.num(base))), why: 'В знаменателе стоит ln основания, а не само основание.' }
        ],
        steps: [
          st('Формула производной логарифма по основанию',
            '(log<sub>a</sub> x)' + PRIME + ' = ' + h(M.div(M.num(1), M.mul(M.X, M.ln(M.V('a')))))),
          st('Подставляем основание a = ' + base,
            d(M.logb(base, M.X)) + ' = ' + h(M.div(M.num(1), M.mul(M.X, lnBase)))),
          st('Учитываем коэффициент', 'f' + PRIME + '(x) = ' + h(ans))
        ]
      };
    }
  });

  // --- Раздел 5: применение ---

  T.push({
    id: 'valuepoly', section: 'apply', rules: ['apply', 'power'], weight: 2,
    gen: function () {
      var a = nzi(1, 4), n = ri(2, 3), b = nzi(2, 7), c = nzi(1, 9);
      var x0 = pick([-2, -1, 1, 2, 3]);
      var f = M.add(M.powx(a, n), M.coef(b, M.X), M.num(c));
      var der = M.add(M.powx(a * n, n - 1), M.num(b));
      var val = a * n * Math.pow(x0, n - 1) + b;
      return {
        kind: 'number',
        prompt: 'Найдите значение производной функции в точке x₀ = ' + M.fmtNum(x0),
        fx: f,
        answerNum: val,
        answerHint: 'Ответ — целое число',
        audit: { kind: 'deriv', at: x0 },
        steps: [
          st('Сначала находим производную',
            'f' + PRIME + '(x) = ' + h(der)),
          st('Подставляем x₀ = ' + M.fmtNum(x0),
            'f' + PRIME + '(' + M.fmtNum(x0) + ') = ' + M.fmtNum(a * n) + '·(' + M.fmtNum(x0) + ')' +
            (n - 1 === 1 ? '' : '<sup>' + (n - 1) + '</sup>') + ' + ' + M.fmtNum(b)),
          st('Вычисляем',
            'f' + PRIME + '(' + M.fmtNum(x0) + ') = ' + M.fmtNum(a * n * Math.pow(x0, n - 1)) + ' + ' + M.fmtNum(b) + ' = ' + M.fmtNum(val))
        ]
      };
    }
  });

  T.push({
    id: 'tangent', section: 'apply', rules: ['apply', 'power'], weight: 2,
    gen: function () {
      var a = nzi(1, 4), b = nzi(2, 7), c = nzi(1, 9);
      var x0 = pick([-2, -1, 0, 1, 2, 3]);
      var f = M.add(M.powx(a, 2), M.coef(b, M.X), M.num(c));
      var der = M.add(M.powx(2 * a, 1), M.num(b));
      var k = 2 * a * x0 + b;
      return {
        kind: 'number',
        prompt: 'Найдите угловой коэффициент касательной к графику функции в точке с абсциссой x₀ = ' + M.fmtNum(x0),
        fx: f,
        answerNum: k,
        answerHint: 'Ответ — целое число',
        audit: { kind: 'deriv', at: x0 },
        steps: [
          st('Угловой коэффициент касательной равен значению производной в точке касания',
            'k = f' + PRIME + '(x₀)'),
          st('Находим производную',
            'f' + PRIME + '(x) = ' + h(der)),
          st('Подставляем x₀ = ' + M.fmtNum(x0),
            'k = ' + M.fmtNum(2 * a) + '·(' + M.fmtNum(x0) + ') + ' + M.fmtNum(b) + ' = ' + M.fmtNum(k))
        ]
      };
    }
  });

  T.push({
    id: 'extremum', section: 'apply', rules: ['apply', 'power'], weight: 2,
    gen: function () {
      if (Math.random() < 0.5) {
        // Парабола: a·x² − 2ar·x + c, экстремум в точке r
        var a = pick([1, 2, 3]) * (Math.random() < 0.5 ? -1 : 1);
        var r = pick([-3, -2, -1, 1, 2, 3]);
        var c = nzi(1, 9);
        var f = M.add(M.powx(a, 2), M.coef(-2 * a * r, M.X), M.num(c));
        var der = M.add(M.powx(2 * a, 1), M.num(-2 * a * r));
        var isMin = a > 0;
        return {
          kind: 'number',
          prompt: 'Найдите точку ' + (isMin ? 'минимума' : 'максимума') + ' функции',
          fx: f,
          answerNum: r,
          audit: { kind: 'root' },
          answerHint: 'В ответ запишите значение x',
          steps: [
            st('В точке экстремума производная равна нулю. Находим производную',
              'f' + PRIME + '(x) = ' + h(der)),
            st('Решаем уравнение f' + PRIME + '(x) = 0',
              M.fmtNum(2 * a) + 'x ' + (a * r > 0 ? '− ' + M.fmtNum(Math.abs(2 * a * r)) : '+ ' + M.fmtNum(Math.abs(2 * a * r))) + ' = 0 ⇒ x = ' + M.fmtNum(r)),
            st('Проверяем характер точки',
              'Коэффициент при x² равен ' + M.fmtNum(a) + ', ветви параболы направлены ' + (isMin ? 'вверх' : 'вниз') +
              ', значит это точка ' + (isMin ? 'минимума' : 'максимума') + '.'),
            st('Ответ', 'x = ' + M.fmtNum(r))
          ]
        };
      }
      // Кубическая: x³ − 3k²x + c, экстремумы в ±k
      var k = ri(1, 4), c2 = nzi(1, 9);
      var f2 = M.add(M.pow(M.X, 3), M.coef(-3 * k * k, M.X), M.num(c2));
      var der2 = M.add(M.powx(3, 2), M.num(-3 * k * k));
      var wantMin = Math.random() < 0.5;
      return {
        kind: 'number',
        prompt: 'Найдите точку ' + (wantMin ? 'минимума' : 'максимума') + ' функции',
        fx: f2,
        answerNum: wantMin ? k : -k,
        audit: { kind: 'root' },
        answerHint: 'В ответ запишите значение x',
        steps: [
          st('В точке экстремума производная равна нулю. Находим производную',
            'f' + PRIME + '(x) = ' + h(der2)),
          st('Решаем уравнение f' + PRIME + '(x) = 0',
            '3x² = ' + M.fmtNum(3 * k * k) + ' ⇒ x² = ' + M.fmtNum(k * k) + ' ⇒ x = ±' + k),
          st('Определяем, где какой экстремум',
            'Парабола 3x² − ' + M.fmtNum(3 * k * k) + ' положительна вне отрезка [−' + k + '; ' + k + '] и отрицательна внутри. ' +
            'Значит в точке x = −' + k + ' производная меняет знак с «+» на «−» (максимум), а в точке x = ' + k + ' — с «−» на «+» (минимум).'),
          st('Ответ', 'x = ' + M.fmtNum(wantMin ? k : -k))
        ]
      };
    }
  });

  T.push({
    id: 'valuesqrt', section: 'apply', rules: ['apply', 'root'], weight: 2,
    gen: function () {
      var s = pick([1, 2, 3, 4, 5]);
      var m = ri(1, 4);
      var a = 2 * s * m;
      var x0 = s * s;
      var f = M.coef(a, M.sqrt(M.X));
      var der = M.div(M.num(a), M.mul(M.num(2), M.sqrt(M.X)));
      return {
        kind: 'number',
        prompt: 'Найдите значение производной функции в точке x₀ = ' + x0,
        fx: f,
        answerNum: m,
        audit: { kind: 'deriv', at: x0 },
        answerHint: 'Ответ — целое число',
        steps: [
          st('Производная корня: (√x)' + PRIME + ' = 1/(2√x)',
            'f' + PRIME + '(x) = ' + h(der)),
          st('Подставляем x₀ = ' + x0 + ', корень извлекается нацело',
            '√' + x0 + ' = ' + s),
          st('Вычисляем',
            'f' + PRIME + '(' + x0 + ') = ' + h(M.div(M.num(a), M.num(2 * s))) + ' = ' + m)
        ]
      };
    }
  });

  T.push({
    id: 'valueexp', section: 'apply', rules: ['apply', 'chain', 'expo'], weight: 2,
    gen: function () {
      var a = ri(1, 5), b = nzi(1, 4);
      var f = M.coef(a, M.exp(M.coef(b, M.X)));
      var der = M.coef(a * b, M.exp(M.coef(b, M.X)));
      return {
        kind: 'number',
        prompt: 'Найдите значение производной функции в точке x₀ = 0',
        fx: f,
        answerNum: a * b,
        audit: { kind: 'deriv', at: 0 },
        answerHint: 'Ответ — целое число',
        steps: [
          st('Сложная функция: внутренняя g(x) = ' + h(M.coef(b, M.X)) + ', g' + PRIME + '(x) = ' + M.fmtNum(b),
            'f' + PRIME + '(x) = ' + h(der)),
          st('Подставляем x₀ = 0',
            'e⁰ = 1'),
          st('Вычисляем',
            'f' + PRIME + '(0) = ' + M.fmtNum(a) + '·' + M.fmtNum(b) + '·1 = ' + M.fmtNum(a * b))
        ]
      };
    }
  });

  // --- Раздел 5: задания формата ЕГЭ ---

  T.push({
    id: 'minmax', section: 'apply', rules: ['apply', 'power'], weight: 2,
    gen: function () {
      // f(x) = x³ − 3k²x + c на [0; 2k]: минимум внутри (x = k), максимум на правом конце
      var k = ri(1, 3), c = nzi(1, 9);
      var wantMin = Math.random() < 0.5;
      var f = M.add(M.pow(M.X, 3), M.coef(-3 * k * k, M.X), M.num(c));
      var der = M.add(M.powx(3, 2), M.num(-3 * k * k));
      var at = wantMin ? k : 2 * k;
      var ans = wantMin ? (-2 * k * k * k + c) : (2 * k * k * k + c);
      return {
        kind: 'number',
        prompt: 'Найдите ' + (wantMin ? 'наименьшее' : 'наибольшее') +
          ' значение функции на отрезке [0; ' + (2 * k) + ']',
        fx: f,
        answerNum: ans,
        answerHint: 'Ответ — целое число',
        audit: { kind: 'fval', at: at },
        steps: [
          st('Находим производную', 'f' + PRIME + '(x) = ' + h(der)),
          st('Приравниваем её к нулю',
            '3x² = ' + M.fmtNum(3 * k * k) + ' ⇒ x = ±' + k +
            '. На отрезке [0; ' + (2 * k) + '] лежит x = ' + k),
          st('Вычисляем значения на концах отрезка и в критической точке',
            'f(0) = ' + M.fmtNum(c) + ', f(' + k + ') = ' + M.fmtNum(-2 * k * k * k + c) +
            ', f(' + (2 * k) + ') = ' + M.fmtNum(2 * k * k * k + c)),
          st('Выбираем ' + (wantMin ? 'наименьшее' : 'наибольшее') + ' из них',
            'f(' + at + ') = ' + M.fmtNum(ans))
        ]
      };
    }
  });

  T.push({
    id: 'tangentb', section: 'apply', rules: ['apply', 'power'], weight: 2,
    gen: function () {
      // Касательная y = kx + b; b = f(x₀) − f′(x₀)·x₀ = d − a·x₀²
      var a = nzi(1, 4), c = nzi(2, 7), d = nzi(1, 9);
      var x0 = pick([-3, -2, -1, 1, 2, 3]);
      var f = M.add(M.powx(a, 2), M.coef(c, M.X), M.num(d));
      var der = M.add(M.powx(2 * a, 1), M.num(c));
      var fx0 = a * x0 * x0 + c * x0 + d;
      var k = 2 * a * x0 + c;
      var b = d - a * x0 * x0;
      return {
        kind: 'number',
        prompt: 'Касательная к графику функции в точке с абсциссой x₀ = ' + M.fmtNum(x0) +
          ' задаётся уравнением y = kx + b. Найдите b',
        fx: f,
        answerNum: b,
        answerHint: 'Ответ — целое число',
        audit: { kind: 'tangentb', at: x0 },
        steps: [
          st('Уравнение касательной в точке x₀',
            'y = f(x₀) + f' + PRIME + '(x₀)(x − x₀), значит b = f(x₀) − f' + PRIME + '(x₀)·x₀'),
          st('Значение функции в точке касания',
            'f(' + M.fmtNum(x0) + ') = ' + M.fmtNum(fx0)),
          st('Значение производной в той же точке',
            'f' + PRIME + '(x) = ' + h(der) + ', f' + PRIME + '(' + M.fmtNum(x0) + ') = ' + M.fmtNum(k)),
          st('Подставляем',
            'b = ' + M.fmtNum(fx0) + ' − (' + M.fmtNum(k) + ')·(' + M.fmtNum(x0) + ') = ' + M.fmtNum(b))
        ]
      };
    }
  });

  T.push({
    id: 'velocity', section: 'apply', rules: ['apply', 'power'], weight: 2,
    gen: function () {
      // Физический смысл производной: скорость — производная пути по времени
      var t = M.V('t');
      var a = ri(1, 2), b = nzi(1, 6), c = ri(1, 9), t0 = ri(1, 4);
      var s = M.add(M.coef(a, M.pow(t, 3)), M.coef(b, M.pow(t, 2)), M.coef(c, t));
      var v = M.add(M.coef(3 * a, M.pow(t, 2)), M.coef(2 * b, t), M.num(c));
      var ans = 3 * a * t0 * t0 + 2 * b * t0 + c;
      return {
        kind: 'number',
        prompt: 'Материальная точка движется прямолинейно, s — расстояние в метрах, ' +
          't — время в секундах. Найдите скорость точки (в м/с) в момент времени t = ' + t0 + ' с',
        fx: s,
        fxLabel: '<i class="fvar">s</i>(<i>t</i>)',
        answerNum: ans,
        answerHint: 'Ответ — целое число',
        audit: { kind: 'deriv', at: t0 },
        steps: [
          st('Скорость равна производной пути по времени',
            'v(t) = s' + PRIME + '(t)'),
          st('Дифференцируем закон движения',
            'v(t) = ' + h(v)),
          st('Подставляем t = ' + t0,
            'v(' + t0 + ') = ' + M.fmtNum(3 * a) + '·' + (t0 * t0) + ' + ' +
            M.fmtNum(2 * b) + '·' + t0 + ' + ' + M.fmtNum(c) + ' = ' + M.fmtNum(ans))
        ]
      };
    }
  });

  T.push({
    id: 'graphread', section: 'apply', rules: ['apply'], weight: 2,
    gen: function () {
      // Задание формата ЕГЭ: по графику производной определить число экстремумов
      var lo = -6, hi = 6;
      var roots = [];
      var guard = 0;
      var count = ri(3, 4);
      while (roots.length < count && guard++ < 200) {
        var r = ri(lo + 1, hi - 1);
        var ok = roots.every(function (q) { return Math.abs(q - r) >= 2; });
        if (ok) roots.push(r);
      }
      roots.sort(function (p, q) { return p - q; });
      var A = Math.random() < 0.5 ? 1 : -1;
      var fn = function (x) {
        var y = A;
        for (var i = 0; i < roots.length; i++) y *= (x - roots[i]);
        return y;
      };
      // Для рисунка значения сжимаем кубическим корнем: нули и знаки
      // сохраняются точно, а без этого многочлен улетает по вертикали
      // и область смены знака прижимается к оси.
      var shape = function (x) {
        var y = fn(x);
        return (y < 0 ? -1 : 1) * Math.pow(Math.abs(y), 1 / 3);
      };
      var wantMax = Math.random() < 0.5;
      var marks = roots.map(function (r) {
        var left = fn(r - 0.4), right = fn(r + 0.4);
        if (left > 0 && right < 0) return 'max';
        if (left < 0 && right > 0) return 'min';
        return 'none';
      });
      var ans = marks.filter(function (m) { return m === (wantMax ? 'max' : 'min'); }).length;
      var signs = [];
      for (var i = 0; i <= roots.length; i++) {
        var probe = i === 0 ? roots[0] - 0.5
          : (i === roots.length ? roots[roots.length - 1] + 0.5 : (roots[i - 1] + roots[i]) / 2);
        signs.push(fn(probe) > 0 ? '+' : '−');
      }
      return {
        kind: 'number',
        prompt: 'На рисунке изображён график y = f' + PRIME + '(x) — производной функции f(x), ' +
          'определённой на отрезке [' + M.fmtNum(lo) + '; ' + hi + ']. Найдите количество точек ' +
          (wantMax ? 'максимума' : 'минимума') + ' функции f(x) на этом отрезке',
        graph: plotSvg(shape, lo, hi),
        sigExtra: 'roots:' + roots.join(',') + '|' + A + '|' + (wantMax ? 'max' : 'min'),
        answerNum: ans,
        answerHint: 'Ответ — целое число',
        audit: { kind: 'signchange', roots: roots, A: A, want: wantMax ? 'max' : 'min' },
        steps: [
          st('Признак точки ' + (wantMax ? 'максимума' : 'минимума'),
            wantMax
              ? 'В точке максимума производная меняет знак с «+» на «−»'
              : 'В точке минимума производная меняет знак с «−» на «+»'),
          st('Производная обращается в нуль в точках',
            'x = ' + roots.map(M.fmtNum).join(', ')),
          st('Знаки производной по промежуткам',
            signs.join('  ')),
          st('Подсчитываем нужные смены знака',
            'Подходящих точек: ' + ans)
        ]
      };
    }
  });

  // ---------- сборка задания ----------

  function buildOptions(raw) {
    var opts = [{ e: raw.answer, correct: true }];
    // Кандидатов обычно больше трёх — перемешиваем, чтобы при повторной
    // встрече с той же функцией набор неверных вариантов отличался.
    var cand = shuffle(raw.wrong || []);
    for (var i = 0; i < cand.length && opts.length < 4; i++) {
      var w = cand[i];
      if (!w || !w.e) continue;
      if (M.sameValue(w.e, raw.answer)) continue;    // совпал с верным — выбрасываем
      var dup = false;
      for (var j = 1; j < opts.length; j++) {
        if (M.sameValue(opts[j].e, w.e)) { dup = true; break; }
      }
      if (dup) continue;
      opts.push({ e: w.e, why: w.why, correct: false });
    }
    return shuffle(opts);
  }

  function build(tpl) {
    var raw = tpl.gen();
    var task = {
      tplId: tpl.id,
      section: tpl.section,
      rules: raw.rules || tpl.rules,
      kind: raw.kind,
      prompt: raw.prompt,
      steps: raw.steps,
      audit: raw.audit || null
    };
    if (raw.graph) {
      // Задание с рисунком: формулы в условии нет
      task.graph = raw.graph;
      task.sigExtra = raw.sigExtra || '';
    } else {
      task.fx = raw.fx;
      task.fxHtml = M.html(raw.fx);
      task.fxPlain = M.plain(raw.fx);
      task.fxLabel = raw.fxLabel || '<i class="fvar">f</i>(<i>x</i>)';
    }
    if (raw.kind === 'choice') {
      task.options = buildOptions(raw);
      task.answerHtml = M.html(raw.answer);
      task.answerPlain = M.plain(raw.answer);
    } else {
      task.answerNum = raw.answerNum;
      task.answerHint = raw.answerHint || 'Ответ — целое число';
      task.answerHtml = M.fmtNum(raw.answerNum);
    }
    return task;
  }

  /** Случайный шаблон с учётом веса и фильтра (раздел или правило). */
  function chooseTemplate(filter) {
    var pool = T.filter(function (tpl) {
      if (!filter) return true;
      if (filter.section) return tpl.section === filter.section;
      if (filter.rule) return tpl.rules.indexOf(filter.rule) !== -1;
      return true;
    });
    if (!pool.length) pool = T;
    var total = 0, i;
    for (i = 0; i < pool.length; i++) total += (pool[i].weight || 1);
    var r = Math.random() * total;
    for (i = 0; i < pool.length; i++) {
      r -= (pool[i].weight || 1);
      if (r <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  }

  // Память на недавние задания. Общее число комбинаций около 60 000,
  // но у отдельных шаблонов вариантов заметно меньше, поэтому без этой
  // проверки один и тот же пример мог повториться уже внутри сессии.
  var recent = [];
  var RECENT_MAX = 30;
  // Недавно показанные шаблоны. Без этого одна и та же форма функции
  // возвращается через задание, отличаясь только коэффициентами.
  var recentTpl = [];
  var RECENT_TPL_MAX = 6;

  function signature(task) {
    return task.tplId + '|' + task.prompt + '|' + (task.fxPlain || task.sigExtra || '');
  }

  /**
   * Новое задание: не тот же шаблон, что предыдущий, и не совпадающее
   * ни с одним из последних RECENT_MAX заданий.
   */
  function newTask(filter, lastId) {
    var pool = templatesFor(filter);
    // Сколько последних шаблонов избегаем: в маленьком разделе нельзя
    // отказываться почти от всех, иначе выбирать будет не из чего.
    var avoid = recentTpl.slice(0, Math.max(0, Math.min(5, pool - 2)));
    if (pool > 1 && lastId && avoid.indexOf(lastId) === -1) avoid.push(lastId);

    var chosen = null;
    for (var attempt = 0; attempt < 24; attempt++) {
      var tpl = chooseTemplate(filter);
      if (avoid.indexOf(tpl.id) !== -1 && attempt < 16) continue;
      var task = build(tpl);
      if (!chosen) chosen = task;                       // запасной вариант
      if (recent.indexOf(signature(task)) === -1) { chosen = task; break; }
    }
    recentTpl.unshift(chosen.tplId);
    recentTpl = recentTpl.slice(0, RECENT_TPL_MAX);
    recent.push(signature(chosen));
    if (recent.length > RECENT_MAX) recent.shift();
    return chosen;
  }

  function templatesFor(filter) {
    return T.filter(function (tpl) {
      if (!filter) return true;
      if (filter.section) return tpl.section === filter.section;
      if (filter.rule) return tpl.rules.indexOf(filter.rule) !== -1;
      return true;
    }).length;
  }

  global.TASKS = {
    RULES: RULES,
    SECTIONS: SECTIONS,
    SECTION_RULES: SECTION_RULES,
    newTask: newTask,
    templatesFor: templatesFor,
    count: T.length
  };
})(window);
