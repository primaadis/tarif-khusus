/* =========================================================
   TARSUS FINDER
   DATA ENGINE
   =========================================================
   DATABASE:
   1. MASTER_KA
   2. MASTER_STASIUN
   3. MASTER_TARIF

   ATURAN:
   - 1 baris MASTER_KA    = 1 KA
   - 1 baris MASTER_STASIUN = 1 stasiun
   - 1 baris MASTER_TARIF = 1 relasi tarif khusus
   - 1 KA boleh mempunyai banyak ID_TARIF
   ========================================================= */


// =========================================================
// 1. GOOGLE SHEET
// =========================================================

const SHEET_ID = "1a4Ln_wASazV35F2M3MKZcJHEmiAV8G-0WmkMmU4Csls";

const SHEETS = {
    ka: "MASTER_KA",
    stasiun: "MASTER_STASIUN",
    tarif: "MASTER_TARIF"
};


// =========================================================
// 2. DATA GLOBAL
// =========================================================

let MASTER_KA = [];
let MASTER_STASIUN = [];
let MASTER_TARIF = [];


// =========================================================
// 3. HELPER
// =========================================================

function clean(value) {
    return String(value ?? "").trim();
}


function normalize(value) {
    return clean(value)
        .toLowerCase()
        .replace(/\s+/g, " ");
}


function normalizeStation(value) {
    return normalize(value);
}


function isActive(value) {
    const v = normalize(value);

    return (
        v === "ya" ||
        v === "aktif" ||
        v === "active" ||
        v === "true" ||
        v === "1"
    );
}


function numberValue(value) {

    const raw = clean(value);

    if (!raw || raw === "-") {
        return null;
    }

    let valueString = raw
        .toLowerCase()
        .replace(/rp/g, "")
        .replace(/\s/g, "")
        .replace(/\./g, "")
        .replace(/,/g, "");

    const number = Number(valueString);

    return Number.isFinite(number) ? number : null;
}


function formatRupiah(value) {

    if (value === null || value === undefined) {
        return "-";
    }

    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0
    }).format(value);
}


function hasFare(value) {
    return value !== null && value !== undefined && Number.isFinite(value);
}


// =========================================================
// 4. AMBIL DATA GOOGLE SHEET
// =========================================================

async function fetchSheet(sheetName) {

    const url =
        `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq` +
        `?sheet=${encodeURIComponent(sheetName)}` +
        `&tqx=out:csv`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `Gagal mengambil sheet ${sheetName}. HTTP ${response.status}`
        );
    }

    return await response.text();
}


// =========================================================
// 5. PARSER CSV
// =========================================================

function parseCSV(csv) {

    const rows = [];
    let row = [];
    let value = "";
    let insideQuotes = false;

    for (let i = 0; i < csv.length; i++) {

        const char = csv[i];
        const next = csv[i + 1];

        if (char === '"' && insideQuotes && next === '"') {

            value += '"';
            i++;
            continue;
        }

        if (char === '"') {

            insideQuotes = !insideQuotes;
            continue;
        }

        if (char === "," && !insideQuotes) {

            row.push(value);
            value = "";
            continue;
        }

        if ((char === "\n" || char === "\r") && !insideQuotes) {

            if (char === "\r" && next === "\n") {
                i++;
            }

            row.push(value);
            value = "";

            if (row.some(cell => clean(cell) !== "")) {
                rows.push(row);
            }

            row = [];
            continue;
        }

        value += char;
    }

    if (value !== "" || row.length > 0) {

        row.push(value);

        if (row.some(cell => clean(cell) !== "")) {
            rows.push(row);
        }
    }

    return rows;
}


// =========================================================
// 6. KONVERSI ROW MENJADI OBJECT
// =========================================================

function rowsToObjects(rows) {

    if (!rows || rows.length === 0) {
        return [];
    }

    const headers = rows[0].map(header =>
        clean(header)
    );

    return rows
        .slice(1)
        .map(row => {

            const obj = {};

            headers.forEach((header, index) => {
                obj[header] = clean(row[index] ?? "");
            });

            return obj;
        });
}


// =========================================================
// 7. PARSE MASTER_KA
// =========================================================

function parseMasterKA(csv) {

    const rows = parseCSV(csv);
    const data = rowsToObjects(rows);

    return data
        .map(row => {

            return {
                idKA: clean(row.ID_KA),
                namaKA: clean(row.NAMA_KA),
                aktif: clean(row.AKTIF)
            };

        })
        .filter(item =>
            item.idKA &&
            item.namaKA &&
            isActive(item.aktif)
        );
}


// =========================================================
// 8. PARSE MASTER_STASIUN
// =========================================================

function parseMasterStasiun(csv) {

    const rows = parseCSV(csv);
    const data = rowsToObjects(rows);

    return data
        .map(row => {

            return {
                idStasiun: clean(row.ID_STASIUN),
                namaStasiun: clean(row.NAMA_STASIUN),
                daopDivre: clean(row.DAOP_DIVRE),
                provinsi: clean(row.PROVINSI),
                aktif: clean(row.AKTIF)
            };

        })
        .filter(item =>
            item.idStasiun &&
            item.namaStasiun &&
            isActive(item.aktif)
        );
}


// =========================================================
// 9. PARSE MASTER_TARIF
// =========================================================

function parseMasterTarif(csv) {

    const rows = parseCSV(csv);
    const data = rowsToObjects(rows);

    return data
        .map(row => {

            const stations = [];

            // MASTER_TARIF mempunyai STASIUN_1 sampai STASIUN_15

            for (let i = 1; i <= 15; i++) {

                const station = clean(row[`STASIUN_${i}`]);

                if (station) {
                    stations.push(station);
                }
            }

            return {

                idTarif: clean(row.ID_TARIF),

                idKA: clean(row.ID_KA),

                arah: clean(row.ARAH),

                polaRelasi: clean(row.POLA_RELASI),

                stations: stations,

                eks: numberValue(row.EKS),

                bis: numberValue(row.BIS),

                eko: numberValue(row.EKO),

                status: clean(row.STATUS)

            };

        })
        .filter(item =>
            item.idTarif &&
            item.idKA &&
            item.stations.length >= 2 &&
            isActive(item.status)
        );
}


// =========================================================
// 10. CARI STASIUN
// =========================================================

function findStations(keyword) {

    const query = normalizeStation(keyword);

    if (!query) {
        return [];
    }

    return MASTER_STASIUN.filter(station =>
        normalizeStation(station.namaStasiun) === query
    );
}


// =========================================================
// 11. AUTOCOMPLETE STASIUN
// =========================================================

function searchStations(keyword) {

    const query = normalize(keyword);

    if (!query) {
        return MASTER_STASIUN.slice(0, 10);
    }

    return MASTER_STASIUN
        .filter(station => {

            return (
                normalize(station.namaStasiun).includes(query) ||
                normalize(station.idStasiun).includes(query) ||
                normalize(station.daopDivre).includes(query) ||
                normalize(station.provinsi).includes(query)
            );

        })
        .slice(0, 10);
}


// =========================================================
// 12. CARI STASIUN BERDASARKAN NAMA
// =========================================================

function stationExists(stationName) {

    const target = normalizeStation(stationName);

    return MASTER_STASIUN.some(station =>
        normalizeStation(station.namaStasiun) === target
    );
}


// =========================================================
// 13. CEK ARAH RELASI
// =========================================================

function routeMatches(tarif, asal, tujuan) {

    const origin = normalizeStation(asal);
    const destination = normalizeStation(tujuan);

    const route = tarif.stations.map(station =>
        normalizeStation(station)
    );

    const originIndex = route.indexOf(origin);
    const destinationIndex = route.indexOf(destination);

    // Salah satu stasiun tidak ada dalam relasi
    if (originIndex === -1 || destinationIndex === -1) {
        return false;
    }

    // Tidak boleh asal dan tujuan sama
    if (originIndex === destinationIndex) {
        return false;
    }

    const arah = normalize(tarif.arah);

    // PP = dua arah
    if (
        arah === "pp" ||
        arah === "pulang pergi" ||
        arah === "dua arah"
    ) {
        return true;
    }

    // SEARAH = harus mengikuti urutan STASIUN_1 -> STASIUN_2
    if (
        arah === "searah" ||
        arah === "satu arah"
    ) {
        return originIndex < destinationIndex;
    }

    // Jika ARAH kosong/tidak dikenal,
    // kita gunakan urutan relasi sebagai default.
    return originIndex < destinationIndex;
}


// =========================================================
// 14. MESIN PENCARIAN TARIF
// =========================================================

function searchTarif(asal, tujuan) {

    const origin = clean(asal);
    const destination = clean(tujuan);

    if (!origin || !destination) {
        return [];
    }

    if (
        normalizeStation(origin) ===
        normalizeStation(destination)
    ) {
        return [];
    }

    // Map MASTER_KA berdasarkan ID_KA
    const kaMap = new Map();

    MASTER_KA.forEach(ka => {
        kaMap.set(
            clean(ka.idKA),
            ka
        );
    });

    const results = [];

    MASTER_TARIF.forEach(tarif => {

        // Cari KA berdasarkan ID_KA
        const ka = kaMap.get(tarif.idKA);

        if (!ka) {
            return;
        }

        // Cek relasi asal -> tujuan
        if (!routeMatches(
            tarif,
            origin,
            destination
        )) {
            return;
        }

        results.push({

            idTarif: tarif.idTarif,

            idKA: tarif.idKA,

            namaKA: ka.namaKA,

            arah: tarif.arah,

            polaRelasi: tarif.polaRelasi,

            stations: tarif.stations,

            eks: tarif.eks,

            bis: tarif.bis,

            eko: tarif.eko

        });

    });

    return results;
}


// =========================================================
// 15. RENDER HASIL
// =========================================================

function renderResultCard(item, asal, tujuan) {

    const fareHTML = [];

    if (hasFare(item.eks)) {

        fareHTML.push(`
            <div class="fare-item">
                <span>Eksekutif</span>
                <strong>${formatRupiah(item.eks)}</strong>
            </div>
        `);

    }

    if (hasFare(item.bis)) {

        fareHTML.push(`
            <div class="fare-item">
                <span>Bisnis</span>
                <strong>${formatRupiah(item.bis)}</strong>
            </div>
        `);

    }

    if (hasFare(item.eko)) {

        fareHTML.push(`
            <div class="fare-item">
                <span>Ekonomi</span>
                <strong>${formatRupiah(item.eko)}</strong>
            </div>
        `);

    }

    const routeHTML = item.stations
        .map((station, index) => {

            return `
                <span class="route-station">
                    ${station}
                </span>
                ${
                    index < item.stations.length - 1
                    ? `<span class="route-arrow">→</span>`
                    : ""
                }
            `;

        })
        .join("");

    return `

        <div class="result-card">

            <div class="result-header">

                <div>

                    <div class="train-name">
                        ${item.namaKA}
                    </div>

                    <div class="train-id">
                        ${item.idKA}
                    </div>

                </div>

                <div class="route-badge">
                    ${item.arah || "PP"}
                </div>

            </div>


            <div class="main-route">

                <div class="route-point">
                    <small>ASAL</small>
                    <strong>${asal}</strong>
                </div>

                <div class="route-line">
                    →
                </div>

                <div class="route-point">
                    <small>TUJUAN</small>
                    <strong>${tujuan}</strong>
                </div>

            </div>


            <div class="route-info">

                <div class="info-label">
                    RELASI TARIF
                </div>

                <div class="route-list">
                    ${routeHTML}
                </div>

            </div>


            <div class="fare-section">

                ${fareHTML.length
                    ? fareHTML.join("")
                    : `
                        <div class="no-fare">
                            Tarif tidak tersedia
                        </div>
                    `
                }

            </div>


            <div class="result-footer">

                <span>
                    ${item.polaRelasi || "KORIDOR"}
                </span>

                <span>
                    ID Tarif: ${item.idTarif}
                </span>

            </div>

        </div>

    `;
}


// =========================================================
// 16. RENDER SEMUA HASIL
// =========================================================

function renderResults(results, asal, tujuan) {

    const container =
        document.getElementById("results");

    if (!container) {
        return;
    }

    if (!results || results.length === 0) {

        container.innerHTML = `

            <div class="empty-result">

                <div class="empty-icon">
                    🔍
                </div>

                <h3>
                    Tarif khusus tidak ditemukan
                </h3>

                <p>
                    Tidak ditemukan relasi tarif khusus
                    untuk ${asal} → ${tujuan}.
                </p>

            </div>

        `;

        return;
    }


    container.innerHTML = results
        .map(item =>
            renderResultCard(
                item,
                asal,
                tujuan
            )
        )
        .join("");
}


// =========================================================
// 17. UPDATE STATUS
// =========================================================

function updateStatus(message, type = "") {

    const status =
        document.getElementById("status");

    if (!status) {
        return;
    }

    status.textContent = message;

    status.className = "status";

    if (type) {
        status.classList.add(type);
    }
}


// =========================================================
// 18. AUTOCOMPLETE UI
// =========================================================

function setupAutocomplete(inputId, suggestionId) {

    const input =
        document.getElementById(inputId);

    const suggestions =
        document.getElementById(suggestionId);

    if (!input || !suggestions) {
        return;
    }


    function showSuggestions() {

        const keyword = input.value;

        const results =
            searchStations(keyword);

        suggestions.innerHTML = "";


        if (!results.length) {

            suggestions.style.display = "none";

            return;
        }


        results.forEach(station => {

            const item =
                document.createElement("div");

            item.className =
                "suggestion-item";


            item.innerHTML = `

                <div class="suggestion-name">
                    ${station.namaStasiun}
                </div>

                <div class="suggestion-detail">
                    ${station.daopDivre}
                </div>

            `;


            item.addEventListener(
                "click",
                () => {

                    input.value =
                        station.namaStasiun;

                    suggestions.style.display =
                        "none";

                }
            );


            suggestions.appendChild(item);

        });


        suggestions.style.display =
            "block";
    }


    input.addEventListener(
        "input",
        showSuggestions
    );


    input.addEventListener(
        "focus",
        showSuggestions
    );


    input.addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {

                event.preventDefault();

                suggestions.style.display =
                    "none";

            }

        }
    );


    document.addEventListener(
        "click",
        event => {

            if (
                !input.contains(event.target) &&
                !suggestions.contains(event.target)
            ) {

                suggestions.style.display =
                    "none";

            }

        }
    );
}


// =========================================================
// 19. PROSES PENCARIAN DARI UI
// =========================================================

function performSearch() {

    const asalInput =
        document.getElementById("asal");

    const tujuanInput =
        document.getElementById("tujuan");


    if (!asalInput || !tujuanInput) {
        return;
    }


    const asal =
        clean(asalInput.value);

    const tujuan =
        clean(tujuanInput.value);


    if (!asal || !tujuan) {

        updateStatus(
            "Silakan isi stasiun asal dan tujuan.",
            "error"
        );

        return;
    }


    updateStatus(
        "Mencari tarif khusus..."
    );


    const results =
        searchTarif(
            asal,
            tujuan
        );


    renderResults(
        results,
        asal,
        tujuan
    );


    updateStatus(
        results.length
            ? `${results.length} tarif ditemukan.`
            : "Tidak ada tarif khusus ditemukan.",
        results.length
            ? "success"
            : "error"
    );
}


// =========================================================
// 20. TUKAR ASAL / TUJUAN
// =========================================================

function setupSwap() {

    const button =
        document.getElementById("swapBtn");

    const asal =
        document.getElementById("asal");

    const tujuan =
        document.getElementById("tujuan");


    if (!button || !asal || !tujuan) {
        return;
    }


    button.addEventListener(
        "click",
        () => {

            const temp =
                asal.value;

            asal.value =
                tujuan.value;

            tujuan.value =
                temp;

        }
    );
}


// =========================================================
// 21. LOAD DATABASE
// =========================================================

async function loadDatabase() {

    try {

        updateStatus(
            "Menghubungkan ke database..."
        );


        const [
            kaCSV,
            stasiunCSV,
            tarifCSV
        ] = await Promise.all([

            fetchSheet(SHEETS.ka),

            fetchSheet(SHEETS.stasiun),

            fetchSheet(SHEETS.tarif)

        ]);


        MASTER_KA =
            parseMasterKA(kaCSV);


        MASTER_STASIUN =
            parseMasterStasiun(stasiunCSV);


        MASTER_TARIF =
            parseMasterTarif(tarifCSV);


        console.log(
            "=== TARSUS FINDER DATABASE ==="
        );


        console.log(
            "MASTER_KA:",
            MASTER_KA
        );


        console.log(
            "MASTER_STASIUN:",
            MASTER_STASIUN
        );


        console.log(
            "MASTER_TARIF:",
            MASTER_TARIF
        );


        console.log(
            `KA aktif: ${MASTER_KA.length}`
        );


        console.log(
            `Stasiun aktif: ${MASTER_STASIUN.length}`
        );


        console.log(
            `Tarif aktif: ${MASTER_TARIF.length}`
        );


        updateStatus(
            `Database siap • ${MASTER_KA.length} KA • ${MASTER_STASIUN.length} stasiun • ${MASTER_TARIF.length} tarif`,
            "success"
        );


    } catch (error) {

        console.error(
            "TARSUS FINDER ERROR:",
            error
        );


        updateStatus(
            "Gagal memuat database. Periksa Google Sheet dan koneksi.",
            "error"
        );

    }
}


// =========================================================
// 22. INITIALIZATION
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        setupAutocomplete(
            "asal",
            "asal-suggestions"
        );


        setupAutocomplete(
            "tujuan",
            "tujuan-suggestions"
        );


        setupSwap();


        const searchButton =
            document.getElementById("searchBtn");


        if (searchButton) {

            searchButton.addEventListener(
                "click",
                performSearch
            );

        }


        const asal =
            document.getElementById("asal");

        const tujuan =
            document.getElementById("tujuan");


        [asal, tujuan].forEach(input => {

            if (!input) {
                return;
            }


            input.addEventListener(
                "keydown",
                event => {

                    if (event.key === "Enter") {

                        event.preventDefault();

                        performSearch();

                    }

                }
            );

        });


        loadDatabase();

    }
);
