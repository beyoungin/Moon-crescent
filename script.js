// ==========================================
// 1. HELPER FUNCTIONS & UTILITIES
// ==========================================

function getNum(id) {
  let el = document.getElementById(id);
  return el ? parseFloat(el.value) || 0 : 0;
}

function setTxt(id, txt) {
  let el = document.getElementById(id);
  if (el) el.innerText = txt;
}

function dmsToDec(d, m, s) {
  let sign = (d < 0 || Object.is(d, -0)) ? -1 : 1;
  return sign * (Math.abs(d) + Math.abs(m)/60 + Math.abs(s)/3600);
}

function decToDMS(dec) {
  if (isNaN(dec)) return "00° 00' 00.00\"";
  let sign = dec < 0 ? "-" : "";
  let abs = Math.abs(dec);
  let d = Math.floor(abs);
  let m = Math.floor((abs - d) * 60);
  let s = ((abs - d - m/60) * 3600).toFixed(2);
  return `${sign}${String(d).padStart(2, '0')}° ${String(m).padStart(2, '0')}' ${String(s).padStart(5, '0')}"`;
}

function decToHMS(dec) {
  if (isNaN(dec)) return "00 : 00 : 00";
  let abs = Math.abs(dec);
  let h = Math.floor(abs);
  let m = Math.floor((abs - h) * 60);
  let s = ((abs - h - m/60) * 3600).toFixed(2);
  return `${String(h).padStart(2, '0')} : ${String(m).padStart(2, '0')} : ${String(s).padStart(5, '0')}`;
}

const toRad = (deg) => deg * Math.PI / 180;
const toDeg = (rad) => rad * 180 / Math.PI;

// ==========================================
// 2. KONVERSI KALENDER HIJRIAH -> MASEHI
// ==========================================

function konversiHijriahKeMasehi(bulanTarget, tahunHijriah) {
  const namaHari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const namaPasaran = ["Legi", "Pahing", "Pon", "Wage", "Kliwon"];
  const namaBulanMasehi = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  // Rukyat dilakukan tanggal 29 bulan sebelumnya
  const akumulasiHariBulan = [354, 29, 59, 89, 118, 148, 177, 207, 236, 266, 295, 325];

  let bulanRukyatIdx = bulanTarget - 1;
  let hariBulan = akumulasiHariBulan[bulanRukyatIdx];

  let tahunLalu = (bulanTarget === 1) ? tahunHijriah - 2 : tahunHijriah - 1;
  let daur = Math.floor(tahunLalu / 30);
  let sisaTahun = tahunLalu % 30;

  let hariDaur = daur * 10631;
  let hariSisaTahun = sisaTahun * 354 + Math.floor((sisaTahun * 11 + 3) / 30);

  let totalHariHijriah = hariDaur + hariSisaTahun + hariBulan + 29;

  let hariIdx = (totalHariHijriah + 4) % 7;
  let pasaranIdx = (totalHariHijriah - 1) % 5;
  if (pasaranIdx < 0) pasaranIdx += 5;

  let stringHariPasaran = `${namaHari[hariIdx]} ${namaPasaran[pasaranIdx]}`;

  let jdn = totalHariHijriah + 1948439.5 + 0.5;

  let f = jdn + 1401 + Math.floor((Math.floor((4 * jdn + 274277) / 146097) * 3) / 4) - 38;
  let e = 4 * f + 3;
  let g = Math.floor((e % 1461) / 4);
  let h = 5 * g + 2;

  let day = Math.floor((h % 153) / 5) + 1;
  let month = ((Math.floor(h / 153) + 2) % 12) + 1;
  let year = Math.floor(e / 1461) - 4716 + Math.floor((12 + 2 - month) / 12);

  let mm = String(month).padStart(2, '0');
  let dd = String(day).padStart(2, '0');

  return {
    tglMasehiStr: `${year}-${mm}-${dd}`,
    tglFormatted: `${day} ${namaBulanMasehi[month - 1]} ${year} M`,
    hariPasaran: stringHariPasaran
  };
}

// ==========================================
// 3. CONTROLLER & HISAB MANUAL EPHEMERIS
// ==========================================

function hitungHisabManual(e) {
  if (e) e.preventDefault();

  let statusEl = document.getElementById('statusMsg');
  statusEl.innerText = "⏳ Memproses Perhitungan Hisab Manual...";
  statusEl.style.color = "#38bdf8";

  // A. LOKASI GEOGRAFIS (POB)
  let lat = dmsToDec(getNum('latDeg'), getNum('latMin'), getNum('latSec'));
  let lon = dmsToDec(getNum('lonDeg'), getNum('lonMin'), getNum('lonSec'));
  let tinggi = getNum('inputTinggi');
  let tz = getNum('inputTZ');

  // B. KONVERSI TANGGAL HIJRIAH
  let bulanH = parseInt(document.getElementById('bulanHijriah').value);
  let tahunH = parseInt(document.getElementById('tahunHijriah').value);

  let masehiObj = konversiHijriahKeMasehi(bulanH, tahunH);
  setTxt('resMasehi', masehiObj.tglFormatted);
  setTxt('resHariPasaran', masehiObj.hariPasaran);
  setTxt('resIjtimaKet', masehiObj.hariPasaran + ", " + masehiObj.tglFormatted);

  // C. DATA EPHEMERIS MATAHARI & BULAN DARI FORM INPUT
  let dataFalak = {
    elm11: getNum('elm11'),
    elm12: getNum('elm12'),
    alb11: getNum('alb11'),
    alb12: getNum('alb12'),
    dekm11: getNum('dekm11'),
    dekm12: getNum('dekm12'),
    arSun11: getNum('arSun11'),
    arMoon11: getNum('arMoon11'),
    dekMoon11: getNum('dekMoon11'),
    dekMoon12: getNum('dekMoon12'),
    eot11: getNum('eot11'),
    sdMoon11: getNum('sdMoon11'),
    hpMoon11: getNum('hpMoon11')
  };

  // ==========================================
  // 4. EKSEKUSI ALGORITMA HISAB 42 LANGKAH
  // ==========================================

  // 1. IJTIMA'
  let b1 = dataFalak.elm12 - dataFalak.elm11;
  let b2 = dataFalak.alb12 - dataFalak.alb11;
  let mb = dataFalak.elm11 - dataFalak.alb11;
  let sb = b2 - b1;

  let titikIjtimaHour = (sb !== 0) ? (mb / sb) : 0;
  let ijtimaUtc = 11 + titikIjtimaHour;
  let ijtimaWib = ijtimaUtc + tz;

  setTxt('resIjtima', decToHMS(ijtimaWib) + " WIB");

  // 2. DIP / KERENDAHAN UFUK
  let dip = Math.sqrt(tinggi) * 0.0293;
  setTxt('rDip', decToDMS(dip));

  // 3. ESTIMASI GHURUB MATAHARI
  let hSunEst = -(16/60 + 34.5/60 + dip);
  let radLat = toRad(lat);
  let radDekSun11 = toRad(dataFalak.dekm11);
  let radHSunEst = toRad(hSunEst);

  let cosTSunEst = (-Math.tan(radLat) * Math.tan(radDekSun11)) + (Math.sin(radHSunEst) / (Math.cos(radLat) * Math.cos(radDekSun11)));
  let tSunEst = toDeg(Math.acos(Math.max(-1, Math.min(1, cosTSunEst))));

  let ghurubUtEst = (12 - (dataFalak.eot11 / 60)) + (tSunEst / 15) - (lon / 15);

  // 4. INTERPOLASI SAAT GHURUB
  let factor = ghurubUtEst - 11;
  let dekSunGhurub = dataFalak.dekm11 + (dataFalak.dekm12 - dataFalak.dekm11) * factor;
  let sdSunGhurub = 16 / 60;

  setTxt('rDekM', decToDMS(dekSunGhurub));

  // 5. TINGGI & GHURUB MATAHARI PRESISI
  let hSunPrecision = -(sdSunGhurub + 34.5/60 + dip);
  let radDekSunPrecision = toRad(dekSunGhurub);
  let radHSunPrecision = toRad(hSunPrecision);

  let cosTSunPrec = (-Math.tan(radLat) * Math.tan(radDekSunPrecision)) + (Math.sin(radHSunPrecision) / (Math.cos(radLat) * Math.cos(radDekSunPrecision)));
  let tSunPrec = toDeg(Math.acos(Math.max(-1, Math.min(1, cosTSunPrec))));

  let ghurubUtPrec = (12 - (dataFalak.eot11 / 60)) + (tSunPrec / 15) - (lon / 15);
  let ghurubWibPrec = ghurubUtPrec + tz;

  setTxt('resSunset', decToHMS(ghurubWibPrec) + " WIB");

  // 6. INTERPOLASI BULAN SAAT GHURUB
  let factorPrec = ghurubUtPrec - 11;
  let arSunGhurub = dataFalak.arSun11;
  let arMoonGhurub = dataFalak.arMoon11;
  let dekMoonGhurub = dataFalak.dekMoon11 + (dataFalak.dekMoon12 - dataFalak.dekMoon11) * factorPrec;
  let sdMoonGhurub = dataFalak.sdMoon11;
  let hpMoonGhurub = dataFalak.hpMoon11;

  setTxt('rDekB', decToDMS(dekMoonGhurub));

  // 7. TINGGI HILAL HAKIKI
  let tMoon = arSunGhurub - arMoonGhurub + tSunPrec;
  setTxt('rTSun', decToDMS(tSunPrec));
  setTxt('rTMoon', decToDMS(tMoon));

  let radTMoon = toRad(tMoon);
  let radDekMoon = toRad(dekMoonGhurub);
  let sinHHilalHakiki = Math.sin(radLat) * Math.sin(radDekMoon) + Math.cos(radLat) * Math.cos(radDekMoon) * Math.cos(radTMoon);
  let hHilalHakiki = toDeg(Math.asin(Math.max(-1, Math.min(1, sinHHilalHakiki))));

  setTxt('rHHakiki', decToDMS(hHilalHakiki));

  // 8. PARALAKS & TINGGI MAR'I
  let paralaksMoon = Math.cos(toRad(hHilalHakiki)) * hpMoonGhurub;
  let hMoonApparentNoRef = hHilalHakiki - paralaksMoon + sdMoonGhurub;
  let refraksi = 34.5 / 60;

  let hMariUpper = hMoonApparentNoRef + refraksi + dip;
  let hMariCenter = hMariUpper - sdMoonGhurub;
  let hMariLower = hMariCenter - sdMoonGhurub;

  setTxt('resTinggiMari', decToDMS(hMariCenter));
  setTxt('rUpper', decToDMS(hMariUpper));
  setTxt('rLower', decToDMS(hMariLower));

  let badge = document.getElementById('badgeUfuk');
  let cardTinggi = document.getElementById('cardTinggi');
  if (hMariCenter >= 0) {
    if (badge) {
      badge.innerText = "Di Atas Ufuk";
      badge.style.background = "rgba(16, 185, 129, 0.2)";
      badge.style.color = "#34d399";
    }
    if (cardTinggi) cardTinggi.style.borderLeftColor = "#10b981";
  } else {
    if (badge) {
      badge.innerText = "Di Bawah Ufuk";
      badge.style.background = "rgba(239, 68, 68, 0.2)";
      badge.style.color = "#f87171";
    }
    if (cardTinggi) cardTinggi.style.borderLeftColor = "#ef4444";
  }

  // 9. AZIMUT MATAHARI & BULAN
  let tanASun = -Math.sin(radLat) / Math.tan(toRad(tSunPrec)) + Math.cos(radLat) * Math.tan(radDekSunPrecision) / Math.sin(toRad(tSunPrec));
  let aSun = toDeg(Math.atan(tanASun));
  let azSun = 270 + aSun;

  let tanAMoon = -Math.sin(radLat) / Math.tan(radTMoon) + Math.cos(radLat) * Math.tan(radDekMoon) / Math.sin(radTMoon);
  let aMoon = toDeg(Math.atan(tanAMoon));
  let azMoon = 270 + aMoon;

  let posHilal = azMoon - azSun;

  setTxt('resAzimuthSun', "Az: " + decToDMS(azSun));
  setTxt('rAzSun', decToDMS(azSun));
  setTxt('rAzMoon', decToDMS(azMoon));
  setTxt('rPosHilal', decToDMS(posHilal));

  // 10. LAMA HILAL
  let nf = toDeg(Math.asin(Math.max(-1, Math.min(1, (Math.sin(radLat) * Math.sin(radDekMoon)) / (Math.cos(radLat) * Math.cos(radDekMoon))))));
  let pnf = Math.cos(toRad(nf)) * hpMoonGhurub;
  let sbs = 90 + nf - pnf + (sdMoonGhurub + (0.575/60) + dip);

  let lagHour = (sbs - tMoon) / 15;
  let terbenamBulanWib = ghurubWibPrec + lagHour;

  setTxt('rLag', decToHMS(lagHour));
  setTxt('rTerbenamBulan', decToHMS(terbenamBulanWib) + " WIB");

  // 11. KONDISI FISIK HILAL
  let fib = 0.01;
  let nh = Math.sqrt(Math.pow(posHilal, 2) + Math.pow(hMariUpper, 2)) / 15;
  let elongasiTopo = toDeg(Math.acos(Math.max(-1, Math.min(1, Math.cos(toRad(hMariCenter + sdSunGhurub + 34.5/60)) * Math.cos(toRad(posHilal))))));
  let umurHilalHour = ghurubWibPrec - ijtimaWib;

  setTxt('rElongasiTopo', decToDMS(elongasiTopo));
  setTxt('rFib', fib.toFixed(2) + "%");
  setTxt('rNh', nh.toFixed(4) + " Jari");
  setTxt('rKeadaan', posHilal >= 0 ? "Miring ke Utara" : "Miring ke Selatan");
  setTxt('rUmurHilal', `${Math.floor(umurHilalHour)} jam ${Math.abs(Math.round((umurHilalHour % 1)*60))} menit`);

  statusEl.innerText = "✓ BERHASIL! Perhitungan Hisab Ephemeris Selesai.";
  statusEl.style.color = "#34d399";
}

window.onload = () => hitungHisabManual(null);
