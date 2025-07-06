# DigiFarm Maps - Digital Agriculture Platform

A modern web application for viewing and analyzing agricultural field data using interactive maps.

## Features

### 🗺️ Interactive Mapping

- **Delineated Land**: Click anywhere on the map to fetch and display field boundaries with detailed agricultural information
- **Boundary Box**: Draw rectangles to select areas and view all fields within the boundary
- **Multiple Map Layers**: Switch between satellite and OpenStreetMap views
- **Search Functionality**: Search for specific locations using the integrated geocoding

### 📊 Field Information

- **Detailed Field Data**: View comprehensive information about agricultural fields
- **Crop Information**: Access crop types, sowing dates, and harvest estimates
- **Farm Management**: View grower and farm details
- **Area Calculations**: Automatic area calculations in multiple units (m², acres, hectares)

### 🎨 Modern UI/UX Design

- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Intuitive Navigation**: Clean sidebar navigation with visual feedback
- **Loading States**: Real-time feedback during data fetching operations
- **Status Notifications**: Clear success, error, and information messages
- **Accessibility**: WCAG compliant with proper focus states and keyboard navigation

## UI/UX Improvements

### Design System

- **Consistent Color Palette**: Professional color scheme with primary, secondary, and accent colors
- **Typography**: Modern Inter font family with proper hierarchy
- **Spacing System**: Consistent padding, margins, and gaps throughout the application
- **Shadow System**: Layered shadows for depth and visual hierarchy
- **Border Radius**: Consistent rounded corners for modern appearance

### Enhanced User Experience

- **Visual Feedback**: Hover effects, transitions, and animations for better interactivity
- **Loading Indicators**: Spinning animations and progress feedback during API calls
- **Status Messages**: Toast-style notifications for user actions and system responses
- **Improved Popups**: Redesigned map popups with better typography and layout
- **Better Controls**: Styled map controls with consistent design language

### Responsive Design

- **Mobile-First Approach**: Optimized layouts for different screen sizes
- **Flexible Navigation**: Adaptive sidebar that transforms for mobile devices
- **Touch-Friendly**: Larger touch targets and improved mobile interactions
- **Cross-Platform**: Consistent experience across different browsers and devices

### Accessibility Features

- **Keyboard Navigation**: Full keyboard support for all interactive elements
- **Focus Management**: Clear focus indicators and logical tab order
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **High Contrast Support**: Enhanced visibility for users with visual impairments
- **Reduced Motion**: Respects user preferences for motion sensitivity

## Technical Stack

- **Frontend Framework**: Angular 19
- **Mapping Library**: Leaflet.js
- **Styling**: SCSS with CSS Custom Properties
- **Search**: Leaflet GeoSearch with OpenStreetMap provider
- **Drawing Tools**: Leaflet Draw for boundary selection

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd digifarm-maps

# Install dependencies
npm install

# Start development server
npm start
```

### Build for Production

```bash
npm run build
```

## Usage

### Delineated Land

1. Navigate to the "Delineated Land" section
2. Click anywhere on the map to fetch field data
3. Hover over displayed polygons to view detailed information
4. Use the search bar to navigate to specific locations

### Boundary Box

1. Navigate to the "Boundary Box" section
2. Use the rectangle drawing tool to select an area
3. Choose between "Exclusive" (fully inside) or "Inclusive" (partially inside) filtering
4. View all fields within the selected boundary
5. Hover over polygons to see field details

## API Integration

The application integrates with:

- **DigiFarm API**: For field boundary and agricultural data
- **Geosys API**: For detailed season field information
- **OpenStreetMap**: For base map tiles and geocoding

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team.

## Histogram Control

The histogram control provides comprehensive statistics and visualization for NDVI/NDWI image data:

### Features:

- **Statistics Display**: Shows min, mean, and max values for the currently active image
- **Interactive Bar Chart**: Visualizes the distribution of NDVI/NDWI values across the field
- **Color-coded Bars**: Each bar in the histogram uses the same colors as the image overlay
- **Collapsible Interface**: Can be collapsed to save screen space
- **Responsive Design**: Adapts to different screen sizes

### Usage:

1. Click on a field to load the polygon boundary
2. Click "Show NDVI" to display the image overlay
3. The histogram control will automatically appear on the left side
4. Use the image type dropdown to switch between different indices (NDVI, NDWI, etc.)
5. The histogram updates automatically when changing image types
6. Click the "−" button to collapse the control

### Data Sources:

- Statistics: `histogram.min`, `histogram.mean`, `histogram.max`
- Chart data: `histogram.items[]` with `valueMin`, `valueMax`, `area`, and `color` properties
- Visualization prioritizes area (hectares) over pixel count for meaningful representation
