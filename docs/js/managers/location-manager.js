/**
 * Location Manager - Handles GPS, address lookup, and geocoding for the Bin Nights app
 */
class LocationManager {
  constructor() {
    this.currentCity = null;
    this.currentZone = null;
    this.currentZoneFeature = null;
    this.config = null;
    this.zones = null;
  }

  /**
   * Get current location using GPS
   */
  async getCurrentLocation() {
    console.log("🔍 Requesting location permission...");
    
    if (!navigator.geolocation) {
      throw new Error("Geolocation is not supported by this browser");
    }

    const location = await getCurrentLocation();
    console.log("📍 Location obtained:", location);
    return location;
  }

  /**
   * Get location info from coordinates
   */
  async getLocationFromCoordinates(lat, lng) {
    console.log("🏘️ Getting location info for coordinates:", lat, lng);
    const locationInfo = await getLocationInfo(lat, lng);
    console.log("🏘️ Location info:", locationInfo);
    
    if (locationInfo.success) {
      this.currentCity = locationInfo.city;
      this.currentZone = locationInfo.zone;
      this.currentZoneFeature = locationInfo.zoneFeature;
      this.config = locationInfo.config;
      this.zones = locationInfo.zones;
      return {
        success: true,
        city: this.currentCity,
        zone: this.currentZone,
        config: this.config
      };
    }
    
    return {
      success: false,
      error: locationInfo.error
    };
  }

  /**
   * Get location info from address
   */
  async getLocationFromAddress(address) {
    console.log("🔍 Looking up address:", address);
    const locationInfo = await getLocationFromAddress(address);
    console.log("📍 Address lookup result:", locationInfo);

    if (locationInfo.success) {
      this.currentCity = locationInfo.city;
      this.currentZone = locationInfo.zone;
      this.currentZoneFeature = locationInfo.zoneFeature;
      this.config = locationInfo.config;
      this.zones = locationInfo.zones;
      return {
        success: true,
        city: this.currentCity,
        zone: this.currentZone,
        config: this.config,
        address: locationInfo.address
      };
    }

    return {
      success: false,
      error: locationInfo.error
    };
  }

  /**
   * Refresh geo data (config and zone features) while keeping location data
   */
  async refreshGeoData() {
    if (!this.currentCity || !this.currentZone) {
      throw new Error("No location data available to refresh geo data");
    }

    try {
      console.log("🔄 Refreshing geo data for", this.currentCity, "zone", this.currentZone);
      
      // Load fresh config
      this.config = await loadCityConfig(this.currentCity);
      
      // Load fresh zones data
      this.zones = await loadCityZones(this.currentCity);
      
      // Find the zone feature for our current zone
      if (this.zones) {
        this.currentZoneFeature = this.zones.features.find(
          (feature) => feature.properties.zone === this.currentZone
        );
      }

      if (this.currentZoneFeature && this.config) {
        console.log("✅ Geo data refreshed successfully");
        return {
          success: true,
          city: this.currentCity,
          zone: this.currentZone,
          config: this.config,
          zoneFeature: this.currentZoneFeature
        };
      } else {
        throw new Error("Could not find zone data for current location");
      }
    } catch (error) {
      console.error("❌ Failed to refresh geo data:", error);
      throw error;
    }
  }

  /**
   * Select a zone manually
   */
  async selectZone(zone, city = null) {
    try {
      if (city) {
        this.currentCity = city;
        this.config = await loadCityConfig(city);
      }

      this.currentZone = zone;

      // Load zones data if not available
      if (!this.zones && this.currentCity) {
        this.zones = await loadCityZones(this.currentCity);
      }

      // Find the zone feature
      if (this.zones) {
        this.currentZoneFeature = this.zones.features.find(
          (feature) => feature.properties.zone === zone
        );
      }

      return {
        success: true,
        city: this.currentCity,
        zone: this.currentZone,
        config: this.config,
        zoneFeature: this.currentZoneFeature
      };
    } catch (error) {
      console.error("Error selecting zone:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Load cached data
   */
  loadFromCache(data) {
    if (data.currentCity) this.currentCity = data.currentCity;
    if (data.currentZone) this.currentZone = data.currentZone;
    if (data.currentZoneFeature) this.currentZoneFeature = data.currentZoneFeature;
    if (data.config) this.config = data.config;
    if (data.zones) this.zones = data.zones;
  }

  /**
   * Get current state for caching
   */
  getStateForCache() {
    return {
      currentCity: this.currentCity,
      currentZone: this.currentZone,
      currentZoneFeature: this.currentZoneFeature,
      config: this.config,
      zones: this.zones
    };
  }

  /**
   * Clear location data
   */
  clear() {
    this.currentCity = null;
    this.currentZone = null;
    this.currentZoneFeature = null;
    this.config = null;
    this.zones = null;
  }
}
