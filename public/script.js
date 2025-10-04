const state = {
  vehicles: [],
  selectedVehicleId: null,
  directionsService: null,
  lastQuote: null,
  activeFilter: 'Alle',
};

const maxStops = 2;

function createAutocomplete(input) {
  if (!window.google || !google.maps) return null;
  const options = { fields: ['formatted_address', 'geometry'], types: ['geocode'] };
  return new google.maps.places.Autocomplete(input, options);
}

function buildStopField(index) {
  const wrapper = document.createElement('div');
  wrapper.className = 'stop-item';
  wrapper.dataset.index = index;

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = `Tussenstop ${index + 1}`;
  input.required = true;
  input.className = 'stop-input';

  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.textContent = 'Verwijderen';
  removeButton.addEventListener('click', () => {
    wrapper.remove();
    updateStopAutocompletes();
  });

  wrapper.appendChild(input);
  wrapper.appendChild(removeButton);
  return wrapper;
}

function updateStopAutocompletes() {
  const stopInputs = document.querySelectorAll('.stop-input');
  stopInputs.forEach((input) => createAutocomplete(input));
}

function renderVehicleFilters() {
  const container = document.getElementById('vehicle-filters');
  container.innerHTML = '';
  const categories = Array.from(new Set(state.vehicles.map((vehicle) => vehicle.category)));
  const filters = ['Alle', ...categories];

  filters.forEach((filter) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip chip--ghost';
    if (filter === state.activeFilter) button.classList.add('chip--active');
    button.textContent = filter;
    button.addEventListener('click', () => {
      state.activeFilter = filter;
      renderVehicleFilters();
      renderVehicleList();
    });
    container.appendChild(button);
  });
}

function renderVehicleList() {
  const container = document.getElementById('vehicle-list');
  container.innerHTML = '';

  const vehicles = state.vehicles.filter((vehicle) => {
    if (state.activeFilter === 'Alle') return true;
    return vehicle.category === state.activeFilter;
  });
  vehicles.sort((a, b) => {
    if (a.recommended && !b.recommended) return -1;
    if (!a.recommended && b.recommended) return 1;
    return a.baseFare - b.baseFare;
  });

  if (vehicles.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'summary__placeholder';
    empty.textContent = 'Geen voertuigen in deze categorie beschikbaar.';
    container.appendChild(empty);
    return;
  }

  vehicles.forEach((vehicle) => {
    const card = document.createElement('article');
    card.className = 'vehicle-card';
    card.dataset.vehicleId = vehicle.id;
    if (vehicle.id === state.selectedVehicleId) {
      card.classList.add('vehicle-card--active');
    }

    const img = document.createElement('img');
    img.src = vehicle.image;
    img.alt = vehicle.name;

    const body = document.createElement('div');
    body.className = 'vehicle-card__body';

    const title = document.createElement('div');
    title.className = 'vehicle-card__title';
    const heading = document.createElement('h3');
    heading.textContent = vehicle.name;
    title.appendChild(heading);

    if (vehicle.recommended) {
      const badge = document.createElement('span');
      badge.className = 'vehicle-card__badge';
      badge.textContent = 'Aanbevolen';
      title.appendChild(badge);
    }

    const meta = document.createElement('div');
    meta.className = 'vehicle-card__meta';
    meta.innerHTML = `
      <span>${vehicle.category}</span>
      <span>${vehicle.capacity} passagiers</span>
    `;

    const description = document.createElement('p');
    description.textContent = vehicle.description || '';
    description.style.margin = '0';
    description.style.color = 'var(--text-muted)';
    description.style.fontSize = '0.9rem';

    const features = document.createElement('div');
    features.className = 'vehicle-card__features';
    (vehicle.features || []).forEach((feature) => {
      const span = document.createElement('span');
      span.textContent = feature;
      features.appendChild(span);
    });

    const price = document.createElement('p');
    price.className = 'summary__price';
    price.style.fontSize = '1.35rem';
    price.style.margin = '0';
    price.textContent = `Vanaf €${vehicle.baseFare.toFixed(2)}`;

    body.appendChild(title);
    body.appendChild(meta);
    body.appendChild(description);
    body.appendChild(features);
    body.appendChild(price);

    card.appendChild(img);
    card.appendChild(body);

    card.addEventListener('click', () => {
      state.selectedVehicleId = vehicle.id;
      renderVehicleList();
    });

    container.appendChild(card);
  });

  const selectedExists = vehicles.some((vehicle) => vehicle.id === state.selectedVehicleId);
  if (!selectedExists) {
    state.selectedVehicleId = vehicles[0]?.id || null;
    if (state.selectedVehicleId) {
      renderVehicleList();
    }
  }
}

function renderSummary(quote) {
  const summary = document.getElementById('summary');
  if (!quote) {
    summary.innerHTML = `
      <h2>Samenvatting</h2>
      <p class="summary__placeholder">
        Vul je gegevens in en kies een voertuig om de ritprijs te berekenen.
      </p>`;
    return;
  }

  const baggageDetails = [
    quote.baggage.large ? `${quote.baggage.large}× grote koffer` : null,
    quote.baggage.small ? `${quote.baggage.small}× kleine koffer` : null,
    quote.baggage.hand ? `${quote.baggage.hand}× handbagage` : null,
  ]
    .filter(Boolean)
    .join(', ');

  const stops = quote.stops.length
    ? quote.stops.map((stop, index) => `<li>Tussenstop ${index + 1}: ${stop}</li>`).join('')
    : '<li>Geen tussenstops</li>';

  summary.innerHTML = `
    <h2>Samenvatting</h2>
    <p class="summary__price">€${quote.price.toFixed(2)}</p>
    <div class="summary__grid">
      <div><strong>Route</strong><br />${quote.pickup} → ${quote.destination}</div>
      <div><strong>Afstand &amp; duur</strong><br />${quote.distanceText} • ${quote.durationText}</div>
      <div><strong>Voertuig</strong><br />${quote.vehicleName}</div>
      <div><strong>Passagiers</strong><br />${quote.passengers}</div>
      <div><strong>Bagage</strong><br />${baggageDetails || 'Geen'}</div>
      <div><strong>Betaalwijze</strong><br />${quote.paymentLabel}</div>
      <div><strong>Ophaalmoment</strong><br />${quote.pickupMoment}</div>
    </div>
    <div>
      <strong>Tussenstops</strong>
      <ul>${stops}</ul>
    </div>
  `;
}

async function fetchVehicles() {
  const response = await fetch('/api/vehicles');
  if (!response.ok) throw new Error('Kon voertuigen niet laden');
  return response.json();
}

function parseDatetime(value) {
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleString('nl-NL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

async function calculateRoute(pickup, stops, destination) {
  if (!pickup || !destination) {
    throw new Error('Vul het vertrekpunt en de bestemming in.');
  }

  const request = {
    origin: pickup,
    destination,
    travelMode: google.maps.TravelMode.DRIVING,
    unitSystem: google.maps.UnitSystem.METRIC,
  };

  if (stops.length) {
    request.waypoints = stops.map((stop) => ({ location: stop, stopover: true }));
  }

  return new Promise((resolve, reject) => {
    state.directionsService.route(request, (result, status) => {
      if (status !== 'OK') {
        reject(new Error('Route kon niet berekend worden. Controleer de adressen.'));
        return;
      }
      const { legs } = result.routes[0];
      const total = legs.reduce(
        (acc, leg) => {
          acc.distanceMeters += leg.distance.value;
          acc.durationSeconds += leg.duration.value;
          return acc;
        },
        { distanceMeters: 0, durationSeconds: 0 }
      );

      const distanceText = legs.map((leg) => leg.distance.text).join(' + ');
      const durationText = legs.map((leg) => leg.duration.text).join(' + ');

      resolve({
        distanceMeters: total.distanceMeters,
        durationSeconds: total.durationSeconds,
        distanceText,
        durationText,
      });
    });
  });
}

function formatDistance(distanceMeters) {
  if (distanceMeters < 1000) {
    return `${distanceMeters} m`;
  }
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

function formatDuration(durationSeconds) {
  const minutes = Math.round(durationSeconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours} u ${remainingMinutes} min`;
}

function calculatePricePreview({ vehicle, distanceMeters, durationSeconds, extraStops, baggage, returnTrip, paymentMethod, immediatePickup }) {
  if (!vehicle) return 0;
  const distanceKm = distanceMeters / 1000;
  const durationMin = durationSeconds / 60;

  let price = vehicle.baseFare + vehicle.perKm * distanceKm + vehicle.perMin * durationMin;

  if (extraStops > 0) {
    price += extraStops * (vehicle.extraStopFee || 0);
  }

  ['large', 'small', 'hand'].forEach((type) => {
    const requested = Number(baggage[type] || 0);
    const allowance = Number(vehicle.luggageIncluded?.[type] || 0);
    const extraBags = Math.max(0, requested - allowance);
    price += extraBags * (vehicle.extraPerBag?.[type] || 0);
  });

  if (returnTrip) {
    price *= vehicle.returnMultiplier || 2;
  }

  const surcharges = vehicle.paymentSurcharges || {};
  price += surcharges[paymentMethod] || 0;

  if (immediatePickup) {
    price += vehicle.immediatePickupFee || 0;
  }

  return Math.round(price * 100) / 100;
}

function getPaymentLabel(value) {
  switch (value) {
    case 'contant':
      return 'Contant';
    case 'pin':
      return 'Pin (in de wagen)';
    case 'stripe':
      return 'Stripe (iDEAL & creditcards)';
    default:
      return value;
  }
}

async function onSubmit(event) {
  event.preventDefault();
  if (!state.selectedVehicleId) {
    alert('Kies eerst een voertuig.');
    return;
  }

  const pickup = document.getElementById('pickup').value.trim();
  const destination = document.getElementById('destination').value.trim();
  const stopInputs = Array.from(document.querySelectorAll('.stop-input'));
  const stops = stopInputs.map((input) => input.value.trim()).filter(Boolean);

  const passengers = Number(document.getElementById('passengers').value);
  const baggage = {
    large: Number(document.getElementById('baggage-large').value),
    small: Number(document.getElementById('baggage-small').value),
    hand: Number(document.getElementById('baggage-hand').value),
  };
  const returnTrip = document.getElementById('return-trip').checked;
  const pickupDatetime = document.getElementById('pickup-datetime').value;
  const flight = document.getElementById('flight').value.trim();
  const name = document.getElementById('name').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const email = document.getElementById('email').value.trim();
  const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
  const immediatePickup = document.getElementById('pickup-datetime').dataset.asap === 'true';

  const vehicle = state.vehicles.find((item) => item.id === state.selectedVehicleId);
  if (!vehicle) {
    alert('Voertuig niet gevonden. Probeer opnieuw.');
    return;
  }

  if (passengers > Number(vehicle.capacity || 0)) {
    alert(`Het geselecteerde voertuig heeft plaats voor maximaal ${vehicle.capacity} passagiers.`);
    return;
  }
  const pickupMomentLabel = immediatePickup
    ? 'Zo snel mogelijk'
    : parseDatetime(pickupDatetime) || 'Zo snel mogelijk';

  try {
    document.getElementById('confirm-booking').disabled = true;
    const route = await calculateRoute(pickup, stops, destination);

    const price = calculatePricePreview({
      vehicle,
      distanceMeters: route.distanceMeters,
      durationSeconds: route.durationSeconds,
      extraStops: stops.length,
      baggage,
      returnTrip,
      paymentMethod,
      immediatePickup,
    });

    const quote = {
      pickup,
      destination,
      stops,
      passengers,
      baggage,
      returnTrip,
      pickupMoment: pickupMomentLabel,
      flight,
      name,
      phone,
      email,
      paymentMethod,
      paymentLabel: getPaymentLabel(paymentMethod),
      vehicleId: vehicle.id,
      vehicleName: vehicle.name,
      distanceMeters: route.distanceMeters,
      durationSeconds: route.durationSeconds,
      distanceText: formatDistance(route.distanceMeters),
      durationText: formatDuration(route.durationSeconds),
      price,
      immediatePickup,
    };

    state.lastQuote = quote;
    renderSummary(quote);
    document.getElementById('confirm-booking').disabled = false;
  } catch (error) {
    alert(error.message);
  }
}

async function confirmBooking() {
  if (!state.lastQuote) return;
  const button = document.getElementById('confirm-booking');
  button.disabled = true;
  button.textContent = 'Wordt verzonden…';

  try {
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pickup: state.lastQuote.pickup,
        destination: state.lastQuote.destination,
        stops: state.lastQuote.stops,
        passengers: state.lastQuote.passengers,
        baggage: state.lastQuote.baggage,
        returnTrip: state.lastQuote.returnTrip,
        pickupMoment: state.lastQuote.pickupMoment,
        pickupDatetime: document.getElementById('pickup-datetime').value,
        flight: state.lastQuote.flight,
        name: state.lastQuote.name,
        phone: state.lastQuote.phone,
        email: state.lastQuote.email,
        paymentMethod: state.lastQuote.paymentMethod,
        vehicleId: state.lastQuote.vehicleId,
        distanceMeters: state.lastQuote.distanceMeters,
        durationSeconds: state.lastQuote.durationSeconds,
        extraStops: state.lastQuote.stops.length,
        baggage: state.lastQuote.baggage,
        immediatePickup: state.lastQuote.immediatePickup,
      }),
    });

    if (!response.ok) {
      throw new Error('Boeking kon niet opgeslagen worden.');
    }

    const saved = await response.json();
    renderSummary({ ...state.lastQuote, price: saved.price });
    alert('Je boeking is bevestigd! Een bevestiging is verstuurd.');
    state.lastQuote = null;
    document.getElementById('booking-form').reset();
    document.getElementById('pickup-datetime').dataset.asap = 'false';
    document.getElementById('stops-container').innerHTML = '';
    updateStopAutocompletes();
    document.getElementById('confirm-booking').disabled = true;
  } catch (error) {
    alert(error.message);
  } finally {
    button.textContent = 'Boeking bevestigen';
  }
}

function togglePricingPanel() {
  const panel = document.getElementById('pricing-panel');
  const toggle = document.getElementById('toggle-pricing-panel');
  const isHidden = panel.hasAttribute('hidden');
  if (isHidden) {
    panel.removeAttribute('hidden');
    toggle.textContent = 'Tarieven sluiten';
  } else {
    panel.setAttribute('hidden', '');
    toggle.textContent = 'Tarieven beheren';
  }
}

function renderPricingPanel() {
  const container = document.getElementById('pricing-panel-content');
  container.innerHTML = '';

  state.vehicles.forEach((vehicle) => {
    const form = document.createElement('form');
    form.className = 'pricing-form';
    form.dataset.vehicleId = vehicle.id;

    const title = document.createElement('h4');
    title.textContent = `${vehicle.name} • ${vehicle.category}`;
    form.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'pricing-form__grid';

    const fields = [
      { label: 'Basisprijs (€)', key: 'baseFare', step: '0.5' },
      { label: 'Prijs per km (€)', key: 'perKm', step: '0.1' },
      { label: 'Prijs per minuut (€)', key: 'perMin', step: '0.05' },
      { label: 'Tussenstop toeslag (€)', key: 'extraStopFee', step: '0.5' },
      { label: 'Retour multiplier', key: 'returnMultiplier', step: '0.05' },
    ];

    fields.forEach(({ label, key, step }) => {
      const wrapper = document.createElement('label');
      wrapper.textContent = label;
      const input = document.createElement('input');
      input.type = 'number';
      input.step = step;
      input.min = '0';
      input.value = vehicle[key];
      input.name = key;
      wrapper.appendChild(input);
      grid.appendChild(wrapper);
    });

    const baggageWrapper = document.createElement('div');
    baggageWrapper.className = 'pricing-form__grid';

    ['large', 'small', 'hand'].forEach((type) => {
      const label = document.createElement('label');
      label.textContent = `Extra bagage (${type}) €`;
      const input = document.createElement('input');
      input.type = 'number';
      input.step = '0.5';
      input.min = '0';
      input.name = `extraPerBag.${type}`;
      input.value = vehicle.extraPerBag?.[type] ?? 0;
      label.appendChild(input);
      baggageWrapper.appendChild(label);
    });

    grid.appendChild(baggageWrapper);

    form.appendChild(grid);

    const button = document.createElement('button');
    button.type = 'submit';
    button.textContent = 'Opslaan';
    form.appendChild(button);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const payload = {};
      formData.forEach((value, key) => {
        if (key.includes('extraPerBag')) {
          const [, bagType] = key.split('.');
          payload.extraPerBag = payload.extraPerBag || { ...vehicle.extraPerBag };
          payload.extraPerBag[bagType] = Number(value);
        } else {
          payload[key] = Number(value);
        }
      });

      try {
        const response = await fetch(`/api/vehicles/${vehicle.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error('Kon tarieven niet opslaan');
        const updated = await response.json();
        state.vehicles = state.vehicles.map((item) => (item.id === updated.id ? updated : item));
        renderVehicleFilters();
        renderVehicleList();
        alert('Tarieven bijgewerkt');
      } catch (error) {
        alert(error.message);
      }
    });

    container.appendChild(form);
  });
}

function initForm() {
  const form = document.getElementById('booking-form');
  form.addEventListener('submit', onSubmit);
  document.getElementById('confirm-booking').addEventListener('click', confirmBooking);
  document.getElementById('toggle-pricing-panel').addEventListener('click', togglePricingPanel);
  document.getElementById('add-stop').addEventListener('click', () => {
    const container = document.getElementById('stops-container');
    const currentStops = container.querySelectorAll('.stop-item').length;
    if (currentStops >= maxStops) {
      alert(`Je kunt maximaal ${maxStops} tussenstops toevoegen.`);
      return;
    }
    const stopField = buildStopField(currentStops);
    container.appendChild(stopField);
    updateStopAutocompletes();
  });

  document.getElementById('pickup-datetime').addEventListener('change', (event) => {
    event.target.dataset.asap = 'false';
  });

  document.getElementById('asap').addEventListener('click', () => {
    const input = document.getElementById('pickup-datetime');
    input.value = new Date().toISOString().slice(0, 16);
    input.dataset.asap = 'true';
  });

  createAutocomplete(document.getElementById('pickup'));
  createAutocomplete(document.getElementById('destination'));
  updateStopAutocompletes();

  document.getElementById('current-year').textContent = new Date().getFullYear();
}

async function initialiseVehicles() {
  try {
    state.vehicles = await fetchVehicles();
    renderVehicleFilters();
    renderVehicleList();
    renderPricingPanel();
  } catch (error) {
    console.error(error);
    alert('Kon voertuigen niet laden. Probeer het later opnieuw.');
  }
}

async function initBookingApp() {
  state.directionsService = new google.maps.DirectionsService();
  initForm();
  await initialiseVehicles();
}

window.initBookingApp = initBookingApp;
