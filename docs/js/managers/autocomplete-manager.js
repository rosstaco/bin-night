/**
 * Autocomplete Manager - Handles address autocomplete functionality
 */
class AutocompleteManager {
  constructor() {
    this.autocompleteTimeout = null;
    this.selectedSuggestionIndex = -1;
    this.suggestions = [];
  }

  /**
   * Setup autocomplete functionality for address input
   */
  setupAutocomplete() {
    const addressInput = document.getElementById("addressInput");
    if (!addressInput) return;

    // Input event for typing
    addressInput.addEventListener("input", this.handleAddressInput.bind(this));

    // Keyboard navigation
    addressInput.addEventListener("keydown", this.handleKeyDown.bind(this));

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
  async selectSuggestion(index, onSelectionCallback) {
    if (index < 0 || index >= this.suggestions.length) return;

    const suggestion = this.suggestions[index];
    const addressInput = document.getElementById("addressInput");

    if (addressInput) {
      addressInput.value = suggestion.display_name;
    }

    this.hideSuggestions();

    // Call the callback with the selected suggestion
    if (onSelectionCallback) {
      return await onSelectionCallback(suggestion);
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
          // Trigger selection callback through event dispatcher
          const event = new CustomEvent('autocompleteSelection', {
            detail: { index: this.selectedSuggestionIndex }
          });
          document.dispatchEvent(event);
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
   * Get the currently selected suggestion index
   */
  getSelectedIndex() {
    return this.selectedSuggestionIndex;
  }

  /**
   * Clear autocomplete state
   */
  clear() {
    this.hideSuggestions();
    if (this.autocompleteTimeout) {
      clearTimeout(this.autocompleteTimeout);
      this.autocompleteTimeout = null;
    }
  }
}
