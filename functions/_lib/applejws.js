// StoreKit2 AppTransaction 的 JWS 校验(Workers 版;逻辑从 X123 颗粒 2 的 PHP 版移植过来,
// 但**不依赖它**:根证书就钉在本文件里,不去任何外部服务器取)。
//
// 做到哪一步(诚实边界,写在代码里免得回执和实现走散):
//   ① 解析 header/payload —— 总是做;payload.receiptType 就是 Production/Sandbox;
//   ② alg 必须 ES256、header.x5c 至少两张证书;
//   ③ 用 x5c[0](叶子)的公钥验 JWS 签名(ES256 的签名本来就是 raw r||s,WebCrypto 直接吃);
//   ④ **自己走一遍证书链**:x5c[i] 的签名必须能被 x5c[i+1] 的公钥验过,最后一张必须能被
//      下面钉死的 Apple Root CA G3 验过(或它自己就是那张根);同时核 issuer/subject DER
//      逐字节接得上、每张证书都在有效期内。
//   ③④ 都过才 verified=yes,任何一步不过写 no + 具体原因。
//
// **没做的**:吊销(CRL/OCSP)、KeyUsage/EKU/basicConstraints、bundleId / appAppleId /
// deviceVerification 与本 App 是否对得上。所以 verified=yes 只说明「这份 JWS 是苹果签的、
// 没被改过」,**不**说明「属于这台设备的这个 App」。别当防作弊结论用。
// 2026.09.08 Naron
import {
  readTLV_claudecode_20260908 as readTLV,
  children_claudecode_20260908 as kids,
  oid_claudecode_20260908 as oidOf,
  bytesEqual_claudecode_20260908 as eq,
  derTime_claudecode_20260908 as derTime,
  derSigToRaw_claudecode_20260908 as derSigToRaw,
} from './der.js';

// 钉死的 Apple Root CA G3(DER base64)。
// sha256 63343abfb89a6a03ebb57e9b3f5fa7be7c4f5c756f3017b3a8c488c3653e9179
// 主体 CN=Apple Root CA - G3, OU=Apple Certification Authority, O=Apple Inc., C=US
export const APPLE_ROOT_G3_B64_20260908 =
  'MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwSQXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9uIEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcNMTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2WjBnMRswGQYDVQQDDBJBcHBsZSBSb290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9yaXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqGSM49AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWmBSp3ZHtfTjjTuxxEtX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517IDvYuVTZXpmkOlEKMaNCMEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySrMA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMAoGCCqGSM49BAMDA2gAMGUCMQCD6cHEFl4aXTQY2e3v9GwOAEZLuN+yRhHFD/3meoyhpmvOwgPUnPWTxnS4at+qIxUCMG1mihDK1A3UT82NQz60imOlM27jbdoXt2QfyFMm+YhidDkLF1vLUagM6BgD56KyKA==';

const CURVES = { '1.2.840.10045.3.1.7': 'P-256', '1.3.132.0.34': 'P-384', '1.3.132.0.35': 'P-521' };
const CURVE_SIZE = { 'P-256': 32, 'P-384': 48, 'P-521': 66 };
const SIG_HASH = { '1.2.840.10045.4.3.2': 'SHA-256', '1.2.840.10045.4.3.3': 'SHA-384', '1.2.840.10045.4.3.4': 'SHA-512' };

export function b64ToBytes_claudecode_20260908(s) {
  const bin = atob(String(s).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function b64uDecodeText_claudecode_20260908(s) {
  try { return new TextDecoder().decode(b64ToBytes_claudecode_20260908(s)); } catch (e) { return ''; }
}

/** 拆一张 X.509:tbs 原字节 / issuer / subject / spki / 有效期 / 签名算法 / 签名值 / 叶子 CN */
export function parseCert_claudecode_20260908(der) {
  const cert = readTLV(der, 0);
  const top = kids(der, cert);
  if (top.length < 3) throw new Error('证书结构不对');
  const [tbs, sigAlg, sigVal] = top;
  const tc = kids(der, tbs);
  let i = (tc[0] && tc[0].tag === 0xa0) ? 1 : 0;   // 可选的 [0] version
  const issuer = tc[i + 2], validity = tc[i + 3], subject = tc[i + 4], spki = tc[i + 5];
  if (!spki) throw new Error('证书字段不全');
  const val = kids(der, validity);
  const spkiAlg = kids(der, kids(der, spki)[0]);
  const sv = der.subarray(sigVal.vStart, sigVal.vEnd);
  if (sv.length < 1 || sv[0] !== 0) throw new Error('签名 BIT STRING 有余位');
  return {
    tbs: der.subarray(tbs.start, tbs.end),
    issuer: der.subarray(issuer.start, issuer.end),
    subject: der.subarray(subject.start, subject.end),
    spki: der.subarray(spki.start, spki.end),
    curve: CURVES[oidOf(der, spkiAlg[1] || spkiAlg[0])] || '',
    notBefore: derTime(der, val[0]),
    notAfter: derTime(der, val[1]),
    sigHash: SIG_HASH[oidOf(der, kids(der, sigAlg)[0])] || '',
    sig: sv.subarray(1),
    cn: extractCN_claudecode_20260908(der, subject),
  };
}

function extractCN_claudecode_20260908(der, subject) {
  try {
    for (const rdn of kids(der, subject)) {
      for (const av of kids(der, rdn)) {
        const pair = kids(der, av);
        if (oidOf(der, pair[0]) === '2.5.4.3') {
          return new TextDecoder().decode(der.subarray(pair[1].vStart, pair[1].vEnd));
        }
      }
    }
  } catch (e) { /* 取不到 CN 不是错,只是少一条展示信息 */ }
  return '';
}

async function importEc_claudecode_20260908(cert) {
  if (!cert.curve) throw new Error('不认识的曲线');
  return crypto.subtle.importKey('spki', cert.spki, { name: 'ECDSA', namedCurve: cert.curve }, false, ['verify']);
}

/** child 的签名能不能被 parent 的公钥验过 */
async function verifyCertSig_claudecode_20260908(child, parent) {
  if (!child.sigHash) return false;
  const key = await importEc_claudecode_20260908(parent);
  const raw = derSigToRaw(child.sig, CURVE_SIZE[parent.curve]);
  return crypto.subtle.verify({ name: 'ECDSA', hash: child.sigHash }, key, raw, child.tbs);
}

/**
 * @returns {present,parsed,verified,reason,env,payload,sigVsLeaf,chain,leafCN}
 * 字段名与 PHP 版一一对应,issue 正文格式因此完全一致。
 */
export async function jwsInspect_claudecode_20260908(jws, rootB64 = APPLE_ROOT_G3_B64_20260908, now = Date.now()) {
  const r = { present: false, parsed: false, verified: false, reason: '', env: '',
              payload: null, sigVsLeaf: 'skip', chain: 'skip', leafCN: '' };
  if (typeof jws !== 'string' || jws === '') { r.reason = '未提供'; return r; }
  r.present = true;
  const parts = jws.split('.');
  if (parts.length !== 3) { r.reason = '不是三段式 JWS'; return r; }

  let header, payload;
  try {
    header = JSON.parse(b64uDecodeText_claudecode_20260908(parts[0]));
    payload = JSON.parse(b64uDecodeText_claudecode_20260908(parts[1]));
  } catch (e) { r.reason = 'header/payload 不是 JSON'; return r; }
  if (!header || typeof header !== 'object' || !payload || typeof payload !== 'object') {
    r.reason = 'header/payload 不是 JSON'; return r;
  }
  r.parsed = true;
  r.payload = payload;
  if (typeof payload.receiptType === 'string') r.env = payload.receiptType;

  if (header.alg !== 'ES256') { r.reason = 'alg=' + (header.alg || '空') + ',不是 ES256'; return r; }
  const x5c = Array.isArray(header.x5c) ? header.x5c : [];
  if (x5c.length < 2) { r.reason = 'header 里没有 x5c 证书链'; return r; }

  // ③ 签名 vs 叶子证书
  let chain;
  try {
    chain = x5c.map((c) => parseCert_claudecode_20260908(b64ToBytes_claudecode_20260908(c)));
  } catch (e) { r.reason = 'x5c 证书解析失败(' + e.message + ')'; return r; }
  r.leafCN = chain[0].cn;
  if (chain[0].curve !== 'P-256') { r.reason = '叶子证书不是 P-256'; return r; }

  let sigOk = false;
  try {
    const key = await importEc_claudecode_20260908(chain[0]);
    const raw = b64ToBytes_claudecode_20260908(parts[2]);
    if (raw.length === 64) {
      sigOk = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key,
        raw, new TextEncoder().encode(parts[0] + '.' + parts[1]));
    }
  } catch (e) { sigOk = false; }
  r.sigVsLeaf = sigOk ? 'ok' : 'bad';
  if (!sigOk) { r.reason = '签名与 x5c 叶子证书对不上'; return r; }

  // ④ 证书链 → 钉死的 Apple Root CA G3
  let root;
  try { root = parseCert_claudecode_20260908(b64ToBytes_claudecode_20260908(rootB64)); }
  catch (e) { r.chain = 'skip'; r.reason = '钉死的根证书解析失败'; return r; }

  const full = eq(chain[chain.length - 1].subject, root.subject) ? chain.slice() : chain.concat([root]);
  for (const c of full) {
    if (now < c.notBefore || now > c.notAfter) {
      r.chain = 'bad';
      r.reason = '证书链里有过期或尚未生效的证书(CN ' + (c.cn || '?') + ')';
      return r;
    }
  }
  for (let i = 0; i < full.length - 1; i++) {
    if (!eq(full[i].issuer, full[i + 1].subject)) {
      r.chain = 'bad'; r.reason = '证书链的 issuer/subject 接不上(第 ' + i + ' 张)'; return r;
    }
    let ok = false;
    try { ok = await verifyCertSig_claudecode_20260908(full[i], full[i + 1]); }
    catch (e) { r.chain = 'error'; r.reason = '链校验本身出错(' + e.message + ')'; return r; }
    if (!ok) { r.chain = 'bad'; r.reason = '证书链没能验到 Apple Root CA G3'; return r; }
  }
  // 链尾必须就是钉死的那张根(自签,逐字节相同)
  const tail = full[full.length - 1];
  if (!eq(tail.subject, root.subject) || !eq(tail.spki, root.spki)) {
    r.chain = 'bad'; r.reason = '链尾不是钉死的 Apple Root CA G3'; return r;
  }
  r.chain = 'ok';
  r.verified = true;
  return r;
}
