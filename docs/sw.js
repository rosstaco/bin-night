// Service Worker for Bin Nights PWA
const CACHE_VERSION = '2.2.2'; // Update this version when you want to force cache refresh
const CACHE_NAME = `bin-nights-v${CACHE_VERSION}`;

// Determine the base path dynamically from the service worker's own URL
const getBasePath = () => {
  const swUrl = new URL(self.location);
  const basePath = swUrl.pathname.replace('/sw.js', '');
  // Return the directory path, or '.' for root
  return basePath || '.';
};

const BASE_PATH = getBasePath();

const urlsToCache = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/style.css`, 
  `${BASE_PATH}/js/app.js`,
  `${BASE_PATH}/js/geo.js`,
  `${BASE_PATH}/js/date-utils.js`,
  // Manager modules
  `${BASE_PATH}/js/managers/cache-manager.js`,
  `${BASE_PATH}/js/managers/location-manager.js`,
  `${BASE_PATH}/js/managers/bin-display-manager.js`,
  `${BASE_PATH}/js/managers/ui-manager.js`,
  `${BASE_PATH}/js/managers/pwa-manager.js`,
  `${BASE_PATH}/js/managers/autocomplete-manager.js`,
  // App assets
  `${BASE_PATH}/manifest.json`,
  `${BASE_PATH}/icons/icon.svg`,
  `${BASE_PATH}/icons/icon.png`,
  `${BASE_PATH}/data/bendigo/config.json`,
  `${BASE_PATH}/data/bendigo/zones.geojson`
];

console.log('Service Worker Base Path:', BASE_PATH);
console.log('URLs to cache:', urlsToCache);

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log(`Installing SW version ${CACHE_VERSION}`);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache:', CACHE_NAME);
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // Force the waiting service worker to become the active service worker
        return self.skipWaiting();
      })
  );
});

// Fetch event - cache first strategy with navigation fix for iOS PWA
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  
  // Handle navigation requests (iOS PWA fix)
  if (event.request.mode === 'navigate') {
    // If it's a navigation request, always serve the index.html from our base path
    event.respondWith(
      caches.match(`${BASE_PATH}/index.html`)
        .then((response) => {
          if (response) {
            return response;
          }
          // Fallback to network if not in cache
          return fetch(`${BASE_PATH}/index.html`);
        })
        .catch(() => {
          // Ultimate fallback
          return caches.match(`${BASE_PATH}/`);
        })
    );
    return;
  }
  
  // For non-navigation requests, use cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          // Return cached version
          return response;
        }
        
        // Clone the request because it's a stream that can only be consumed once
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then((response) => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response because it's a stream that can only be consumed once
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        }).catch(() => {
          // If network fails and it's an HTML request, try to serve index.html
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match(`${BASE_PATH}/index.html`);
          }
          throw error;
        });
      })
  );
});

// Activate event - clean up old caches and take control immediately
self.addEventListener('activate', (event) => {
  console.log(`Activating SW version ${CACHE_VERSION}`);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});
