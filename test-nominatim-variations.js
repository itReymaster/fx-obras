const https = require('https');

// Testando variações de coordenadas em volta de Curitiba
const coords = [
  { lat: -25.4290, lon: -49.2671, desc: 'Teste original' },
  { lat: -25.4295, lon: -49.2675, desc: 'Variação 1' },
  { lat: -25.4285, lon: -49.2670, desc: 'Variação 2' },
  { lat: -25.4300, lon: -49.2680, desc: 'Variação 3' }
];

let tested = 0;

coords.forEach((point, index) => {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${point.lat}&lon=${point.lon}&format=json&addressdetails=1&zoom=18`;

  setTimeout(() => {
    https.get(url, { headers: { 'User-Agent': 'FxObras/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const result = JSON.parse(data);
        const addr = result.address;
        console.log(`\n📍 ${point.desc} (${point.lat}, ${point.lon})`);
        console.log(`   Rua: ${addr.road || '❌ N/A'}`);
        console.log(`   Número: ${addr.house_number || '❌ N/A'}`);
        console.log(`   Bairro: ${addr.suburb || '❌ N/A'}`);
        console.log(`   CEP: ${addr.postcode || '❌ N/A'}`);
      });
    }).on('error', err => console.error('Erro:', err));
  }, index * 1500); // 1.5s delay between requests
});
