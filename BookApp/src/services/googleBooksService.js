const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes';

// Optional API key from environment (REACT_APP_GOOGLE_BOOKS_KEY)
const API_KEY = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_GOOGLE_BOOKS_KEY) ? process.env.REACT_APP_GOOGLE_BOOKS_KEY : '';

// Simple in-memory cache to avoid repeated identical calls during a session
const cache = new Map();
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

const mapVolumeToBook = (v) => {
  const info = v.volumeInfo || {};
  const sale = v.saleInfo || {};
  const listPrice = sale.listPrice || sale.retailPrice || {};
  const amount = typeof listPrice.amount === 'number' ? listPrice.amount : 50;
  const currencyCode = listPrice.currencyCode || 'INR';

  // Prefer to leave rating undefined if not present, calling code will choose whether to display
  const rating = typeof info.averageRating === 'number' ? info.averageRating : undefined;

  return {
    _id: v.id,
    title: info.title || 'Untitled',
    author: (info.authors && info.authors[0]) || 'Unknown',
    description: info.description || '',
    rating: rating,
    reviewsCount: info.ratingsCount || 0,
    category: (info.categories && info.categories[0]) || 'general',
    imageUrl: info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || '',
    price: amount,
    currencyCode
  };
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Fetch with retries and exponential backoff for 429/5xx errors
async function fetchWithRetries(url, options = {}, retries = 3, backoff = 500) {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;

      // Retry on 429 (rate limit) or server errors 5xx
      if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
        if (attempt === retries) return res; // give up
        const wait = backoff * Math.pow(2, attempt);
        await sleep(wait);
        attempt++;
        continue;
      }

      // Other non-ok statuses: return as-is for the caller to handle
      return res;
    } catch (err) {
      // network error: retry
      if (attempt === retries) throw err;
      const wait = backoff * Math.pow(2, attempt);
      await sleep(wait);
      attempt++;
    }
  }
}

function buildUrl(url) {
  if (!API_KEY) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}key=${encodeURIComponent(API_KEY)}`;
}

async function fetchJson(url) {
  const cached = cache.get(url);
  const now = Date.now();
  if (cached && (now - cached.ts) < CACHE_TTL) {
    return cached.data;
  }

  const res = await fetchWithRetries(buildUrl(url), {}, 3, 400);
  if (!res.ok) {
    // Try to parse JSON if possible, otherwise return null
    try {
      const maybe = await res.json();
      return maybe;
    } catch (e) {
      return null;
    }
  }

  const data = await res.json();
  cache.set(url, { ts: now, data });
  return data;
}

export const googleBooksService = {
  async search(query, maxResults = 20) {
    const q = encodeURIComponent(query);
    const paidUrl = `${GOOGLE_BOOKS_API}?q=${q}&maxResults=${maxResults}&printType=books&orderBy=relevance&filter=paid-ebooks`;
    let data = await fetchJson(paidUrl);
    let items = Array.isArray(data?.items) ? data.items : [];
    if (items.length === 0) {
      const fallbackUrl = `${GOOGLE_BOOKS_API}?q=${q}&maxResults=${maxResults}&printType=books&orderBy=relevance`;
      data = await fetchJson(fallbackUrl);
      items = Array.isArray(data?.items) ? data.items : [];
    }
    return items.map(mapVolumeToBook);
  },

  async byCategory(category, maxResults = 40) {
    const normalizedCategory = category.toLowerCase()
      .replace(/\s+/g, '+')
      .replace('self-help', 'self+help')
      .replace('self help', 'self+help');

    const query = `subject:${normalizedCategory}`;
    const q = encodeURIComponent(query);

    const paidUrl = `${GOOGLE_BOOKS_API}?q=${q}&orderBy=relevance&printType=books&filter=paid-ebooks&maxResults=${maxResults}`;
    let data = await fetchJson(paidUrl);
    let items = Array.isArray(data?.items) ? data.items : [];

    if (items.length === 0) {
      const fallbackUrl = `${GOOGLE_BOOKS_API}?q=${q}&orderBy=relevance&printType=books&maxResults=${maxResults}`;
      data = await fetchJson(fallbackUrl);
      items = Array.isArray(data?.items) ? data.items : [];
    }

    if (items.length === 0) {
      const broadQuery = encodeURIComponent(normalizedCategory.split('+')[0]);
      const broadUrl = `${GOOGLE_BOOKS_API}?q=${broadQuery}&orderBy=relevance&printType=books&maxResults=${maxResults}`;
      data = await fetchJson(broadUrl);
      items = Array.isArray(data?.items) ? data.items : [];
    }

    console.log(`Google Books API returned ${items.length} items for category: ${category}`);
    return items.map(mapVolumeToBook).map(b => ({ ...b, category }));
  }
};

// Fetch a single volume by its Google Books volumeId
export const getGoogleVolumeById = async (volumeId) => {
  if (!volumeId) return null;
  const url = `${GOOGLE_BOOKS_API}/${encodeURIComponent(volumeId)}`;
  const data = await fetchJson(url);
  if (!data || !data.id) return null;
  return mapVolumeToBook(data);
};


