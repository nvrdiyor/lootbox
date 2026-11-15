// Sayt qaysi manzillar (Host) bilan ochilishi mumkinligini cheklaydi.
// Sabab: server kelgan Host nomini havolalarda ishlatadi (canonical, sitemap) va "so'rov o'z
// saytimizdanmi" tekshiruvida unga tayanadi — begona nom bilan kelgan so'rov qabul qilinmasin.
import net from 'node:net';
import { config } from '../config.js';

const LOCAL = new Set(['localhost', '127.0.0.1', '[::1]']);
const SAFE_NAME = /^[a-z0-9.\-[\]:]+$/;

/** "example.com:3210" → "example.com",  "[::1]:3210" → "[::1]" */
export function hostName(value) {
  const host = String(value || '').trim().toLowerCase();
  if (host.startsWith('[')) return host.slice(0, host.indexOf(']') + 1);
  return host.split(':')[0];
}

export function hostAllowed(value) {
  const name = hostName(value);
  if (!name || !SAFE_NAME.test(name)) return false;
  if (LOCAL.has(name) || name.endsWith('.localhost')) return true;
  if (config.siteHost) {
    return name === config.siteHost || name === `www.${config.siteHost}` || `www.${name}` === config.siteHost;
  }
  // SITE_URL kiritilmagan (lokal ishlatish): IP manzil bilan ochish mumkin — masalan telefondan
  // http://192.168.1.5:3210. Begona domen nomi qabul qilinmaydi.
  return net.isIP(name.replace(/^\[|\]$/g, '')) !== 0;
}
