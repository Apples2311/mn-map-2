// Global variables
let map;
let districtLayer;
let districtsVisible = true;
let selectedDistrict = null;

// Minnesota center coordinates
const MINNESOTA_CENTER = [46.7296, -94.6859];

// Initialize the map
function initMap() {
    // Create the map centered on Minnesota
    map = L.map('map', {
        center: MINNESOTA_CENTER,
        zoom: 6,
        minZoom: 8, // Limited zoom out (was 5)
        maxZoom: 19,
        zoomAnimation: true,
        fadeAnimation: true,
        zoomAnimationThreshold: 4,
        updateWhenIdle: true
    });

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    // Add transit/line map layer (CartoDB Positron as a clean, transit-friendly style)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19
    }).addTo(map);

    // Add Minnesota School Districts from ArcGIS Feature Service
    addDistrictsFromArcGIS();

    // Add zoom fade logic for district fills
    map.on('zoomend', function() {
        const isMaxZoom = map.getZoom() === map.getMaxZoom();
        for (const id in window.districtLayerRefs) {
            const layer = window.districtLayerRefs[id];
            const color = (window.districtEdits && window.districtEdits[id] && window.districtEdits[id].color) || null;
            // If at max zoom, always transparent; if not, restore color
            layer.setStyle({
                color: '#000',
                fillColor: color || 'transparent',
                fillOpacity: (isMaxZoom ? 0 : (color ? 0.5 : 0)),
                weight: 2
            });
        }
    });
}

// Store district layer references for color updates
if (!window.districtLayerRefs) window.districtLayerRefs = {};

// Store MASMS dot markers for each district
if (!window.masmsDotMarkers) window.masmsDotMarkers = {};

// Add districts from ArcGIS Feature Service
function addDistrictsFromArcGIS() {
    document.getElementById('loading').style.display = 'none';
    const featureServiceUrl = 'https://services.arcgis.com/GXwOsvnLQI6EDOp7/ArcGIS/rest/services/Minnesota_School_District_Boundaries_Current_Year_View/FeatureServer/0';
    const districts = L.esri.featureLayer({
        url: featureServiceUrl,
        style: function (feature) {
            // Use saved color if available
            const id = feature && (feature.properties.SDORGID || feature.properties.DISTRICT_ID || feature.properties.ID);
            const color = (window.districtEdits && window.districtEdits[id] && window.districtEdits[id].color) || null;
            return { color: '#000', weight: 2, fillColor: color || 'transparent', fillOpacity: color ? 0.5 : 0 };
        },
        onEachFeature: function (feature, layer) {
            // Store reference for color updates
            const id = feature.properties.SDORGID || feature.properties.DISTRICT_ID || feature.properties.ID;
            window.districtLayerRefs[id] = layer;
            // Add label at the center of the polygon
            if (layer.getBounds && typeof layer.getBounds === 'function') {
                const center = layer.getBounds().getCenter();
                const labelText = cleanDistrictName(feature.properties.PREFNAME || feature.properties.SHORTNAME || 'District');
                const label = L.marker(center, {
                    icon: L.divIcon({
                        className: 'district-label',
                        html: `<span>${labelText}</span>`,
                        iconSize: [120, 24],
                        iconAnchor: [60, 12]
                    }),
                    interactive: false
                });
                label.addTo(map);
                // Add MASMS blue dot if applicable
                if (window.districtEdits && window.districtEdits[id] && window.districtEdits[id].masms === 'Yes') {
                    // Add glow
                    const glow = L.circleMarker(center, {
                        radius: 13,
                        color: 'rgba(255,255,255,0.5)',
                        fillColor: 'rgba(255,255,255,0.3)',
                        fillOpacity: 0.7,
                        weight: 0
                    }).addTo(map);
                    // Add main dot
                    const dot = L.circleMarker(center, {
                        color: '#fff', // white border
                        fillColor: '#00fff7', // brighter teal
                        fillOpacity: 1,
                        weight: 4
                    }).addTo(map);
                    dot.bindTooltip('MASMS Member', {permanent: false, direction: 'top'});
                    window.masmsDotMarkers[id] = [glow, dot];
                }
            }
            layer.on({
                mouseover: function (e) {
                    e.target.setStyle({ color: '#000', fillColor: color || 'transparent', weight: 2, fillOpacity: color ? 0.5 : 0 });
                    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                        e.target.bringToFront();
                    }
                },
                mouseout: function (e) {
                    // Restore to saved color
                    const id = feature.properties.SDORGID || feature.properties.DISTRICT_ID || feature.properties.ID;
                    const color = (window.districtEdits && window.districtEdits[id] && window.districtEdits[id].color) || null;
                    e.target.setStyle({ color: '#000', fillColor: color || 'transparent', weight: 2, fillOpacity: color ? 0.5 : 0 });
                },
                click: function (e) {
                    updateDistrictInfo(feature.properties);
                }
            });
        }
    }).addTo(map);
    districts.once('load', function () {
        map.fitBounds(districts.getBounds());
    });
}

// Utility to normalize district names for matching
function normalizeName(name) {
    return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Utility to clean up district names for display
function cleanDistrictName(name) {
    return (name || '').replace(/school district/gi, '').replace(/public/gi, '').replace(/\s+/g, ' ').trim();
}

// Improved CSV parser (handles quoted fields and commas)
function parseCSV(csv) {
    const rows = [];
    let inQuotes = false, field = '', row = [];
    for (let i = 0; i < csv.length; i++) {
        const char = csv[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            row.push(field);
            field = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (field || row.length > 0) row.push(field);
            if (row.length > 0) rows.push(row);
            field = '';
            row = [];
            // Handle \r\n
            if (char === '\r' && csv[i + 1] === '\n') i++;
        } else {
            field += char;
        }
    }
    if (field || row.length > 0) row.push(field);
    if (row.length > 0) rows.push(row);
    return rows;
}

// Load contacts CSV and store in window.districtContacts
function loadDistrictContacts() {
    fetch('North School Districts Building & Grounds Directors_ Superintendnts contact info - Sheet1.csv')
        .then(response => response.text())
        .then(csv => {
            const rows = parseCSV(csv);
            const headers = rows[0].map(h => h.trim());
            window.districtContacts = {};
            for (let i = 1; i < rows.length; i++) {
                const entry = {};
                headers.forEach((h, idx) => entry[h] = (rows[i][idx] || '').trim());
                // Use normalized School District as key
                if (entry['School District']) {
                    window.districtContacts[normalizeName(entry['School District'])] = entry;
                }
            }
            window.districtContactsLoaded = true;
        });
}

// Call this on page load
loadDistrictContacts();

// Add a search bar above the Edit District Info form
function renderDistrictSearchBar(onSelectDistrict) {
    // Gather all districts from the map and CSV
    let allDistricts = [];
    if (window.districtContactsLoaded) {
        allDistricts = Object.values(window.districtContacts).map(entry => ({
            name: (entry['School District'] || '').trim(),
            contact: (entry['Main point of contact'] || '').trim(),
            phone: (entry['Phone'] || '').trim()
        }));
    }
    // Fallback: if no CSV, use map districts
    if (allDistricts.length === 0 && window.districtLayerRefs) {
        allDistricts = Object.values(window.districtLayerRefs).map(layer => {
            const props = layer.feature && layer.feature.properties;
            return {
                name: cleanDistrictName(props.PREFNAME || props.SHORTNAME || props.NAME || 'Unknown District'),
                contact: '',
                phone: ''
            };
        });
    }
    // Remove duplicates
    const seen = new Set();
    allDistricts = allDistricts.filter(d => {
        const key = d.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
    // Render search bar and dropdown
    return `
        <div id="district-search-bar" style="margin-bottom: 1rem;">
            <input type="text" id="district-search-input" placeholder="Search by district, contact, or phone..." style="width: 100%; padding: 0.5rem; border-radius: 5px; border: 1px solid #ccc;" />
            <div id="district-search-results" style="background: #fff; border: 1px solid #ccc; border-radius: 0 0 5px 5px; max-height: 180px; overflow-y: auto; display: none; position: absolute; z-index: 2000; width: 95%;"></div>
        </div>
    `;
}

// Update the sidebar with district information and editable fields, including color
function updateDistrictInfo(properties) {
    const districtInfo = document.getElementById('district-info');
    const rawDistrictName = properties.PREFNAME || properties.SHORTNAME || properties.NAME || 'Unknown District';
    const districtName = cleanDistrictName(rawDistrictName);
    const districtId = properties.SDORGID || properties.DISTRICT_ID || properties.ID || 'N/A';
    if (!window.districtEdits) window.districtEdits = {};
    const edits = window.districtEdits[districtId] || {};
    // Try to get contact info from CSV
    let contact = {};
    let matchType = 'none';
    if (window.districtContactsLoaded) {
        const normName = normalizeName(rawDistrictName);
        // Log all normalized names for debugging
        if (!window._districtDebugLogged) {
            console.log('Map district:', rawDistrictName, 'Normalized:', normName);
            console.log('All CSV keys:', Object.keys(window.districtContacts));
            window._districtDebugLogged = true;
        }
        if (window.districtContacts[normName]) {
            contact = window.districtContacts[normName];
            matchType = 'exact';
        } else {
            // Fuzzy match: find a CSV key that contains or is contained by the normalized map name
            const csvKeys = Object.keys(window.districtContacts);
            const fuzzyKey = csvKeys.find(k => normName.includes(k) || k.includes(normName));
            if (fuzzyKey) {
                contact = window.districtContacts[fuzzyKey];
                matchType = 'fuzzy';
            }
        }
    }
    function getField(field, fallback) {
        if (edits[field] !== undefined) return edits[field];
        if (field === 'contactPerson') return contact['Main point of contact'] || fallback || '';
        if (field === 'email') return contact['Emails'] || fallback || '';
        if (field === 'phoneNumber') return contact['Phone'] || fallback || '';
        return properties[field] || fallback || '';
    }
    // Color options
    const colorOptions = [
        { name: 'Red', value: '#e74c3c' },
        { name: 'Green', value: '#27ae60' },
        { name: 'Yellow', value: '#f1c40f' },
        { name: 'Orange', value: '#f39c12' }
    ];
    // When opening the form, do not pre-select a color
    const selectedColor = (edits.color && typeof edits.color === 'string') ? edits.color : null;
    // Render the editable form with color picker, MASMS checkbox, and number of schools
    const masmsValue = getField('masms', '');
    // Render the search bar above the form
    districtInfo.innerHTML = renderDistrictSearchBar(selectDistrictByName) + `
        <form id="district-edit-form" class="district-info">
            <h3>Edit District Info</h3>
            <label><strong>District Name:</strong><br>
                <input type="text" name="districtName" value="${districtName}" style="width: 100%; margin-bottom: 0.5rem;" />
            </label>
            <label><strong>Main Point of Contact:</strong><br>
                <input type="text" name="contactPerson" value="${getField('contactPerson', '')}" style="width: 100%; margin-bottom: 0.5rem;" />
            </label>
            <label><strong>Email:</strong><br>
                <input type="email" name="email" value="${getField('email', '')}" style="width: 100%; margin-bottom: 0.5rem;" />
            </label>
            <label><strong>Phone Number:</strong><br>
                <input type="tel" name="phoneNumber" value="${getField('phoneNumber', '')}" style="width: 100%; margin-bottom: 0.5rem;" />
            </label>
            <label><strong>Secondary Phone:</strong><br>
                <input type="tel" name="secondaryPhone" value="${getField('secondaryPhone', '')}" style="width: 100%; margin-bottom: 0.5rem;" />
            </label>
            <label><strong>Website:</strong><br>
                <input type="url" name="website" value="${getField('website', '')}" style="width: 100%; margin-bottom: 0.5rem;" placeholder="https://example.com" />
                ${getField('website', '').trim() ? `<a href="${getField('website', '')}" target="_blank" style="display:block; color:#3498db; margin-bottom:0.5rem;">Visit Website</a>` : ''}
            </label>
            <label><strong>Number of Schools:</strong><br>
                <input type="number" name="numSchools" min="0" value="${getField('numSchools', '')}" style="width: 100%; margin-bottom: 0.5rem;" />
            </label>
            <label><strong>MASMS Member:</strong><br>
                <label style="margin-right: 1rem;">
                    <input type="checkbox" name="masmsYes" ${masmsValue === 'Yes' ? 'checked' : ''} /> Yes
                </label>
                <label>
                    <input type="checkbox" name="masmsNo" ${masmsValue === 'No' ? 'checked' : ''} /> No
                </label>
            </label>
            <label><strong>Notes:</strong><br>
                <textarea name="notes" rows="5" style="width: 100%; min-height: 90px; margin-bottom: 0.5rem;">${getField('notes', '')}</textarea>
            </label>
            <label><strong>District Color:</strong><br>
                <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                    ${colorOptions.map(opt => `
                        <label style="display: flex; align-items: center; gap: 0.2rem;">
                            <input type="radio" name="color" value="${opt.value}" ${selectedColor === opt.value ? 'checked' : ''} />
                            <span style="display:inline-block;width:18px;height:18px;background:${opt.value};border-radius:50%;border:2px solid #ccc;"></span>
                            <span>${opt.name}</span>
                        </label>
                    `).join('')}
                </div>
            </label>
            <button type="submit" style="background: #3498db; color: white; border: none; border-radius: 5px; padding: 0.5rem 1.5rem; font-size: 1rem; cursor: pointer; margin-top: 0.5rem;">Save</button>
            ${matchType === 'none' ? `<div style='color:#e74c3c;margin-top:0.5rem;'>No contact info found for this district. Check the name in your CSV.</div>` : ''}
            ${matchType === 'fuzzy' ? `<div style='color:#f1c40f;margin-top:0.5rem;'>Fuzzy match used. Check if info is correct.</div>` : ''}
        </form>
    `;
    // Add search logic (must be inside updateDistrictInfo)
    const searchInput = document.getElementById('district-search-input');
    const searchResults = document.getElementById('district-search-results');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const q = searchInput.value.trim().toLowerCase();
            if (!q) { searchResults.style.display = 'none'; searchResults.innerHTML = ''; return; }
            let allDistricts = [];
            if (window.districtContactsLoaded) {
                allDistricts = Object.values(window.districtContacts).map(entry => ({
                    name: (entry['School District'] || '').trim(),
                    contact: (entry['Main point of contact'] || '').trim(),
                    phone: (entry['Phone'] || '').trim()
                }));
            }
            if (allDistricts.length === 0 && window.districtLayerRefs) {
                allDistricts = Object.values(window.districtLayerRefs).map(layer => {
                    const props = layer.feature && layer.feature.properties;
                    return {
                        name: cleanDistrictName(props.PREFNAME || props.SHORTNAME || props.NAME || 'Unknown District'),
                        contact: '',
                        phone: ''
                    };
                });
            }
            // Remove duplicates
            const seen = new Set();
            allDistricts = allDistricts.filter(d => {
                const key = d.name.toLowerCase();
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
            // Filter
            const matches = allDistricts.filter(d =>
                d.name.toLowerCase().includes(q) ||
                d.contact.toLowerCase().includes(q) ||
                d.phone.toLowerCase().includes(q)
            );
            if (matches.length === 0) {
                searchResults.innerHTML = '<div style="padding: 0.5rem; color: #888;">No results found.</div>';
                searchResults.style.display = 'block';
                return;
            }
            searchResults.innerHTML = matches.map(d =>
                `<div class="district-search-result" style="padding: 0.5rem; cursor: pointer; border-bottom: 1px solid #eee;" data-name="${d.name.replace(/"/g, '&quot;')}">
                    <strong>${d.name}</strong><br>
                    <span style="font-size:0.9em; color:#555;">${d.contact} ${d.phone}</span>
                </div>`
            ).join('');
            searchResults.style.display = 'block';
            // Add click listeners
            Array.from(searchResults.querySelectorAll('.district-search-result')).forEach(el => {
                el.addEventListener('click', function() {
                    const name = el.getAttribute('data-name');
                    selectDistrictByName(name);
                    searchResults.style.display = 'none';
                    searchInput.value = '';
                });
            });
            // Add Enter key support
            searchInput.onkeydown = function(e) {
                if (e.key === 'Enter' && matches.length > 0) {
                    e.preventDefault();
                    selectDistrictByName(matches[0].name);
                    searchResults.style.display = 'none';
                    searchInput.value = '';
                }
            };
        });
        // Hide results on blur
        searchInput.addEventListener('blur', function() {
            setTimeout(() => { searchResults.style.display = 'none'; }, 200);
        });
    }
    // Handle form submission (in-memory only)
    const form = document.getElementById('district-edit-form');
    // Ensure only one MASMS checkbox can be checked at a time
    const masmsYes = form.querySelector('input[name="masmsYes"]');
    const masmsNo = form.querySelector('input[name="masmsNo"]');
    masmsYes.addEventListener('change', () => { if (masmsYes.checked) masmsNo.checked = false; });
    masmsNo.addEventListener('change', () => { if (masmsNo.checked) masmsYes.checked = false; });
    form.onsubmit = function(e) {
        e.preventDefault();
        const formData = new FormData(form);
        let masms = '';
        if (masmsYes.checked) masms = 'Yes';
        else if (masmsNo.checked) masms = 'No';
        let notes = formData.get('notes') || '';
        if (notes.trim() !== '') {
            const now = new Date();
            const dateStr = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();
            notes = notes + ` [Saved on: ${dateStr}]`;
        }
        window.districtEdits[districtId] = {
            districtName: formData.get('districtName'),
            contactPerson: formData.get('contactPerson'),
            email: formData.get('email'),
            phoneNumber: formData.get('phoneNumber'),
            secondaryPhone: formData.get('secondaryPhone'),
            numSchools: formData.get('numSchools'),
            website: formData.get('website'),
            masms: masms,
            notes: notes,
            color: formData.get('color') || null
        };
        // Update the district color on the map
        const layer = window.districtLayerRefs[districtId];
        if (layer) {
            layer.setStyle({ color: '#000', fillColor: formData.get('color') || 'transparent', weight: 2, fillOpacity: formData.get('color') ? 0.5 : 0 });
        }
        // Update MASMS dot marker
        if (!window.masmsDotMarkers) window.masmsDotMarkers = {};
        // Remove old dot if exists
        if (window.masmsDotMarkers[districtId]) {
            // Remove both glow and dot if present
            const dots = window.masmsDotMarkers[districtId];
            if (Array.isArray(dots)) {
                dots.forEach(d => map.removeLayer(d));
            } else {
                map.removeLayer(dots);
            }
            delete window.masmsDotMarkers[districtId];
        }
        // Add new dot if MASMS is Yes
        if (masms === 'Yes') {
            // Find the center of the district
            const layer = window.districtLayerRefs[districtId];
            if (layer && layer.getBounds) {
                const center = layer.getBounds().getCenter();
                // Add glow
                const glow = L.circleMarker(center, {
                    radius: 13,
                    color: 'rgba(255,255,255,0.5)',
                    fillColor: 'rgba(255,255,255,0.3)',
                    fillOpacity: 0.7,
                    weight: 0
                }).addTo(map);
                // Add main dot
                const dot = L.circleMarker(center, {
                    color: '#fff', // white border
                    fillColor: '#00fff7', // brighter teal
                    fillOpacity: 1,
                    weight: 4
                }).addTo(map);
                dot.bindTooltip('MASMS Member', {permanent: false, direction: 'top'});
                window.masmsDotMarkers[districtId] = [glow, dot];
            }
        }
        // Optionally, show a confirmation
        form.querySelector('button[type="submit"]').textContent = 'Saved!';
        setTimeout(() => {
            form.querySelector('button[type="submit"]').textContent = 'Save';
        }, 1200);
    };
}

// Helper to select a district by name and update the form
function selectDistrictByName(name) {
    // Try to find the corresponding layer
    let foundLayer = null;
    for (const id in window.districtLayerRefs) {
        const layer = window.districtLayerRefs[id];
        const props = layer.feature && layer.feature.properties;
        const displayName = cleanDistrictName(props.PREFNAME || props.SHORTNAME || props.NAME || 'Unknown District');
        if (displayName === name) {
            foundLayer = layer;
            break;
        }
    }
    if (foundLayer) {
        // Simulate a click to update the sidebar
        foundLayer.fire('click');
    }
}

// Reset map view to show all districts
function resetView() {
    if (districtLayer) {
        map.fitBounds(districtLayer.getBounds());
    }
}

// Toggle district visibility
function toggleDistricts() {
    if (districtLayer) {
        if (districtsVisible) {
            map.removeLayer(districtLayer);
            districtsVisible = false;
        } else {
            map.addLayer(districtLayer);
            districtsVisible = true;
        }
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Minnesota School District Map...');
    initMap();
});

// Add keyboard shortcuts
document.addEventListener('keydown', function(e) {
    switch(e.key) {
        case 'r':
        case 'R':
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                resetView();
            }
            break;
        case 't':
        case 'T':
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                toggleDistricts();
            }
            break;
    }
});

// Export functions for global access
window.resetView = resetView;
window.toggleDistricts = toggleDistricts; 