// ============================================================
// Location Map — Phase 4
// Spots are saved in your Supabase database, so every device sees them.
// Anyone can view the map; only signed-in users can add, edit or delete.
// ============================================================


// ------------------------------------------------------------
// 1. CONNECT TO SUPABASE
// ------------------------------------------------------------

// Your project's address and public key. These are meant to be public;
// the security rules (RLS) you set up in Supabase decide what's allowed.
// Never put a "secret" or "service_role" key here.
const SUPABASE_URL = "https://agcaxcbelhfltsarolft.supabase.co";
const SUPABASE_KEY = "sb_publishable_OnTYkRGNdNVdaSIsRc54XQ_DptoDF9O";

// "db" is our connection to the database
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// The list of spots currently shown on the map
let spots = [];

// Who is signed in right now (null = a visitor who can only look)
let currentUser = null;

// Get every spot from the database.
// "async/await" means: wait for the internet to answer before continuing.
async function loadSpots() {
  const { data, error } = await db
    .from("spots")            // the table you made
    .select("*")              // all columns
    .order("created_at");     // oldest first

  if (error) {
    console.error(error);
    alert("Couldn't load your spots. Check your internet and refresh.");
    return;
  }

  spots = data;
  renderSpots();
}


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
  `;

  // Visitors only see the details. Edit/Delete appear only when you're signed in.
  if (!currentUser) return box;

  const actions = document.createElement("div");
  actions.className = "popup-actions";
  actions.innerHTML = `
    <button type="button" class="edit-btn">Edit</button>
    <button type="button" class="delete-btn">Delete</button>
  `;
  box.appendChild(actions);

  // Edit: close the popup and open the form filled with this spot's details
  box.querySelector(".edit-btn").addEventListener("click", function () {
    map.closePopup();
    openForm(spot);
  });

  // Delete: ask first, then remove it from the database
  box.querySelector(".delete-btn").addEventListener("click", async function () {
    if (!confirm(`Delete "${spot.name}"?`)) return;

    const { error } = await db.from("spots").delete().eq("id", spot.id);
    if (error) {
      console.error(error);
      alert("Couldn't delete that spot. Try again.");
      return;
    }

    spots = spots.filter(function (s) { return s.id !== spot.id; });
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


// ------------------------------------------------------------
// 4. THE ADD / EDIT FORM
// ------------------------------------------------------------

const panel = document.getElementById("form-panel");
const spotForm = document.getElementById("spot-form");
const formTitle = document.getElementById("form-title");
const formCoords = document.getElementById("form-coords");
const saveButton = spotForm.querySelector("button[type=submit]");
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
  fields.address.value = spot ? (spot.address || "") : (address || "");
  fields.parking.value = spot ? (spot.parking || "") : "";
  fields.hours.value = spot ? (spot.hours || "") : "";
  fields.notes.value = spot ? (spot.notes || "") : "";
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

// Save button: sends the spot to the database
spotForm.addEventListener("submit", async function (event) {
  event.preventDefault(); // stop the browser from reloading the page

  const details = {
    name: fields.name.value.trim(),
    address: fields.address.value.trim(),
    parking: fields.parking.value.trim(),
    hours: fields.hours.value.trim(),
    notes: fields.notes.value.trim()
  };

  // Stop double-clicks from saving twice while we wait
  saveButton.disabled = true;
  saveButton.textContent = "Saving…";

  let result;
  if (editingId) {
    // Update the existing row, and get the updated row back
    result = await db.from("spots").update(details).eq("id", editingId).select().single();
  } else {
    // Insert a new row; the database creates its id and created_at
    result = await db
      .from("spots")
      .insert({ ...details, lat: formLatLng.lat, lng: formLatLng.lng })
      .select()
      .single();
  }

  saveButton.disabled = false;
  saveButton.textContent = "Save";

  if (result.error) {
    console.error(result.error);
    alert("Couldn't save that spot. Try again.");
    return; // keep the form open so nothing you typed is lost
  }

  const saved = result.data;
  if (editingId) {
    spots = spots.map(function (s) { return s.id === saved.id ? saved : s; });
  } else {
    spots.push(saved);
  }

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

    // Visitors can search to look around, but only you can add a spot
    if (!currentUser) return;

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
  if (!currentUser) return;     // only signed-in users can add spots
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


// ------------------------------------------------------------
// 7. SIGN IN AND SIGN OUT
// ------------------------------------------------------------

const loginBtn = document.getElementById("login-btn");
const loginPanel = document.getElementById("login-panel");
const loginForm = document.getElementById("login-form");
const loginEmail = document.getElementById("login-email");
const loginPassword = document.getElementById("login-password");
const loginError = document.getElementById("login-error");

// Runs whenever someone signs in or out, and once when the page loads
function setUser(user) {
  currentUser = user;
  loginBtn.textContent = user ? "Sign out" : "Sign in";

  // Close anything that only makes sense in the other state
  if (!user) closeForm();
  map.closePopup(); // popups rebuild next time, with or without Edit/Delete
}

function openLogin() {
  closeForm();
  loginError.hidden = true;
  loginForm.reset();
  loginPanel.hidden = false;
  loginEmail.focus();
}

function closeLogin() {
  loginPanel.hidden = true;
}

// Top-bar button: signs out if you're signed in, otherwise opens the sign-in form
loginBtn.addEventListener("click", async function () {
  if (currentUser) {
    await db.auth.signOut();
  } else {
    openLogin();
  }
});

// Sign-in form
loginForm.addEventListener("submit", async function (event) {
  event.preventDefault();
  loginError.hidden = true;

  const { error } = await db.auth.signInWithPassword({
    email: loginEmail.value.trim(),
    password: loginPassword.value
  });

  if (error) {
    loginError.textContent = "Wrong email or password.";
    loginError.hidden = false;
    return;
  }

  closeLogin();
});

document.getElementById("login-cancel").addEventListener("click", closeLogin);
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape" && !loginPanel.hidden) closeLogin();
});


// ------------------------------------------------------------
// 8. START: check if you're already signed in, then load spots
// ------------------------------------------------------------

async function start() {
  // Supabase remembers your sign-in, so you don't have to log in every visit
  const { data } = await db.auth.getSession();
  setUser(data.session ? data.session.user : null);

  // Keep the page in sync if you sign in or out later
  db.auth.onAuthStateChange(function (_event, session) {
    setUser(session ? session.user : null);
  });

  loadSpots();
}

start();
