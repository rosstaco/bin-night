/**
 * Date utility functions for bin collection scheduling using Moment.js
 */

/**
 * Get the current date/time in the specified timezone
 * @param {string} timezone - IANA timezone identifier (e.g., 'Australia/Melbourne')
 * @returns {moment.Moment} Current moment in the specified timezone
 */
function getCurrentMoment(timezone = 'Australia/Melbourne') {
    return moment.tz(timezone);
}

/**
 * Find the next collection date for a given zone
 * @param {Object} config - City configuration object
 * @param {Object} zoneFeature - GeoJSON zone feature with properties
 * @param {moment.Moment} fromDate - Date to start searching from (defaults to now)
 * @returns {Object} Next collection info with date and bins
 */
function getNextCollection(config, zoneFeature, fromDate = null) {
    if (!zoneFeature || !zoneFeature.properties) {
        throw new Error('Invalid zone feature provided');
    }

    const zoneInfo = zoneFeature.properties;
    const startMoment = fromDate || getCurrentMoment(config.timezone);
    const referenceDate = moment.tz(config.startDate, config.timezone);
    const collectionDay = zoneInfo.collectionDay; // 1=Monday, 2=Tuesday, etc.
    
    // Enable debugging with: localStorage.setItem('binNights-debug', 'true')
    const debugEnabled = localStorage.getItem('binNights-debug') === 'true';
    
    if (debugEnabled) {
        console.log('🔍 getNextCollection debug:', {
            currentTime: startMoment.format('YYYY-MM-DD HH:mm:ss dddd'),
            currentWeekday: startMoment.isoWeekday(),
            collectionWeekday: collectionDay,
            zone: zoneInfo.zone
        });
    }
    
    // Determine if we should skip today based on time
    // After cutoff hour on collection day, show next week's collection
    const cutoffHour = config.collectionCutoffHour || 18; // Default to 6 PM
    const isAfterCutoff = startMoment.hour() >= cutoffHour;
    const isTodayCollectionDay = startMoment.isoWeekday() === collectionDay;
    const shouldSkipToday = isTodayCollectionDay && isAfterCutoff;
    
    if (debugEnabled) {
        console.log('⏰ Time logic:', {
            currentHour: startMoment.hour(),
            cutoffHour,
            isAfterCutoff,
            isTodayCollectionDay,
            shouldSkipToday
        });
    }
    
    // Start searching from today, but skip to tomorrow if after cutoff
    let searchDate = startMoment.clone().startOf('day');
    if (shouldSkipToday) {
        searchDate.add(1, 'day');
        if (debugEnabled) {
            console.log('⏭️ Skipping today due to time cutoff, starting search from tomorrow');
        }
    }
    
    // Find the next collection day (up to 14 days ahead)
    for (let i = 0; i < 14; i++) {
        const dayOfWeek = searchDate.isoWeekday(); // 1=Monday, 7=Sunday
        
        if (dayOfWeek === collectionDay) {
            // This is a collection day for this zone, now check which bins
            const weeksSinceReference = Math.floor(searchDate.diff(referenceDate, 'weeks', true));
            const collectedBins = [];
            
            if (debugEnabled) {
                console.log(`📅 Found collection day: ${searchDate.format('YYYY-MM-DD dddd')} (i=${i}, weeksSinceRef=${weeksSinceReference})`);
            }
            
            Object.entries(zoneInfo.bins || {}).forEach(([binType, binConfig]) => {
                const { interval, weekOffset } = binConfig;
                const adjustedWeek = weeksSinceReference - weekOffset;
                
                if (debugEnabled) {
                    console.log(`  🗑️ ${binType}: interval=${interval}, weekOffset=${weekOffset}, adjustedWeek=${adjustedWeek}, collected=${adjustedWeek >= 0 && adjustedWeek % interval === 0}`);
                }
                
                // Check if this bin is collected this week
                if (adjustedWeek >= 0 && adjustedWeek % interval === 0) {
                    collectedBins.push(binType);
                }
            });
            
            if (debugEnabled) {
                console.log(`  ✅ Bins for this day: [${collectedBins.join(', ')}]`);
            }
            
            // If any bins are collected on this day, this is our next collection
            if (collectedBins.length > 0) {
                const result = {
                    date: searchDate.clone(),
                    bins: collectedBins,
                    isToday: searchDate.isSame(startMoment, 'day'),
                    timeText: getTimeText(searchDate, startMoment, config),
                    dateText: searchDate.format('MMMM Do YYYY')
                };
                
                if (debugEnabled) {
                    console.log('🎯 Next collection found:', {
                        date: result.date.format('YYYY-MM-DD dddd'),
                        bins: result.bins,
                        isToday: result.isToday,
                        timeText: result.timeText
                    });
                }
                
                return result;
            }
        }
        
        // Move to next day
        searchDate.add(1, 'day');
    }
    
    if (debugEnabled) {
        console.log('❌ No collection found in next 14 days');
    }
    return null; // No collection found in next 14 days
}

/**
 * Get human-readable time text with bin-out reminders
 * @param {moment.Moment} collectionDate - The collection date
 * @param {moment.Moment} currentDate - Current date
 * @param {Object} config - Configuration object with cutoff hour
 * @returns {string} Human-readable time text
 */
function getTimeText(collectionDate, currentDate, config = {}) {
    // Compare start of days to get accurate day difference
    const collectionDay = collectionDate.clone().startOf('day');
    const currentDay = currentDate.clone().startOf('day');
    const diffDays = collectionDay.diff(currentDay, 'days');
    
    if (diffDays === 0) {
        // Collection is today - always show "Today"
        return 'Today';
    } else if (diffDays === 1) {
        // Collection is tomorrow - remind to put bins out tonight
        return 'Put your bins out tonight';
    } else if (diffDays <= 6) {
        // Collection is this week - show day name
        return collectionDate.format('dddd');
    } else if (diffDays === 7) {
        // Collection is exactly next week - show "Next {dayname}"
        return `Next ${collectionDate.format('dddd')}`;
    } else {
        // Collection is further away - show date
        return collectionDate.format('MMM Do');
    }
}

/**
 * Get the bin schedule status for display
 * @param {Object} config - City configuration object
 * @param {Object} zoneFeature - GeoJSON zone feature with properties
 * @param {moment.Moment} currentDate - Current date (optional)
 * @returns {Object} Collection status and bin states
 */
function getCollectionStatus(config, zoneFeature, currentDate = null) {
    const now = currentDate || getCurrentMoment(config.timezone);
    const nextCollection = getNextCollection(config, zoneFeature, now);
    
    if (!nextCollection) {
        return {
            error: 'No upcoming collections found',
            nextCollectionText: 'Unknown',
            nextCollectionDateText: 'Unknown',
            binStates: {}
        };
    }
    
    // Create bin states - bins that are in the next collection are "active"
    const binStates = {};
    const zoneBins = zoneFeature.properties.bins || {};
    Object.keys(zoneBins).forEach(binType => {
        binStates[binType] = {
            isActive: nextCollection.bins.includes(binType),
            nextCollection: nextCollection.bins.includes(binType) ? nextCollection.date : null
        };
    });
    
    // Add debug info
    const zoneId = zoneFeature.properties.zone;
    console.log('🗓️ Collection Status Debug:', {
        zone: zoneId,
        currentDate: now.format('YYYY-MM-DD dddd'),
        nextCollection: {
            date: nextCollection.date.format('YYYY-MM-DD dddd'),
            bins: nextCollection.bins,
            timeText: nextCollection.timeText
        },
        binStates
    });
    
    return {
        currentDate: now,
        zone: zoneId,
        nextCollection,
        nextCollectionText: nextCollection.timeText,
        nextCollectionDateText: nextCollection.dateText,
        binStates,
        activeBins: nextCollection.bins
    };
}

/**
 * Test function to check schedules for all zones
 * @param {Object} config - City configuration object
 * @param {Object} zones - GeoJSON feature collection with zones
 * @param {moment.Moment} testDate - Date to test (optional)
 */
function debugAllZones(config, zones, testDate = null) {
    const now = testDate || getCurrentMoment(config.timezone);
    console.log(`\n🧪 Debug All Zones for ${now.format('YYYY-MM-DD dddd')}`);
    console.log('========================================');
    
    zones.features.forEach(zoneFeature => {
        const zoneId = zoneFeature.properties.zone;
        console.log(`\n📍 Zone ${zoneId}:`);
        try {
            const status = getCollectionStatus(config, zoneFeature, now);
            console.log(`  Next: ${status.nextCollectionText} (${status.nextCollectionDateText})`);
            console.log(`  Bins: ${status.activeBins.join(', ') || 'None'}`);
        } catch (error) {
            console.log(`  Error: ${error.message}`);
        }
    });
}

/**
 * Debug function to test bin calculations
 */
function debugBinCalculation() {
    if (!window.app || !window.app.currentZoneFeature || !window.app.config) {
        console.log('❌ App not ready or no zone selected');
        return;
    }
    
    const zoneFeature = window.app.currentZoneFeature;
    const config = window.app.config;
    const zoneInfo = zoneFeature.properties;
    
    console.log('🧪 Debugging Bin Calculation');
    console.log('============================');
    console.log('Zone:', zoneInfo.zone);
    console.log('Collection Day:', zoneInfo.collectionDay);
    console.log('Start Date:', config.startDate);
    console.log('Timezone:', config.timezone);
    
    const now = getCurrentMoment(config.timezone);
    const referenceDate = moment.tz(config.startDate, config.timezone);
    
    console.log('Current Date:', now.format('YYYY-MM-DD dddd'));
    console.log('Reference Date:', referenceDate.format('YYYY-MM-DD dddd'));
    
    // Check next 7 days
    for (let i = 0; i < 7; i++) {
        const testDate = now.clone().add(i, 'days').startOf('day');
        const dayOfWeek = testDate.isoWeekday();
        
        if (dayOfWeek === zoneInfo.collectionDay) {
            console.log(`\n📅 Collection Day Found: ${testDate.format('YYYY-MM-DD dddd')}`);
            
            const weeksSinceReference = Math.floor(testDate.diff(referenceDate, 'weeks', true));
            console.log('Weeks since reference:', weeksSinceReference);
            
            const collectedBins = [];
            Object.entries(zoneInfo.bins || {}).forEach(([binType, binConfig]) => {
                const { interval, weekOffset, name } = binConfig;
                const adjustedWeek = weeksSinceReference - weekOffset;
                
                console.log(`\n🗑️ ${name} (${binType}):`);
                console.log(`  Interval: ${interval}, Week Offset: ${weekOffset}`);
                console.log(`  Adjusted Week: ${adjustedWeek}`);
                console.log(`  ${adjustedWeek} % ${interval} = ${adjustedWeek % interval}`);
                
                if (adjustedWeek >= 0 && adjustedWeek % interval === 0) {
                    console.log(`  ✅ COLLECTED this week`);
                    collectedBins.push(binType);
                } else {
                    console.log(`  ❌ NOT collected this week`);
                }
            });
            
            console.log('\n📋 Bins to be collected:', collectedBins);
            break;
        }
    }
}

/**
 * Test function to understand current collection logic
 */
function testCollectionLogic() {
    console.log('🧪 Testing Collection Logic');
    console.log('========================');
    
    if (!window.app || !window.app.config || !window.app.currentZoneFeature) {
        console.log('❌ App not ready. Please wait for location to be detected.');
        return;
    }
    
    const config = window.app.config;
    const zoneFeature = window.app.currentZoneFeature;
    const now = getCurrentMoment(config.timezone);
    
    console.log('Current time:', now.format('YYYY-MM-DD HH:mm:ss dddd'));
    console.log('Current weekday:', now.isoWeekday());
    console.log('Collection weekday:', zoneFeature.properties.collectionDay);
    console.log('Cutoff hour:', config.collectionCutoffHour || 18);
    console.log('Current hour:', now.hour());
    
    const isAfterCutoff = now.hour() >= (config.collectionCutoffHour || 18);
    const isTodayCollectionDay = now.isoWeekday() === zoneFeature.properties.collectionDay;
    
    console.log('Is today collection day?', isTodayCollectionDay);
    console.log('Is after cutoff?', isAfterCutoff);
    console.log('Should skip today?', isTodayCollectionDay && isAfterCutoff);
    
    // Test the next collection function
    const nextCollection = getNextCollection(config, zoneFeature, now);
    if (nextCollection) {
        console.log('Next collection:', {
            date: nextCollection.date.format('YYYY-MM-DD dddd'),
            bins: nextCollection.bins,
            isToday: nextCollection.isToday,
            timeText: nextCollection.timeText,
            dateText: nextCollection.dateText
        });
    } else {
        console.log('No next collection found');
    }
}

// Make it available globally
window.debugBinCalculation = debugBinCalculation;
window.testCollectionLogic = testCollectionLogic;

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getCurrentMoment,
        getNextCollection,
        getTimeText,
        getCollectionStatus,
        debugAllZones
    };
}
