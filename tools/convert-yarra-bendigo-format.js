#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the raw Yarra zones data
const rawData = JSON.parse(fs.readFileSync('yarra_zones.json', 'utf8'));

// Map collection days to numbers (like Bendigo format)
const dayToNumber = {
    'Monday': 1,
    'Tuesday': 2, 
    'Wednesday': 3,
    'Thursday': 4,
    'Friday': 5
};

// Transform to GeoJSON format matching Bendigo structure
const geojson = {
    type: "FeatureCollection",
    features: rawData.features.map(feature => {
        const collectionDay = dayToNumber[feature.attributes.collection_day];
        const zoneNum = feature.attributes.zone_num;
        
        // For Yarra: 
        // - Rubbish & Organics: Weekly (interval 1)
        // - Recycling & Glass: Fortnightly alternating (interval 2)
        // We'll use weekOffset to alternate glass/recycling
        return {
            type: "Feature",
            properties: {
                zone: zoneNum.toString(),
                collectionDay: collectionDay,
                bins: {
                    rubbish: {
                        name: "Rubbish",
                        color: "#dc2626",
                        interval: 1,  // Weekly
                        weekOffset: 0
                    },
                    organics: {
                        name: "Organics", 
                        color: "#16a34a",
                        interval: 1,  // Weekly
                        weekOffset: 0
                    },
                    recycling: {
                        name: "Recycling",
                        color: "#eab308",
                        interval: 2,  // Fortnightly
                        weekOffset: 0
                    },
                    glass: {
                        name: "Glass",
                        color: "#6f42c1", 
                        interval: 2,  // Fortnightly
                        weekOffset: 1  // Alternates with recycling
                    }
                }
            },
            geometry: {
                type: "Polygon",
                coordinates: feature.geometry.rings
            }
        };
    })
};

// Write the GeoJSON file in Bendigo format
const outputDir = path.join(__dirname, '..', 'docs', 'data', 'yarra');
fs.writeFileSync(
    path.join(outputDir, 'zones.geojson'), 
    JSON.stringify(geojson, null, 2)
);

console.log('Successfully converted Yarra zones to Bendigo format!');
console.log(`Created ${geojson.features.length} zone features`);

// Show sample of zone data
const sampleZone = geojson.features[0];
console.log('\nSample zone structure:');
console.log(`Zone ${sampleZone.properties.zone}:`);
console.log(`- Collection Day: ${sampleZone.properties.collectionDay}`);
console.log('- Bins:');
Object.entries(sampleZone.properties.bins).forEach(([binType, binConfig]) => {
    console.log(`  ${binType}: ${binConfig.name} (${binConfig.interval === 1 ? 'weekly' : 'fortnightly'}, offset: ${binConfig.weekOffset})`);
});
