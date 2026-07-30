export default async function handler(req, res) {
  // Izinkan CORS agar frontend Anda bisa mengakses API ini
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { command, start, stop } = req.query;

  if (!command || !start || !stop) {
    return res.status(400).json({ error: 'Parameter command, start, dan stop wajib diisi' });
  }

  const url = `https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND='${command}'&MAKE_EPHEM='YES'&EPHEM_TYPE='OBSERVER'&CENTER='500@399'&START_TIME='${start}'&STOP_TIME='${stop}'&STEP_SIZE='1h'&QUANTITIES='1,4,13,20,24'&ANG_FORMAT='DEG'`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Gagal mengambil data dari NASA JPL' });
  }
}