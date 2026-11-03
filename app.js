// ============================================================
// Location Map — Phase 1
// Shows a map with a few sample spots. Tap a pin to see details.
// ============================================================

// 1. YOUR SPOTS
// Each spot is an object: a bundle of details about one place.
// All of them sit inside an array (the square brackets), which is a list.
// These are SAMPLE spots with placeholder details: replace them with your own.
const spots = [
  {
    name: "Jackson Street Bridge",
    lat: 33.7590,   // latitude  (up/down position on Earth)
    lng: -84.3720,  // longitude (left/right position on Earth)
    address: "Jackson St NE, Atlanta, GA",
    parking: "Sample: street parking nearby",
    hours: "Sample: check before you go",
    notes: "Sample: skyline view; replace with your own notes"
  },
  {
    name: "Piedmont Park",
    lat: 33.7851,
    lng: -84.3738,
    address: "Piedmont Park, Atlanta, GA",
    parking: "Sample: paid parking deck",
    hours: "Sample: check the park's website",
    notes: "Sample: lake and skyline shots"
  },
  {
    name: "Krog Street Tunnel",
    lat: 33.7535,
    lng: -84.3637,
    address: "Krog St NE, Atlanta, GA",
    parking: "Sample: street parking",
    hours: "Sample: open area",
    notes: "Sample: graffiti walls; watch for cars"
  }
];

// 2. CREATE THE MAP
// "map" matches <div id="map"> in index.html.
// setView([latitude, longitude], zoom): higher zoom = closer in.
const map = L.map("map").setView([33.7676, -84.3700], 13);

// 3. ADD THE MAP PICTURES (tiles) FROM OPENSTREETMAP
// {z}/{x}/{y} get filled in automatically as you zoom and drag.
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  // Required credit line for using OpenStreetMap's free tiles
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// 4. DROP A PIN FOR EVERY SPOT
// forEach runs the code inside once for each spot in the list.
spots.forEach(function (spot) {
  // Build the popup's content as HTML text
  const popupHtml = `
    <div class="popup">
      <h3>${spot.name}</h3>
      <p><span class="label">Address:</span> ${spot.address}</p>
      <p><span class="label">Parking:</span> ${spot.parking}</p>
      <p><span class="label">Hours:</span> ${spot.hours}</p>
      <p><span class="label">Notes:</span> ${spot.notes}</p>
    </div>
  `;

  // Place the pin and attach the popup (it opens when the pin is tapped)
  L.marker([spot.lat, spot.lng]).addTo(map).bindPopup(popupHtml);
});
