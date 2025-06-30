/**
 * Main application logic for Bin Nights app
 */

class BinNightsApp {
  constructor() {
    this.currentCity = null;
    this.currentZone = null;
    this.currentZoneFeature = null;
    this.config = null;
    this.zones = null;
    this.lastUpdate = null;
    this.hasDisplayedLocation = false; // Track if we've successfully shown location info

    // Autocomplete state
    this.autocompleteTimeout = null;
    this.selectedSuggestionIndex = -1;
    this.suggestions = [];

    // Cache key for localStorage
    this.cacheKey = "binNights";

    // Bind methods
    this.init = this.init.bind(this);
    this.refreshData = this.refreshData.bind(this);
    this.lookupAddress = this.lookupAddress.bind(this);
    this.setupAutocomplete = this.setupAutocomplete.bind(this);
    this.handleAddressInput = this.handleAddressInput.bind(this);
    this.showSuggestions = this.showSuggestions.bind(this);
    this.showHelperText = this.showHelperText.bind(this);
    this.hideSuggestions = this.hideSuggestions.bind(this);
    this.selectSuggestion = this.selectSuggestion.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.toggleDarkMode = this.toggleDarkMode.bind(this);
    this.showAddressSelection = this.showAddressSelection.bind(this);
    this.closeAddressSelectionModal = this.closeAddressSelectionModal.bind(this);
    this.handleUseGps = this.handleUseGps.bind(this);
    this.showAddressInput = this.showAddressInput.bind(this);
    this.showLocationOptions = this.showLocationOptions.bind(this);

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

      // Load cached data first
      this.loadFromCache();

      // Apply saved settings
      this.applySavedSettings();

      // If we have cached data, show it immediately
      if (
        this.currentCity &&
        this.currentZone &&
        this.currentZoneFeature &&
        this.config
      ) {
        this.updateLocationInfo(
          `${this.config.city} Zone ${this.currentZone} (cached)`
        );
        this.updateBinDisplay();
        this.hasDisplayedLocation = true; // Mark that we've shown location info
      }

      // Try to get location and update data (but don't block the UI)
      this.getCurrentLocationAndUpdate().catch((error) => {
        // Location detection failed, but app can still work with manual zone selection
      });

      // If no cached data and location fails, show address selection modal after a delay
      setTimeout(() => {
        // Only show modal if we haven't successfully displayed any location data
        if (!this.hasDisplayedLocation) {
          this.showAddressSelection();
        }
      }, 3000);
    } catch (error) {
      console.error("Error initializing app:", error);
      this.showError("Failed to initialize app: " + error.message);
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

    // Address selection button
    const addressSelectionBtn = document.getElementById("addressSelectionBtn");
    if (addressSelectionBtn) {
      addressSelectionBtn.addEventListener("click", this.showAddressSelection);
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
      enterAddressBtn.addEventListener("click", () => this.showAddressInput());
    }

    // Back to options button
    const backToOptionsBtn = document.getElementById("backToOptionsBtn");
    if (backToOptionsBtn) {
      backToOptionsBtn.addEventListener("click", () => this.showLocationOptions());
    }

    // Allow Enter key in address input
    const addressInput = document.getElementById("addressInput");
    if (addressInput) {
      addressInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          if (this.selectedSuggestionIndex >= 0) {
            this.selectSuggestion(this.selectedSuggestionIndex);
          } else {
            this.lookupAddress();
          }
        }
      });

      // Setup autocomplete
      this.setupAutocomplete();
    }

    // Dark mode toggle
    const darkModeToggle = document.getElementById("darkModeToggle");
    if (darkModeToggle) {
      darkModeToggle.addEventListener("change", this.toggleDarkMode);
    }

    // Address selection modal close button
    const closeAddressSelectionBtn = document.getElementById("closeAddressSelectionBtn");
    if (closeAddressSelectionBtn) {
      closeAddressSelectionBtn.addEventListener("click", this.closeAddressSelectionModal);
    }

    // Close modal when clicking outside
    const addressSelectionModal = document.getElementById("addressSelectionModal");
    if (addressSelectionModal) {
      addressSelectionModal.addEventListener("click", (e) => {
        if (e.target === addressSelectionModal) {
          this.closeAddressSelectionModal();
        }
      });
    }
  }

  /**
   * Get current location and update app data
   */
  async getCurrentLocationAndUpdate() {
    try {
      this.updateLocationInfo("Getting your location...");

      // Check if geolocation is supported
      if (!navigator.geolocation) {
        throw new Error("Geolocation is not supported by this browser");
      }

      // Try to get current location with better error handling
      console.log("🔍 Requesting location permission...");
      const location = await getCurrentLocation();
      console.log("📍 Location obtained:", location);

      // Get location info (city and zone)
      this.updateLocationInfo("Finding your collection zone...");
      const locationInfo = await getLocationInfo(location.lat, location.lng);
      console.log("🏘️ Location info:", locationInfo);

      if (locationInfo.success) {
        this.currentCity = locationInfo.city;
        this.currentZone = locationInfo.zone;
        this.currentZoneFeature = locationInfo.zoneFeature;
        this.config = locationInfo.config;
        this.zones = locationInfo.zones;

        // Update UI
        this.updateLocationInfo(`${this.config.city} Zone ${this.currentZone}`);
        this.updateBinDisplay();
        this.hasDisplayedLocation = true; // Mark that we've shown location info

        // Save to cache
        this.saveToCache();

        // Hide error message if visible
        this.hideError();
      } else {
        console.warn("❌ Location detection failed:", locationInfo.error);
        
        // Try to use cached data if available
        if (this.currentCity && this.currentZone) {
          console.log("📦 Using cached data instead");
          this.updateBinDisplay();
          this.hasDisplayedLocation = true; // Mark that we've shown location info
        } else {
          // Show address selection modal instead of manual zone selector
          console.log("🎯 Showing address selection modal");
          setTimeout(() => this.showAddressSelection(), 1000);
        }
      }
    } catch (error) {
      console.error("❌ Location error:", error);
      let errorMessage = "Unable to get your location: " + error.message;

      // Provide more specific error messages
      if (error.message.includes("denied")) {
        errorMessage =
          "Location permission denied. Please enter your address below to find your collection zone.";
      } else if (error.message.includes("unavailable")) {
        errorMessage =
          "Location services unavailable. Please enter your address below to find your collection zone.";
      } else if (error.message.includes("timeout")) {
        errorMessage =
          "Location request timed out. Please enter your address below to find your collection zone.";
      } else {
        errorMessage =
          "Unable to get your location. Please enter your address below to find your collection zone.";
      }

      // Try to use cached data first
      if (this.currentCity && this.currentZone) {
        console.log("📦 Using cached data due to location error");
        this.updateLocationInfo(
          `${this.config?.city || this.currentCity} Zone ${
            this.currentZone
          } (cached)`
        );
        this.updateBinDisplay();
        this.hasDisplayedLocation = true; // Mark that we've shown location info
      } else {
        // Only show address selection modal if no cached data is available
        console.log(
          "🎯 Location error occurred, showing address selection modal"
        );
        this.showAddressSelection();
      }
    }
  }

  /**
   * Update the next collection display
   */
  updateNextCollectionDisplay(status) {
    const nextCollectionEl = document.getElementById("nextCollection");
    if (!nextCollectionEl) return;

    const timeEl = nextCollectionEl.querySelector(".collection-time");
    const dateEl = nextCollectionEl.querySelector(".collection-date");

    if (timeEl) {
      timeEl.textContent = status.nextCollectionText || "Unknown";
    }

    if (dateEl) {
      dateEl.textContent = status.nextCollectionDateText || "";
    }
  }

  /**
   * Update the bins container with current bin states
   */
  updateBinsContainer(status) {
    const container = document.getElementById("binsContainer");
    if (!container) return;

    // Clear existing bins
    container.innerHTML = "";

    // Create bins using the new binStates structure
    Object.entries(this.currentZoneFeature?.properties?.bins || {}).forEach(
      ([binType, binConfig]) => {
        const binState = status.binStates[binType] || { isActive: false };
        const binEl = this.createBinElement(binType, binConfig, binState);
        container.appendChild(binEl);
      }
    );
  }

  /**
   * Create a bin element
   */
  createBinElement(binType, binConfig, binState) {
    const binEl = document.createElement("div");
    binEl.className = `bin ${binType}`;

    // Add active/inactive class based on binState
    if (binState.isActive) {
      binEl.classList.add("active");
    } else {
      binEl.classList.add("inactive");
    }

    // Bin icon
    const iconEl = document.createElement("div");
    iconEl.className = `bin-icon ${binType}`;
    iconEl.innerHTML = this.getBinIcon(binType);

    // Bin label
    const labelEl = document.createElement("div");
    labelEl.className = "bin-label";
    labelEl.textContent = binConfig.name;

    binEl.appendChild(iconEl);
    binEl.appendChild(labelEl);

    // Add click handler for additional info
    binEl.addEventListener("click", () => {
      this.showBinInfo(binType, binConfig, binState);
    });

    return binEl;
  }

  /**
   * Get icon for bin type
   */
  getBinIcon(binType) {
    // Return empty string - icon is now handled entirely by CSS
    return '';
  }
  /**
   * Get symbol for bin content type
   */
  getBinSymbol(binType) {
    const symbols = {
      rubbish:
        '<text x="0" y="0" text-anchor="middle" fill="white" font-size="120" font-weight="bold">🗑️</text>',
      recycling:
        '<text x="0" y="0" text-anchor="middle" fill="white" font-size="120" font-weight="bold">♻️</text>',
      green:
        '<text x="0" y="0" text-anchor="middle" fill="white" font-size="120" font-weight="bold">🌿</text>',
      glass:
        '<text x="0" y="0" text-anchor="middle" fill="white" font-size="120" font-weight="bold">🍾</text>',
    };
    return symbols[binType] || symbols["rubbish"];
  }

  /**
   * Show bin information (placeholder for future enhancement)
   */
  showBinInfo(binType, binConfig, binState) {
    // This could show a modal with more details about the bin
    console.log("Bin info:", { binType, binConfig, binState });

    // For now, just log some useful info
    if (binState.isActive) {
      console.log(
        `🗑️ ${binConfig.name} will be collected in the next collection cycle`
      );
    } else {
      console.log(`🗑️ ${binConfig.name} is not in the next collection cycle`);
    }
  }

  /**
   * Show manual zone selector
   */
  async showManualZoneSelector() {
    try {
      // Load current city config if not available
      if (!this.config) {
        const defaultCity = "bendigo";
        this.config = await loadCityConfig(defaultCity);
        this.currentCity = defaultCity;
      }

      const selector = document.getElementById("manualZoneSelector");
      const zoneButtons = document.getElementById("zoneButtons");

      if (!selector || !zoneButtons) return;

      // Clear existing buttons
      zoneButtons.innerHTML = "";

      // Create zone buttons
      Object.keys(this.config.zones).forEach((zone) => {
        const btn = document.createElement("button");
        btn.className = "zone-btn";
        btn.textContent = `Zone ${zone}`;
        btn.addEventListener("click", () => this.selectZone(zone));
        zoneButtons.appendChild(btn);
      });

      // Show selector, hide error
      selector.style.display = "block";
      this.hideError();
    } catch (error) {
      console.error("Error showing manual zone selector:", error);
      this.showError("Unable to load zone options: " + error.message);
    }
  }

  /**
   * Hide manual zone selector
   */
  hideManualZoneSelector() {
    const selector = document.getElementById("manualZoneSelector");
    if (selector) {
      selector.style.display = "none";
    }
  }

  /**
   * Enable test mode with Zone A
   */
  async enableTestMode() {
    try {
      console.log("🧪 Enabling test mode with Zone A");

      // Load Bendigo config if not available
      if (!this.config) {
        this.config = await loadCityConfig("bendigo");
      }

      this.currentCity = "bendigo";
      this.currentZone = "A";

      // Test all zones first for debugging
      if (typeof debugAllZones === "function") {
        debugAllZones(this.config);
      }

      // Update display
      this.updateLocationInfo(`${this.config.city} Zone A (test mode)`);
      this.updateBinDisplay();

      // Save to cache
      this.saveToCache();

      // Hide error
      this.hideError();
    } catch (error) {
      console.error("Error enabling test mode:", error);
      this.showError("Error enabling test mode: " + error.message);
    }
  }

  /**
   * Look up location by address
   */
  async lookupAddress() {
    const addressInput = document.getElementById("addressInput");
    const lookupBtn = document.getElementById("lookupAddressBtn");

    if (!addressInput || !lookupBtn) {
      console.error("Address input elements not found");
      return;
    }

    const address = addressInput.value.trim();
    if (!address) {
      this.showError("Please enter an address to look up.");
      return;
    }

    try {
      // Update button state
      const originalText = lookupBtn.textContent;
      lookupBtn.textContent = "Looking up...";
      lookupBtn.disabled = true;

      // Update location info
      this.updateLocationInfo(`Looking up address: ${address}`);

      console.log("🔍 Looking up address:", address);

      // Use the address lookup function
      const locationInfo = await getLocationFromAddress(address);
      console.log("📍 Address lookup result:", locationInfo);

      if (locationInfo.success) {
        this.currentCity = locationInfo.city;
        this.currentZone = locationInfo.zone;
        this.currentZoneFeature = locationInfo.zoneFeature;
        this.config = locationInfo.config;
        this.zones = locationInfo.zones;

        // Update UI with geocoded address info
        const locationText = locationInfo.address
          ? `${this.config.city} Zone ${this.currentZone} (${
              locationInfo.address.split(",")[0]
            })`
          : `${this.config.city} Zone ${this.currentZone}`;
        this.updateLocationInfo(locationText);
        this.updateBinDisplay();
        this.hasDisplayedLocation = true; // Mark that we've shown location info

        // Save to cache
        this.saveToCache();

        // Hide error message and close modal
        this.hideError();
        this.closeAddressSelectionModal();

        // Clear the input
        addressInput.value = "";
      } else {
        console.warn("❌ Address lookup failed:", locationInfo.error);
        this.showError(
          locationInfo.error ||
            "Unable to find your address. Please try a more specific address or select your zone manually."
        );
      }
    } catch (error) {
      console.error("❌ Address lookup error:", error);
      this.showError("Error looking up address: " + error.message);
    } finally {
      // Restore button state
      lookupBtn.textContent = "Find My Zone";
      lookupBtn.disabled = false;
    }
  }

  /**
   * Setup autocomplete functionality for address input
   */
  setupAutocomplete() {
    const addressInput = document.getElementById("addressInput");
    if (!addressInput) return;

    // Input event for typing
    addressInput.addEventListener("input", this.handleAddressInput);

    // Keyboard navigation
    addressInput.addEventListener("keydown", this.handleKeyDown);

    // Hide suggestions when clicking outside
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".address-autocomplete")) {
        this.hideSuggestions();
      }
    });

    // Hide suggestions when input loses focus (with a delay for click events)
    addressInput.addEventListener("blur", () => {
      setTimeout(() => this.hideSuggestions(), 150);
    });
  }

  /**
   * Handle address input changes with debouncing
   */
  async handleAddressInput(e) {
    const query = e.target.value; // Don't trim here - keep original value with spaces

    // Clear previous timeout
    if (this.autocompleteTimeout) {
      clearTimeout(this.autocompleteTimeout);
    }

    // Reset selection
    this.selectedSuggestionIndex = -1;

    // Simple check: search only when query ends with space and has meaningful content
    const endsWithSpace = query.endsWith(" ");
    const trimmedQuery = query.trim();
    const shouldSearch = endsWithSpace && trimmedQuery.length >= 3;

    // Debug logging
    console.log(
      "Raw query:",
      `"${query}"`,
      "Length:",
      query.length,
      "Ends with space:",
      endsWithSpace,
      "Trimmed:",
      `"${trimmedQuery}"`,
      "Should search:",
      shouldSearch
    );

    if (!shouldSearch) {
      // Show helper text if user is typing but hasn't completed a word
      if (query.length >= 2) {
        this.showHelperText();
      } else {
        this.hideSuggestions();
      }
      return;
    }

    // Debounce the API call
    this.autocompleteTimeout = setTimeout(async () => {
      try {
        this.showLoadingSuggestions();
        const suggestions = await searchAddresses(query);
        this.suggestions = suggestions;
        this.showSuggestions(suggestions);
      } catch (error) {
        console.error("Autocomplete error:", error);
        this.hideSuggestions();
      }
    }, 300); // 300ms delay
  }

  /**
   * Show loading state in suggestions dropdown
   */
  showLoadingSuggestions() {
    const dropdown = document.getElementById("autocompleteDropdown");
    if (!dropdown) return;

    dropdown.innerHTML =
      '<div class="autocomplete-loading">Searching addresses...</div>';
    dropdown.style.display = "block";
  }

  /**
   * Show address suggestions in dropdown
   */
  showSuggestions(suggestions) {
    const dropdown = document.getElementById("autocompleteDropdown");
    if (!dropdown) return;

    if (suggestions.length === 0) {
      dropdown.innerHTML =
        '<div class="autocomplete-no-results">No addresses found</div>';
      dropdown.style.display = "block";
      return;
    }

    dropdown.innerHTML = suggestions
      .map((suggestion, index) => {
        return `<div class="autocomplete-item" data-index="${index}">
                ${suggestion.display_name}
            </div>`;
      })
      .join("");

    // Add click event listeners to suggestions
    dropdown.querySelectorAll(".autocomplete-item").forEach((item, index) => {
      item.addEventListener("click", () => this.selectSuggestion(index));
    });

    dropdown.style.display = "block";
  }

  /**
   * Show helper text in suggestions dropdown
   */
  showHelperText() {
    const dropdown = document.getElementById("autocompleteDropdown");
    if (!dropdown) return;

    dropdown.innerHTML =
      '<div class="autocomplete-helper-text">Address suggestions will appear after you finish typing a word (add a space)</div>';
    dropdown.style.display = "block";
  }

  /**
   * Hide suggestions dropdown
   */
  hideSuggestions() {
    const dropdown = document.getElementById("autocompleteDropdown");
    if (dropdown) {
      dropdown.style.display = "none";
      dropdown.innerHTML = "";
    }
    this.selectedSuggestionIndex = -1;
    this.suggestions = [];
  }

  /**
   * Select a suggestion from the dropdown
   */
  async selectSuggestion(index) {
    if (index < 0 || index >= this.suggestions.length) return;

    const suggestion = this.suggestions[index];
    const addressInput = document.getElementById("addressInput");

    if (addressInput) {
      addressInput.value = suggestion.display_name;
    }

    this.hideSuggestions();

    // Automatically look up the selected address
    try {
      const locationInfo = await getLocationInfo(
        suggestion.lat,
        suggestion.lng
      );
      console.log("📍 Selected address location info:", locationInfo);

      if (locationInfo.success) {
        this.currentCity = locationInfo.city;
        this.currentZone = locationInfo.zone;
        this.currentZoneFeature = locationInfo.zoneFeature;
        this.config = locationInfo.config;
        this.zones = locationInfo.zones;

        // Update UI
        const locationText = `${this.config.city} Zone ${this.currentZone} (${
          suggestion.display_name.split(",")[0]
        })`;
        this.updateLocationInfo(locationText);
        this.updateBinDisplay();
        this.hasDisplayedLocation = true; // Mark that we've shown location info

        // Save to cache
        this.saveToCache();

        // Hide error message and close modal
        this.hideError();
        this.closeAddressSelectionModal();

        // Clear the input
        if (addressInput) {
          addressInput.value = "";
        }
      } else {
        console.warn(
          "❌ Selected address location failed:",
          locationInfo.error
        );
        this.showError(
          locationInfo.error ||
            "Selected address is not in a supported collection zone."
        );
      }
    } catch (error) {
      console.error("❌ Error processing selected address:", error);
      this.showError("Error processing selected address: " + error.message);
    }
  }

  /**
   * Handle keyboard navigation in autocomplete
   */
  handleKeyDown(e) {
    const dropdown = document.getElementById("autocompleteDropdown");
    if (!dropdown || dropdown.style.display === "none") return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        this.selectedSuggestionIndex = Math.min(
          this.selectedSuggestionIndex + 1,
          this.suggestions.length - 1
        );
        this.updateSuggestionHighlight();
        break;

      case "ArrowUp":
        e.preventDefault();
        this.selectedSuggestionIndex = Math.max(
          this.selectedSuggestionIndex - 1,
          -1
        );
        this.updateSuggestionHighlight();
        break;

      case "Escape":
        this.hideSuggestions();
        break;

      case "Enter":
        if (this.selectedSuggestionIndex >= 0) {
          e.preventDefault();
          this.selectSuggestion(this.selectedSuggestionIndex);
        }
        break;
    }
  }

  /**
   * Update visual highlight of selected suggestion
   */
  updateSuggestionHighlight() {
    const dropdown = document.getElementById("autocompleteDropdown");
    if (!dropdown) return;

    const items = dropdown.querySelectorAll(".autocomplete-item");
    items.forEach((item, index) => {
      if (index === this.selectedSuggestionIndex) {
        item.classList.add("highlighted");
      } else {
        item.classList.remove("highlighted");
      }
    });
  }

  /**
   * Toggle dark mode
   */
  toggleDarkMode() {
    const isDark =
      document.documentElement.getAttribute("data-theme") === "dark";
    const newTheme = isDark ? "light" : "dark";

    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("binNights-theme", newTheme);
    
    // Update toggle state
    this.updateThemeToggle();
  }

  /**
   * Detect system theme preference
   */
  getSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  /**
   * Update theme toggle state
   */
  updateThemeToggle() {
    const darkModeToggle = document.getElementById("darkModeToggle");
    if (darkModeToggle) {
      const currentTheme = document.documentElement.getAttribute("data-theme");
      darkModeToggle.checked = currentTheme === "dark";
    }
  }

  /**
   * Apply saved settings from localStorage
   */
  applySavedSettings() {
    // Apply saved theme or system preference
    let savedTheme = localStorage.getItem("binNights-theme");
    
    // If no saved theme, use system preference
    if (!savedTheme) {
      savedTheme = this.getSystemTheme();
      console.log("No saved theme, using system preference:", savedTheme);
    }
    
    document.documentElement.setAttribute("data-theme", savedTheme);
    this.updateThemeToggle();
    
    // Listen for system theme changes
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addListener((e) => {
        // Only update if user hasn't manually set a preference
        const manualTheme = localStorage.getItem("binNights-theme");
        if (!manualTheme) {
          const systemTheme = e.matches ? 'dark' : 'light';
          document.documentElement.setAttribute("data-theme", systemTheme);
          this.updateThemeToggle();
          console.log("System theme changed to:", systemTheme);
        }
      });
    }
  }

  /**
   * Refresh app data
   */
  async refreshData() {
    try {
      console.log("🔄 Refreshing data...");

      if (this.currentCity && this.currentZone) {
        // Update with current zone
        this.updateBinDisplay();
        this.updateLastRefresh();
      } else {
        // Try to get location again
        await this.getCurrentLocationAndUpdate();
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
      this.showError("Error refreshing: " + error.message);
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    const errorDiv = document.getElementById("errorMessage");
    if (errorDiv) {
      errorDiv.querySelector("p").textContent = message;
      errorDiv.style.display = "block";
    }

    // Update location info
    this.updateLocationInfo("Location detection failed");
  }

  /**
   * Hide error message
   */
  hideError() {
    const errorDiv = document.getElementById("errorMessage");
    if (errorDiv) {
      errorDiv.style.display = "none";
    }
  }

  /**
   * Update location info display
   */
  updateLocationInfo(text) {
    const locationInfo = document.getElementById("locationInfo");
    if (locationInfo) {
      locationInfo.textContent = text;
    }
  }

  /**
   * Update last refresh time
   */
  updateLastRefresh() {
    this.lastUpdate = new Date();
    const lastUpdateSpan = document.getElementById("lastUpdate");
    if (lastUpdateSpan) {
      lastUpdateSpan.textContent = `Updated: ${this.lastUpdate.toLocaleTimeString()}`;
    }
  }

  /**
   * Update bin display based on current zone and schedule
   */
  updateBinDisplay() {
    if (!this.config || !this.currentZoneFeature) {
      this.showError("Please enter your address to find your collection zone.");
      return;
    }

    try {
      // Find next collection
      const nextCollection = getNextCollection(
        this.config,
        this.currentZoneFeature
      );

      if (nextCollection) {
        this.updateNextCollectionDisplay(nextCollection);

        // Create status object with all bins and their active states
        const status = {
          binStates: {},
        };

        // Get all bin types from zone feature and set their active state
        Object.keys(this.currentZoneFeature.properties.bins || {}).forEach(
          (binType) => {
            status.binStates[binType] = {
              isActive: nextCollection.bins.includes(binType),
            };
          }
        );

        this.updateBinsContainer(status);
      }

      this.updateLastRefresh();
    } catch (error) {
      console.error("Error updating bin display:", error);
      this.showError("Error updating display: " + error.message);
    }
  }

  /**
   * Update next collection time display
   */
  updateNextCollectionDisplay(nextCollection) {
    const nextCollectionDiv = document.getElementById("nextCollection");
    if (!nextCollectionDiv) return;

    const timeDiv = nextCollectionDiv.querySelector(".collection-time");
    const dateDiv = nextCollectionDiv.querySelector(".collection-date");

    if (timeDiv && dateDiv) {
      const timeUntil = getTimeText(
        nextCollection.date,
        getCurrentMoment(this.config.timezone)
      );
      timeDiv.textContent = timeUntil;
      dateDiv.textContent = nextCollection.date.format("MMMM Do");
    }
  }

  /**
   * Save app state to localStorage
   */
  saveToCache() {
    try {
      const cacheData = {
        city: this.currentCity,
        zone: this.currentZone,
        zoneFeature: this.currentZoneFeature,
        config: this.config,
        zones: this.zones,
        lastUpdate: this.lastUpdate,
        timestamp: Date.now(),
      };

      localStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
      console.log("💾 Data saved to cache");
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
      if (!cached) return false;

      const data = JSON.parse(cached);

      // Check if cache is still valid (24 hours)
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      if (Date.now() - data.timestamp > maxAge) {
        console.log("📦 Cache expired, clearing...");
        localStorage.removeItem(this.cacheKey);
        return false;
      }

      this.currentCity = data.city;
      this.currentZone = data.zone;
      this.currentZoneFeature = data.zoneFeature;
      this.config = data.config;
      this.zones = data.zones;
      this.lastUpdate = data.lastUpdate ? new Date(data.lastUpdate) : null;

      // If we don't have a zoneFeature but have zone data, try to find it
      if (!this.currentZoneFeature && this.currentZone && this.zones) {
        this.currentZoneFeature = this.zones.features.find(
          (feature) => feature.properties.zone === this.currentZone
        );
      }

      console.log("📦 Data loaded from cache:", {
        city: this.currentCity,
        zone: this.currentZone,
      });

      return true;
    } catch (error) {
      console.warn("Failed to load from cache:", error);
      localStorage.removeItem(this.cacheKey);
      return false;
    }
  }

  /**
   * Select a zone manually
   */
  async selectZone(zone) {
    try {
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

      // Update display
      this.updateLocationInfo(`${this.config.city} Zone ${zone} (manual)`);
      this.updateBinDisplay();

      // Save to cache
      this.saveToCache();

      // Hide selector
      this.hideManualZoneSelector();
    } catch (error) {
      console.error("Error selecting zone:", error);
      this.showError("Error selecting zone: " + error.message);
    }
  }

  /**
   * Show settings modal with focus on address search (when GPS fails)
   */
  showSettingsWithAddressSearch() {
    // Don't show modal if we already have location info displayed
    if (this.hasDisplayedLocation) {
      return;
    }
    
    const modal = document.getElementById("settingsModal");
    const addressSection = document.getElementById("addressSearchSection");
    const addressInput = document.getElementById("addressInput");
    
    if (!modal) return;

    // Show the modal
    this.populateSettings();
    modal.style.display = "flex";
    
    // Focus on the address input if available
    if (addressInput) {
      setTimeout(() => {
        addressInput.focus();
      }, 100);
    }
    
    // Update location info to indicate manual setup
    this.updateLocationInfo("Please find your location using the address search or zone selection below");
  }

  /**
   * Show address selection modal
   */
  showAddressSelection() {
    const modal = document.getElementById("addressSelectionModal");
    if (!modal) return;

    // Show the modal with location options
    modal.style.display = "flex";
    this.showLocationOptions();
    
    // Update location info to indicate manual setup
    this.updateLocationInfo("Choose how you'd like to find your collection zone");
  }

  /**
   * Close address selection modal
   */
  closeAddressSelectionModal() {
    const modal = document.getElementById("addressSelectionModal");
    if (modal) {
      modal.style.display = "none";
    }
    
    // Reset to options view
    this.showLocationOptions();
  }

  /**
   * Show location options (GPS or Address)
   */
  showLocationOptions() {
    const optionsDiv = document.querySelector(".location-options");
    const addressSection = document.getElementById("addressInputSection");
    
    if (optionsDiv) {
      optionsDiv.style.display = "flex";
    }
    if (addressSection) {
      addressSection.style.display = "none";
    }
  }

  /**
   * Show address input section
   */
  showAddressInput() {
    const optionsDiv = document.querySelector(".location-options");
    const addressSection = document.getElementById("addressInputSection");
    const addressInput = document.getElementById("addressInput");
    
    if (optionsDiv) {
      optionsDiv.style.display = "none";
    }
    if (addressSection) {
      addressSection.style.display = "block";
    }
    
    // Focus on the address input
    if (addressInput) {
      setTimeout(() => {
        addressInput.focus();
      }, 100);
    }
  }

  /**
   * Handle "Use GPS" button click
   */
  async handleUseGps() {
    try {
      this.updateLocationInfo("Getting your location...");
      
      // Try to get location
      await this.getCurrentLocationAndUpdate();
      
      // Close the modal if successful
      this.closeAddressSelectionModal();
    } catch (error) {
      console.error("GPS failed:", error);
      // Let the user know GPS failed and switch to address input
      this.updateLocationInfo("GPS failed. Please enter your address below.");
      this.showAddressInput();
    }
  }
}

// Initialize the app
new BinNightsApp();
