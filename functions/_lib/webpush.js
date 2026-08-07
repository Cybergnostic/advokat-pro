export const VAPID_PUBLIC_KEY = 'BC8zQ_raNZBn5HL1-pd9l_ClLL0t7VNlAVrxgJBr2v7XDLNmJTcxRjIddbacBXi0sZqY7TraT-RMMmMuGVaDgb8';
const VAPID_SUBJECT = 'https://advokat-pro.pages.dev/';

function b64urlBytes(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function b64urlText(value) {
  return b64urlBytes(new TextEncoder().encode(value));
}

function decodeB64url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function concatBytes(...arrays) {
  const size = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const a of arrays) { out.set(a, offset); offset += a.length; }
  return out;
}

async function hmac(keyBytes, dataBytes) {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, dataBytes));
}

async function hkdfExpand(prk, info, length) {
  const block = await hmac(prk, concatBytes(info, new Uint8Array([1])));
  return block.slice(0, length);
}

async function vapidAuthorization(endpoint, privateD) {
  if (!privateD) throw new Error('VAPID_PRIVATE_KEY is not configured.');
  const pub = decodeB64url(VAPID_PUBLIC_KEY);
  const x = b64urlBytes(pub.slice(1, 33));
  const y = b64urlBytes(pub.slice(33, 65));
  const key = await crypto.subtle.importKey('jwk', {
    kty: 'EC', crv: 'P-256', x, y, d: privateD, ext: true, key_ops: ['sign']
  }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const header = b64urlText(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const payload = b64urlText(JSON.stringify({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: VAPID_SUBJECT
  }));
  const input = `${header}.${payload}`;
  const signature = new Uint8Array(await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(input)
  ));
  return `vapid t=${input}.${b64urlBytes(signature)}, k=${VAPID_PUBLIC_KEY}`;
}

async function encryptPayload(p256dh, auth, payload) {
  const receiverPublicBytes = decodeB64url(p256dh);
  const authSecret = decodeB64url(auth);
  const receiverPublic = await crypto.subtle.importKey(
    'raw', receiverPublicBytes, { name: 'ECDH', namedCurve: 'P-256' }, false, []
  );
  const senderKeys = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
  );
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'ECDH', public: receiverPublic }, senderKeys.privateKey, 256
  ));
  const senderPublicBytes = new Uint8Array(await crypto.subtle.exportKey('raw', senderKeys.publicKey));
  const keyInfo = concatBytes(
    new TextEncoder().encode('WebPush: info\0'), receiverPublicBytes, senderPublicBytes
  );
  const prkKey = await hmac(authSecret, sharedSecret);
  const ikm = await hkdfExpand(prkKey, keyInfo, 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(salt, ikm);
  const cek = await hkdfExpand(prk, new TextEncoder().encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdfExpand(prk, new TextEncoder().encode('Content-Encoding: nonce\0'), 12);
  const plain = concatBytes(new TextEncoder().encode(JSON.stringify(payload)), new Uint8Array([2]));
  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, plain));
  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, 4096);
  return concatBytes(salt, recordSize, new Uint8Array([senderPublicBytes.length]), senderPublicBytes, cipher);
}

export async function sendWebPush(subscription, privateD, payload) {
  if (!subscription.p256dh || !subscription.auth) throw new Error('Push subscription is missing encryption keys.');
  const authorization = await vapidAuthorization(subscription.endpoint, privateD);
  const headers = { TTL: '120', Urgency: 'high', Authorization: authorization };
  const options = { method: 'POST', headers };
  if (payload) {
    options.body = await encryptPayload(subscription.p256dh, subscription.auth, payload);
    headers['Content-Encoding'] = 'aes128gcm';
    headers['Content-Type'] = 'application/octet-stream';
  }
  return fetch(subscription.endpoint, options);
}

async function sendToSubscriptions(env, subscriptions, payload) {
  const usable = subscriptions.filter((x) => x.endpoint && x.p256dh && x.auth);
  let delivered = 0;
  let failed = 0;

  await Promise.allSettled(usable.map(async (sub) => {
    try {
      const res = await sendWebPush(sub, env.VAPID_PRIVATE_KEY, payload);
      if (res.status === 404 || res.status === 410) {
        await env.DB.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').bind(sub.endpoint).run();
        failed++;
      } else if (!res.ok) {
        failed++;
        console.warn('Push service returned', res.status, sub.endpoint);
      } else {
        delivered++;
      }
    } catch (error) {
      failed++;
      console.warn('Push delivery failed', sub.endpoint, error);
    }
  }));

  return { attempted: usable.length, delivered, failed };
}

export async function sendPushToUser(env, userId, payload) {
  if (!userId) return { attempted: 0, delivered: 0, failed: 0 };
  const rows = await env.DB.prepare(`SELECT endpoint, p256dh, auth FROM push_subscriptions
    WHERE user_id = ?`).bind(userId).all();
  return sendToSubscriptions(env, rows.results || [], payload);
}

export async function sendPushToAll(env, payload) {
  const rows = await env.DB.prepare('SELECT endpoint, p256dh, auth FROM push_subscriptions').all();
  return sendToSubscriptions(env, rows.results || [], payload);
}
