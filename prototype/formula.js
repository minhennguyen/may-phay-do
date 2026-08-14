'use strict';
/**
 * Engine biểu thức công thức.
 *
 * Vì sao không dùng eval() hay new Function():
 *   Công thức do người dùng nhập và lưu trong CSDL. Nếu chạy bằng eval, một tenant
 *   có thể nhập `process.exit()` hoặc đọc biến môi trường của server. Parser riêng
 *   chỉ hiểu số, biến, toán tử — không có đường nào chạm tới hệ thống.
 *
 * Cú pháp hỗ trợ:
 *   số:        1200   55.5
 *   biến:      W  H  sash  Bk  Bc  ...
 *   toán tử:   + - * / %   > >= < <= == !=   && ||   ? :
 *   hàm:       min max ceil floor round abs
 */

const FUNCS = {
  min: Math.min,
  max: Math.max,
  ceil: Math.ceil,
  floor: Math.floor,
  round: Math.round,
  abs: Math.abs,
};

function tokenize(src) {
  const tokens = [];
  let i = 0;
  const isDigit = (c) => c >= '0' && c <= '9';
  const isIdentStart = (c) => /[A-Za-z_]/.test(c);
  const isIdentPart = (c) => /[A-Za-z0-9_]/.test(c);

  while (i < src.length) {
    const c = src[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }

    if (isDigit(c) || (c === '.' && isDigit(src[i + 1]))) {
      let j = i;
      while (j < src.length && (isDigit(src[j]) || src[j] === '.')) j++;
      const text = src.slice(i, j);
      if ((text.match(/\./g) || []).length > 1) {
        throw new Error(`Số không hợp lệ: "${text}"`);
      }
      tokens.push({ type: 'num', value: parseFloat(text) });
      i = j;
      continue;
    }

    if (isIdentStart(c)) {
      let j = i;
      while (j < src.length && isIdentPart(src[j])) j++;
      tokens.push({ type: 'ident', value: src.slice(i, j) });
      i = j;
      continue;
    }

    const two = src.slice(i, i + 2);
    if (['>=', '<=', '==', '!=', '&&', '||'].includes(two)) {
      tokens.push({ type: 'op', value: two });
      i += 2;
      continue;
    }

    if ('+-*/%()<>?:,'.includes(c)) {
      tokens.push({ type: 'op', value: c });
      i++;
      continue;
    }

    throw new Error(`Ký tự không hợp lệ trong công thức: "${c}" (vị trí ${i})`);
  }
  tokens.push({ type: 'eof', value: null });
  return tokens;
}

function parse(tokens) {
  let pos = 0;
  const peek = () => tokens[pos];
  const eat = (value) => {
    const t = tokens[pos];
    if (t.value !== value) {
      throw new Error(`Mong đợi "${value}" nhưng gặp "${t.value ?? 'hết biểu thức'}"`);
    }
    pos++;
    return t;
  };
  const tryEat = (...values) => {
    const t = tokens[pos];
    if (t.type === 'op' && values.includes(t.value)) { pos++; return t.value; }
    return null;
  };

  // ternary := or ('?' ternary ':' ternary)?
  function ternary() {
    const cond = orExpr();
    if (tryEat('?')) {
      const a = ternary();
      eat(':');
      const b = ternary();
      return { kind: 'cond', cond, a, b };
    }
    return cond;
  }

  function orExpr() {
    let left = andExpr();
    let op;
    while ((op = tryEat('||'))) left = { kind: 'bin', op, left, right: andExpr() };
    return left;
  }

  function andExpr() {
    let left = cmpExpr();
    let op;
    while ((op = tryEat('&&'))) left = { kind: 'bin', op, left, right: cmpExpr() };
    return left;
  }

  function cmpExpr() {
    let left = addExpr();
    let op;
    while ((op = tryEat('>', '>=', '<', '<=', '==', '!='))) {
      left = { kind: 'bin', op, left, right: addExpr() };
    }
    return left;
  }

  function addExpr() {
    let left = mulExpr();
    let op;
    while ((op = tryEat('+', '-'))) left = { kind: 'bin', op, left, right: mulExpr() };
    return left;
  }

  function mulExpr() {
    let left = unary();
    let op;
    while ((op = tryEat('*', '/', '%'))) left = { kind: 'bin', op, left, right: unary() };
    return left;
  }

  function unary() {
    const op = tryEat('-', '+');
    if (op) return { kind: 'unary', op, operand: unary() };
    return primary();
  }

  function primary() {
    const t = peek();

    if (t.type === 'num') { pos++; return { kind: 'num', value: t.value }; }

    if (t.type === 'ident') {
      pos++;
      if (peek().type === 'op' && peek().value === '(') {
        eat('(');
        const args = [];
        if (!(peek().type === 'op' && peek().value === ')')) {
          args.push(ternary());
          while (tryEat(',')) args.push(ternary());
        }
        eat(')');
        return { kind: 'call', name: t.value, args };
      }
      return { kind: 'var', name: t.value };
    }

    if (t.type === 'op' && t.value === '(') {
      eat('(');
      const e = ternary();
      eat(')');
      return e;
    }

    throw new Error(`Biểu thức không hợp lệ tại "${t.value ?? 'hết biểu thức'}"`);
  }

  const ast = ternary();
  if (peek().type !== 'eof') {
    throw new Error(`Thừa ký tự "${peek().value}" ở cuối biểu thức`);
  }
  return ast;
}

function evaluate(node, scope) {
  switch (node.kind) {
    case 'num':
      return node.value;

    case 'var': {
      if (!(node.name in scope)) {
        const available = Object.keys(scope).sort().join(', ');
        throw new Error(`Không tìm thấy biến "${node.name}". Biến khả dụng: ${available}`);
      }
      const v = scope[node.name];
      if (typeof v !== 'number' || !Number.isFinite(v)) {
        throw new Error(`Biến "${node.name}" không phải số hợp lệ (đang là ${v})`);
      }
      return v;
    }

    case 'unary': {
      const v = evaluate(node.operand, scope);
      return node.op === '-' ? -v : v;
    }

    case 'cond':
      return evaluate(node.cond, scope) ? evaluate(node.a, scope) : evaluate(node.b, scope);

    case 'call': {
      const fn = FUNCS[node.name];
      if (!fn) {
        throw new Error(`Hàm "${node.name}" không tồn tại. Hàm khả dụng: ${Object.keys(FUNCS).join(', ')}`);
      }
      return fn(...node.args.map((a) => evaluate(a, scope)));
    }

    case 'bin': {
      const l = evaluate(node.left, scope);
      const r = evaluate(node.right, scope);
      switch (node.op) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/':
          if (r === 0) throw new Error('Chia cho 0 trong công thức');
          return l / r;
        case '%':
          if (r === 0) throw new Error('Chia lấy dư cho 0 trong công thức');
          return l % r;
        case '>':  return l >  r ? 1 : 0;
        case '>=': return l >= r ? 1 : 0;
        case '<':  return l <  r ? 1 : 0;
        case '<=': return l <= r ? 1 : 0;
        case '==': return l === r ? 1 : 0;
        case '!=': return l !== r ? 1 : 0;
        case '&&': return (l && r) ? 1 : 0;
        case '||': return (l || r) ? 1 : 0;
        default: throw new Error(`Toán tử chưa hỗ trợ: ${node.op}`);
      }
    }

    default:
      throw new Error(`Nút AST không hợp lệ: ${node.kind}`);
  }
}

const cache = new Map();

/** Biên dịch (có cache) một chuỗi công thức thành hàm nhận scope. */
function compile(src) {
  let ast = cache.get(src);
  if (!ast) {
    ast = parse(tokenize(src));
    cache.set(src, ast);
  }
  return (scope) => evaluate(ast, scope);
}

/** Tính nhanh một công thức. Kết quả là số thực. */
function evalExpr(src, scope) {
  try {
    return compile(src)(scope);
  } catch (err) {
    throw new Error(`Lỗi công thức "${src}": ${err.message}`);
  }
}

/** Tính công thức rồi làm tròn về mm nguyên — dùng cho mọi kích thước. */
function evalMm(src, scope) {
  return Math.round(evalExpr(src, scope));
}

/** Liệt kê tên biến một công thức cần — dùng để kiểm tra công thức lúc người dùng lưu. */
function variablesUsed(src) {
  const names = new Set();
  (function walk(n) {
    if (n.kind === 'var') names.add(n.name);
    if (n.kind === 'bin') { walk(n.left); walk(n.right); }
    if (n.kind === 'unary') walk(n.operand);
    if (n.kind === 'cond') { walk(n.cond); walk(n.a); walk(n.b); }
    if (n.kind === 'call') n.args.forEach(walk);
  })(parse(tokenize(src)));
  return [...names];
}

module.exports = { compile, evalExpr, evalMm, variablesUsed, tokenize, parse };
