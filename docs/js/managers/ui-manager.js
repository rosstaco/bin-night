/**
 * UI Manager - Handles UI interactions, modal management, and theme switching
 */
class UIManager {
  constructor() {
    this.hasDisplayedLocation = false;
  }

  /**
   * Initialize UI components and event listeners
   */
  init() {
    this.applySavedSettings();
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
   * Show manual zone selector
   */
  async showManualZoneSelector(config) {
    try {
      const selector = document.getElementById("manualZoneSelector");
      const zoneButtons = document.getElementById("zoneButtons");

      if (!selector || !zoneButtons) return;

      // Clear existing buttons
      zoneButtons.innerHTML = "";

      // Create zone buttons
      Object.keys(config.zones).forEach((zone) => {
        const btn = document.createElement("button");
        btn.className = "zone-btn";
        btn.textContent = `Zone ${zone}`;
        btn.addEventListener("click", () => {
          // Dispatch custom event for zone selection
          const event = new CustomEvent('zoneSelected', {
            detail: { zone }
          });
          document.dispatchEvent(event);
        });
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
   * Set up button loading state
   */
  setButtonLoading(buttonId, isLoading, loadingText = "Loading...") {
    const button = document.getElementById(buttonId);
    if (!button) return;

    if (isLoading) {
      button.dataset.originalText = button.textContent;
      button.textContent = loadingText;
      button.disabled = true;
    } else {
      button.textContent = button.dataset.originalText || button.textContent;
      button.disabled = false;
      delete button.dataset.originalText;
    }
  }

  /**
   * Clear address input
   */
  clearAddressInput() {
    const addressInput = document.getElementById("addressInput");
    if (addressInput) {
      addressInput.value = "";
    }
  }

  /**
   * Get/Set location display status
   */
  setLocationDisplayed(displayed) {
    this.hasDisplayedLocation = displayed;
  }

  getLocationDisplayed() {
    return this.hasDisplayedLocation;
  }
}
