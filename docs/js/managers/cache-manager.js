/**
 * Cache Manager - Handles localStorage operations for the Bin Nights app
 */
class CacheManager {
  constructor() {
    this.cacheKey = "binNights";
  }

  /**
   * Save app state to localStorage
   */
  saveToCache(data) {
    try {
      // Extract only essential data from zoneFeature to reduce cache size
      const simplifiedZoneData = data.currentZoneFeature ? {
        zone: data.currentZoneFeature.properties.zone,
        collectionDay: data.currentZoneFeature.properties.collectionDay,
        bins: data.currentZoneFeature.properties.bins
      } : null;

      const cacheData = {
        // Location data - persists indefinitely
        city: data.currentCity,
        zone: data.currentZone,
        locationTimestamp: Date.now(),
        
        // Geo/bin data - expires after 24 hours
        zoneData: simplifiedZoneData,
        config: data.config,
        lastUpdate: data.lastUpdate,
        geoTimestamp: Date.now(),
      };

      localStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
      console.log("💾 Data saved to cache (location + geo data)");
    } catch (error) {
      console.warn("Failed to save to cache:", error);
    }
  }

  /**
   * Load app state from localStorage
   */
  loadFromCache() {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (!cached) return null;

      const data = JSON.parse(cached);

      // Handle migration from old cache format (single timestamp)
      if (data.timestamp && !data.geoTimestamp) {
        data.geoTimestamp = data.timestamp;
        data.locationTimestamp = data.timestamp;
      }

      // Check if geo data is still valid (24 hours)
      const maxGeoAge = 24 * 60 * 60 * 1000; // 24 hours
      const geoDataExpired = data.geoTimestamp && (Date.now() - data.geoTimestamp > maxGeoAge);
      
      const result = {
        hasLocationData: false,
        hasValidGeoData: false,
        data: {}
      };

      // Always load location data if available
      if (data.city && data.zone) {
        result.data.currentCity = data.city;
        result.data.currentZone = data.zone;
        result.hasLocationData = true;
        console.log("📦 Location data loaded from cache:", {
          city: data.city,
          zone: data.zone,
        });
      }

      // Load geo data only if not expired
      if (!geoDataExpired && data.config && data.zoneData) {
        result.data.config = data.config;
        result.data.lastUpdate = data.lastUpdate ? new Date(data.lastUpdate) : null;

        // Reconstruct currentZoneFeature from simplified zoneData
        result.data.currentZoneFeature = {
          type: "Feature",
          properties: {
            zone: data.zoneData.zone,
            collectionDay: data.zoneData.collectionDay,
            bins: data.zoneData.bins
          },
          geometry: null // We don't need the geometry for bin scheduling
        };

        result.hasValidGeoData = true;
        console.log("📦 Geo data loaded from cache (fresh)");
      } else if (geoDataExpired) {
        console.log("📦 Geo data expired, will refresh bin schedules");
      } else {
        console.log("📦 No geo data in cache");
      }

      // Handle old cache format with zoneFeature
      if (!result.data.currentZoneFeature && data.zoneFeature && !geoDataExpired) {
        result.data.currentZoneFeature = data.zoneFeature;
        result.hasValidGeoData = true;
      }

      return result;
    } catch (error) {
      console.warn("Failed to load from cache:", error);
      return null;
    }
  }

  /**
   * Clear cache data
   */
  clearCache() {
    try {
      localStorage.removeItem(this.cacheKey);
      console.log("🗑️ Cache cleared");
    } catch (error) {
      console.warn("Failed to clear cache:", error);
    }
  }
}
