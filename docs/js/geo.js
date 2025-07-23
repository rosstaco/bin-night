/**
 * Geolocation utilities for finding collection zones
 */

/**
 * Get the user's current location using the Geolocation API
 * @returns {Promise<{lat: number, lng: number}>} User's coordinates
 */
function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by this browser'));
            return;
        }
        
        const options = {
            enableHighAccuracy: false, // Faster response
            timeout: 15000, // 15 seconds timeout
            maximumAge: 600000 // Cache for 10 minutes
        };
        
        console.log('🔍 Requesting geolocation with options:', options);
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                console.log('✅ Geolocation success:', {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy
                });
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy
                });
            },
            (error) => {
                let message = 'Unable to get location';
                console.error('❌ Geolocation error:', error);
                
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        message = 'Location access denied by user';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        message = 'Location information unavailable';
                        break;
                    case error.TIMEOUT:
                        message = 'Location request timed out';
                        break;
                }
                reject(new Error(message));
            },
            options
        );
    });
}

/**
 * Load GeoJSON data for a city
 * @param {string} city - City name (e.g., 'bendigo')
 * @returns {Promise<Object>} GeoJSON feature collection
 */
async function loadCityZones(city) {
    try {
        const response = await fetch(`data/${city}/zones.geojson`);
        if (!response.ok) {
            throw new Error(`Failed to load zones for ${city}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error loading city zones:', error);
        throw error;
    }
}

/**
 * Load configuration data for a city
 * @param {string} city - City name (e.g., 'bendigo')
 * @returns {Promise<Object>} City configuration object
 */
async function loadCityConfig(city) {
    try {
        const response = await fetch(`data/${city}/config.json`);
        if (!response.ok) {
            throw new Error(`Failed to load config for ${city}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error loading city config:', error);
        throw error;
    }
}

/**
 * Find which zone contains a given point using Turf.js
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {Object} geoJSON - GeoJSON feature collection with zone polygons
 * @returns {Object|null} Zone feature or null if not found
 */
function findZone(lat, lng, geoJSON) {
    if (!window.turf) {
        console.error('Turf.js is not loaded');
        return null;
    }
    
    try {
        const point = turf.point([lng, lat]);
        
        for (let i = 0; i < geoJSON.features.length; i++) {
            const feature = geoJSON.features[i];
            const geom = feature.geometry;
            
            if (!geom || (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon')) {
                console.warn(`⚠️ Feature ${i} has invalid geometry type:`, geom?.type);
                continue;
            }
            
            try {
                let polygon;
                if (geom.type === 'Polygon') {
                    polygon = turf.polygon(geom.coordinates);
                } else if (geom.type === 'MultiPolygon') {
                    polygon = turf.multiPolygon(geom.coordinates);
                }
                
                if (turf.booleanPointInPolygon(point, polygon)) {
                    console.log(`✅ Found point in zone: ${feature.properties.zone}`);
                    return feature;
                }
            } catch (featureError) {
                console.warn(`⚠️ Error processing zone ${feature.properties.zone}:`, featureError);
            }
        }
        
        return null; // Point not found in any zone
    } catch (error) {
        console.error('Error in point-in-polygon calculation:', error);
        return null;
    }
}

/**
 * Get location information including city and zone
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Object>} Location information object
 */
async function getLocationInfo(lat, lng) {
    try {
        // List of supported cities
        const supportedCities = ['bendigo', 'yarra'];
        
        // Try each city to find which one contains this location
        for (const cityName of supportedCities) {
            try {
                const [zones, config] = await Promise.all([
                    loadCityZones(cityName),
                    loadCityConfig(cityName)
                ]);
                
                // Find zone in this city
                const zoneFeature = findZone(lat, lng, zones);
                
                if (zoneFeature) {
                    console.log(`✅ Found location in ${cityName} zone: ${zoneFeature.properties.zone}`);
                    return {
                        success: true,
                        city: cityName,
                        zone: zoneFeature.properties.zone,
                        zoneFeature,
                        lat,
                        lng,
                        zones,
                        config
                    };
                }
                
                console.log(`📍 Location not found in ${cityName} zones`);
            } catch (cityError) {
                console.warn(`⚠️ Error loading data for ${cityName}:`, cityError);
            }
        }
        
        // If we get here, location wasn't found in any supported city
        return {
            success: false,
            error: 'Location is outside of supported waste collection zones. Currently supported: City of Greater Bendigo and City of Yarra.',
            lat,
            lng
        };
        
    } catch (error) {
        return {
            success: false,
            error: error.message,
            lat,
            lng
        };
    }
}

/**
 * Calculate distance between two points (in kilometers)
 * @param {number} lat1 - First point latitude
 * @param {number} lng1 - First point longitude
 * @param {number} lat2 - Second point latitude
 * @param {number} lng2 - Second point longitude
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
    if (!window.turf) {
        // Fallback Haversine formula
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    const from = turf.point([lng1, lat1]);
    const to = turf.point([lng2, lat2]);
    return turf.distance(from, to, { units: 'kilometers' });
}
/**
 * Geocode an address to get coordinates using OpenStreetMap Nominatim API
 * @param {string} address - The address to geocode
 * @returns {Promise<{lat: number, lng: number, display_name: string}>} Coordinates and formatted address
 */
async function geocodeAddress(address) {
    try {
        console.log('🔍 Geocoding address:', address);
        
        // Use OpenStreetMap Nominatim API (free) without geographic bounds restriction
        const encodedAddress = encodeURIComponent(address);
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&addressdetails=1&countrycodes=au`;
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'BinNights/1.0 (Waste Collection Reminder App)'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Geocoding API error: ${response.status}`);
        }
        
        const results = await response.json();
        
        if (results.length === 0) {
            throw new Error('Address not found. Please try a more specific address.');
        }
        
        const result = results[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        
        console.log('✅ Geocoding success:', {
            lat,
            lng,
            display_name: result.display_name
        });
        
        return {
            lat,
            lng,
            display_name: result.display_name,
            accuracy: 'address' // Indicate this came from address lookup
        };
        
    } catch (error) {
        console.error('❌ Geocoding error:', error);
        throw new Error(`Unable to find location for "${address}": ${error.message}`);
    }
}

/**
 * Try to get location using address lookup as fallback
 * @param {string} address - The address to look up
 * @returns {Promise<Object>} Location information object
 */
async function getLocationFromAddress(address) {
    try {
        // First geocode the address
        const coords = await geocodeAddress(address);
        
        // Then get location info using the coordinates
        const locationInfo = await getLocationInfo(coords.lat, coords.lng);
        
        // Add the geocoded information to the result
        if (locationInfo.success) {
            locationInfo.geocoded = true;
            locationInfo.address = coords.display_name;
            locationInfo.accuracy = coords.accuracy;
        } else {
            locationInfo.geocoded = true;
            locationInfo.address = coords.display_name;
            locationInfo.lat = coords.lat;
            locationInfo.lng = coords.lng;
        }
        
        return locationInfo;
        
    } catch (error) {
        return {
            success: false,
            error: error.message,
            geocoded: true
        };
    }
}

/**
 * Search for address suggestions using OpenStreetMap Nominatim API
 * @param {string} query - The search query
 * @param {number} limit - Maximum number of results (default: 5)
 * @param {AbortSignal} signal - Optional abort signal for cancelling requests
 * @returns {Promise<Array>} Array of address suggestions
 */
async function searchAddresses(query, limit = 5, signal = null) {
    try {
        if (!query || query.length < 3) {
            return [];
        }
        
        console.log('🔍 Searching addresses for:', query);
        
        // Use OpenStreetMap Nominatim API for address search without geographic bounds
        const encodedQuery = encodeURIComponent(query);
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=${limit}&addressdetails=1&countrycodes=au`;
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'BinNights/1.0 (Waste Collection Reminder App)'
            },
            signal // Add abort signal support
        });
        
        if (!response.ok) {
            throw new Error(`Address search API error: ${response.status}`);
        }
        
        const results = await response.json();
        
        // Convert results to our format (no geographic filtering)
        const suggestions = results.map(result => ({
            display_name: result.display_name,
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon),
            place_id: result.place_id,
            type: result.type,
            importance: result.importance
        }));
        
        console.log('✅ Address search results:', suggestions.length);
        
        return suggestions;
        
    } catch (error) {
        console.error('❌ Address search error:', error);
        return [];
    }
}

/**
 * Test function to check zone finding with coordinates that should be in zones
 */
function testZoneFinding() {
    // Test coordinates for both supported cities
    const testCoords = [
        { name: 'Bendigo center (should be in A23)', lat: -36.7569, lng: 144.278, expectedCity: 'bendigo' },
        { name: 'Richmond (Yarra)', lat: -37.82, lng: 145.0, expectedCity: 'yarra' },
        { name: 'Outside all zones', lat: -38.0, lng: 146.0, expectedCity: null }
    ];
    
    console.log('🧪 Testing zone finding for multiple cities...');
    
    testCoords.forEach(async (coord) => {
        console.log(`\n📍 Testing ${coord.name}: [${coord.lng}, ${coord.lat}]`);
        
        try {
            const result = await getLocationInfo(coord.lat, coord.lng);
            
            if (result.success) {
                console.log(`✅ Found in ${result.city} zone: ${result.zone}`);
                if (coord.expectedCity && result.city !== coord.expectedCity) {
                    console.warn(`⚠️ Expected ${coord.expectedCity} but found ${result.city}`);
                }
            } else {
                console.log(`❌ Not found in any zone: ${result.error}`);
                if (coord.expectedCity) {
                    console.warn(`⚠️ Expected to find in ${coord.expectedCity}`);
                }
            }
        } catch (error) {
            console.error(`❌ Error testing ${coord.name}:`, error);
        }
    });
}

// Make it available globally for testing
window.testZoneFinding = testZoneFinding;

// TODO: Replace with tree-shaken Turf.js imports for better bundle size
// Example: import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon';

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getCurrentLocation,
        loadCityZones,
        loadCityConfig,
        findZone,
        getLocationInfo,
        calculateDistance,
        geocodeAddress,
        getLocationFromAddress,
        searchAddresses
    };
}
