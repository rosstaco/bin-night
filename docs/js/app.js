/**
 * Main application logic for Bin Nights app
 */

class BinNightsApp {
  constructor() {
    // Initialize managers
    this.cacheManager = new CacheManager();
    this.locationManager = new LocationManager();
    this.binDisplayManager = new BinDisplayManager();
    this.uiManager = new UIManager();
    this.pwaManager = new PWAManager();
    this.autocompleteManager = new AutocompleteManager();

    // Bind methods
    this.init = this.init.bind(this);
    this.refreshData = this.refreshData.bind(this);
    this.lookupAddress = this.lookupAddress.bind(this);
    this.handleUseGps = this.handleUseGps.bind(this);

    // Initialize when DOM is ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", this.init);
    } else {
      this.init();
    }
  }

  /**
   * Initialize the application
   */
  async init() {
    try {
      // Set up event listeners
      this.setupEventListeners();

      // Set up managers
      this.uiManager.init();
      this.pwaManager.setupPWAInstall();
      this.autocompleteManager.setupAutocomplete();

      // Load cached data first
      const cacheResult = this.cacheManager.loadFromCache();

      if (cacheResult) {
        this.locationManager.loadFromCache(cacheResult.data);
        if (cacheResult.data.lastUpdate) {
          this.binDisplayManager.setLastUpdate(new Date(cacheResult.data.lastUpdate));
        }

        // If we have complete cached data (location + geo), show it immediately
        if (cacheResult.hasLocationData && cacheResult.hasValidGeoData) {
          const config = this.locationManager.config;
          const zone = this.locationManager.currentZone;
          this.uiManager.updateLocationInfo(`${config.city} Zone ${zone} (cached)`);
          this.binDisplayManager.updateBinDisplay(
            this.locationManager.config,
            this.locationManager.currentZoneFeature
          );
          this.uiManager.setLocationDisplayed(true);
        } 
        // If we have location but missing geo data, refresh geo data
        else if (cacheResult.hasLocationData && !cacheResult.hasValidGeoData) {
          console.log("📦 Have location, refreshing geo data...");
          const city = this.locationManager.currentCity;
          const zone = this.locationManager.currentZone;
          this.uiManager.updateLocationInfo(`${city} Zone ${zone} (refreshing...)`);
          this.uiManager.setLocationDisplayed(true);
          
          // Refresh geo data in background
          try {
            await this.locationManager.refreshGeoData();
            this.updateDisplayAfterLocationChange();
          } catch (error) {
            console.warn("Failed to refresh geo data:", error);
            this.uiManager.updateLocationInfo(`${city} Zone ${zone} (refresh needed)`);
          }
        }
      }

      // If no cached data, show address selection modal after a delay
      setTimeout(() => {
        if (!this.uiManager.getLocationDisplayed()) {
          this.uiManager.showAddressSelection();
        }
      }, 3000);
    } catch (error) {
      console.error("Error initializing app:", error);
      this.uiManager.showError("Failed to initialize app: " + error.message);
    }
  }

  /**
   * Set up event listeners for UI interactions
   */
  setupEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById("refreshBtn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", this.refreshData);
    }

    // Install button
    const installBtn = document.getElementById("installBtn");
    if (installBtn) {
      installBtn.addEventListener("click", () => this.pwaManager.handleInstallPrompt());
    }

    // Address selection button
    const addressSelectionBtn = document.getElementById("addressSelectionBtn");
    if (addressSelectionBtn) {
      addressSelectionBtn.addEventListener("click", () => this.uiManager.showAddressSelection());
    }

    // Address lookup
    const lookupAddressBtn = document.getElementById("lookupAddressBtn");
    if (lookupAddressBtn) {
      lookupAddressBtn.addEventListener("click", () => this.lookupAddress());
    }

    // Use GPS button
    const useGpsBtn = document.getElementById("useGpsBtn");
    if (useGpsBtn) {
      useGpsBtn.addEventListener("click", () => this.handleUseGps());
    }

    // Enter Address button
    const enterAddressBtn = document.getElementById("enterAddressBtn");
    if (enterAddressBtn) {
      enterAddressBtn.addEventListener("click", () => this.uiManager.showAddressInput());
    }

    // Back to options button
    const backToOptionsBtn = document.getElementById("backToOptionsBtn");
    if (backToOptionsBtn) {
      backToOptionsBtn.addEventListener("click", () => this.uiManager.showLocationOptions());
    }

    // Allow Enter key in address input
    const addressInput = document.getElementById("addressInput");
    if (addressInput) {
      addressInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const selectedIndex = this.autocompleteManager.getSelectedIndex();
          if (selectedIndex >= 0) {
            this.handleAutocompleteSelection(selectedIndex);
          } else {
            this.lookupAddress();
          }
        }
      });
    }

    // Dark mode toggle
    const darkModeToggle = document.getElementById("darkModeToggle");
    if (darkModeToggle) {
      darkModeToggle.addEventListener("change", () => this.uiManager.toggleDarkMode());
    }

    // Address selection modal close button
    const closeAddressSelectionBtn = document.getElementById("closeAddressSelectionBtn");
    if (closeAddressSelectionBtn) {
      closeAddressSelectionBtn.addEventListener("click", () => this.uiManager.closeAddressSelectionModal());
    }

    // Close modal when clicking outside
    const addressSelectionModal = document.getElementById("addressSelectionModal");
    if (addressSelectionModal) {
      addressSelectionModal.addEventListener("click", (e) => {
        if (e.target === addressSelectionModal) {
          this.uiManager.closeAddressSelectionModal();
        }
      });
    }

    // Custom events
    document.addEventListener('autocompleteSelection', (e) => {
      this.handleAutocompleteSelection(e.detail.index);
    });

    document.addEventListener('zoneSelected', (e) => {
      this.selectZone(e.detail.zone);
    });
  }

  /**
   * Handle autocomplete selection
   */
  async handleAutocompleteSelection(index) {
    await this.autocompleteManager.selectSuggestion(index, async (suggestion) => {
      try {
        const locationInfo = await this.locationManager.getLocationFromCoordinates(
          suggestion.lat,
          suggestion.lng
        );

        if (locationInfo.success) {
          this.updateDisplayAfterLocationChange(suggestion.display_name.split(",")[0]);
          this.uiManager.closeAddressSelectionModal();
          this.uiManager.clearAddressInput();
        } else {
          this.uiManager.showError(
            locationInfo.error || "Selected address is not in a supported collection zone."
          );
        }
      } catch (error) {
        console.error("❌ Error processing selected address:", error);
        this.uiManager.showError("Error processing selected address: " + error.message);
      }
    });
  }

  /**
   * Update display after location change
   */
  updateDisplayAfterLocationChange(addressPrefix = null) {
    const config = this.locationManager.config;
    const zone = this.locationManager.currentZone;
    
    let locationText = `${config.city} Zone ${zone}`;
    if (addressPrefix) {
      locationText += ` (${addressPrefix})`;
    }
    
    this.uiManager.updateLocationInfo(locationText);
    this.binDisplayManager.updateBinDisplay(
      this.locationManager.config,
      this.locationManager.currentZoneFeature
    );
    this.uiManager.setLocationDisplayed(true);
    this.saveCurrentState();
    this.uiManager.hideError();
  }

  /**
   * Save current state to cache
   */
  saveCurrentState() {
    const stateData = {
      ...this.locationManager.getStateForCache(),
      lastUpdate: this.binDisplayManager.getLastUpdate()
    };
    this.cacheManager.saveToCache(stateData);
  }

  /**
   * Get current location and update app data
   */
  async getCurrentLocationAndUpdate() {
    try {
      this.uiManager.updateLocationInfo("Getting your location...");

      const location = await this.locationManager.getCurrentLocation();
      
      this.uiManager.updateLocationInfo("Finding your collection zone...");
      const locationInfo = await this.locationManager.getLocationFromCoordinates(
        location.lat, 
        location.lng
      );

      if (locationInfo.success) {
        this.updateDisplayAfterLocationChange();
      } else {
        console.warn("❌ Location detection failed:", locationInfo.error);
        
        // Try to use cached data if available
        const cacheResult = this.cacheManager.loadFromCache();
        if (cacheResult && cacheResult.hasLocationData) {
          console.log("📦 Using cached data instead");
          this.locationManager.loadFromCache(cacheResult.data);
          this.updateDisplayAfterLocationChange();
        } else {
          console.log("🎯 Showing address selection modal");
          setTimeout(() => this.uiManager.showAddressSelection(), 1000);
        }
      }
    } catch (error) {
      console.error("❌ Location error:", error);
      let errorMessage = this.getLocationErrorMessage(error);

      // Try to use cached data first
      const cacheResult = this.cacheManager.loadFromCache();
      if (cacheResult && cacheResult.hasLocationData) {
        console.log("📦 Using cached data due to location error");
        this.locationManager.loadFromCache(cacheResult.data);
        const config = this.locationManager.config;
        const zone = this.locationManager.currentZone;
        const city = config?.city || this.locationManager.currentCity;
        this.uiManager.updateLocationInfo(`${city} Zone ${zone} (cached)`);
        this.binDisplayManager.updateBinDisplay(
          this.locationManager.config,
          this.locationManager.currentZoneFeature
        );
        this.uiManager.setLocationDisplayed(true);
      } else {
        console.log("🎯 Location error occurred, showing address selection modal");
        this.uiManager.showAddressSelection();
      }
    }
  }

  /**
   * Get appropriate error message for location errors
   */
  getLocationErrorMessage(error) {
    if (error.message.includes("denied")) {
      return "Location permission denied. Please enter your address below to find your collection zone.";
    } else if (error.message.includes("unavailable")) {
      return "Location services unavailable. Please enter your address below to find your collection zone.";
    } else if (error.message.includes("timeout")) {
      return "Location request timed out. Please enter your address below to find your collection zone.";
    } else {
      return "Unable to get your location. Please enter your address below to find your collection zone.";
    }
  }

  /**
   * Look up location by address
   */
  async lookupAddress() {
    const addressInput = document.getElementById("addressInput");

    if (!addressInput) {
      console.error("Address input elements not found");
      return;
    }

    const address = addressInput.value.trim();
    if (!address) {
      this.uiManager.showError("Please enter an address to look up.");
      return;
    }

    try {
      this.uiManager.setButtonLoading("lookupAddressBtn", true, "Looking up...");
      this.uiManager.updateLocationInfo(`Looking up address: ${address}`);

      console.log("� Looking up address:", address);
      const locationInfo = await this.locationManager.getLocationFromAddress(address);

      if (locationInfo.success) {
        this.updateDisplayAfterLocationChange(locationInfo.address?.split(",")[0]);
        this.uiManager.closeAddressSelectionModal();
        this.uiManager.clearAddressInput();
      } else {
        console.warn("❌ Address lookup failed:", locationInfo.error);
        this.uiManager.showError(
          locationInfo.error ||
            "Unable to find your address. Please try a more specific address or select your zone manually."
        );
      }
    } catch (error) {
      console.error("❌ Address lookup error:", error);
      this.uiManager.showError("Error looking up address: " + error.message);
    } finally {
      this.uiManager.setButtonLoading("lookupAddressBtn", false);
    }
  }

  /**
   * Handle "Use GPS" button click
   */
  async handleUseGps() {
    try {
      this.uiManager.updateLocationInfo("Getting your location...");
      
      await this.getCurrentLocationAndUpdate();
      this.uiManager.closeAddressSelectionModal();
    } catch (error) {
      console.error("GPS failed:", error);
      this.uiManager.updateLocationInfo("GPS failed. Please enter your address below.");
      this.uiManager.showAddressInput();
    }
  }

  /**
   * Select a zone manually
   */
  async selectZone(zone) {
    try {
      const result = await this.locationManager.selectZone(zone, this.locationManager.currentCity || "bendigo");
      
      if (result.success) {
        this.updateDisplayAfterLocationChange(" (manual)");
        this.uiManager.hideManualZoneSelector();
      } else {
        this.uiManager.showError("Error selecting zone: " + result.error);
      }
    } catch (error) {
      console.error("Error selecting zone:", error);
      this.uiManager.showError("Error selecting zone: " + error.message);
    }
  }

  /**
   * Refresh app data
   */
  async refreshData() {
    try {
      console.log("🔄 Refreshing data...");

      const hasLocation = this.locationManager.currentCity && this.locationManager.currentZone;
      
      if (hasLocation) {
        // If we have location data, refresh geo data to get latest schedules
        if (this.locationManager.config && this.locationManager.currentZoneFeature) {
          // Just update display if we have everything
          this.binDisplayManager.updateBinDisplay(
            this.locationManager.config,
            this.locationManager.currentZoneFeature
          );
        } else {
          // Refresh geo data if missing
          try {
            await this.locationManager.refreshGeoData();
            this.updateDisplayAfterLocationChange();
          } catch (error) {
            console.warn("Failed to refresh geo data, updating display anyway:", error);
            this.binDisplayManager.updateBinDisplay(
              this.locationManager.config,
              this.locationManager.currentZoneFeature
            );
          }
        }
      } else {
        // Try to get location again if no location data
        await this.getCurrentLocationAndUpdate();
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
      this.uiManager.showError("Error refreshing: " + error.message);
    }
  }

  /**
   * Enable test mode with Zone A
   */
  async enableTestMode() {
    try {
      console.log("🧪 Enabling test mode with Zone A");

      const result = await this.locationManager.selectZone("A", "bendigo");
      
      if (result.success) {
        // Test all zones first for debugging
        if (typeof debugAllZones === "function") {
          debugAllZones(result.config);
        }

        this.updateDisplayAfterLocationChange(" (test mode)");
      } else {
        this.uiManager.showError("Error enabling test mode: " + result.error);
      }
    } catch (error) {
      console.error("Error enabling test mode:", error);
      this.uiManager.showError("Error enabling test mode: " + error.message);
    }
  }}

// Initialize the app
new BinNightsApp();
