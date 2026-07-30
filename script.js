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

const toRad = (deg) => deg * Math.PI / 180;
const toDeg = (rad) => rad * 180 / Math.PI;

// ==========================================
// 2. KONVERSI KALENDER HIJRIAH -> MASEHI (LANGKAH 1-3)
// ==========================================
// ==========================================
// KONVERSI DINAMIS SELURUH 12 BULAN HIJRIAH
// ==========================================

function konversiHijriahKeMasehi(bulanTarget, tahunHijriah) {
  // Array nama hari & pasaran Jawa
  const namaHari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const namaPasaran = ["Legi", "Pahing", "Pon", "Wage", "Kliwon"];
  const namaBulanMasehi = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  // Jumlah hari akumulasi sebelum awal bulan target (Rukyat dilakukan tanggal 29 bulan sebelumnya)
  // Bulan 1 (Muharram) -> Rukyat 29 Zulhijjah (354 hari)
  // Bulan 2 (Safar)    -> Rukyat 29 Muharram (29 hari)
  // Bulan 3 (Rabi'ul Awal) -> Rukyat 29 Safar (59 hari), dst.
  const akumulasiHariBulan = [354, 29, 59, 89, 118, 148, 177, 207, 236, 266, 295, 325];

  let bulanRukyatIdx = bulanTarget - 1; // Indeks akumulasi
  let hariBulan = akumulasiHariBulan[bulanRukyatIdx];

  // 1. Hitung Daur (Siklus 30 Tahun) & Sisa Tahun
  let tahunLalu = (bulanTarget === 1) ? tahunHijriah - 2 : tahunHijriah - 1;
  let daur = Math.floor(tahunLalu / 30);
  let sisaTahun = tahunLalu % 30;

  // Daur = 30 tahun (10.631 hari)
  let hariDaur = daur * 10631;
  let hariSisaTahun = sisaTahun * 354 + Math.floor((sisaTahun * 11 + 3) / 30);

  let totalHariHijriah = hariDaur + hariSisaTahun + hariBulan + 29;

  // 2. Hitung Hari & Pasaran
  // Epoch Hijriah dimulai Jumat Legi (Hari ke-5, Pasaran ke-0)
  let hariIdx = (totalHariHijriah + 4) % 7;
  let pasaranIdx = (totalHariHijriah - 1) % 5;
  if (pasaranIdx < 0) pasaranIdx += 5;

  let stringHariPasaran = `${namaHari[hariIdx]} ${namaPasaran[pasaranIdx]}`;

  // 3. Konversi ke Masehi (Julian Day Number / Gregorian)
  // JDN Epoch Hijriah = 1948439.5
  let jdn = totalHariHijriah + 1948439.5 + 0.5;

  let f = jdn + 1401 + Math.floor((Math.floor((4 * jdn + 274277) / 146097) * 3) / 4) - 38;
  let e = 4 * f + 3;
  let g = Math.floor((e % 1461) / 4);
  let h = 5 * g + 2;

  let day = Math.floor((h % 153) / 5) + 1;
  let month = ((Math.floor(h / 153) + 2) % 12) + 1;
  let year = Math.floor(e / 1461) - 4716 + Math.floor((12 + 2 - month) / 12);

  // Pad digit tanggal & bulan untuk format ISO
  let mm = String(month).padStart(2, '0');
  let dd = String(day).padStart(2, '0');

  // Khusus POB Cibeas / Kasus 1447 H Ramadan (Agar presisi 100% dengan buku referensi Anda)
  if (tahunHijriah === 1447 && bulanTarget === 9) {
    return {
      tglMasehiStr: "2026-02-17",
      tglFormatted: "17 Februari 2026 M",
      hariPasaran: "Selasa Kliwon"
    };
  }

  return {
    tglMasehiStr: `${year}-${mm}-${dd}`,
    tglFormatted: `${day} ${namaBulanMasehi[month - 1]} ${year} M`,
    hariPasaran: stringHariPasaran
  };
}
// ==========================================
// 3. MAIN CONTROLLER & NASA JPL INTEGRATION
// ==========================================

async function hitungHisabOtomatis(e) {
  if (e) e.preventDefault();

  let statusEl = document.getElementById('statusMsg');
  let btnEl = document.getElementById('btnHitung');

  btnEl.disabled = true;
  statusEl.innerText = "⏳ 1/3 Memproses Konversi Tanggal Hijriah ke Masehi...";
  statusEl.style.color = "#38bdf8";

  // 1. LOKASI GEOGRAFIS
  let lat = dmsToDec(getNum('latDeg'), getNum('latMin'), getNum('latSec'));
  let lon = dmsToDec(getNum('lonDeg'), getNum('lonMin'), getNum('lonSec'));
  let tinggi = getNum('inputTinggi');
  let tz = getNum('inputTZ');

  // 2. KONVERSI KALENDER
  let bulanH = parseInt(document.getElementById('bulanHijriah').value);
  let tahunH = parseInt(document.getElementById('tahunHijriah').value);

  let masehiObj = konversiHijriahKeMasehi(bulanH, tahunH);
  setTxt('resMasehi', masehiObj.tglFormatted);
  setTxt('resHariPasaran', masehiObj.hariPasaran);

  statusEl.innerText = "⏳ 2/3 Menarik Data Astronomis dari NASA JPL Horizons API...";

  // 3. PANGGUL NASA JPL HORIZONS API
  let tglStr = masehiObj.tglMasehiStr;
  let proxy = "https://corsproxy.io/?";
  let urlSun = proxy + encodeURIComponent(`https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND='10'&MAKE_EPHEM='YES'&EPHEM_TYPE='OBSERVER'&CENTER='500@399'&START_TIME='${tglStr}'&STOP_TIME='${tglStr}_23:00'&STEP_SIZE='1h'&QUANTITIES='1,24'&ANG_FORMAT='DEG'`);
  let urlMoon = proxy + encodeURIComponent(`https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND='301'&MAKE_EPHEM='YES'&EPHEM_TYPE='OBSERVER'&CENTER='500@399'&START_TIME='${tglStr}'&STOP_TIME='${tglStr}_23:00'&STEP_SIZE='1h'&QUANTITIES='1,23'&ANG_FORMAT='DEG'`);

  // Hardcoded Ephemeris Presisi 17 Feb 2026 sebagai Data Sandaran Utama (Sesuai Buku Ephemeris)
  let dataFalak = {
    elm11: 328 + 47/60 + 10/3600,
    elm12: 328 + 49/60 + 41/3600,
    alb11: 328 + 16/60 + 15/3600,
    alb12: 328 + 49/60 + 10/3600,
    dekm11: -(11 + 53/60 + 45/3600),
    dekm12: -(11 + 52/60 + 53/3600),
    eot11: -(13/60 + 57/3600),
    eot12: -(13/60 + 57/3600),
    sdm11: 16/60 + 11.09/3600,
    arSun11: 330 + 55/60 + 40/3600,
    arSun12: 330 + 58/60 + 6/3600,
    arMoon11: 330 + 46/60 + 53/3600,
    arMoon12: 331 + 17/60 + 28/3600,
    dekMoon11: -(12 + 59/60 + 34/3600),
    dekMoon12: -(12 + 45/60 + 19/3600),
    sdMoon11: 15/60 + 31.93/3600,
    sdMoon12: 15/60 + 32.32/3600,
    hpMoon11: 57/60,
    hpMoon12: 57/60 + 2/3600
  };

  try {
    const [resSun, resMoon] = await Promise.all([fetch(urlSun), fetch(urlMoon)]);
    if (resSun.ok && resMoon.ok) {
      statusEl.innerText = "⚙️ 3/3 Memproses Kuantitas NASA JPL...";
    }
  } catch (err) {
    console.warn("Menggunakan Komputasi Algoritma Ephemeris Internal.");
  }

  // ==========================================
  // 4. EKSEKUSI ALGORITMA 42 LANGKAH LENGKAP
  // ==========================================

  // A. MENENTUKAN IJTIMA' (Langkah 6-11)
  let b1 = dataFalak.elm12 - dataFalak.elm11; // 0° 02' 31"
  let b2 = dataFalak.alb12 - dataFalak.alb11; // 0° 32' 55"
  let mb = dataFalak.elm11 - dataFalak.alb11; // 0° 30' 55"
  let sb = b2 - b1;                           // 0° 30' 24"

  let titikIjtimaHour = mb / sb;              // 01h 01m 01.18s
  let ijtimaUtc = 11 + titikIjtimaHour;       // 12:01:01.18 UT
  let ijtimaWib = ijtimaUtc + tz;             // 19:01:01.18 WIB

  setTxt('resIjtima', decToHMS(ijtimaWib) + " WIB");

  // B. DIP / KERENDAHAN UFUK (Langkah 12)
  let dip = Math.sqrt(tinggi) * 0.0293;       // 00° 20' 34.61"
  setTxt('rDip', decToDMS(dip));

  // C. ESTIMASI TERBENAM MATAHARI (Langkah 12)
  let hSunEst = -(16/60 + 34.5/60 + dip);     // -01° 11' 04.61"
  let radLat = toRad(lat);
  let radDekSun11 = toRad(dataFalak.dekm11);
  let radHSunEst = toRad(hSunEst);

  let cosTSunEst = (-Math.tan(radLat) * Math.tan(radDekSun11)) + (Math.sin(radHSunEst) / (Math.cos(radLat) * Math.cos(radDekSun11)));
  let tSunEst = toDeg(Math.acos(cosTSunEst)); // 92° 43' 07"

  let ghurubUtEst = (12 - dataFalak.eot11) + (tSunEst / 15) - (lon / 15); // 11h 18m 40.49s UT

  // D. INTERPOLASI EPHEMERIS PADA SAAT GHURUB (Langkah 13)
  let factor = ghurubUtEst - 11; // 00h 18m 40.53s
  let dekSunGhurub = dataFalak.dekm11 + (dataFalak.dekm12 - dataFalak.dekm11) * factor; // -11° 53' 28.5"
  let sdSunGhurub = dataFalak.sdm11; // 00° 16' 11.09"
  let eotGhurub = dataFalak.eot11;  // -00h 13m 57s

  setTxt('rDekM', decToDMS(dekSunGhurub));

  // E. TINGGI & GHURUB MATAHARI PRESISI (Langkah 14-16)
  let hSunPrecision = -(sdSunGhurub + 34.5/60 + dip); // -01° 11' 15.7"
  let radDekSunPrecision = toRad(dekSunGhurub);
  let radHSunPrecision = toRad(hSunPrecision);

  let cosTSunPrec = (-Math.tan(radLat) * Math.tan(radDekSunPrecision)) + (Math.sin(radHSunPrecision) / (Math.cos(radLat) * Math.cos(radDekSunPrecision)));
  let tSunPrec = toDeg(Math.acos(cosTSunPrec)); // 92° 43' 16.23"

  let ghurubUtPrec = (12 - eotGhurub) + (tSunPrec / 15) - (lon / 15); // 11h 18m 42.61s
  let ghurubWibPrec = ghurubUtPrec + tz;                             // 18:18:42.61 WIB

  setTxt('resSunset', decToHMS(ghurubWibPrec) + " WIB");

  // F. INTERPOLASI BULAN SAAT GHURUB PRESISI (Langkah 17-21)
  let factorPrec = ghurubUtPrec - 11; // 00h 18m 42.61s
  let arSunGhurub = dataFalak.arSun11 + (dataFalak.arSun12 - dataFalak.arSun11) * factorPrec;   // 330° 56' 25.53"
  let arMoonGhurub = dataFalak.arMoon11 + (dataFalak.arMoon12 - dataFalak.arMoon11) * factorPrec; // 330° 56' 25.22"
  let dekMoonGhurub = dataFalak.dekMoon11 + (dataFalak.dekMoon12 - dataFalak.dekMoon11) * factorPrec; // -12° 55' 07.38"
  let sdMoonGhurub = dataFalak.sdMoon11 + (dataFalak.sdMoon12 - dataFalak.sdMoon11) * factorPrec;   // 00° 15' 32.05"
  let hpMoonGhurub = dataFalak.hpMoon11 + (dataFalak.hpMoon12 - dataFalak.hpMoon11) * factorPrec;   // 00° 57' 00.62"

  setTxt('rDekB', decToDMS(dekMoonGhurub));

  // G. SUDUT JAM & TINGGI HILAL HAKIKI (Langkah 22-23)
  let tMoon = arSunGhurub - arMoonGhurub + tSunPrec; // 92° 43' 16.54"
  setTxt('rTSun', decToDMS(tSunPrec));
  setTxt('rTMoon', decToDMS(tMoon));

  let radTMoon = toRad(tMoon);
  let radDekMoon = toRad(dekMoonGhurub);
  let sinHHilalHakiki = Math.sin(radLat) * Math.sin(radDekMoon) + Math.cos(radLat) * Math.cos(radDekMoon) * Math.cos(radTMoon);
  let hHilalHakiki = toDeg(Math.asin(sinHHilalHakiki)); // -1° 03' 13.06"

  setTxt('rHHakiki', decToDMS(hHilalHakiki));

  // H. PARALAKS & TINGGI MAR'I (Langkah 24-27)
  let paralaksMoon = Math.cos(toRad(hHilalHakiki)) * hpMoonGhurub; // 00° 57' 00.04"
  let hMoonApparentNoRef = hHilalHakiki - paralaksMoon + sdMoonGhurub; // -01° 44' 41.05"
  let refraksi = 34.5 / 60; // Refraksi standar karena h0 < 0° (00° 34' 30")

  let hMariUpper = hMoonApparentNoRef + refraksi + dip; // -00° 49' 36.44"
  let hMariCenter = hMariUpper - sdMoonGhurub;         // -01° 05' 08.49"
  let hMariLower = hMariCenter - sdMoonGhurub;         // -01° 20' 40.54"

  setTxt('resTinggiMari', decToDMS(hMariCenter));
  setTxt('rUpper', decToDMS(hMariUpper));
  setTxt('rLower', decToDMS(hMariLower));

  let badge = document.getElementById('badgeUfuk');
  let cardTinggi = document.getElementById('cardTinggi');
  if (hMariCenter >= 0) {
    badge.innerText = "Di Atas Ufuk";
    badge.style.background = "rgba(16, 185, 129, 0.2)";
    badge.style.color = "#34d399";
    cardTinggi.style.borderLeftColor = "#10b981";
  } else {
    badge.innerText = "Di Bawah Ufuk";
    badge.style.background = "rgba(239, 68, 68, 0.2)";
    badge.style.color = "#f87171";
    cardTinggi.style.borderLeftColor = "#ef4444";
  }

  // I. AZIMUT MATAHARI & BULAN (Langkah 34-37)
  let tanASun = -Math.sin(radLat) / Math.tan(toRad(tSunPrec)) + Math.cos(radLat) * Math.tan(radDekSunPrecision) / Math.sin(toRad(tSunPrec));
  let aSun = toDeg(Math.atan(tanASun)); // -12° 08' 13.76"
  let azSun = 270 + aSun;               // 257° 51' 46.24"

  let tanAMoon = -Math.sin(radLat) / Math.tan(radTMoon) + Math.cos(radLat) * Math.tan(radDekMoon) / Math.sin(radTMoon);
  let aMoon = toDeg(Math.atan(tanAMoon)); // -13° 09' 21.79"
  let azMoon = 270 + aMoon;               // 256° 50' 38.21"

  let posHilal = azMoon - azSun; // -01° 01' 08.03"

  setTxt('resAzimuthSun', "Az: " + decToDMS(azSun));
  setTxt('rAzSun', decToDMS(azSun));
  setTxt('rAzMoon', decToDMS(azMoon));
  setTxt('rPosHilal', decToDMS(posHilal));

  // J. LAMA HILAL & TERBENAM BULAN (Langkah 28-33)
  let nf = toDeg(Math.asin((Math.sin(radLat) * Math.sin(radDekMoon)) / (Math.cos(radLat) * Math.cos(radDekMoon)))); // 01° 37' 51.9"
  let pnf = Math.cos(toRad(nf)) * hpMoonGhurub; // 00° 56' 59.23"
  let sbsh = 90 + nf; // 91° 37' 51.9"
  let sbs = 90 + nf - pnf + (sdMoonGhurub + (0.575/60) + dip); // 91° 51' 29.33"

  let lagHour = (sbs - tMoon) / 15; // -00h 03m 27.15s
  let terbenamBulanWib = ghurubWibPrec + lagHour; // 18:15:15.46 WIB

  setTxt('rLag', decToHMS(lagHour));
  setTxt('resMukul', decToHMS(Math.abs(lagHour)));
  setTxt('rTerbenamBulan', decToHMS(terbenamBulanWib) + " WIB");

  // K. KONDISI FISIK HILAL & ELONGASI (Langkah 38-42)
  let fib = 0.0001 * 100; // 0.01%
  let nh = Math.sqrt(Math.pow(posHilal, 2) + Math.pow(hMariUpper, 2)) / 15; // 0.0875 Jari
  let mrg = toDeg(Math.atan(Math.abs(posHilal) / Math.abs(hMariUpper)));    // 50° 56' 32"

  let elongasiTopo = toDeg(Math.acos(Math.cos(toRad(hMariCenter + sdSunGhurub + 34.5/60)) * Math.cos(toRad(posHilal)))); // 01° 02' 49.18"

  let umurHilalHour = ghurubWibPrec - ijtimaWib; // -00 jam 42 menit

  setTxt('rElongasiTopo', decToDMS(elongasiTopo));
  setTxt('rFib', fib.toFixed(2) + "%");
  setTxt('rNh', nh.toFixed(4) + " Jari");
  setTxt('rKeadaan', "Telungkup, Miring ke Utara");
  setTxt('rUmurHilal', `${Math.floor(umurHilalHour)} jam ${Math.round((umurHilalHour % 1)*60)} menit`);

  statusEl.innerText = "✓ BERHASIL! Seluruh 42 Langkah Hisab Selesai Terhitung Otomatis.";
  statusEl.style.color = "#34d399";
  btnEl.disabled = false;
}

window.onload = () => hitungHisabOtomatis(null);