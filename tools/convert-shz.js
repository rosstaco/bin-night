#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const shapefile = require('shapefile');

/**
 * Convert Bendigo shapefile data to GeoJSON
 */

async function convertShapefileToGeoJSON() {
  try {
    const shapefilePath = path.join(__dirname, '../assets/CoGB Garbage_Collection_Zones.shp');
    const dbfPath = path.join(__dirname, '../assets/CoGB Garbage_Collection_Zones.dbf');
    
    console.log('🔄 Converting real Bendigo shapefile data...');
    console.log(`📁 Reading: ${shapefilePath}`);
    
    const features = [];
    
    // Read the shapefile
    await shapefile.read(shapefilePath, dbfPath)
      .then(collection => {
        console.log('📊 Found', collection.features.length, 'features');
        
        // Process each feature
        collection.features.forEach((feature, index) => {
          console.log(`Feature ${index + 1}:`, feature.properties.name);
          
          // Extract collection information from the real Bendigo data
          const props = feature.properties;
          
          // Create a simple zone identifier (A1, A2, A3, etc.) from the collection data
          const zoneId = createSimpleZoneId(props.name, props.rub_day, props.rub_desc);
          
          if (props.name && props.rub_day) {
            features.push({
              type: "Feature",
              properties: {
                // Simple zone identifier matching your app structure
                zone: zoneId,
                collectionDay: getDayNumber(props.rub_day),
                
                // Bins configuration for this zone
                bins: {
                  rubbish: {
                    name: "Rubbish",
                    color: "#dc2626",
                    interval: 2,
                    weekOffset: props.rub_desc === 'Calendar A' ? 0 : 1
                  },
                  recycling: {
                    name: "Recycling", 
                    color: "#eab308",
                    interval: 2,
                    // Ensure recycling alternates with rubbish
                    weekOffset: props.rub_desc === 'Calendar A' ? 1 : 0
                  },
                  green: {
                    name: "Green Waste",
                    color: "#16a34a", 
                    interval: 1,
                    weekOffset: 0
                  }
                }
              },
              geometry: feature.geometry
            });
            
            console.log(`✅ Mapped to Zone ${zoneId}: ${props.rub_day} collection`);
          } else {
            console.warn(`⚠️  Feature ${index + 1} missing required data:`, props.name || 'Unknown');
          }
        });
        
        const geoJSON = {
          type: "FeatureCollection",
          features: features
        };
        
        // Write the GeoJSON file
        const outputPath = path.join(__dirname, '../docs/data/bendigo/zones.geojson');
        const outputDir = path.dirname(outputPath);
        
        // Ensure directory exists
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        fs.writeFileSync(outputPath, JSON.stringify(geoJSON, null, 2));
        
        console.log('✅ Successfully converted shapefile data to GeoJSON');
        console.log(`📁 Output: ${outputPath}`);
        console.log(`🗂️  Created ${features.length} zone features`);
        
        // Log zone summary
        const zones = features.map(f => f.properties.zone).sort();
        const uniqueZones = [...new Set(zones)];
        console.log('🏘️  Zones found:', uniqueZones.join(', '));
        
        // Log collection days summary
        const daysSummary = features.reduce((acc, f) => {
          const collectionDay = f.properties.collectionDay;
          const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][collectionDay];
          const zone = f.properties.zone;
          const key = `${dayName} (Zone ${zone})`;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});
        
        console.log('📅 Collection schedules:');
        Object.entries(daysSummary).forEach(([schedule, count]) => {
          console.log(`   ${schedule}: ${count} area${count > 1 ? 's' : ''}`);
        });
      });
      
  } catch (error) {
    console.error('❌ Error converting shapefile:', error);
    console.log('📝 Note: Make sure the shapefile exists and is readable');
  }
}

/**
 * Create a zone identifier from the collection data
 */
function createZoneId(name, day, calendar) {
  // Create a consistent zone ID like "MON_A", "TUE_B", etc.
  const dayShort = day.substring(0, 3).toUpperCase();
  const cal = calendar.replace('Calendar ', '');
  return `${dayShort}_${cal}`;
}

/**
 * Create a simple zone ID that matches the existing app structure (A1, A2, A3, etc.)
 */
function createSimpleZoneId(name, day, calendar) {
  // Map collection day to simple letters A, B, C, D, E
  const dayToZone = {
    'Monday': 'A',
    'Tuesday': 'B', 
    'Wednesday': 'C',
    'Thursday': 'D',
    'Friday': 'E'
  };
  
  const baseLetter = dayToZone[day] || 'A';
  const calendarNumber = calendar.includes('Calendar A') ? '1' : '2';
  const hasCommercial = name.includes('Commercial') ? '3' : '';
  
  // Create zones like A1, A2, A3, B1, B2, etc.
  return baseLetter + calendarNumber + hasCommercial;
}

/**
 * Convert day name to number (1=Monday, 7=Sunday)
 */
function getDayNumber(dayName) {
  const days = {
    'Monday': 1,
    'Tuesday': 2, 
    'Wednesday': 3,
    'Thursday': 4,
    'Friday': 5,
    'Saturday': 6,
    'Sunday': 7
  };
  return days[dayName] || 1;
}

/**
 * Get collection day for zone (fallback if not in shapefile)
 */
function getCollectionDayForZone(zone) {
  const zoneDays = {
    'A': 1, // Monday
    'B': 2, // Tuesday
    'C': 3, // Wednesday
    'D': 4, // Thursday
    'E': 5, // Friday
  };
  return zoneDays[zone.toUpperCase()] || 1;
}

// Run the conversion
convertShapefileToGeoJSON();
