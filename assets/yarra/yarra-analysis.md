# City of Yarra Waste Collection Data Analysis

## Data Source
- **Service**: Yarra City Council ArcGIS REST service
- **URL**: https://yccgis-prd.esriaustraliaonline.com.au/arcgis/rest/services/Hosted/Waster_Collection_Zones/FeatureServer/0
- **Total Zones**: 11 zones (numbered 1-10, with some duplicates in the raw data)

## Collection Schedule Structure
Based on the user's description and the data analysis:

### Bin Types
1. **Rubbish** (Red bin) - Weekly collection
2. **Organics** (Green bin) - Weekly collection  
3. **Glass** (Purple bin) - Fortnightly collection (alternating with recycling)
4. **Recycling** (Yellow bin) - Fortnightly collection (alternating with glass)

### Collection Days by Zone
| Zone | Collection Day |
|------|----------------|
| 1, 2 | Monday |
| 3, 4 | Tuesday |
| 5, 6 | Wednesday |
| 7, 8 | Thursday |
| 9, 10 | Friday |

## Data Structure
The original ArcGIS data contains:
- `collection_day`: The day of the week for collections
- `zone_num`: Numeric zone identifier
- `geometry`: Polygon boundaries for each zone
- Various metadata fields (creation dates, object IDs, etc.)

## Generated Files
1. **`/workspace/docs/data/yarra/zones.geojson`**: Complete zone boundaries with properties
2. **`/workspace/docs/data/yarra/config.json`**: City configuration including schedule details

## Schedule Logic
- **Rubbish & Organics**: Collected weekly on the zone's designated day
- **Glass & Recycling**: Collected fortnightly on alternating weeks on the zone's designated day

This structure matches the existing application pattern used for Bendigo data and should integrate seamlessly with the existing waste collection application.
