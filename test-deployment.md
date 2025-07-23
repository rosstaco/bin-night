# iOS PWA Subdirectory Fix - Testing Guide

## What was the problem?
iOS Safari has a bug where PWAs (Progressive Web Apps) installed from a subdirectory (e.g., `domain.com/binapp/`) will redirect to the root domain (`domain.com/`) when launched from the home screen, instead of staying in the subdirectory.

## The Fix Applied

### 1. **Relative Paths in Manifest** (`manifest.json`)
- Changed `start_url` from `/bin-nights/` to `./`
- Changed `scope` from `/bin-nights/` to `./`

### 2. **Dynamic Service Worker** (`sw.js`)
- Service worker now determines its base path dynamically
- Handles navigation requests properly for PWAs
- Caches resources using relative paths

### 3. **iOS PWA Navigation Fix** (`index.html`)
- Added client-side detection for iOS PWA mode
- Redirects to correct path if launched at wrong location
- Uses multiple fallback methods to determine correct path

### 4. **Base Tag** (`index.html`)
- Added `<base href="./">` to ensure all relative paths resolve correctly

## Testing Scenarios

### Test 1: Root Deployment
- Deploy to `https://domain.com/`
- Install as PWA
- Launch from home screen
- ✅ Should open at `https://domain.com/`

### Test 2: Subdirectory Deployment
- Deploy to `https://domain.com/binapp/`
- Install as PWA
- Launch from home screen
- ✅ Should open at `https://domain.com/binapp/` (not redirect to root)

### Test 3: Deep Subdirectory
- Deploy to `https://domain.com/apps/utilities/binapp/`
- Install as PWA
- Launch from home screen
- ✅ Should open at `https://domain.com/apps/utilities/binapp/`

## How to Test

1. **Desktop Testing**: Use Chrome DevTools device emulation with iOS Safari
2. **iOS Simulator**: Test in Xcode iOS Simulator
3. **Real Device**: Test on actual iOS device

### Testing Steps:
1. Navigate to the app URL in Safari
2. Add to Home Screen
3. Launch from home screen
4. Verify it opens at the correct URL
5. Check that all resources load correctly
6. Verify service worker registers properly

## Debug Information

Enable debugging in browser console:
```javascript
// Enable service worker debugging
localStorage.setItem('binNights-debug', 'true')

// Check current PWA status
console.log('Standalone mode:', window.navigator.standalone);
console.log('Display mode:', window.matchMedia('(display-mode: standalone)').matches);
```

## Fallback Mechanisms

The fix includes multiple fallback mechanisms:
1. **Service Worker Navigation Handling**: Primary fix for navigation requests
2. **Client-side Path Detection**: Backup fix using manifest and base tag analysis
3. **Base Tag**: Ensures relative paths work correctly
4. **Dynamic Path Resolution**: Service worker determines correct base path automatically

This comprehensive approach should resolve the iOS PWA subdirectory issue across all deployment scenarios.
