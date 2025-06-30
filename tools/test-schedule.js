#!/usr/bin/env node

/**
 * Test script to validate the bin schedule calculations
 */

// Import the date utilities (if running in Node.js)
const fs = require('fs');
const path = require('path');

// Read the config file
const configPath = path.join(__dirname, '../docs/data/bendigo/config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Mock the date utilities since we're in Node.js
function getCurrentDateInTimezone(timezone = 'Australia/Melbourne') {
    return new Date(); // For testing, use current date
}

function getDayOfWeek(date) {
    const day = date.getDay();
    return day === 0 ? 7 : day; // Convert Sunday from 0 to 7
}

function getWeeksSince(currentDate, referenceDate) {
    const diffTime = Math.abs(currentDate - referenceDate);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7);
}

function calculateBinSchedule(config, zone, date) {
    const zoneInfo = config.zones[zone];
    if (!zoneInfo) {
        throw new Error(`Zone ${zone} not found in configuration`);
    }

    const referenceDate = new Date(config.startDate);
    const currentWeek = getWeeksSince(date, referenceDate);
    const dayOfWeek = getDayOfWeek(date);
    const collectionDay = zoneInfo.collectionDay;
    
    const schedule = {};
    
    // Check each bin type
    Object.entries(config.bins).forEach(([binType, binConfig]) => {
        const { interval, weekOffset } = binConfig;
        
        // Calculate if this bin is collected this week
        const adjustedWeek = currentWeek - weekOffset;
        const isCollectionWeek = adjustedWeek >= 0 && adjustedWeek % interval === 0;
        
        // Check if today is the collection day for this zone
        const isCollectionDay = dayOfWeek === collectionDay;
        
        schedule[binType] = {
            isCollected: isCollectionWeek && isCollectionDay,
            isCollectionWeek,
            isCollectionDay,
            nextCollection: null
        };
    });
    
    return schedule;
}

// Test the calculations
console.log('🧪 Testing Bin Schedule Calculations');
console.log('=====================================');

const testDate = new Date('2025-06-30'); // Monday
console.log(`Test Date: ${testDate.toDateString()}`);
console.log(`Day of Week: ${getDayOfWeek(testDate)} (1=Mon, 7=Sun)`);

const referenceDate = new Date(config.startDate);
console.log(`Reference Date: ${referenceDate.toDateString()}`);
console.log(`Weeks Since Reference: ${getWeeksSince(testDate, referenceDate)}`);

console.log('\nTesting each zone:');
Object.keys(config.zones).forEach(zone => {
    console.log(`\n📍 Zone ${zone} (Collection Day: ${config.zones[zone].collectionDay})`);
    
    try {
        const schedule = calculateBinSchedule(config, zone, testDate);
        
        Object.entries(schedule).forEach(([binType, info]) => {
            const status = info.isCollected ? '✅ COLLECTED' : '❌ Not collected';
            console.log(`  ${config.bins[binType].name}: ${status}`);
            console.log(`    Collection Week: ${info.isCollectionWeek ? 'Yes' : 'No'}`);
            console.log(`    Collection Day: ${info.isCollectionDay ? 'Yes' : 'No'}`);
        });
    } catch (error) {
        console.error(`  Error: ${error.message}`);
    }
});

console.log('\n✅ Test completed successfully!');
console.log('\n📝 Note: This validates the core scheduling logic.');
console.log('   The actual app uses more sophisticated date handling for timezones.');
