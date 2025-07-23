# App.js Refactoring - Module Structure

## Overview

The original `app.js` file was **1679 lines** and contained duplicate code, especially in the PWA installation functionality. The code has been refactored into a modular structure that is easier to maintain and test.

## New Structure

### Main App (462 lines)
- **`js/app.js`** - Main application coordinator class that manages all the individual managers

### Manager Modules (1207 lines total)

1. **`js/managers/cache-manager.js`** (126 lines)
   - Handles all localStorage operations
   - Manages cache expiration and migration
   - Separates location data (persistent) from geo data (24hr expiry)

2. **`js/managers/location-manager.js`** (201 lines)
   - Handles GPS location detection
   - Address geocoding and lookup
   - Zone data management
   - Location state management

3. **`js/managers/bin-display-manager.js`** (190 lines)
   - Manages bin display and status
   - Collection schedule calculations
   - Bin UI element creation
   - Last update timestamp tracking

4. **`js/managers/ui-manager.js`** (269 lines)
   - Modal management (address selection, etc.)
   - Theme switching (dark/light mode)
   - Error message display
   - Location info updates
   - Button loading states

5. **`js/managers/pwa-manager.js`** (162 lines)
   - PWA installation functionality
   - Platform detection (iOS/Android)
   - Install button management
   - **Eliminates duplicate code** from the original app.js

6. **`js/managers/autocomplete-manager.js`** (259 lines)
   - Address input autocomplete
   - Suggestion dropdown management
   - Keyboard navigation
   - Debounced API calls

## Benefits

1. **Reduced Code Duplication**: Eliminated duplicate PWA installation methods
2. **Better Organization**: Related functionality is grouped together
3. **Easier Testing**: Each manager can be tested independently
4. **Improved Maintainability**: Changes to specific features are isolated
5. **Better Separation of Concerns**: Each manager has a single responsibility
6. **Cleaner Main App**: The main app class is now focused on coordination rather than implementation

## Event-Driven Communication

The managers communicate through custom events:
- `autocompleteSelection` - When user selects an address suggestion
- `zoneSelected` - When user manually selects a zone

This loose coupling makes the system more flexible and testable.

## Loading Order

The HTML loads managers before the main app to ensure all dependencies are available:

```html
<!-- Manager modules -->
<script src="js/managers/cache-manager.js"></script>
<script src="js/managers/location-manager.js"></script>
<script src="js/managers/bin-display-manager.js"></script>
<script src="js/managers/ui-manager.js"></script>
<script src="js/managers/pwa-manager.js"></script>
<script src="js/managers/autocomplete-manager.js"></script>
<!-- Main app -->
<script src="js/app.js"></script>
```

## Future Enhancements

This modular structure makes it easy to:
- Add new features by creating new managers
- Replace specific functionality without affecting other parts
- Add unit tests for individual managers
- Implement dependency injection if needed
- Convert to ES6 modules in the future
