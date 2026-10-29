/**
 * Генераторы заданий.
 *
 * Каждый шаблон умеет три вещи:
 *   - породить функцию со случайными коэффициентами,
 *   - собрать пошаговый разбор ИМЕННО для этих чисел,
 *   - выдать неверные варианты ответа, каждый из которых соответствует
 *     конкретной типичной ошибке (а не просто «другая формула»).
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

  // ---------- правила (для подсказок, диагностики и справочника) ----------

  var RULES = {
    konst: { name: 'Константа и множитель', formula: '(C)′ = 0, (C·u)′ = C·u′' },
    power: { name: 'Степень', formula: '(xⁿ)′ = n·xⁿ⁻¹, (x)′ = 1' },
    sum: { name: 'Сумма и разность', formula: '(u ± v)′ = u′ ± v′' },
    product: { name: 'Произведение', formula: '(u·v)′ = u′v + uv′' },
    quotient: { name: 'Частное', formula: '(u / v)′ = (u′v − uv′) / v²' },
    chain: { name: 'Сложная функция', formula: '(f(g(x)))′ = f′(g(x))·g′(x)' },
    trig: { name: 'Тригонометрия', formula: '(sin x)′ = cos x, (cos x)′ = −sin x, (tg x)′ = 1 / cos²x' },
    expo: { name: 'Показательная', formula: '(eˣ)′ = eˣ, (aˣ)′ = aˣ·ln a' },
    log: { name: 'Логарифм', formula: '(ln x)′ = 1 / x' },
    root: { name: 'Корень', formula: '(√x)′ = 1 / (2√x)' },
    apply: { name: 'Применение производной', formula: 'k = f′(x₀) — угловой коэффициент касательной; в точке экстремума f′(x) = 0' }
  };

  // Порядок разделов — по возрастанию сложности внутри темы производных.
  var SECTIONS = [
    { id: 'basic', title: 'Базовые правила', hint: 'Степень, постоянный множитель, сумма и разность', level: 'Просто' },
    { id: 'product', title: 'Произведение и частное', hint: 'Формулы (uv)′ и (u/v)′', level: 'Средне' },
    { id: 'funcs', title: 'sin, cos, eˣ и ln', hint: 'Табличные производные элементарных функций', level: 'Средне' },
    { id: 'chain', title: 'Сложная функция', hint: 'Цепное правило: источник наибольшего числа ошибок', level: 'Сложно' },
    { id: 'apply', title: 'Применение', hint: 'Значение в точке, касательная, экстремумы', level: 'ЕГЭ' }
  ];

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
      var kind = pick(['sin', 'exp', 'ln']);
      var k = ri(1, 9);
      var x2 = M.pow(M.X, 2);
      var u, du, kdu, uName, extra, inner, innerSwapped;

      if (kind === 'sin') {
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

  // --- Раздел 5: применение ---

  T.push({
    id: 'valuepoly', section: 'apply', rules: ['apply', 'power'], weight: 3,
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
    id: 'tangent', section: 'apply', rules: ['apply', 'power'], weight: 3,
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
    id: 'extremum', section: 'apply', rules: ['apply', 'power'], weight: 3,
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
      fx: raw.fx,
      fxHtml: M.html(raw.fx),
      fxPlain: M.plain(raw.fx),
      steps: raw.steps
    };
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

  function signature(task) {
    return task.tplId + '|' + task.prompt + '|' + M.plain(task.fx);
  }

  /**
   * Новое задание: не тот же шаблон, что предыдущий, и не совпадающее
   * ни с одним из последних RECENT_MAX заданий.
   */
  function newTask(filter, lastId) {
    var pool = templatesFor(filter);
    var chosen = null;
    for (var attempt = 0; attempt < 16; attempt++) {
      var tpl = chooseTemplate(filter);
      if (pool > 1 && tpl.id === lastId && attempt < 8) continue;
      var task = build(tpl);
      if (!chosen) chosen = task;                       // запасной вариант
      if (recent.indexOf(signature(task)) === -1) { chosen = task; break; }
    }
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
    newTask: newTask,
    templatesFor: templatesFor,
    count: T.length
  };
})(window);
