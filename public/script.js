document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('booking-form');
  const summary = document.getElementById('summary');

  const autocompleteOptions = { types: ['geocode'] };
  new google.maps.places.Autocomplete(document.getElementById('pickup'), autocompleteOptions);
  new google.maps.places.Autocomplete(document.getElementById('destination'), autocompleteOptions);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      pickup: document.getElementById('pickup').value,
      destination: document.getElementById('destination').value,
      date: document.getElementById('date').value,
      time: document.getElementById('time').value,
      passengers: document.getElementById('passengers').value,
      baggage: document.getElementById('baggage').value,
      flight: document.getElementById('flight').value,
      name: document.getElementById('name').value,
      phone: document.getElementById('phone').value,
      email: document.getElementById('email').value,
      tripType: document.getElementById('tripType').value
    };

    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    summary.innerHTML = `<h3>Summary</h3>
      <p>From: ${result.pickup}</p>
      <p>To: ${result.destination}</p>
      <p>Price: €${result.price}</p>`;
  });
});
