# 🗺️ Minnesota School District Interactive Map

An interactive web application that displays Minnesota's school districts with detailed boundary information and district data.

## ✨ Features

- **Interactive Map**: Explore Minnesota school districts with zoom, pan, and click interactions
- **District Information**: Click on any district to view detailed information in the sidebar
- **Modern UI**: Clean, responsive design with beautiful styling
- **Multiple Map Layers**: Switch between street maps and satellite imagery
- **District Highlighting**: Hover and click effects for better user experience
- **Mobile Responsive**: Works on desktop, tablet, and mobile devices
- **Keyboard Shortcuts**: Quick access to common functions

## 🚀 Quick Start

### Prerequisites

- Python 3.6 or higher (for the local server)
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation & Setup

1. **Clone or download this repository**
   ```bash
   # If you have the files locally, navigate to the project directory
   cd mn-map
   ```

2. **Start the local server**
   ```bash
   python3 server.py
   ```

3. **Open your browser**
   - Navigate to: `http://localhost:8000/mn-map.html`
   - The application will load automatically

## 🌐 Sharing Your Map

### Option 1: GitHub Pages (Free & Easy)

1. **Create a GitHub repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Push to GitHub**
   ```bash
   git remote add origin https://github.com/yourusername/mn-map.git
   git push -u origin main
   ```

3. **Enable GitHub Pages**
   - Go to your repository on GitHub
   - Click "Settings" → "Pages"
   - Select "Deploy from a branch"
   - Choose "main" branch and "/ (root)" folder
   - Click "Save"

4. **Your map will be available at:**
   `https://yourusername.github.io/mn-map/mn-map.html`

### Option 2: Netlify (Free & Instant)

1. **Go to [netlify.com](https://netlify.com)**
2. **Drag and drop your project folder** to the deploy area
3. **Your map will be live instantly** with a URL like:
   `https://random-name.netlify.app`

### Option 3: Vercel (Free & Fast)

1. **Go to [vercel.com](https://vercel.com)**
2. **Import your GitHub repository** or drag and drop files
3. **Deploy automatically** with a custom domain option

### Option 4: Traditional Web Hosting

Upload these files to any web hosting service:
- `mn-map.html` (rename to `index.html` for auto-loading)
- `app.js`
- Any logo images
- The shapefile data folder

## 📁 File Structure

```
mn-map/
├── mn-map.html          # Main HTML file
├── app.js              # JavaScript application logic
├── server.py           # Local development server
├── README.md           # This file
└── shp_bdry_school_district_boundaries (5)/
    ├── school_district_boundaries.shp    # Shapefile geometry
    ├── school_district_boundaries.dbf    # Attribute data
    ├── school_district_boundaries.prj    # Projection info
    └── ... (other shapefile components)
```

## 🛠️ Technical Details

### Technologies Used
- **Leaflet.js**: Interactive mapping library
- **Shapefile.js**: Shapefile parsing library
- **HTML5/CSS3**: Modern web standards
- **Vanilla JavaScript**: No framework dependencies

### Data Source
The application uses Minnesota school district boundary data in ESRI Shapefile format, which includes:
- District boundaries (polygons)
- District names and IDs
- Geographic coordinates
- Area and perimeter calculations

### Browser Compatibility
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 🔧 Customization

### Changing the Port
If port 8000 is already in use, edit `server.py` and change the `PORT` variable:

```python
PORT = 8080  # or any other available port
```

### Modifying District Styling
Edit the `styleDistrict` function in `app.js`:

```javascript
function styleDistrict(feature) {
    return {
        fillColor: '#3498db',    // Change fill color
        weight: 2,               // Change border width
        opacity: 1,              // Change border opacity
        color: '#2980b9',        // Change border color
        fillOpacity: 0.3         // Change fill opacity
    };
}
```

### Adding More Information
To display additional district properties, modify the `updateDistrictInfo` function in `app.js`.

## 🐛 Troubleshooting

### Common Issues

**"Error loading shapefile"**
- Ensure the shapefile files are in the correct directory
- Check that the server is running on the correct port
- Verify file permissions

**"Port already in use"**
- Change the port number in `server.py`
- Or stop the existing server using the process

**"Map not loading"**
- Check browser console for JavaScript errors
- Ensure all files are in the correct locations
- Try refreshing the page

### Getting Help
1. Check the browser console (F12) for error messages
2. Verify all files are present in the project directory
3. Ensure the local server is running correctly

## 📊 Data Information

The school district boundary data includes:
- **Format**: ESRI Shapefile (.shp)
- **Projection**: NAD83 / Minnesota North (EPSG:26915)
- **Coverage**: State of Minnesota
- **Features**: 330+ school districts
- **Attributes**: District names, IDs, areas, perimeters

## 🤝 Contributing

Feel free to submit issues, feature requests, or pull requests to improve this application.

## 📄 License

This project is open source and available under the MIT License.

---

**Happy Mapping! 🗺️** 