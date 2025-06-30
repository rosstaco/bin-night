#!/usr/bin/env node

// Simple test to verify zone polygon structure
const fs = require('fs');
const path = require('path');

// Load zones
const zonesPath = path.join(__dirname, '../docs/data/bendigo/zones.geojson');
const zones = JSON.parse(fs.readFileSync(zonesPath, 'utf8'));

console.log('🧪 Zone Structure Test');
console.log('======================');
console.log(`Total zones: ${zones.features.length}`);

// Check first few zones
for (let i = 0; i < Math.min(3, zones.features.length); i++) {
    const feature = zones.features[i];
    const zone = feature.properties.zone;
    const geom = feature.geometry;
    
    console.log(`\nZone ${zone}:`);
    console.log(`  Type: ${geom.type}`);
    console.log(`  Rings: ${geom.coordinates.length}`);
    
    if (geom.coordinates[0]) {
        const ring = geom.coordinates[0];
        console.log(`  Points in main ring: ${ring.length}`);
        
        // Check if closed
        const first = ring[0];
        const last = ring[ring.length - 1];
        const closed = first[0] === last[0] && first[1] === last[1];
        console.log(`  Ring closed: ${closed}`);
        
        // Sample coordinates
        console.log(`  First coord: [${first[0]}, ${first[1]}]`);
        console.log(`  Last coord: [${last[0]}, ${last[1]}]`);
        
        // Calculate rough center
        const lngs = ring.map(p => p[0]);
        const lats = ring.map(p => p[1]);
        const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
        const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
        console.log(`  Approx center: [${centerLng.toFixed(6)}, ${centerLat.toFixed(6)}]`);
    }
}

// Test coordinates that should be in different areas
const testCoords = [
    { name: 'Bendigo center', lat: -36.7569, lng: 144.2780 },
    { name: 'Zone E13 area', lat: -36.759, lng: 144.311 },
    { name: 'Outside Bendigo', lat: -37.8, lng: 145.0 }
];

console.log('\n🎯 Test Coordinates');
console.log('==================');

testCoords.forEach(coord => {
    console.log(`\nTesting ${coord.name}: [${coord.lng}, ${coord.lat}]`);
    
    let found = false;
    for (let i = 0; i < zones.features.length; i++) {
        const feature = zones.features[i];
        const ring = feature.geometry.coordinates[0];
        
        // Simple bounds check
        const lngs = ring.map(p => p[0]);
        const lats = ring.map(p => p[1]);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        
        if (coord.lng >= minLng && coord.lng <= maxLng && 
            coord.lat >= minLat && coord.lat <= maxLat) {
            console.log(`  Within bounds of zone ${feature.properties.zone}`);
            found = true;
        }
    }
    
    if (!found) {
        console.log(`  Not within bounds of any zone`);
    }
});
