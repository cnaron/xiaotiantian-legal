// 最小 DER 读写 —— X.509 证书链校验 + PKCS#1→PKCS#8 转换都要它。
// Workers 的 WebCrypto 不会验证书链,链要自己拆开一张一张验,所以必须有个 DER 解析器。
// 只实现用得到的部分:定长 tag、≤4 字节长度域、SEQUENCE 遍历、OID、时间。 2026.09.08 Naron

export function readTLV_claudecode_20260908(b, off) {
  if (off + 2 > b.length) throw new Error('DER 越界');
  const tag = b[off];
  let p = off + 1;
  let len = b[p++];
  if (len & 0x80) {
    const n = len & 0x7f;
    if (n === 0 || n > 4) throw new Error('DER 长度域不支持(' + n + ' 字节)');
    len = 0;
    for (let i = 0; i < n; i++) len = len * 256 + b[p++];
  }
  const vStart = p, vEnd = p + len;
  if (vEnd > b.length) throw new Error('DER 长度越界');
  return { tag, start: off, vStart, vEnd, end: vEnd };
}

export function children_claudecode_20260908(b, tlv) {
  const out = [];
  let p = tlv.vStart;
  while (p < tlv.vEnd) { const t = readTLV_claudecode_20260908(b, p); out.push(t); p = t.end; }
  return out;
}

export function encodeLen_claudecode_20260908(n) {
  if (n < 0x80) return [n];
  const bytes = [];
  let v = n;
  while (v > 0) { bytes.unshift(v & 0xff); v = Math.floor(v / 256); }
  return [0x80 | bytes.length].concat(bytes);
}

export function tlv_claudecode_20260908(tag, value) {
  const len = encodeLen_claudecode_20260908(value.length);
  const out = new Uint8Array(1 + len.length + value.length);
  out[0] = tag; out.set(len, 1); out.set(value, 1 + len.length);
  return out;
}

export function oid_claudecode_20260908(b, tlv) {
  const v = b.subarray(tlv.vStart, tlv.vEnd);
  if (!v.length) return '';
  const parts = [Math.floor(v[0] / 40), v[0] % 40];
  let acc = 0;
  for (let i = 1; i < v.length; i++) {
    acc = acc * 128 + (v[i] & 0x7f);
    if (!(v[i] & 0x80)) { parts.push(acc); acc = 0; }
  }
  return parts.join('.');
}

export function bytesEqual_claudecode_20260908(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** UTCTime(0x17,两位年)/ GeneralizedTime(0x18,四位年)→ 毫秒 */
export function derTime_claudecode_20260908(b, tlv) {
  const s = new TextDecoder().decode(b.subarray(tlv.vStart, tlv.vEnd));
  let y, rest;
  if (tlv.tag === 0x17) {                       // YYMMDDHHMMSSZ
    const yy = parseInt(s.slice(0, 2), 10);
    y = yy >= 50 ? 1900 + yy : 2000 + yy;       // RFC 5280 §4.1.2.5.1
    rest = s.slice(2);
  } else {                                      // YYYYMMDDHHMMSSZ
    y = parseInt(s.slice(0, 4), 10);
    rest = s.slice(4);
  }
  const n = (i, l) => parseInt(rest.slice(i, i + l), 10);
  return Date.UTC(y, n(0, 2) - 1, n(2, 2), n(4, 2), n(6, 2), rest.length >= 10 ? n(8, 2) : 0);
}

/** PKCS#1 RSAPrivateKey → PKCS#8 PrivateKeyInfo(WebCrypto 只吃 pkcs8) */
export function pkcs1ToPkcs8_claudecode_20260908(pkcs1) {
  const ver = new Uint8Array([0x02, 0x01, 0x00]);
  // AlgorithmIdentifier { OID 1.2.840.113549.1.1.1 (rsaEncryption), NULL }
  const alg = new Uint8Array([0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86,
                              0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00]);
  const oct = tlv_claudecode_20260908(0x04, pkcs1);
  const body = new Uint8Array(ver.length + alg.length + oct.length);
  body.set(ver, 0); body.set(alg, ver.length); body.set(oct, ver.length + alg.length);
  return tlv_claudecode_20260908(0x30, body);
}

/** DER ECDSA 签名(SEQUENCE{INTEGER r, INTEGER s})→ WebCrypto 要的 raw r||s */
export function derSigToRaw_claudecode_20260908(b, size) {
  const seq = readTLV_claudecode_20260908(b, 0);
  const kids = children_claudecode_20260908(b, seq);
  if (kids.length !== 2) throw new Error('ECDSA 签名不是两个 INTEGER');
  const out = new Uint8Array(size * 2);
  for (let i = 0; i < 2; i++) {
    let v = b.subarray(kids[i].vStart, kids[i].vEnd);
    while (v.length > 1 && v[0] === 0) v = v.subarray(1);
    if (v.length > size) throw new Error('ECDSA 整数超出曲线长度');
    out.set(v, i * size + size - v.length);
  }
  return out;
}
