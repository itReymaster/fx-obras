const https = require('https');

const lat = -25.4290;
const lon = -49.2671;
const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&zoom=18`;

console.log('Testando Nominatim para CEP 80610240 (Curitiba, PR)...\n');

https.get(url, { headers: { 'User-Agent': 'FxObras/1.0' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const result = JSON.parse(data);
    console.log('=== Endereço retornado ===');
    console.log(JSON.stringify(result.address, null, 2));
    console.log('\n=== Resultado parseado ===');
    console.log({
      road: result.address.road,
      house_number: result.address.house_number,
      suburb: result.address.suburb,
      city: result.address.city,
      postcode: result.address.postcode,
      state_code: result.address.state_code
    });
  });
}).on('error', err => console.error('Erro:', err));
