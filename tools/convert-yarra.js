#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the raw Yarra zones data
const rawData = JSON.parse(fs.readFileSync('yarra_zones.json', 'utf8'));

// Transform to GeoJSON format
const geojson = {
    type: "FeatureCollection",
    features: rawData.features.map(feature => ({
        type: "Feature",
        properties: {
            zone: feature.attributes.zone_num,
            collection_day: feature.attributes.collection_day.toLowerCase(),
            // Yarra schedule: 
            // - Rubbish (red) and Organics (green): weekly on collection_day
            // - Glass (purple) and Recycling (yellow): fortnightly alternating
            schedule: {
                rubbish: {
                    frequency: 'weekly',
                    day: feature.attributes.collection_day.toLowerCase()
                },
                organics: {
                    frequency: 'weekly', 
                    day: feature.attributes.collection_day.toLowerCase()
                },
                recycling: {
                    frequency: 'fortnightly',
                    day: feature.attributes.collection_day.toLowerCase(),
                    alternates_with: 'glass'
                },
                glass: {
                    frequency: 'fortnightly',
                    day: feature.attributes.collection_day.toLowerCase(),
                    alternates_with: 'recycling'
                }
            }
        },
        geometry: {
            type: "Polygon",
            coordinates: feature.geometry.rings
        }
    }))
};

// Create config file
const config = {
    name: "City of Yarra",
    timezone: "Australia/Melbourne",
    bins: {
        rubbish: {
            name: "Rubbish",
            color: "#dc3545",
            icon: "🗑️"
        },
        organics: {
            name: "Organics", 
            color: "#28a745",
            icon: "🌱"
        },
        recycling: {
            name: "Recycling",
            color: "#ffc107", 
            icon: "♻️"
        },
        glass: {
            name: "Glass",
            color: "#6f42c1",
            icon: "🍾"
        }
    },
    schedule_info: {
        rubbish: "Weekly collection on your zone's designated day",
        organics: "Weekly collection on your zone's designated day", 
        recycling: "Fortnightly collection alternating with glass",
        glass: "Fortnightly collection alternating with recycling"
    },
    zones: geojson.features.reduce((acc, feature) => {
        const zone = feature.properties.zone;
        acc[zone] = {
            day: feature.properties.collection_day,
            schedule: feature.properties.schedule
        };
        return acc;
    }, {})
};

// Write files
const outputDir = path.join(__dirname, '..', 'docs', 'data', 'yarra');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Write GeoJSON
fs.writeFileSync(
    path.join(outputDir, 'zones.geojson'), 
    JSON.stringify(geojson, null, 2)
);

// Write config
fs.writeFileSync(
    path.join(outputDir, 'config.json'),
    JSON.stringify(config, null, 2)
);

console.log('Successfully converted Yarra waste collection data!');
console.log(`Created ${geojson.features.length} zone features`);
console.log('Zones:', Object.keys(config.zones).sort((a, b) => Number(a) - Number(b)));
console.log('Collection days:', [...new Set(Object.values(config.zones).map(z => z.day))]);
