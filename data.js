/* =========================================================
   TARSUS FINDER
   DATA ENGINE - FINAL DEBUG VERSION
   ========================================================= */

const SHEET_ID = "1a4Ln_wASazV35F2M3MKZcJHEmiAV8G-0WmkMmU4Csls";

const SHEETS = {
    ka: "MASTER_KA",
    stasiun: "MASTER_STASIUN",
    tarif: "MASTER_TARIF"
};


// =========================================================
// DATA GLOBAL
// =========================================================

let MASTER_KA = [];
let MASTER_STASIUN = [];
let MASTER_TARIF = [];


// =========================================================
// HELPER
// =========================================================

function clean(value) {

    return String(value ?? "")
        .replace(/^\uFEFF/, "")
        .trim();
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

    if (
        !raw ||
        raw === "-" ||
        raw === "–" ||
        raw === "—"
    ) {
        return null;
    }

    const number = Number(
        raw
            .toLowerCase()
            .replace(/rp/g, "")
            .replace(/\s/g, "")
            .replace(/\./g, "")
            .replace(/,/g, "")
    );

    return Number.isFinite(number)
        ? number
        : null;
}


function formatRupiah(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "-";
    }

    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0
    }).format(value);
}


function hasFare(value) {

    return (
        value !== null &&
        value !== undefined &&
        Number.isFinite(value)
    );
}


// =========================================================
// FETCH GOOGLE SHEET
// =========================================================

async function fetchSheet(sheetName) {

    const url =
        `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq` +
        `?sheet=${encodeURIComponent(sheetName)}` +
        `&tqx=out:csv`;

    console.log(
        `Mengambil sheet: ${sheetName}`
    );

    const response = await fetch(url);

    if (!response.ok) {

        throw new Error(
            `Gagal mengambil ${sheetName}. HTTP ${response.status}`
        );
    }

    const text = await response.text();

    console.log(
        `${sheetName}: ${text.length} karakter diterima`
    );

    return text;
}


// =========================================================
// CSV PARSER
// =========================================================

function parseCSV(csv) {

    const rows = [];

    let row = [];
    let value = "";
    let insideQuotes = false;


    for (let i = 0; i < csv.length; i++) {

        const char = csv[i];
        const next = csv[i + 1];


        if (
            char === '"' &&
            insideQuotes &&
            next === '"'
        ) {

            value += '"';
            i++;

            continue;
        }


        if (char === '"') {

            insideQuotes = !insideQuotes;

            continue;
        }


        if (
            char === "," &&
            !insideQuotes
        ) {

            row.push(
                clean(value)
            );

            value = "";

            continue;
        }


        if (
            (char === "\n" || char === "\r") &&
            !insideQuotes
        ) {

            if (
                char === "\r" &&
                next === "\n"
            ) {
                i++;
            }


            row.push(
                clean(value)
            );

            value = "";


            if (
                row.some(
                    cell => clean(cell) !== ""
                )
            ) {

                rows.push(row);
            }


            row = [];

            continue;
        }


        value += char;
    }


    if (
        value !== "" ||
        row.length > 0
    ) {

        row.push(
            clean(value)
        );


        if (
            row.some(
                cell => clean(cell) !== ""
            )
        ) {

            rows.push(row);
        }
    }


    return rows;
}


// =========================================================
// ROW → OBJECT
// =========================================================

function rowsToObjects(rows) {

    if (
        !rows ||
        rows.length === 0
    ) {
        return [];
    }


    const headers =
        rows[0].map(header =>
            clean(header)
        );


    console.log(
        "HEADER TERBACA:",
        headers
    );


    return rows
        .slice(1)
        .map(row => {

            const obj = {};

            headers.forEach(
                (header, index) => {

                    if (!header) {
                        return;
                    }

                    obj[header] =
                        clean(row[index] ?? "");

                }
            );

            return obj;

        });
}


// =========================================================
// MASTER KA
// =========================================================

function parseMasterKA(csv) {

    const rows =
        parseCSV(csv);

    const data =
        rowsToObjects(rows);


    console.log(
        "MASTER_KA raw:",
        data
    );


    return data
        .map(row => ({

            idKA:
                clean(row["ID_KA"]),

            namaKA:
                clean(row["NAMA_KA"]),

            aktif:
                clean(row["AKTIF"])

        }))
        .filter(item => {

            return (
                item.idKA &&
                item.namaKA &&
                isActive(item.aktif)
            );

        });
}


// =========================================================
// MASTER STASIUN
// =========================================================

function parseMasterStasiun(csv) {

    const rows =
        parseCSV(csv);

    const data =
        rowsToObjects(rows);


    console.log(
        "MASTER_STASIUN raw:",
        data
    );


    return data
        .map(row => ({

            idStasiun:
                clean(row["ID_STASIUN"]),

            namaStasiun:
                clean(row["NAMA_STASIUN"]),

            daopDivre:
                clean(row["DAOP_DIVRE"]),

            provinsi:
                clean(row["PROVINSI"]),

            aktif:
                clean(row["AKTIF"])

        }))
        .filter(item => {

            return (
                item.idStasiun &&
                item.namaStasiun &&
                isActive(item.aktif)
            );

        });
}


// =========================================================
// MASTER TARIF
// =========================================================

function parseMasterTarif(csv) {

    const rows =
        parseCSV(csv);

    const data =
        rowsToObjects(rows);


    console.log(
        "MASTER_TARIF raw:",
        data
    );


    return data
        .map(row => {

            const stations = [];


            for (
                let i = 1;
                i <= 15;
                i++
            ) {

                const station =
                    clean(
                        row[`STASIUN_${i}`]
                    );


                if (station) {

                    stations.push(
                        station
                    );
                }
            }


            return {

                idTarif:
                    clean(row["ID_TARIF"]),

                idKA:
                    clean(row["ID_KA"]),

                arah:
                    clean(row["ARAH"]),

                polaRelasi:
                    clean(row["POLA_RELASI"]),

                stations:

                    stations,

                eks:
                    numberValue(row["EKS"]),

                bis:
                    numberValue(row["BIS"]),

                eko:
                    numberValue(row["EKO"]),

                status:
                    clean(row["STATUS"])

            };

        })
        .filter(item => {

            return (
                item.idTarif &&
                item.idKA &&
                item.stations.length >= 2 &&
                isActive(item.status)
            );

        });
}


// =========================================================
// CARI STASIUN
// =========================================================

function searchStations(keyword) {

    const query =
        normalize(keyword);


    if (!query) {

        return MASTER_STASIUN
            .slice(0, 10);
    }


    return MASTER_STASIUN
        .filter(station => {

            return normalize(
                station.namaStasiun
            ).includes(query);

        })
        .slice(0, 10);
}


// =========================================================
// CEK RUTE
// =========================================================

function routeMatches(
    tarif,
    asal,
    tujuan
) {

    const origin =
        normalizeStation(asal);

    const destination =
        normalizeStation(tujuan);


    const route =
        tarif.stations.map(
            station =>
                normalizeStation(station)
        );


    const originIndex =
        route.indexOf(origin);

    const destinationIndex =
        route.indexOf(destination);


    if (
        originIndex === -1 ||
        destinationIndex === -1
    ) {

        return false;
    }


    if (
        originIndex ===
        destinationIndex
    ) {

        return false;
    }


    const arah =
        normalize(tarif.arah);


    if (
        arah === "pp" ||
        arah === "pulang pergi" ||
        arah === "dua arah"
    ) {

        return true;
    }


    if (
        arah === "searah" ||
        arah === "satu arah"
    ) {

        return (
            originIndex <
            destinationIndex
        );
    }


    // Default
    return (
        originIndex <
        destinationIndex
    );
}


// =========================================================
// SEARCH TARIF
// =========================================================

function searchTarif(
    asal,
    tujuan
) {

    const origin =
        clean(asal);

    const destination =
        clean(tujuan);


    if (
        !origin ||
        !destination
    ) {

        return [];
    }


    const kaMap =
        new Map();


    MASTER_KA.forEach(ka => {

        kaMap.set(
            clean(ka.idKA),
            ka
        );

    });


    const results = [];


    MASTER_TARIF.forEach(
        tarif => {

            const ka =
                kaMap.get(
                    tarif.idKA
                );


            if (!ka) {
                return;
            }


            if (
                !routeMatches(
                    tarif,
                    origin,
                    destination
                )
            ) {

                return;
            }


            results.push({

                idTarif:
                    tarif.idTarif,

                idKA:
                    tarif.idKA,

                namaKA:
                    ka.namaKA,

                arah:
                    tarif.arah,

                polaRelasi:
                    tarif.polaRelasi,

                stations:
                    tarif.stations,

                eks:
                    tarif.eks,

                bis:
                    tarif.bis,

                eko:
                    tarif.eko

            });

        }
    );


    console.log(
        `Pencarian ${origin} → ${destination}:`,
        results
    );


    return results;
}


// =========================================================
// RENDER RESULT
// =========================================================

function renderResultCard(
    item,
    asal,
    tujuan
) {

    let fares = "";


    if (hasFare(item.eks)) {

        fares += `
            <div class="fare-item">
                <span>Eksekutif</span>
                <strong>
                    ${formatRupiah(item.eks)}
                </strong>
            </div>
        `;
    }


    if (hasFare(item.bis)) {

        fares += `
            <div class="fare-item">
                <span>Bisnis</span>
                <strong>
                    ${formatRupiah(item.bis)}
                </strong>
            </div>
        `;
    }


    if (hasFare(item.eko)) {

        fares += `
            <div class="fare-item">
                <span>Ekonomi</span>
                <strong>
                    ${formatRupiah(item.eko)}
                </strong>
            </div>
        `;
    }


    const routeHTML =
        item.stations
            .map(
                (station, index) => {

                    return `
                        <span class="route-station">
                            ${station}
                        </span>

                        ${
                            index <
                            item.stations.length - 1

                            ? `
                                <span class="route-arrow">
                                    →
                                </span>
                              `

                            : ""
                        }
                    `;

                }
            )
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
                    ${item.arah}
                </div>

            </div>


            <div class="main-route">

                <div class="route-point">

                    <small>ASAL</small>

                    <strong>
                        ${asal}
                    </strong>

                </div>


                <div class="route-line">
                    →
                </div>


                <div class="route-point">

                    <small>TUJUAN</small>

                    <strong>
                        ${tujuan}
                    </strong>

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

                ${
                    fares

                    ||

                    `
                        <div class="no-fare">
                            Tarif tidak tersedia
                        </div>
                    `
                }

            </div>


            <div class="result-footer">

                <span>
                    ${item.polaRelasi}
                </span>

                <span>
                    ID Tarif: ${item.idTarif}
                </span>

            </div>

        </div>

    `;
}


// =========================================================
// RENDER RESULTS
// =========================================================

function renderResults(
    results,
    asal,
    tujuan
) {

    const container =
        document.getElementById(
            "results"
        );


    if (!container) {
        return;
    }


    if (
        !results ||
        results.length === 0
    ) {

        container.innerHTML = `

            <div class="empty-result">

                <div class="empty-icon">
                    🔍
                </div>

                <h3>
                    Tarif khusus tidak ditemukan
                </h3>

                <p>
                    Tidak ditemukan tarif
                    untuk ${asal} → ${tujuan}.
                </p>

            </div>

        `;

        return;
    }


    container.innerHTML =
        results
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
// STATUS
// =========================================================

function updateStatus(
    message,
    type = ""
) {

    const status =
        document.getElementById(
            "status"
        );


    if (!status) {
        return;
    }


    status.textContent =
        message;


    status.className =
        "status";


    if (type) {

        status.classList.add(
            type
        );
    }
}


// =========================================================
// AUTOCOMPLETE
// =========================================================

function setupAutocomplete(
    inputId,
    suggestionId
) {

    const input =
        document.getElementById(
            inputId
        );

    const suggestions =
        document.getElementById(
            suggestionId
        );


    if (
        !input ||
        !suggestions
    ) {

        return;
    }


    function showSuggestions() {

        const results =
            searchStations(
                input.value
            );


        suggestions.innerHTML =
            "";


        if (!results.length) {

            suggestions.style.display =
                "none";

            return;
        }


        results.forEach(
            station => {

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "suggestion-item";


                // HANYA NAMA STASIUN
                item.textContent =
                    station.namaStasiun;


                item.addEventListener(
                    "click",
                    () => {

                        input.value =
                            station.namaStasiun;

                        suggestions.style.display =
                            "none";

                    }
                );


                suggestions.appendChild(
                    item
                );

            }
        );


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


    document.addEventListener(
        "click",
        event => {

            if (
                !input.contains(
                    event.target
                ) &&
                !suggestions.contains(
                    event.target
                )
            ) {

                suggestions.style.display =
                    "none";
            }

        }
    );
}


// =========================================================
// SEARCH BUTTON
// =========================================================

function performSearch() {

    const asalInput =
        document.getElementById(
            "asal"
        );

    const tujuanInput =
        document.getElementById(
            "tujuan"
        );


    if (
        !asalInput ||
        !tujuanInput
    ) {

        return;
    }


    const asal =
        clean(
            asalInput.value
        );

    const tujuan =
        clean(
            tujuanInput.value
        );


    if (
        !asal ||
        !tujuan
    ) {

        updateStatus(
            "Silakan isi stasiun asal dan tujuan.",
            "error"
        );

        return;
    }


    updateStatus(
        "Mencari tarif..."
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
// SWAP
// =========================================================

function setupSwap() {

    const button =
        document.getElementById(
            "swapBtn"
        );

    const asal =
        document.getElementById(
            "asal"
        );

    const tujuan =
        document.getElementById(
            "tujuan"
        );


    if (
        !button ||
        !asal ||
        !tujuan
    ) {

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
// LOAD DATABASE
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
        ] =
            await Promise.all([

                fetchSheet(
                    SHEETS.ka
                ),

                fetchSheet(
                    SHEETS.stasiun
                ),

                fetchSheet(
                    SHEETS.tarif
                )

            ]);


        MASTER_KA =
            parseMasterKA(
                kaCSV
            );


        MASTER_STASIUN =
            parseMasterStasiun(
                stasiunCSV
            );


        MASTER_TARIF =
            parseMasterTarif(
                tarifCSV
            );


        console.log(
            "================================"
        );

        console.log(
            "TARSUS FINDER DATABASE"
        );

        console.log(
            "================================"
        );


        console.log(
            "Jumlah KA:",
            MASTER_KA.length
        );


        console.log(
            "Jumlah STASIUN:",
            MASTER_STASIUN.length
        );


        console.log(
            "Jumlah TARIF:",
            MASTER_TARIF.length
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


        updateStatus(

            `Database siap • ` +
            `${MASTER_KA.length} KA • ` +
            `${MASTER_STASIUN.length} stasiun • ` +
            `${MASTER_TARIF.length} tarif`,

            "success"
        );


    } catch (error) {

        console.error(
            "TARSUS FINDER ERROR:",
            error
        );


        updateStatus(
            "Gagal membaca database.",
            "error"
        );

    }
}


// =========================================================
// INITIALIZATION
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
            document.getElementById(
                "searchBtn"
            );


        if (searchButton) {

            searchButton.addEventListener(
                "click",
                performSearch
            );

        }


        const asal =
            document.getElementById(
                "asal"
            );

        const tujuan =
            document.getElementById(
                "tujuan"
            );


        [asal, tujuan].forEach(
            input => {

                if (!input) {
                    return;
                }


                input.addEventListener(
                    "keydown",
                    event => {

                        if (
                            event.key ===
                            "Enter"
                        ) {

                            event.preventDefault();

                            performSearch();

                        }

                    }
                );

            }
        );


        loadDatabase();

    }
);
