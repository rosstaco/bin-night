# Yarra Waste Collection Data Integration Guide

This document describes the complete process of integrating City of Yarra waste collection data into the BinNights waste collection app, originally designed for Bendigo. This process can be repeated for future data updates or for integrating other council areas.

## Overview

The BinNights app was successfully extended to support both City of Greater Bendigo and City of Yarra waste collection zones, with proper bin scheduling including the unique glass/recycling alternating system used by Yarra.

## Data Source

**Primary Source:** City of Yarra ArcGIS REST Services
- **URL:** `https://maps.yarracity.vic.gov.au/server/rest/services/Property/Waste_Collection_Areas/MapServer/0/query`
- **Format:** ArcGIS Feature Service (returns GeoJSON)
- **Data Type:** Polygon geometries with collection zone information

### Data Discovery Process

1. **Initial Research:** Searched Yarra City Council website for waste collection information
2. **Found:** Zone-based collection system with downloadable PDF calendars
3. **Discovered:** ArcGIS web services through browser developer tools inspection
4. **Verified:** Data completeness and accuracy through spot-checking

## Data Structure Analysis

### Original Yarra Data Format
```json
{
  "features": [
    {
      "attributes": {
        "OBJECTID": 1,
        "Zone": "1",
        "Day": "Monday",
        "Collection_Day": 1
      },
      "geometry": {
        "rings": [[[lng1, lat1], [lng2, lat2], ...]]
      }
    }
  ]
}
```

### Target Bendigo Format
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "zone": "1",
        "collectionDay": 1,
        "bins": {
          "rubbish": {"name": "Rubbish", "color": "#dc2626", "interval": 1, "weekOffset": 0},
          "organics": {"name": "Organics", "color": "#16a34a", "interval": 1, "weekOffset": 0},
          "recycling": {"name": "Recycling", "color": "#eab308", "interval": 2, "weekOffset": 1},
          "glass": {"name": "Glass", "color": "#6f42c1", "interval": 2, "weekOffset": 0}
        }
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[lng1, lat1], [lng2, lat2], ...]]
      }
    }
  ]
}
```

## Collection Schedule Logic

### Yarra Collection System
- **Red-lid rubbish:** Weekly (interval: 1, weekOffset: 0)
- **Lime green organics (FOGO):** Weekly (interval: 1, weekOffset: 0)
- **Yellow-lid recycling:** Fortnightly, alternating with glass
- **Purple-lid glass:** Fortnightly, alternating with recycling

### Week Offset Calculation
The `weekOffset` determines which week in a fortnightly cycle the bin is collected:
- `weekOffset: 0` = Week 0, 2, 4, 6... (July 1-7, July 15-21, etc.)
- `weekOffset: 1` = Week 1, 3, 5, 7... (July 8-14, July 22-28, etc.)

**Critical:** Glass and recycling must have opposite week offsets to alternate properly.

## Implementation Steps

### Step 1: Data Fetching

Create a script to fetch data from the ArcGIS service:

```bash
curl "https://maps.yarracity.vic.gov.au/server/rest/services/Property/Waste_Collection_Areas/MapServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson" > yarra-raw.geojson
```

### Step 2: Data Conversion Script

Create `/workspace/tools/convert-yarra-bendigo-format.js`:

Key conversion logic:
```javascript
// Convert geometry from ArcGIS rings to GeoJSON Polygon
const rings = feature.geometry.rings;
const coordinates = rings.map(ring => 
  ring.map(([lng, lat]) => [lng, lat])
);

// Map collection days
const dayMapping = {
  'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 
  'Thursday': 4, 'Friday': 5, 'Saturday': 6, 'Sunday': 0
};

// Create bin configuration with proper intervals and week offsets
const bins = {
  rubbish: { name: "Rubbish", color: "#dc2626", interval: 1, weekOffset: 0 },
  organics: { name: "Organics", color: "#16a34a", interval: 1, weekOffset: 0 },
  recycling: { name: "Recycling", color: "#eab308", interval: 2, weekOffset: 1 },
  glass: { name: "Glass", color: "#6f42c1", interval: 2, weekOffset: 0 }
};
```

### Step 3: Week Offset Validation

Manual validation was required to ensure correct week offsets:

1. **Obtained actual first glass collection dates** for each zone from PDF calendars
2. **Mapped to week numbers** based on July 1, 2025 start date
3. **Created validation script** (`/workspace/tools/fix-yarra-week-offsets.js`)

**Validation Data:**
```javascript
const WEEK_OFFSETS = {
  // Week 0 zones (first glass collection July 1-7)
  '1': 0, '2': 0, '3': 0, '5': 0, '7': 0, '9': 0,
  // Week 1 zones (first glass collection July 8-14)  
  '4': 1, '6': 1, '8': 1, '10': 1
};
```

### Step 4: Configuration File

Create `/workspace/docs/data/yarra/config.json`:

```json
{
  "name": "City of Yarra",
  "timezone": "Australia/Melbourne",
  "startDate": "2025-07-01",
  "bounds": {
    "north": -37.75,
    "south": -37.87,
    "east": 145.05,
    "west": 144.95
  }
}
```

### Step 5: App Integration

#### 5.1 Update Location Detection
Modified `/workspace/docs/js/geo.js` to support multiple cities:

```javascript
async function getLocationInfo(lat, lng) {
  const supportedCities = ['bendigo', 'yarra'];
  
  for (const cityName of supportedCities) {
    const [zones, config] = await Promise.all([
      loadCityZones(cityName),
      loadCityConfig(cityName)
    ]);
    
    const zoneFeature = findZone(lat, lng, zones);
    if (zoneFeature) {
      return { success: true, city: cityName, zone: zoneFeature.properties.zone, ... };
    }
  }
  
  return { success: false, error: 'Location not in supported areas' };
}
```

#### 5.2 Remove Geographic Restrictions
Updated address search to work Australia-wide:

```javascript
async function searchAddresses(query, limit = 5, signal = null) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=${limit}&addressdetails=1&countrycodes=au`;
  // No bounds restriction - users can search anywhere
}
```

## File Structure

```
docs/data/
├── bendigo/
│   ├── zones.geojson
│   └── config.json
└── yarra/
    ├── zones.geojson
    └── config.json

tools/
├── convert-yarra-bendigo-format.js
└── fix-yarra-week-offsets.js
```

## Testing and Validation

### 1. Data Validation
- Verify all zones are present (1-10 for Yarra)
- Check geometry validity
- Confirm bin configurations are correct

### 2. Schedule Validation
- Test week offset calculations against actual collection dates
- Verify glass/recycling alternation works correctly
- Check edge cases (year boundaries, leap years)

### 3. Geographic Validation
- Test point-in-polygon for known addresses
- Verify zone boundaries don't overlap incorrectly
- Test address search works for both cities

## Common Issues and Solutions

### Issue 1: Incorrect Week Offsets
**Problem:** Glass and recycling bins showing on same week
**Solution:** Use actual collection calendar data to validate week offsets

### Issue 2: Geometry Conversion Errors
**Problem:** ArcGIS rings format differs from GeoJSON
**Solution:** Properly handle coordinate transformation and ring ordering

### Issue 3: Address Search Limitations
**Problem:** Geographic bounds restricting search to original city
**Solution:** Remove bounds restrictions, allow Australia-wide search

## Future Enhancements

### Adding New Cities
1. Find council's waste collection data source (preferably GeoJSON/ArcGIS)
2. Analyze collection schedule patterns
3. Create conversion script based on `convert-yarra-bendigo-format.js`
4. Validate week offsets with actual collection calendars
5. Add city to `supportedCities` array in `geo.js`

### Data Updates
1. Re-fetch data from original source
2. Run conversion script
3. Validate week offsets haven't changed
4. Test critical addresses still resolve correctly

## Resources

- **Yarra City Council:** https://www.yarracity.vic.gov.au/services/bins-and-recycling
- **ArcGIS REST API:** https://developers.arcgis.com/rest/services-reference/
- **OpenStreetMap Nominatim:** https://nominatim.org/release-docs/develop/api/Search/
- **Turf.js Documentation:** https://turfjs.org/

## Change Log

- **2025-07-23:** Initial Yarra integration completed
- **2025-07-23:** Week offset validation and correction implemented
- **2025-07-23:** Address search restrictions removed

---

*This document should be updated whenever the data integration process is modified or when new cities are added.*
