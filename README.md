# Bin Nights App

A GPS-based bin collection reminder app that shows which bins to put out based on your location and zone.

🗑️ **Live Demo**: Open `docs/index.html` in your browser or serve the `docs/` folder

## ✅ Completed Features

### Core Functionality
- 📍 **GPS Location Detection** - Automatically detects your collection zone
- 🏠 **Address Lookup** - Search by address with autocomplete suggestions  
- 🗓️ **Smart Scheduling** - Calculates which bins are collected today/next
- 🎨 **Visual Interface** - Clear, colorful bin display with status indicators
- � **Offline Ready** - Caches data for reliable operation
- ⚙️ **Manual Override** - Select zone manually if GPS fails
- 🗺️ **Real Data** - Uses official City of Greater Bendigo zone boundaries

### UI/UX Improvements (Recently Completed)
- 📱 **Responsive Design** - Fully responsive layout that works on all screen sizes
- 🌙 **Dark Mode** - iPhone-style toggle with automatic system theme detection
- 🎯 **Simplified Navigation** - Removed complex settings, streamlined UI
- 🚀 **Modal Address Search** - Clean modal interface for location selection
- 🎨 **Modern Styling** - Updated design with better contrast and spacing
- 📐 **Adaptive Layout** - Bins display in single row with flexbox layout

### Technical Features
- 🔄 **Real-time Updates** - Automatic refresh and state management
- 📊 **SVG Icons** - Scalable, themeable bin icons with CSS filters
- 🎭 **Smooth Animations** - Subtle hover effects and transitions
- 🔧 **Error Handling** - Graceful fallbacks for GPS and network issues

## 🚧 Known Issues

- **Bin Icons**: Currently working on making SVG bin icons fully responsive and adaptive across all themes and screen sizes
- **Performance**: Large GeoJSON files may cause slight delays on slower devices

## Current Implementation Status

**Fully Working:**
- GPS location detection and zone lookup
- Address search with autocomplete 
- Bin schedule calculation and display
- Dark/light theme switching with system preference detection
- Responsive layout and mobile support
- Offline caching and data persistence
- Modal-based location selection interface

**In Progress:**
- Bin icon display system (SVG responsiveness being refined)
- Performance optimization for large datasets

**Next Priorities:**
1. Complete SVG icon system for all themes and screen sizes
2. Add bin collection notifications/reminders  
3. Expand to additional council areas

## Quick Start

### Option 1: Static File Server
```bash
cd docs
python3 -m http.server 8000
# Open http://localhost:8000
```

### Option 2: Development Container
1. Open this folder in VS Code
2. When prompted, click "Reopen in Container" 
3. Run the "Start Development Server" task or open `docs/index.html`

## Architecture & Design

### Frontend Stack
- **Vanilla JavaScript** - No frameworks, fast loading
- **CSS Custom Properties** - Dynamic theming support
- **Flexbox Layout** - Responsive design without media query complexity
- **Progressive Enhancement** - Works without JavaScript for basic info

### Key Components
- **Location Detection**: GPS → Geocoding → Zone Lookup → Bin Schedule
- **Address Search**: Autocomplete → Validation → Zone Mapping
- **Theme System**: System preference detection + manual override
- **Caching**: localStorage for offline capability and performance

### Recent Refactoring (2025)
The app underwent a major UI/UX refactor focusing on:
1. **Simplified Interface**: Removed complex settings modal, streamlined to essential features
2. **Modal-based Address Search**: Cleaner UX with dedicated modal for location selection
3. **Responsive Bin Display**: Single-row layout that adapts to all screen sizes
4. **Modern Theme Toggle**: iPhone-style toggle with system preference detection
5. **CSS-based Icon System**: Moved from inline SVG to external SVG with CSS filters for better performance and theming

### Zone Data Format

Zones are stored in `docs/data/bendigo/zones.geojson` as a GeoJSON FeatureCollection where each feature represents a collection zone with:

- **Zone identifier** (e.g., "A1", "B2", "E13")
- **Collection day** (1=Monday through 7=Sunday)
- **Bin configuration** (rubbish, recycling, green waste with schedules)

Example zone feature:
```json
{
  "type": "Feature",
  "properties": {
    "zone": "A1",
    "collectionDay": 2,
    "bins": {
      "rubbish": {
        "name": "Rubbish",
        "color": "#dc2626",
        "interval": 2,
        "weekOffset": 0
      },
      "recycling": {
        "name": "Recycling", 
        "color": "#eab308",
        "interval": 2,
        "weekOffset": 0
      },
      "green": {
        "name": "Green Waste",
        "color": "#16a34a", 
        "interval": 1,
        "weekOffset": 0
      }
    }
  },
  "geometry": { /* Polygon coordinates */ }
}
```

### Schema Validation

A JSON Schema is available at `docs/data/zones-schema.json` for validating the zones.geojson structure.

## Development Changelog

### 2025-06-30: UI/UX Modernization
- ✅ Moved address search to modal interface
- ✅ Removed complex settings, simplified to essential features  
- ✅ Added iPhone-style theme toggle with system preference detection
- ✅ Implemented responsive single-row bin layout
- ✅ Switched to external SVG icons with CSS filter theming
- 🚧 Working on completing responsive SVG icon system

### Previous Development
- ✅ Core GPS and geocoding functionality
- ✅ Real-time bin schedule calculation
- ✅ Offline data caching
- ✅ City of Greater Bendigo zone data integration

## Development Setup

This project uses a VS Code devcontainer with all the necessary tools pre-installed.

### What's Included

- Node.js 18+ for development tools
- Python 3 with geospatial libraries
- GDAL for shapefile conversion
- http-server for local development

### Development Server

```bash
# Serve the docs folder (GitHub Pages root)
cd docs && python3 -m http.server 8080
```

## Project Structure

See [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) for detailed implementation plan.

```
bin-nights/
├── docs/                    # GitHub Pages root
│   ├── data/
│   │   ├── bendigo/
│   │   │   ├── config.json  # City metadata and bounds
│   │   │   └── zones.geojson # Zone polygons with bin data
│   │   └── zones-schema.json # JSON Schema for validation
│   ├── js/                  # Application JavaScript
│   └── index.html           # Main application
├── tools/                   # Development tools
│   └── convert-shz.js       # Shapefile to GeoJSON converter
├── assets/                  # Source data files
└── .devcontainer/          # Dev environment config
```

## Data Processing

The real shapefile data from City of Greater Bendigo is converted to GeoJSON:

```bash
# Convert shapefile to web-ready GeoJSON
cd tools
node convert-shz.js
```

This processes the original `assets/CoGB Garbage_Collection_Zones.*` files and generates the clean `docs/data/bendigo/zones.geojson` with embedded bin schedules.

## Deployment

GitHub Pages automatically deploys from the `docs/` folder.
