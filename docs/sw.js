// Service Worker for Bin Nights PWA
const CACHE_VERSION = '2.0.1'; // Update this version when you want to force cache refresh
const CACHE_NAME = `bin-nights-v${CACHE_VERSION}`;
const BASE_PATH = '/bin-nights';
const urlsToCache = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/style.css`,
  `${BASE_PATH}/js/app.js`,
  `${BASE_PATH}/js/geo.js`,
  `${BASE_PATH}/js/date-utils.js`,
  `${BASE_PATH}/manifest.json`,
  `${BASE_PATH}/icons/icon.svg`,
  `${BASE_PATH}/data/bendigo/config.json`,
  `${BASE_PATH}/data/bendigo/zones.geojson`
];

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

// Fetch event - cache first strategy with network fallback
self.addEventListener('fetch', (event) => {
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
        });
      }
    )
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
