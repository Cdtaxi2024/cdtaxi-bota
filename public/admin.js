async function loadBookings() {
  const tableBody = document.querySelector('#booking-table tbody');
  tableBody.innerHTML = '<tr><td colspan="5">Laden…</td></tr>';
  try {
    const response = await fetch('/api/bookings');
    if (!response.ok) throw new Error();
    const bookings = await response.json();
    if (!bookings.length) {
      tableBody.innerHTML = '<tr><td colspan="5">Nog geen reserveringen.</td></tr>';
      return;
    }
    tableBody.innerHTML = '';
    bookings
      .slice()
      .reverse()
      .forEach((booking) => {
        const row = document.createElement('tr');
        const pickupMoment = booking.pickupMoment || booking.pickupDatetime || '';
        const routeStops = (booking.stops || []).map((stop, index) => `<br />Stop ${index + 1}: ${stop}`).join('');
        row.innerHTML = `
          <td>
            <strong>${new Date(booking.createdAt || Date.now()).toLocaleDateString('nl-NL')}</strong><br />
            <span>${pickupMoment}</span>
          </td>
          <td>
            <strong>${booking.name || '-'}</strong><br />
            <span>${booking.phone || ''}</span>
          </td>
          <td>
            ${booking.pickup} → ${booking.destination}
            ${routeStops}
          </td>
          <td>${booking.vehicleName || booking.vehicleId || ''}</td>
          <td>€${Number(booking.price || 0).toFixed(2)}</td>
        `;
        tableBody.appendChild(row);
      });
  } catch (error) {
    tableBody.innerHTML = '<tr><td colspan="5">Kon reserveringen niet laden.</td></tr>';
  }
}

async function loadVehicles() {
  const container = document.getElementById('admin-pricing');
  container.innerHTML = '<p>Tariefgegevens laden…</p>';
  try {
    const response = await fetch('/api/vehicles');
    if (!response.ok) throw new Error();
    const vehicles = await response.json();
    container.innerHTML = '';

    vehicles.forEach((vehicle) => {
      const form = document.createElement('form');
      form.className = 'pricing-form';
      form.dataset.vehicleId = vehicle.id;

      const title = document.createElement('h4');
      title.textContent = `${vehicle.name} (${vehicle.category})`;
      form.appendChild(title);

      const grid = document.createElement('div');
      grid.className = 'pricing-form__grid';

      const fields = [
        { label: 'Basisprijs (€)', key: 'baseFare', step: '0.5' },
        { label: 'Per kilometer (€)', key: 'perKm', step: '0.1' },
        { label: 'Per minuut (€)', key: 'perMin', step: '0.05' },
        { label: 'Tussenstop toeslag (€)', key: 'extraStopFee', step: '0.5' },
        { label: 'Retour multiplier', key: 'returnMultiplier', step: '0.05' },
      ];

      fields.forEach(({ label, key, step }) => {
        const wrapper = document.createElement('label');
        wrapper.textContent = label;
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.step = step;
        input.value = vehicle[key];
        input.name = key;
        wrapper.appendChild(input);
        grid.appendChild(wrapper);
      });

      ['large', 'small', 'hand'].forEach((type) => {
        const wrapper = document.createElement('label');
        wrapper.textContent = `Extra bagage (${type}) €`;
        const input = document.createElement('input');
        input.type = 'number';
        input.name = `extraPerBag.${type}`;
        input.min = '0';
        input.step = '0.5';
        input.value = vehicle.extraPerBag?.[type] ?? 0;
        wrapper.appendChild(input);
        grid.appendChild(wrapper);
      });

      form.appendChild(grid);

      const button = document.createElement('button');
      button.type = 'submit';
      button.textContent = 'Opslaan';
      form.appendChild(button);

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = new FormData(form);
        const payload = {};
        data.forEach((value, key) => {
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
          if (!response.ok) throw new Error();
          await response.json();
          button.textContent = 'Opgeslagen!';
          setTimeout(() => (button.textContent = 'Opslaan'), 1500);
        } catch (error) {
          button.textContent = 'Mislukt';
          button.disabled = true;
          setTimeout(() => {
            button.textContent = 'Opslaan';
            button.disabled = false;
          }, 2000);
        }
      });

      container.appendChild(form);
    });
  } catch (error) {
    container.innerHTML = '<p>Kon tarieven niet laden.</p>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadBookings();
  loadVehicles();
});
