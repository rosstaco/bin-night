/**
 * Bin Display Manager - Handles bin display, collection status, and UI updates
 */
class BinDisplayManager {
  constructor() {
    this.lastUpdate = null;
  }

  /**
   * Update bin display based on current zone and schedule
   */
  updateBinDisplay(config, currentZoneFeature) {
    if (!config || !currentZoneFeature) {
      throw new Error("Config and zone feature are required for bin display");
    }

    try {
      // Find next collection
      const nextCollection = getNextCollection(config, currentZoneFeature);

      if (nextCollection) {
        this.updateNextCollectionDisplay(nextCollection, config);

        // Create status object with all bins and their active states
        const status = {
          binStates: {},
        };

        // Get all bin types from zone feature and set their active state
        Object.keys(currentZoneFeature.properties.bins || {}).forEach(
          (binType) => {
            status.binStates[binType] = {
              isActive: nextCollection.bins.includes(binType),
            };
          }
        );

        this.updateBinsContainer(status, currentZoneFeature);
      }

      this.updateLastRefresh();
    } catch (error) {
      console.error("Error updating bin display:", error);
      throw new Error("Error updating display: " + error.message);
    }
  }

  /**
   * Update next collection time display
   */
  updateNextCollectionDisplay(nextCollection, config) {
    const nextCollectionDiv = document.getElementById("nextCollection");
    if (!nextCollectionDiv) return;

    const timeDiv = nextCollectionDiv.querySelector(".collection-time");
    const dateDiv = nextCollectionDiv.querySelector(".collection-date");

    if (timeDiv && dateDiv) {
      const timeUntil = getTimeText(
        nextCollection.date,
        getCurrentMoment(config.timezone)
      );
      timeDiv.textContent = timeUntil;
      dateDiv.textContent = nextCollection.date.format("MMMM Do");
    }
  }

  /**
   * Update the bins container with current bin states
   */
  updateBinsContainer(status, currentZoneFeature) {
    const container = document.getElementById("binsContainer");
    if (!container) return;

    // Clear existing bins
    container.innerHTML = "";

    // Define preferred order with green bin first
    const binOrder = ['green', 'rubbish', 'organics', 'recycling', 'glass'];
    
    // Get all bin entries and sort them
    const binEntries = Object.entries(currentZoneFeature?.properties?.bins || {});
    const sortedBinEntries = binEntries.sort(([binTypeA], [binTypeB]) => {
      const indexA = binOrder.indexOf(binTypeA);
      const indexB = binOrder.indexOf(binTypeB);
      
      // If both bins are in the order array, sort by their position
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      // If only one is in the order array, prioritize it
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      // If neither is in the order array, maintain original order
      return 0;
    });

    // Create bins using the sorted order
    sortedBinEntries.forEach(([binType, binConfig]) => {
      const binState = status.binStates[binType] || { isActive: false };
      const binEl = this.createBinElement(binType, binConfig, binState);
      container.appendChild(binEl);
    });
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
   * Get icon for bin type (handled by CSS now)
   */
  getBinIcon(binType) {
    // Return empty string - icon is now handled entirely by CSS
    return '';
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
   * Get last update time
   */
  getLastUpdate() {
    return this.lastUpdate;
  }

  /**
   * Set last update time (for loading from cache)
   */
  setLastUpdate(date) {
    this.lastUpdate = date;
  }
}
