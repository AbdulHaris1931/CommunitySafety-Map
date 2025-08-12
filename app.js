// Initialize map
let map = L.map('map').setView([20.5937, 78.9629], 5);

// Base layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Marker cluster & heatmap layers
let markers = L.markerClusterGroup();
let heatPoints = [];

// Load incidents from localStorage
let incidents = JSON.parse(localStorage.getItem('incidents')) || [];

// Render existing incidents
incidents.forEach(inc => addIncidentMarker(inc));

map.addLayer(markers);

// Add incident marker
function addIncidentMarker(incident) {
    let color = incident.type === 'crime' ? 'red' : incident.type === 'hazard' ? 'orange' : 'blue';
    let marker = L.circleMarker([incident.lat, incident.lng], {
        radius: 8,
        color: color,
        fillOpacity: 0.8
    }).bindPopup(`<b>${incident.title}</b><br>Type: ${incident.type}`);
    markers.addLayer(marker);
    heatPoints.push([incident.lat, incident.lng, 0.5]);
}

// Heatmap
let heat = L.heatLayer(heatPoints, { radius: 25 }).addTo(map);

// Report incident
document.getElementById('reportBtn').addEventListener('click', () => {
    let title = document.getElementById('incidentTitle').value;
    let type = document.getElementById('incidentType').value;
    let center = map.getCenter();
    let incident = { title, type, lat: center.lat, lng: center.lng };
    incidents.push(incident);
    localStorage.setItem('incidents', JSON.stringify(incidents));
    addIncidentMarker(incident);
    heat.setLatLngs(heatPoints);
    alert('Incident reported!');
});

// Geocode function
async function geocode(query) {
    let res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
    let data = await res.json();
    return data.length > 0 ? [parseFloat(data[0].lat), parseFloat(data[0].lon)] : null;
}

// Search location
document.getElementById('searchBtn').addEventListener('click', async () => {
    let loc = document.getElementById('search').value;
    let coords = await geocode(loc);
    if (coords) map.setView(coords, 14);
    else alert('Location not found.');
});

// Find safe route
document.getElementById('routeBtn').addEventListener('click', async () => {
    let startLoc = document.getElementById('start').value;
    let endLoc = document.getElementById('end').value;
    let startCoords = await geocode(startLoc);
    let endCoords = await geocode(endLoc);

    if (!startCoords || !endCoords) {
        alert('Invalid start or end location.');
        return;
    }

    let routeRes = await fetch(`https://router.project-osrm.org/route/v1/walking/${startCoords[1]},${startCoords[0]};${endCoords[1]},${endCoords[0]}?overview=full&geometries=geojson`);
    let routeData = await routeRes.json();
    let coords = routeData.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);

    // Remove old route
    if (window.routeLayer) map.removeLayer(window.routeLayer);

    // Draw new route
    window.routeLayer = L.polyline(coords, { color: 'green', weight: 5 }).addTo(map);
    map.fitBounds(window.routeLayer.getBounds());

    // Safety check
    let unsafe = incidents.some(inc => coords.some(pt => map.distance(pt, [inc.lat, inc.lng]) < 200));
    if (unsafe) {
        alert('⚠ This route has incidents nearby. Be cautious.');
    } else {
        alert('✅ Route seems safe.');
    }
});
