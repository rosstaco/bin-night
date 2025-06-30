#!/usr/bin/env node

/**
 * Test the new Moment.js based date calculations
 */

// Simulate Moment.js for Node.js environment
const moment = require('moment-timezone');

// Read the config
const fs = require('fs');
const path = require('path');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/data/bendigo/config.json'), 'utf8'));

// Copy the functions from date-utils.js
function getCurrentMoment(timezone = 'Australia/Melbourne') {
    return moment.tz(timezone);
}

function getNextCollection(config, zone, fromDate = null) {
    const zoneInfo = config.zones[zone];
    if (!zoneInfo) {
        throw new Error(`Zone ${zone} not found in configuration`);
    }

    const startMoment = fromDate || getCurrentMoment(config.timezone);
    const referenceDate = moment.tz(config.startDate, config.timezone);
    const collectionDay = zoneInfo.collectionDay;
    
    let searchDate = startMoment.clone().startOf('day');
    
    for (let i = 0; i < 14; i++) {
        const dayOfWeek = searchDate.isoWeekday();
        
        if (dayOfWeek === collectionDay) {
            const weeksSinceReference = Math.floor(searchDate.diff(referenceDate, 'weeks', true));
            const collectedBins = [];
            
            Object.entries(config.bins).forEach(([binType, binConfig]) => {
                const { interval, weekOffset } = binConfig;
                const adjustedWeek = weeksSinceReference - weekOffset;
                
                if (adjustedWeek >= 0 && adjustedWeek % interval === 0) {
                    collectedBins.push(binType);
                }
            });
            
            if (collectedBins.length > 0) {
                return {
                    date: searchDate.clone(),
                    bins: collectedBins,
                    isToday: searchDate.isSame(startMoment, 'day'),
                    timeText: getTimeText(searchDate, startMoment),
                    dateText: searchDate.format('dddd, MMMM Do YYYY')
                };
            }
        }
        
        searchDate.add(1, 'day');
    }
    
    return null;
}

function getTimeText(collectionDate, currentDate) {
    // Compare start of days to get accurate day difference  
    const collectionDay = collectionDate.clone().startOf('day');
    const currentDay = currentDate.clone().startOf('day');
    const diffDays = collectionDay.diff(currentDay, 'days');
    
    if (diffDays === 0) {
        return 'Today';
    } else if (diffDays === 1) {
        return 'Tomorrow';
    } else if (diffDays <= 6) {
        return collectionDate.format('dddd');
    } else {
        return collectionDate.format('dddd, MMM Do');
    }
}

function getCollectionStatus(config, zone, currentDate = null) {
    const now = currentDate || getCurrentMoment(config.timezone);
    const nextCollection = getNextCollection(config, zone, now);
    
    if (!nextCollection) {
        return {
            error: 'No upcoming collections found',
            nextCollectionText: 'Unknown',
            nextCollectionDateText: 'Unknown',
            binStates: {}
        };
    }
    
    const binStates = {};
    Object.keys(config.bins).forEach(binType => {
        binStates[binType] = {
            isActive: nextCollection.bins.includes(binType)
        };
    });
    
    return {
        currentDate: now,
        zone,
        nextCollection,
        nextCollectionText: nextCollection.timeText,
        nextCollectionDateText: nextCollection.dateText,
        binStates,
        activeBins: nextCollection.bins
    };
}

// Test with current date
console.log('🧪 Testing New Date Calculations with Moment.js');
console.log('==============================================');

const now = getCurrentMoment(config.timezone);
console.log(`Current Date/Time: ${now.format('YYYY-MM-DD dddd HH:mm')} (${config.timezone})`);
console.log(`Reference Date: ${config.startDate}`);

console.log('\nTesting all zones:');
Object.keys(config.zones).forEach(zone => {
    console.log(`\n📍 Zone ${zone} (Collection Day: ${config.zones[zone].collectionDay}):`);
    
    try {
        const status = getCollectionStatus(config, zone, now);
        
        if (status.error) {
            console.log(`  ❌ ${status.error}`);
        } else {
            console.log(`  🗓️  Next Collection: ${status.nextCollectionText}`);
            console.log(`  📅 Date: ${status.nextCollectionDateText}`);
            console.log(`  🗑️  Active Bins: ${status.activeBins.join(', ') || 'None'}`);
            
            // Show individual bin states
            Object.entries(status.binStates).forEach(([binType, state]) => {
                const icon = state.isActive ? '✅' : '❌';
                console.log(`     ${icon} ${config.bins[binType].name}`);
            });
        }
    } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
    }
});

console.log('\n✅ Test completed!');
console.log('\n📝 Expected behavior:');
console.log('   - Today is Sunday (no collections)');
console.log('   - Tomorrow (Monday) should show collections for Zone A');
console.log('   - Zone A: Monday = Recycling + Green Waste');
console.log('   - Other zones: Tuesday-Friday = various combinations');
