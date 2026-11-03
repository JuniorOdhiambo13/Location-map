// ============================================================
// Location Map — Phase 2
// Add spots by clicking the map or searching an address.
// Edit or delete them from each pin's popup.
// Spots are saved in this browser (localStorage) until Phase 3.
// ============================================================


// ------------------------------------------------------------
// 1. SAVED DATA
// ------------------------------------------------------------

// The name your spots are saved under in the browser
const STORAGE_KEY = "location-map-spots";

// Shown the very first time, before you've saved anything.
// Each spot has an "id" so we can find it later to edit or delete it.
const sampleSpots = [
  {
    id: "sample-1",
    name: "Jackson Street Bridge",
    lat: 33.7590,
    lng: -84.3720,
    address: "Jackson St NE, Atlanta, GA",
    parking: "Sample: street parking nearby",
    hours: "Sample: check before you go",
    notes: "Sample: skyline view; replace with your own notes"
  },
  {
    id: "sample-2",
    name: "Piedmont Park",
    lat: 33.7851,
    lng: -84.3738,
    address: "Piedmont Park, Atlanta, GA",
    parking: "Sample: paid parking deck",
    hours: "Sample: check the park's website",
    notes: "Sample: lake and skyline shots"
  },
  {
    id: "sample-3",
    name: "Krog Street Tunnel",
    lat: 33.7535,
    lng: -84.3637,
    address: "Krog St NE, Atlanta, GA",
    parking: "Sample: street parking",
    hours: "Sample: open area",
    notes: "Sample: graffiti walls; watch for cars"
  }
];

// Load saved spots from the browser, or use the samples if there are none.
// try/catch = "try this, and if it errors, do this instead" so the app never crashes.
function loadSpots() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved); // turn saved text back into a list
    }
  } catch (error) {
    console.warn("Could not load saved spots:", error);
  }
  return sampleSpots;
}

// Save the current list of spots into the browser
function saveSpots() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(spots)); // list -> text
  } catch (error) {
    alert("Couldn't save in this browser. Your changes will be lost when you close the page.");
  }
}

// "let" instead of "const" because this list will change
let spots = loadSpots();


// ------------------------------------------------------------
// 2. THE MAP
// ------------------------------------------------------------

const map = L.map("map").setView([33.7676, -84.3700], 13);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// A "layer group" holds all the pins so we can clear and redraw them at once
const markerLayer = L.layerGroup().addTo(map);


// ------------------------------------------------------------
// 3. PINS AND POPUPS
// ------------------------------------------------------------

// Makes typed text safe to show on the page.
// Without this, typing something like <b> into a note would be treated as code.
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}

// Builds what you see when you tap a pin, including Edit and Delete buttons
function buildPopup(spot) {
  const box = document.createElement("div");
  box.className = "popup";
  box.innerHTML = `
    <h3>${escapeHtml(spot.name)}</h3>
    <p><span class="label">Address:</span> ${escapeHtml(spot.address) || "—"}</p>
    <p><span class="label">Parking:</span> ${escapeHtml(spot.parking) || "—"}</p>
    <p><span class="label">Hours:</span> ${escapeHtml(spot.hours) || "—"}</p>
    <p><span class="label">Notes:</span> ${escapeHtml(spot.notes) || "—"}</p>
    <div class="popup-actions">
      <button type="button" class="edit-btn">Edit</button>
      <button type="button" class="delete-btn">Delete</button>
    </div>
  `;

  // Edit: close the popup and open the form filled with this spot's details
  box.querySelector(".edit-btn").addEventListener("click", function () {
    map.closePopup();
    openForm(spot);
  });

  // Delete: ask first, then remove this spot from the list
  box.querySelector(".delete-btn").addEventListener("click", function () {
    if (!confirm(`Delete "${spot.name}"?`)) return;
    spots = spots.filter(function (s) { return s.id !== spot.id; });
    saveSpots();
    map.closePopup();
    renderSpots();
  });

  return box;
}

// Clears the map and draws a pin for every spot in the list
function renderSpots() {
  markerLayer.clearLayers();
  spots.forEach(function (spot) {
    L.marker([spot.lat, spot.lng])
      .bindPopup(function () { return buildPopup(spot); })
      .addTo(markerLayer);
  });
}

renderSpots();


// ------------------------------------------------------------
// 4. THE ADD / EDIT FORM
// ------------------------------------------------------------

const panel = document.getElementById("form-panel");
const spotForm = document.getElementById("spot-form");
const formTitle = document.getElementById("form-title");
const formCoords = document.getElementById("form-coords");
const fields = {
  name: document.getElementById("field-name"),
  address: document.getElementById("field-address"),
  parking: document.getElementById("field-parking"),
  hours: document.getElementById("field-hours"),
  notes: document.getElementById("field-notes")
};

let editingId = null;   // id of the spot being edited, or null for a new spot
let formLatLng = null;  // where the spot is on the map
let draftMarker = null; // see-through pin showing where a new spot will go

// Opens the form. Pass a spot to edit it, or a location to add a new one.
function openForm(spot, latlng, address) {
  editingId = spot ? spot.id : null;
  formLatLng = spot ? L.latLng(spot.lat, spot.lng) : latlng;

  formTitle.textContent = spot ? "Edit spot" : "New spot";
  fields.name.value = spot ? spot.name : "";
  fields.address.value = spot ? spot.address : (address || "");
  fields.parking.value = spot ? spot.parking : "";
  fields.hours.value = spot ? spot.hours : "";
  fields.notes.value = spot ? spot.notes : "";
  formCoords.textContent = `Location: ${formLatLng.lat.toFixed(5)}, ${formLatLng.lng.toFixed(5)}`;

  panel.hidden = false;
  fields.name.focus();
}

function closeForm() {
  panel.hidden = true;
  editingId = null;
  formLatLng = null;
  removeDraftMarker();
}

function showDraftMarker(latlng) {
  removeDraftMarker();
  draftMarker = L.marker(latlng, { opacity: 0.6 }).addTo(map);
}

function removeDraftMarker() {
  if (draftMarker) {
    map.removeLayer(draftMarker);
    draftMarker = null;
  }
}

// Save button
spotForm.addEventListener("submit", function (event) {
  event.preventDefault(); // stop the browser from reloading the page

  const details = {
    name: fields.name.value.trim(),
    address: fields.address.value.trim(),
    parking: fields.parking.value.trim(),
    hours: fields.hours.value.trim(),
    notes: fields.notes.value.trim()
  };

  if (editingId) {
    // Replace the old details of the spot being edited
    spots = spots.map(function (s) {
      return s.id === editingId ? { ...s, ...details } : s;
    });
  } else {
    // Add a brand-new spot. Date.now() gives a unique number to use as its id.
    spots.push({
      id: Date.now().toString(),
      lat: formLatLng.lat,
      lng: formLatLng.lng,
      ...details
    });
  }

  saveSpots();
  closeForm();
  renderSpots();
});

// Cancel button, or the Escape key
document.getElementById("cancel-btn").addEventListener("click", closeForm);
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape" && !panel.hidden) closeForm();
});


// ------------------------------------------------------------
// 5. ADDRESS LOOKUP WITH NOMINATIM
// ------------------------------------------------------------

// Coordinates -> address (used when you click the map)
async function reverseGeocode(latlng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latlng.lat}&lon=${latlng.lng}`;
    const response = await fetch(url);
    if (!response.ok) return "";
    const data = await response.json();
    return data.display_name || "";
  } catch (error) {
    return ""; // no address is fine; you can type it yourself
  }
}

// Address -> coordinates (used by the search box)
document.getElementById("search-form").addEventListener("submit", async function (event) {
  event.preventDefault();
  const query = document.getElementById("search-input").value.trim();
  if (!query) return;

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    const results = await response.json();

    if (!results.length) {
      alert(`No results for "${query}".`);
      return;
    }

    const place = results[0];
    const latlng = L.latLng(Number(place.lat), Number(place.lon));
    map.setView(latlng, 16);
    showDraftMarker(latlng);
    openForm(null, latlng, place.display_name);
  } catch (error) {
    alert("Search isn't working right now. Try again in a moment.");
  }
});


// ------------------------------------------------------------
// 6. CLICK THE MAP TO ADD A SPOT
// ------------------------------------------------------------

// When you click the map to close a popup, don't also start a new spot
let popupJustClosed = false;
map.on("popupclose", function () {
  popupJustClosed = true;
  setTimeout(function () { popupJustClosed = false; }, 0);
});

map.on("click", async function (event) {
  if (popupJustClosed) return; // that click was just closing a popup
  if (editingId) return;       // don't interrupt an edit in progress

  const clicked = event.latlng;
  showDraftMarker(clicked);
  openForm(null, clicked);

  // Fill in the address automatically while you start typing the name
  fields.address.placeholder = "Looking up address…";
  const address = await reverseGeocode(clicked);
  fields.address.placeholder = "";

  // Only fill it in if you're still on this same new spot and haven't typed one
  if (formLatLng && formLatLng.equals(clicked) && !fields.address.value) {
    fields.address.value = address;
  }
});
