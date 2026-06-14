const crypto = require('crypto');
const express = require('express');
const { chromium } = require('playwright');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();
const app = express();
app.use(express.json({ limit: '1mb' }));

const DEFAULT_SETTINGS = {
  profitMarginMultiplier: 1.35,
  forexConversionRate: 2.1,
  defaultCurrency: 'GHS',
  publishMode: 'draft',
  allowedDomains: ['meijiavip.com', 'www.meijiavip.com'],
};

const MAX_PRODUCTS_PER_SOURCE = Number(process.env.MAX_PRODUCTS_PER_SOURCE || 80);
const NAV_TIMEOUT_MS = Number(process.env.NAV_TIMEOUT_MS || 45000);

function now() {
  return admin.firestore.FieldValue.serverTimestamp();
}

function stableHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value || {})).digest('hex');
}

function normalizeUrl(url) {
  if (!url) return '';
  return url.startsWith('http') ? url : `https://${url}`;
}

function getDomain(url) {
  try {
    return new URL(normalizeUrl(url)).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function sourceSkuFromUrl(sourceId, productUrl, title) {
  const input = `${sourceId}:${productUrl || title}`;
  return crypto.createHash('md5').update(input).digest('hex').slice(0, 16).toUpperCase();
}

function parsePrice(value) {
  const match = String(value || '').replace(/,/g, '').match(/(?:￥|¥|CNY)?\s*(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function retailPrice(rawCnyPrice, settings) {
  const raw = Number(rawCnyPrice || 0);
  const fx = Number(settings.forexConversionRate || DEFAULT_SETTINGS.forexConversionRate);
  const margin = Number(settings.profitMarginMultiplier || DEFAULT_SETTINGS.profitMarginMultiplier);
  return Math.round(raw * fx * margin * 100) / 100;
}

async function translateText(value) {
  const text = cleanText(value);
  if (!text) return '';
  if (!/[\u3400-\u9FFF]/.test(text)) return text;
  try {
    const translated = await callGoogleTranslate(text);
    return cleanText(translated);
  } catch (err) {
    throw new Error(`Translation failed: ${err.message}`);
  }
}

async function getCloudRunAccessToken() {
  const resp = await fetch('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token', {
    headers: { 'Metadata-Flavor': 'Google' },
  });
  if (!resp.ok) throw new Error(`Metadata token request failed with ${resp.status}`);
  const payload = await resp.json();
  if (!payload.access_token) throw new Error('Metadata token response did not include access_token');
  return payload.access_token;
}

async function callGoogleTranslate(text) {
  const endpoint = 'https://translation.googleapis.com/language/translate/v2';
  const body = {
    q: text,
    source: 'zh-CN',
    target: 'en',
    format: 'text',
  };

  if (process.env.GOOGLE_TRANSLATE_API_KEY) {
    const resp = await fetch(`${endpoint}?key=${encodeURIComponent(process.env.GOOGLE_TRANSLATE_API_KEY)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(payload.error?.message || `Translate API returned ${resp.status}`);
    return payload.data?.translations?.[0]?.translatedText || text;
  }

  const token = await getCloudRunAccessToken();
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const payload = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(payload.error?.message || `Translate API returned ${resp.status}`);
  return payload.data?.translations?.[0]?.translatedText || text;
}

async function translateSpecs(specs) {
  const output = {};
  for (const [key, value] of Object.entries(specs || {})) {
    const translatedKey = await translateText(key);
    const translatedValue = await translateText(value);
    output[translatedKey || key] = translatedValue || value;
  }
  return output;
}

async function loadSettings() {
  const snap = await db.collection('system_settings').doc('product_sync').get();
  return { ...DEFAULT_SETTINGS, ...(snap.exists ? snap.data() : {}) };
}

async function loadActiveSources() {
  const snap = await db.collection('product_sync_sources').where('status', '==', 'active').get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function writeRun(runId, payload) {
  await db.collection('sync_runs').doc(runId).set({ ...payload, updatedAt: now() }, { merge: true });
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let total = 0;
      const distance = 500;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        total += distance;
        if (total >= document.body.scrollHeight * 1.5) {
          clearInterval(timer);
          resolve();
        }
      }, 180);
    });
  });
}

async function extractMeijiaListing(page, source) {
  await page.goto(normalizeUrl(source.url), { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
  await page.waitForTimeout(1500);
  await autoScroll(page);
  await page.waitForTimeout(800);

  return page.evaluate(({ sourceId, maxProducts }) => {
    const absolutize = href => {
      try { return new URL(href, window.location.origin).href; } catch { return ''; }
    };
    const parsePrice = text => {
      const match = String(text || '').replace(/,/g, '').match(/(?:￥|¥)\s*(\d+(?:\.\d+)?)/);
      return match ? Number(match[1]) : 0;
    };
    const cleanText = value => String(value || '').replace(/\s+/g, ' ').trim();
    const anchors = Array.from(document.querySelectorAll('a[href]'));
    const candidates = [];

    for (const anchor of anchors) {
      const text = cleanText(anchor.innerText || anchor.textContent || '');
      const rawPrice = parsePrice(text);
      if (!rawPrice) continue;

      const img = anchor.querySelector('img') || anchor.closest('li, .item, .goods, .product')?.querySelector('img');
      const title = cleanText(text.replace(/(?:￥|¥)\s*\d+(?:\.\d+)?/g, ''));
      const productUrl = absolutize(anchor.getAttribute('href'));
      const imageUrl = img?.currentSrc || img?.src || img?.getAttribute('data-src') || img?.getAttribute('data-original') || '';
      if (!title || !productUrl) continue;

      candidates.push({
        sourceId,
        productUrl,
        sourceSku: '',
        chineseTitle: title,
        chineseDescription: title,
        rawCnyPrice: rawPrice,
        imageGalleryUrls: imageUrl ? [absolutize(imageUrl)] : [],
        specs: {},
      });
    }

    const deduped = [];
    const seen = new Set();
    for (const item of candidates) {
      if (seen.has(item.productUrl)) continue;
      seen.add(item.productUrl);
      deduped.push(item);
      if (deduped.length >= maxProducts) break;
    }
    return deduped;
  }, { sourceId: source.id, maxProducts: MAX_PRODUCTS_PER_SOURCE });
}

async function enrichMeijiaProduct(context, product) {
  const { page } = context;
  if (!product.productUrl) return product;
  try {
    await page.goto(product.productUrl, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
    await page.waitForTimeout(900);
    const detail = await page.evaluate(() => {
      const cleanText = value => String(value || '').replace(/\s+/g, ' ').trim();
      const images = Array.from(document.querySelectorAll('img'))
        .map(img => img.currentSrc || img.src || img.getAttribute('data-src') || img.getAttribute('data-original'))
        .filter(Boolean)
        .slice(0, 12);
      const specs = {};
      Array.from(document.querySelectorAll('tr')).forEach(row => {
        const cells = Array.from(row.querySelectorAll('th,td')).map(cell => cleanText(cell.innerText));
        if (cells.length >= 2 && cells[0] && cells[1]) specs[cells[0]] = cells.slice(1).join(' ');
      });
      const description = cleanText(
        document.querySelector('.description, .desc, .detail, .goods-detail, .product-detail')?.innerText ||
        document.querySelector('meta[name="description"]')?.getAttribute('content') ||
        ''
      );
      return { images, specs, description };
    });
    return {
      ...product,
      chineseDescription: detail.description || product.chineseDescription,
      imageGalleryUrls: Array.from(new Set([...(product.imageGalleryUrls || []), ...(detail.images || [])])).slice(0, 12),
      specs: { ...(product.specs || {}), ...(detail.specs || {}) },
    };
  } catch (err) {
    return { ...product, detailWarning: err.message };
  }
}

async function extractProductsForSource(browser, source) {
  const domain = getDomain(source.url);
  const context = await browser.newContext({
    locale: 'zh-CN',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121 Safari/537.36',
  });
  const page = await context.newPage();
  try {
    let products;
    if (domain === 'meijiavip.com') {
      products = await extractMeijiaListing(page, source);
      const detailPage = await context.newPage();
      const enriched = [];
      for (const product of products.slice(0, Math.min(products.length, 25))) {
        enriched.push(await enrichMeijiaProduct({ page: detailPage }, product));
      }
      products = [...enriched, ...products.slice(enriched.length)];
    } else {
      throw new Error(`No scraper profile registered for ${domain}`);
    }

    return products.map(product => ({
      ...product,
      sourceSku: product.sourceSku || sourceSkuFromUrl(source.id, product.productUrl, product.chineseTitle),
    }));
  } finally {
    await context.close();
  }
}

async function publishProduct(source, rawProduct, settings) {
  const sourceSku = rawProduct.sourceSku;
  const scrapedRef = db.collection('scraped_products').doc(sourceSku);
  const scrapedSnap = await scrapedRef.get();
  const previous = scrapedSnap.exists ? scrapedSnap.data() : null;

  const translatedTitle = await translateText(rawProduct.chineseTitle);
  const translatedDescription = await translateText(rawProduct.chineseDescription);
  const translatedSpecs = await translateSpecs(rawProduct.specs);
  const currentHash = stableHash({
    title: rawProduct.chineseTitle,
    description: rawProduct.chineseDescription,
    images: rawProduct.imageGalleryUrls,
    specs: rawProduct.specs,
  });
  const finalPrice = retailPrice(rawProduct.rawCnyPrice, settings);
  const status = source.publishMode || settings.publishMode || 'draft';
  const nowField = now();

  if (previous && Number(previous.rawCnyPrice) !== Number(rawProduct.rawCnyPrice)) {
    await db.collection('price_history_log').add({
      sourceSku,
      sourceId: source.id,
      sourceUrl: source.url,
      previousRawCnyPrice: Number(previous.rawCnyPrice || 0),
      newRawCnyPrice: Number(rawProduct.rawCnyPrice || 0),
      previousRetailPrice: Number(previous.retailPrice || 0),
      newRetailPrice: finalPrice,
      changedAt: nowField,
    });
  }

  const scrapedPayload = {
    sourceSku,
    sourceId: source.id,
    sourceUrl: source.url,
    supplierDomain: source.supplierDomain || getDomain(source.url),
    category: source.category || 'Furniture',
    subcategory: source.subcategory || 'Furniture',
    chineseTitle: rawProduct.chineseTitle,
    chineseDescription: rawProduct.chineseDescription,
    translatedTitle,
    translatedDescription,
    rawCnyPrice: Number(rawProduct.rawCnyPrice || 0),
    retailPrice: finalPrice,
    currency: settings.defaultCurrency || 'GHS',
    forexConversionRate: Number(settings.forexConversionRate),
    profitMarginMultiplier: Number(settings.profitMarginMultiplier),
    imageGalleryUrls: rawProduct.imageGalleryUrls || [],
    specs: rawProduct.specs || {},
    translatedSpecs,
    contentHash: currentHash,
    syncStatus: status,
    lastSeenAt: nowField,
    updatedAt: nowField,
    createdAt: previous?.createdAt || nowField,
    detailWarning: rawProduct.detailWarning || '',
  };

  const productPayload = {
    id: sourceSku,
    sourceSku,
    sourceId: source.id,
    sourceUrl: rawProduct.productUrl || source.url,
    supplierDomain: source.supplierDomain || getDomain(source.url),
    name: translatedTitle || rawProduct.chineseTitle,
    desc: translatedDescription || rawProduct.chineseDescription,
    img: rawProduct.imageGalleryUrls?.[0] || '',
    gallery: rawProduct.imageGalleryUrls || [],
    cat: source.subcategory || source.category || 'Furniture',
    groupId: 'furniture',
    type: 'synced',
    specs: Object.entries(translatedSpecs || {}).map(([key, value]) => `${key}: ${value}`).join('\n'),
    rawCnyPrice: Number(rawProduct.rawCnyPrice || 0),
    retailPrice: finalPrice,
    fobPrice: Number(rawProduct.rawCnyPrice || 0),
    landedCost: finalPrice,
    currency: settings.defaultCurrency || 'GHS',
    syncStatus: status,
    status: status === 'publish' ? 'Available' : 'Draft',
    updatedAt: nowField,
    createdAt: previous?.createdAt || nowField,
  };

  await scrapedRef.set(scrapedPayload, { merge: true });
  await db.collection('products').doc(sourceSku).set(productPayload, { merge: true });

  if (!previous) return 'inserted';
  if (previous.contentHash !== currentHash || Number(previous.rawCnyPrice) !== Number(rawProduct.rawCnyPrice)) return 'updated';
  return 'skipped';
}

async function runSync({ requestedBy = 'system' } = {}) {
  const runId = `SYNC-${Date.now()}`;
  const counters = { discovered: 0, inserted: 0, updated: 0, skipped: 0, failed: 0 };
  const errors = [];
  await writeRun(runId, { status: 'running', startedAt: now(), requestedBy, ...counters });

  const settings = await loadSettings();
  const sources = await loadActiveSources();
  const allowedDomains = (settings.allowedDomains || []).map(d => d.replace(/^www\./, ''));
  const browser = await chromium.launch({ headless: true });

  try {
    for (const source of sources) {
      const domain = getDomain(source.url);
      if (!allowedDomains.includes(domain)) {
        errors.push({ sourceId: source.id, error: `Domain ${domain} not allowed` });
        counters.failed += 1;
        continue;
      }

      let products = [];
      try {
        products = await extractProductsForSource(browser, source);
        counters.discovered += products.length;
      } catch (err) {
        errors.push({ sourceId: source.id, error: err.message });
        counters.failed += 1;
        continue;
      }

      for (const product of products) {
        try {
          const result = await publishProduct(source, product, settings);
          counters[result] += 1;
        } catch (err) {
          counters.failed += 1;
          errors.push({ sourceId: source.id, sku: product.sourceSku, error: err.message });
        }
      }

      await writeRun(runId, { ...counters, errors: errors.slice(0, 20) });
    }
  } finally {
    await browser.close();
  }

  const status = counters.failed > 0 ? 'completed_with_errors' : 'completed';
  await writeRun(runId, { status, completedAt: now(), ...counters, errors: errors.slice(0, 50) });
  return { runId, status, ...counters, errors: errors.slice(0, 10) };
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'westline-product-sync-worker' });
});

app.post('/run-sync', async (req, res) => {
  try {
    const result = await runSync({ requestedBy: req.body?.requestedBy || req.body?.trigger || 'manual' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Westline product sync worker listening on ${port}`);
});
