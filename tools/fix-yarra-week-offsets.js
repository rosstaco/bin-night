#!/usr/bin/env node

/**
 * Fix Yarra week offsets based on actual collection dates
 * 
 * Based on the first glass collection dates provided:
 * - Week 0 (July 1-7): Zones 2, 3, 5, 7, 9 → weekOffset: 0
 * - Week 1 (July 8-14): Zones 1, 4, 6, 8, 10 → weekOffset: 1
 */

const fs = require('fs');
const path = require('path');

// Week offset mapping based on actual collection dates
const WEEK_OFFSETS = {
    // Week 0 zones (first glass collection July 1-7)
    '2': 0,   // July 7  
    '3': 0,   // July 1
    '5': 0,   // July 2
    '7': 0,   // July 3
    '9': 0,   // July 4
    
    // Week 1 zones (first glass collection July 8-14)
    '1': 1,   // July 14
    '4': 1,   // July 8
    '6': 1,   // July 9
    '8': 1,   // July 10
    '10': 1   // July 11
};

async function fixWeekOffsets() {
    try {
        console.log('🔧 Fixing Yarra week offsets...');
        
        // Read the current zones file
        const zonesPath = path.join(__dirname, '../docs/data/yarra/zones.geojson');
        console.log('📖 Reading zones from:', zonesPath);
        
        const zonesData = JSON.parse(fs.readFileSync(zonesPath, 'utf8'));
        
        let fixedCount = 0;
        
        // Process each zone
        for (const feature of zonesData.features) {
            const zone = feature.properties.zone;
            const expectedOffset = WEEK_OFFSETS[zone];
            
            if (expectedOffset !== undefined) {
                const currentGlassOffset = feature.properties.bins.glass.weekOffset;
                const currentRecyclingOffset = feature.properties.bins.recycling.weekOffset;
                
                if (currentGlassOffset !== expectedOffset) {
                    console.log(`🔄 Zone ${zone}: Fixing glass weekOffset from ${currentGlassOffset} to ${expectedOffset}`);
                    feature.properties.bins.glass.weekOffset = expectedOffset;
                    fixedCount++;
                }
                
                // Recycling should be opposite of glass (alternating)
                const expectedRecyclingOffset = expectedOffset === 0 ? 1 : 0;
                if (currentRecyclingOffset !== expectedRecyclingOffset) {
                    console.log(`🔄 Zone ${zone}: Fixing recycling weekOffset from ${currentRecyclingOffset} to ${expectedRecyclingOffset}`);
                    feature.properties.bins.recycling.weekOffset = expectedRecyclingOffset;
                    fixedCount++;
                }
                
                console.log(`✅ Zone ${zone}: Glass=${expectedOffset}, Recycling=${expectedRecyclingOffset}`);
            } else {
                console.warn(`⚠️  Zone ${zone}: No week offset data available`);
            }
        }
        
        // Write the fixed data back
        fs.writeFileSync(zonesPath, JSON.stringify(zonesData, null, 2));
        console.log(`\n✅ Fixed ${fixedCount} week offsets and saved to ${zonesPath}`);
        
        // Validate the results
        console.log('\n🔍 Validation summary:');
        for (const feature of zonesData.features) {
            const zone = feature.properties.zone;
            const glassOffset = feature.properties.bins.glass.weekOffset;
            const recyclingOffset = feature.properties.bins.recycling.weekOffset;
            console.log(`Zone ${zone}: Glass=${glassOffset}, Recycling=${recyclingOffset}`);
        }
        
    } catch (error) {
        console.error('❌ Error fixing week offsets:', error);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    fixWeekOffsets();
}

module.exports = { fixWeekOffsets };
