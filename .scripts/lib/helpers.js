const fs = require('fs');
const path = require('path');

function today() {
  const d = new Date();
  const months = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function isoDateInTimeZone(date, timeZone = 'Europe/Amsterdam') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

function todayISOAmsterdam() {
  return isoDateInTimeZone(new Date(), 'Europe/Amsterdam');
}

function replaceMarker(content, marker, replacement) {
  const regex = new RegExp(`(<!-- BEGIN:${marker} -->)[\\s\\S]*?(<!-- END:${marker} -->)`, 'g');
  return content.replace(regex, `$1\n${replacement}\n$2`);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function slugify(text) {
  return text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function cleanPathLike(value) {
  if (!value) return '/';
  let pathname = '/';
  try {
    const url = new URL(value, 'https://peuterplannen.nl');
    pathname = url.pathname || '/';
  } catch (_) {
    pathname = value.split('?')[0].split('#')[0] || '/';
  }

  if (pathname === '/app') return '/app.html';
  if (pathname === '/blog') return '/blog/';
  if (pathname === '/index.html') return '/';
  if (!pathname.startsWith('/')) pathname = `/${pathname}`;
  if (!path.extname(pathname) && !pathname.endsWith('/')) pathname += '/';
  return pathname;
}

function fullSiteUrl(pathname) {
  const clean = cleanPathLike(pathname);
  return `https://peuterplannen.nl${clean === '/' ? '/' : clean}`;
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parseDateSafe(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysSince(value) {
  const d = parseDateSafe(value);
  if (!d) return Infinity;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function normalizeExternalUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^\/\//.test(trimmed)) return `https:${trimmed}`;
  return `https://${trimmed.replace(/^\/+/, '')}`;
}

function normalizeExternalHost(url) {
  const normalized = normalizeExternalUrl(url);
  if (!normalized) return '';
  try {
    return new URL(normalized).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

function displayExternalUrl(url) {
  const normalized = normalizeExternalUrl(url);
  if (!normalized) return '';
  return normalized.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
}

module.exports = {
  today,
  todayISO,
  isoDateInTimeZone,
  todayISOAmsterdam,
  replaceMarker,
  escapeHtml,
  slugify,
  cleanPathLike,
  fullSiteUrl,
  readJsonIfExists,
  parseDateSafe,
  daysSince,
  normalizeExternalUrl,
  normalizeExternalHost,
  displayExternalUrl,
};
