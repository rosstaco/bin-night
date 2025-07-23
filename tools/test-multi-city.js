#!/usr/bin/env node

/**
 * Test script for multi-city geo functions
 */

// Load the geo.js functions (we'll need to adapt them for Node.js)
const fetch = require('node-fetch');
global.fetch = fetch;

// Mock Turf.js for basic testing
global.turf = {
    point: (coords) => ({ type: 'Point', coordinates: coords }),
    polygon: (coords) => ({ type: 'Polygon', coordinates: coords }),
    multiPolygon: (coords) => ({ type: 'MultiPolygon', coordinates: coords }),
    booleanPointInPolygon: (point, polygon) => {
        // Very basic point-in-polygon test (not production ready)
        const [lng, lat] = point.coordinates;
        
        if (polygon.type === 'Polygon') {
            const ring = polygon.coordinates[0];
            return isPointInRing(lng, lat, ring);
        } else if (polygon.type === 'MultiPolygon') {
            return polygon.coordinates.some(polyCoords => 
                isPointInRing(lng, lat, polyCoords[0])
            );
        }
        return false;
    }
};

function isPointInRing(lng, lat, ring) {
    // Simple bounding box test
    const lngs = ring.map(p => p[0]);
    const lats = ring.map(p => p[1]);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    
    return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
}

// Load and test the geo functions
async function testMultiCityGeo() {
    console.log('🧪 Testing multi-city geo functions...\n');
    
    // Test coordinates
    const testCoords = [
        { name: 'Bendigo CBD', lat: -36.7569, lng: 144.278, expectedCity: 'bendigo' },
        { name: 'Richmond (Yarra)', lat: -37.82, lng: 145.0, expectedCity: 'yarra' },
        { name: 'Outside both cities', lat: -38.0, lng: 146.0, expectedCity: null }
    ];
    
    // Load city data
    console.log('📂 Loading city data...');
    
    try {
        const bendigoZones = await fetch('http://localhost:8080/data/bendigo/zones.geojson').then(r => r.json());
        const bendigoConfig = await fetch('http://localhost:8080/data/bendigo/config.json').then(r => r.json());
        const yarraZones = await fetch('http://localhost:8080/data/yarra/zones.geojson').then(r => r.json());
        const yarraConfig = await fetch('http://localhost:8080/data/yarra/config.json').then(r => r.json());
        
        console.log('✅ Loaded data successfully:');
        console.log(`   • Bendigo: ${bendigoZones.features.length} zones`);
        console.log(`   • Yarra: ${yarraZones.features.length} zones`);
        console.log();
        
        // Test each coordinate
        for (const coord of testCoords) {
            console.log(`📍 Testing ${coord.name}: [${coord.lng}, ${coord.lat}]`);
            
            // Test Bendigo
            const bendigoResult = testPointInCity(coord.lat, coord.lng, bendigoZones, 'bendigo');
            if (bendigoResult) {
                console.log(`   ✅ Found in Bendigo zone: ${bendigoResult}`);
            }
            
            // Test Yarra
            const yarraResult = testPointInCity(coord.lat, coord.lng, yarraZones, 'yarra');
            if (yarraResult) {
                console.log(`   ✅ Found in Yarra zone: ${yarraResult}`);
            }
            
            if (!bendigoResult && !yarraResult) {
                console.log(`   ❌ Not found in any supported city`);
            }
            
            console.log();
        }
        
        console.log('🎯 Testing address search bounds...');
        console.log(`   • Bendigo bounds: ${JSON.stringify(bendigoConfig.bounds)}`);
        console.log(`   • Yarra bounds: ${JSON.stringify(yarraConfig.bounds)}`);
        
        const combinedBounds = {
            south: Math.min(bendigoConfig.bounds.south, yarraConfig.bounds.south),
            north: Math.max(bendigoConfig.bounds.north, yarraConfig.bounds.north),
            west: Math.min(bendigoConfig.bounds.west, yarraConfig.bounds.west),
            east: Math.max(bendigoConfig.bounds.east, yarraConfig.bounds.east)
        };
        console.log(`   • Combined bounds: ${JSON.stringify(combinedBounds)}`);
        
    } catch (error) {
        console.error('❌ Error loading city data:', error);
    }
}

function testPointInCity(lat, lng, zones, cityName) {
    const point = turf.point([lng, lat]);
    
    for (const feature of zones.features) {
        const geom = feature.geometry;
        if (!geom || (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon')) {
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
                return feature.properties.zone;
            }
        } catch (error) {
            // Skip problematic geometries
        }
    }
    
    return null;
}

// Run the test
testMultiCityGeo().catch(console.error);
