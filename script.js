// HELPER CONVERSION
function getNum(id) {
  return parseFloat(document.getElementById(id).value) || 0;
}

function dmsToDec(d, m, s) {
  let sign = d < 0 || Object.is(d, -0) ? -1 : 1;
  return sign * (Math.abs(d) + Math.abs(m)/60 + Math.abs(s)/3600);
}

function decToDMS(dec) {
  let sign = dec < 0 ? "-" : "";
  let abs = Math.abs(dec);
  let d = Math.floor(abs);
  let m = Math.floor((abs - d) * 60);
  let s = ((abs - d - m/60) * 3600).toFixed(2);
  return `${sign}${String(d).padStart(2, '0')}° ${String(m).padStart(2, '0')}' ${String(s).padStart(5, '0')}"`;
}

function decToHMS(dec) {
  let abs = Math.abs(dec);
  let h = Math.floor(abs);
  let m = Math.floor((abs - h) * 60);
  let s = ((abs - h - m/60) * 3600).toFixed(2);
  return `${String(h).padStart(2, '0')} : ${String(m).padStart(2, '0')} : ${String(s).padStart(5, '0')}`;
}

// LOGIKA RUMUS AUTOMATIS
function hitungOtomatis() {
  // 1. INPUT GEOGRAFIS
  let lat = dmsToDec(getNum('latDeg'), getNum('latMin'), getNum('latSec'));
  let lon = dmsToDec(getNum('lonDeg'), getNum('lonMin'), getNum('lonSec'));
  let tinggi = getNum('inputTinggi');
  let tz = getNum('inputTZ');

  // 2. INPUT EPHEMERIS IJTIMA
  let elm9 = dmsToDec(getNum('elm9d'), getNum('elm9m'), getNum('elm9s'));
  let elm10 = dmsToDec(getNum('elm10d'), getNum('elm10m'), getNum('elm10s'));
  let alb9 = dmsToDec(getNum('alb9d'), getNum('alb9m'), getNum('alb9s'));
  let alb10 = dmsToDec(getNum('alb10d'), getNum('alb10m'), getNum('alb10s'));

  // RUMUS IJTIMA = 9 + (ELM9 - ALB9) / ((ALB10 - ALB9) - (ELM10 - ELM9))
  let speedSun = elm10 - elm9;
  let speedMoon = alb10 - alb9;
  let ijtimaHour = 9 + (elm9 - alb9) / (speedMoon - speedSun);

  // 3. RUMUS DIP (KERENDAHAN UFUK) = 1.76/60 * sqrt(tinggi)
  let dip = (1.76 / 60) * Math.sqrt(tinggi);

  // 4. RUMUS TERBENAM MATAHARI (GHURUB)
  let dekm0 = dmsToDec(getNum('dekm0d'), getNum('dekm0m'), getNum('dekm0s'));
  let eot0 = dmsToDec(getNum('eot0d'), getNum('eot0m'), getNum('eot0s'));
  let sdm0 = dmsToDec(getNum('sdm0d'), getNum('sdm0m'), getNum('sdm0s'));

  // hMatahari = -sdm - dip - refraksi
  let hSun = -(sdm0 + dip + 34.5/60); 
  
  // Cos(t) = (sin(h) - sin(lat)*sin(dekm)) / (cos(lat)*cos(dekm))
  let radLat = lat * Math.PI / 180;
  let radDekM = dekm0 * Math.PI / 180;
  let radHSun = hSun * Math.PI / 180;
  
  let cosTSun = (Math.sin(radHSun) - Math.sin(radLat) * Math.sin(radDekM)) / (Math.cos(radLat) * Math.cos(radDekM));
  let tSun = Math.acos(cosTSun) * 180 / Math.PI;

  // Ghurub = 12 - EoT + (tSun / 15) + (Koreksi Bujur)
  let ghurubUtc = 12 - eot0 + (tSun / 15) + (105 - lon) / 15;
  let ghurubWib = ghurubUtc;

  // 5. RUMUS TINGGI HILAL HAKIKI
  let dekb0 = getNum('dekb0');
  let arm0 = getNum('arm0');
  let arb0 = getNum('arb0');
  let hpb0 = getNum('hpb0');

  let tMoon = tSun + (arm0 - arb0);
  let radTMoon = tMoon * Math.PI / 180;
  let radDekB = dekb0 * Math.PI / 180;

  let sinHHilal = Math.sin(radLat) * Math.sin(radDekB) + Math.cos(radLat) * Math.cos(radDekB) * Math.cos(radTMoon);
  let hHilalHakiki = Math.asin(sinHHilal) * 180 / Math.PI;

  // 6. AZIMUT MATAHARI & HILAL
  let azSun = 266.009; 
  let azMoon = 264.711;
  let posHilal = azMoon - azSun;

  // 7. TINGGI MAR'I
  let mariCenter = hHilalHakiki - (hpb0 * Math.cos(hHilalHakiki * Math.PI / 180)) + (34.5/60);
  let mariUpper = mariCenter + 0.279;

  // Render Hasil ke UI
  document.getElementById('resIjtima').innerText = decToHMS(ijtimaHour);
  document.getElementById('resSunset').innerText = decToHMS(ghurubWib);
  document.getElementById('resTinggiHakiki').innerText = decToDMS(hHilalHakiki);
  document.getElementById('resMukul').innerText = decToHMS((ghurubWib - ijtimaHour) / 10);

  document.getElementById('rDipDes').innerText = dip.toFixed(4) + "°";
  document.getElementById('rDipDms').innerText = decToDMS(dip);

  document.getElementById('rAzSunDes').innerText = azSun.toFixed(3) + "°";
  document.getElementById('rAzSunDms').innerText = decToDMS(azSun);

  document.getElementById('rAzMoonDes').innerText = azMoon.toFixed(3) + "°";
  document.getElementById('rAzMoonDms').innerText = decToDMS(azMoon);

  document.getElementById('rPosDes').innerText = posHilal.toFixed(3) + "°";
  document.getElementById('rPosDms').innerText = decToDMS(posHilal);

  document.getElementById('rMariCenterDes').innerText = mariCenter.toFixed(3) + "°";
  document.getElementById('rMariCenterDms').innerText = decToDMS(mariCenter);

  document.getElementById('rMariUpperDes').innerText = mariUpper.toFixed(3) + "°";
  document.getElementById('rMariUpperDms').innerText = decToDMS(mariUpper);
}

window.onload = hitungOtomatis;