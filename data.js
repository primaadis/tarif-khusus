/* =========================================================
   TARSUS FINDER
   DATA ENGINE
   Database:
   1. MASTER_KA
   2. MASTER_TARIF
   3. MASTER_STASIUN
   ========================================================= */

const SHEET_ID = "1a4Ln_wASazV35F2M3MKZcJHEmiAV8G-0WmkMmU4Csls";

const SHEETS = {
    ka: "MASTER_KA",
    tarif: "MASTER_TARIF",
    stasiun: "MASTER_STASIUN"
};


/* =========================================================
   UTILITAS
   ========================================================= */

function clean(value) {
    return String(value ?? "").trim();
}

function normalize(value) {
    return clean(value)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeStation(value) {
    return normalize(value)
        .replace(/\bsta\.?\b/g, "")
        .replace(/\bstasiun\b/g, "")
        .trim();
}

function isActive(value) {
    const v = normalize(value);

    return (
        v === "ya" ||
        v === "aktif" ||
        v === "active" ||
        v === "true" ||
        v === "1" ||
        v === "yes"
    );
}

function numberValue(value) {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    let v = String(value)
        .replace(/\s/g, "")
        .replace(/\./g, "")
        .replace(/,/g, "");

    const n = Number(v);

    return Number.isFinite(n) ? n : null;
}

function formatRupiah(value) {
    const n = numberValue(value);

    if (n === null) {
        return "-";
    }

    return "Rp " + n.toLocaleString("id-ID");
}


/* =========================================================
   GOOGLE SHEETS CSV
   ========================================================= */

async function fetchSheet(sheetName) {

    const url =
        `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq` +
        `?sheet=${encodeURIComponent(sheetName)}` +
        `&tqx=out:csv`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `Gagal mengambil data ${sheetName}.`
        );
    }

    return await response.text();
}


/* =========================================================
   CSV PARSER
   ========================================================= */

function parseCSV(text) {

    const rows = [];
    let row = [];
    let cell = "";
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {

        const char = text[i];
        const next = text[i + 1];

        if (char === '"') {

            if (insideQuotes && next === '"') {
                cell += '"';
                i++;
            } else {
                insideQuotes = !insideQuotes;
            }

        } else if (char === "," && !insideQuotes) {

            row.push(cell);
            cell = "";

        } else if (
            (char === "\n" || char === "\r") &&
            !insideQuotes
        ) {

            if (char === "\r" && next === "\n") {
                i++;
            }

            row.push(cell);
            rows.push(row);

            row = [];
            cell = "";

        } else {

            cell += char;
        }
    }

    if (cell !== "" || row.length > 0) {
        row.push(cell);
        rows.push(row);
    }

    if (!rows.length) {
        return [];
    }

    const headers = rows[0].map(h => clean(h));

    return rows
        .slice(1)
        .filter(row =>
            row.some(cell => clean(cell) !== "")
        )
        .map(row => {

            const obj = {};

            headers.forEach((header, index) => {
                obj[header] = clean(row[index] ?? "");
            });

            return obj;
        });
}


/* =========================================================
   HEADER HELPER
   ========================================================= */

function getField(row, names) {

    for (const name of names) {

        if (
            Object.prototype.hasOwnProperty.call(row, name) &&
            clean(row[name]) !== ""
        ) {
            return clean(row[name]);
        }
    }

    return "";
}


/* =========================================================
   LOAD DATABASE
   ========================================================= */

let DATABASE = {
    ka: [],
    tarif: [],
    stasiun: []
};

let DATABASE_READY = false;


/* =========================================================
   LOAD MASTER_KA
   ========================================================= */

function parseMasterKA(rows) {

    return rows
        .map(row => {

            return {
                idKA: getField(row, [
                    "ID_KA",
                    "ID KA",
                    "ID"
                ]),

                namaKA: getField(row, [
                    "NAMA_KA",
                    "NAMA KA",
                    "Kereta",
                    "Nama Kereta",
                    "KA"
                ]),

                aktif: getField(row, [
                    "AKTIF",
                    "STATUS",
                    "Status"
                ])
            };

        })
        .filter(item =>
            item.namaKA &&
            isActive(item.aktif)
        );
}


/* =========================================================
   LOAD MASTER_TARIF
   ========================================================= */

function parseMasterTarif(rows) {

    return rows
        .map(row => {

            const stations = [];

            for (let i = 1; i <= 10; i++) {

                const station = getField(row, [
                    `STASIUN_${i}`,
                    `STASIUN ${i}`,
                    `Stasiun ${i}`,
                    `STASIUN${i}`
                ]);

                if (station) {
                    stations.push(station);
                }
            }

            return {

                idTarif: getField(row, [
                    "ID_TARIF",
                    "ID TARIF",
                    "ID"
                ]),

                idKA: getField(row, [
                    "ID_KA",
                    "ID KA"
                ]),

                namaKA: getField(row, [
                    "NAMA_KA",
                    "NAMA KA",
                    "Kereta",
                    "Nama Kereta",
                    "KA"
                ]),

                relasiAsli: getField(row, [
                    "RELASI_ASLI",
                    "RELASI ASLI",
                    "Relasi Asli",
                    "Relasi",
                    "REL"
                ]),

                arah: getField(row, [
                    "ARAH",
                    "Arah"
                ]),

                polaRelasi: getField(row, [
                    "POLA_RELASI",
                    "POLA RELASI",
                    "Pola Relasi"
                ]),

                stations: stations,

                eks: getField(row, [
                    "EKS",
                    "EKSEKUTIF",
                    "Eksekutif"
                ]),

                bis: getField(row, [
                    "BIS",
                    "BISNIS",
                    "Bisnis"
                ]),

                eko: getField(row, [
                    "EKO",
                    "EKONOMI",
                    "Ekonomi"
                ]),

                status: getField(row, [
                    "STATUS",
                    "Status",
                    "AKTIF",
                    "Aktif"
                ]),

                raw: row
            };

        })
        .filter(item =>
            item.namaKA &&
            item.stations.length >= 2 &&
            isActive(item.status)
        );
}


/* =========================================================
   LOAD MASTER_STASIUN
   ========================================================= */

function parseMasterStasiun(rows) {

    return rows
        .map(row => {

            return {

                kode: getField(row, [
                    "KODE_STASIUN",
                    "KODE STASIUN",
                    "Kode Stasiun",
                    "Kode"
                ]),

                nama: getField(row, [
                    "NAMA_STASIUN",
                    "NAMA STASIUN",
                    "Nama Stasiun",
                    "Stasiun"
                ]),

                alternatif: getField(row, [
                    "NAMA_ALTERNATIF",
                    "NAMA ALTERNATIF",
                    "Nama Alternatif",
                    "Alternatif"
                ]),

                kota: getField(row, [
                    "KOTA",
                    "Kota"
                ]),

                daop: getField(row, [
                    "DAOP",
                    "Daop"
                ]),

                aktif: getField(row, [
                    "AKTIF",
                    "Aktif",
                    "STATUS",
                    "Status"
                ])
            };

        })
        .filter(item =>
            item.nama &&
            isActive(item.aktif)
        );
}


/* =========================================================
   LOAD SEMUA MASTER
   ========================================================= */

async function loadDatabase() {

    setStatus("Menghubungkan ke database...", "loading");

    try {

        const [
            kaCSV,
            tarifCSV,
            stasiunCSV
        ] = await Promise.all([

            fetchSheet(SHEETS.ka),
            fetchSheet(SHEETS.tarif),
            fetchSheet(SHEETS.stasiun)

        ]);

        DATABASE.ka =
            parseMasterKA(parseCSV(kaCSV));

        DATABASE.tarif =
            parseMasterTarif(parseCSV(tarifCSV));

        DATABASE.stasiun =
            parseMasterStasiun(parseCSV(stasiunCSV));

        DATABASE_READY = true;

        console.log("DATABASE BERHASIL DIMUAT");
        console.log("MASTER_KA:", DATABASE.ka);
        console.log("MASTER_TARIF:", DATABASE.tarif);
        console.log("MASTER_STASIUN:", DATABASE.stasiun);

        setStatus(
            `${DATABASE.ka.length} KA • ${DATABASE.tarif.length} tarif • ${DATABASE.stasiun.length} stasiun`,
            "success"
        );

    } catch (error) {

        console.error(error);

        DATABASE_READY = false;

        setStatus(
            "Gagal memuat database. Pastikan Google Sheet sudah dipublikasikan.",
            "error"
        );
    }
}


/* =========================================================
   MASTER STASIUN
   ========================================================= */

function findStation(value) {

    const target = normalizeStation(value);

    if (!target) {
        return null;
    }

    return DATABASE.stasiun.find(station => {

        const nama = normalizeStation(station.nama);
        const kode = normalize(station.kode);

        const alternatif = station.alternatif
            .split(/[;,|]/)
            .map(x => normalizeStation(x))
            .filter(Boolean);

        return (
            nama === target ||
            kode === target ||
            alternatif.includes(target)
        );

    }) || null;
}


/* =========================================================
   AUTOCOMPLETE
   ========================================================= */

function searchStations(keyword) {

    const q = normalize(keyword);

    if (!q) {
        return [];
    }

    return DATABASE.stasiun
        .filter(station => {

            const nama = normalize(station.nama);
            const kode = normalize(station.kode);
            const kota = normalize(station.kota);

            const alternatif = normalize(
                station.alternatif
            );

            return (
                nama.includes(q) ||
                kode.includes(q) ||
                kota.includes(q) ||
                alternatif.includes(q)
            );

        })
        .slice(0, 8);
}


/* =========================================================
   CEK POSISI STASIUN DALAM RELASI
   ========================================================= */

function getStationIndex(tarif, stationName) {

    const target = normalizeStation(stationName);

    return tarif.stations.findIndex(
        station =>
            normalizeStation(station) === target
    );
}


/* =========================================================
   CEK APAKAH RELASI MEMENUHI PENCARIAN
   ========================================================= */

function routeMatches(tarif, asal, tujuan) {

    const asalIndex =
        getStationIndex(tarif, asal.nama);

    const tujuanIndex =
        getStationIndex(tarif, tujuan.nama);

    if (asalIndex === -1 || tujuanIndex === -1) {
        return false;
    }

    if (asalIndex === tujuanIndex) {
        return false;
    }

    const arah = normalize(tarif.arah);
    const pola = normalize(tarif.polaRelasi);

    /*
       PP
       --------------------------------
       Dua arah diperbolehkan.
    */

    if (
        arah === "pp" ||
        arah === "pulang pergi" ||
        arah === "dua arah"
    ) {
        return true;
    }

    /*
       SEARAH
       --------------------------------
       Asal harus berada sebelum tujuan
       dalam urutan MASTER_TARIF.
    */

    if (
        arah === "searah" ||
        arah === "satu arah"
    ) {
        return asalIndex < tujuanIndex;
    }

    /*
       Jika ARAH belum diisi,
       gunakan urutan sebagai default.
    */

    if (!arah) {
        return asalIndex < tujuanIndex;
    }

    return false;
}


/* =========================================================
   PENCARIAN TARIF
   ========================================================= */

function searchTarif(asalInput, tujuanInput) {

    if (!DATABASE_READY) {
        return [];
    }

    const asal = findStation(asalInput);
    const tujuan = findStation(tujuanInput);

    if (!asal || !tujuan) {
        return [];
    }

    const results = [];

    DATABASE.tarif.forEach(tarif => {

        if (!routeMatches(tarif, asal, tujuan)) {
            return;
        }

        /*
           Cari data KA dari MASTER_KA.
           MASTER_TARIF tetap menjadi sumber
           relasi dan tarif.
        */

        const ka = DATABASE.ka.find(
            item =>
                item.idKA === tarif.idKA ||
                normalize(item.namaKA) === normalize(tarif.namaKA)
        );

        if (ka && !isActive(ka.aktif)) {
            return;
        }

        results.push({
            ...tarif,

            asal: asal.nama,
            tujuan: tujuan.nama,

            asalKota: asal.kota,
            tujuanKota: tujuan.kota,

            namaKA: ka
                ? ka.namaKA
                : tarif.namaKA
        });

    });

    /*
       Hilangkan kemungkinan duplikat.
    */

    const unique = [];

    const seen = new Set();

    results.forEach(item => {

        const key = [
            item.idTarif,
            normalize(item.namaKA),
            normalize(item.relasiiAsli || item.relasiAsli),
            normalize(item.asal),
            normalize(item.tujuan)
        ].join("|");

        if (!seen.has(key)) {

            seen.add(key);
            unique.push(item);

        }
    });

    return unique;
}


/* =========================================================
   RENDER HASIL
   ========================================================= */

function renderResults(results, asal, tujuan) {

    const container =
        document.getElementById("results");

    if (!container) {
        return;
    }

    if (!results.length) {

        container.innerHTML = `
            <div class="empty-result">
                <div class="empty-icon">⌕</div>

                <h3>Tarif khusus tidak ditemukan</h3>

                <p>
                    Tidak ditemukan tarif khusus untuk
                    <strong>${escapeHTML(asal)}</strong>
                    → 
                    <strong>${escapeHTML(tujuan)}</strong>.
                </p>
            </div>
        `;

        return;
    }

    container.innerHTML = results
        .map(renderResultCard)
        .join("");
}


/* =========================================================
   CARD HASIL
   ========================================================= */

function renderResultCard(item) {

    const fares = [];

    if (item.eks !== "") {

        fares.push(`
            <div class="fare-item">
                <span>Eksekutif</span>
                <strong>${formatRupiah(item.eks)}</strong>
            </div>
        `);
    }

    if (item.bis !== "") {

        fares.push(`
            <div class="fare-item">
                <span>Bisnis</span>
                <strong>${formatRupiah(item.bis)}</strong>
            </div>
        `);
    }

    if (item.eko !== "") {

        fares.push(`
            <div class="fare-item">
                <span>Ekonomi</span>
                <strong>${formatRupiah(item.eko)}</strong>
            </div>
        `);
    }

    const routeStations = item.stations
        .map((station, index) => {

            const isOrigin =
                normalizeStation(station) ===
                normalizeStation(item.asal);

            const isDestination =
                normalizeStation(station) ===
                normalizeStation(item.tujuan);

            let className = "";

            if (isOrigin) {
                className = "route-origin";
            }

            if (isDestination) {
                className = "route-destination";
            }

            return `
                <span class="route-station ${className}">
                    ${escapeHTML(station)}
                </span>
                ${
                    index < item.stations.length - 1
                    ? `<span class="route-arrow">›</span>`
                    : ""
                }
            `;

        })
        .join("");

    return `
        <article class="result-card">

            <div class="result-top">

                <div>

                    <div class="train-label">
                        KERETA API
                    </div>

                    <h2 class="train-name">
                        ${escapeHTML(item.namaKA)}
                    </h2>

                </div>

                <div class="direction-badge">
                    ${escapeHTML(item.arah || "-")}
                </div>

            </div>


            <div class="search-route">

                <div class="station-point">

                    <small>ASAL</small>

                    <strong>
                        ${escapeHTML(item.asal)}
                    </strong>

                </div>

                <div class="big-arrow">
                    →
                </div>

                <div class="station-point">

                    <small>TUJUAN</small>

                    <strong>
                        ${escapeHTML(item.tujuan)}
                    </strong>

                </div>

            </div>


            <div class="official-relation">

                <span class="relation-label">
                    RELASI TARIF KHUSUS
                </span>

                <strong>
                    ${escapeHTML(item.relasiAsli)}
                </strong>

            </div>


            <div class="route-box">

                <div class="route-title">
                    LINTASAN RELASI
                </div>

                <div class="route-list">
                    ${routeStations}
                </div>

            </div>


            <div class="fare-title">
                TARIF KHUSUS
            </div>

            <div class="fare-list">
                ${fares.join("")}
            </div>


            <div class="result-footer">

                ${
                    item.polaRelasi
                    ? `
                        <span>
                            Pola: ${escapeHTML(item.polaRelasi)}
                        </span>
                    `
                    : ""
                }

                ${
                    item.idTarif
                    ? `
                        <span>
                            ID: ${escapeHTML(item.idTarif)}
                        </span>
                    `
                    : ""
                }

            </div>

        </article>
    `;
}


/* =========================================================
   HTML ESCAPE
   ========================================================= */

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   STATUS
   ========================================================= */

function setStatus(message, type = "") {

    const element =
        document.getElementById("status");

    if (!element) {
        return;
    }

    element.textContent = message;

    element.className =
        `status ${type}`;
}


/* =========================================================
   AUTOCOMPLETE UI
   ========================================================= */

function setupAutocomplete(inputId, listId) {

    const input =
        document.getElementById(inputId);

    const list =
        document.getElementById(listId);

    if (!input || !list) {
        return;
    }

    input.addEventListener("input", () => {

        const results =
            searchStations(input.value);

        if (!results.length) {

            list.innerHTML = "";
            list.classList.remove("show");

            return;
        }

        list.innerHTML =
            results.map(station => {

                return `
                    <div
                        class="autocomplete-item"
                        data-value="${escapeHTML(station.nama)}"
                    >

                        <strong>
                            ${escapeHTML(station.nama)}
                        </strong>

                        <small>
                            ${
                                station.kode
                                ? escapeHTML(station.kode)
                                : ""
                            }

                            ${
                                station.kota
                                ? " • " + escapeHTML(station.kota)
                                : ""
                            }
                        </small>

                    </div>
                `;

            }).join("");

        list.classList.add("show");


        list.querySelectorAll(
            ".autocomplete-item"
        ).forEach(item => {

            item.addEventListener("click", () => {

                input.value =
                    item.dataset.value;

                list.innerHTML = "";
                list.classList.remove("show");

            });

        });

    });


    input.addEventListener("focus", () => {

        if (input.value.trim()) {
            input.dispatchEvent(
                new Event("input")
            );
        }

    });


    document.addEventListener("click", event => {

        if (
            !input.contains(event.target) &&
            !list.contains(event.target)
        ) {

            list.innerHTML = "";
            list.classList.remove("show");

        }

    });

}


/* =========================================================
   SEARCH BUTTON
   ========================================================= */

function executeSearch() {

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

        setStatus(
            "Masukkan stasiun asal dan tujuan.",
            "error"
        );

        return;
    }


    const asalStation =
        findStation(asal);

    const tujuanStation =
        findStation(tujuan);


    if (!asalStation) {

        setStatus(
            `"${asal}" tidak ditemukan di MASTER_STASIUN.`,
            "error"
        );

        return;
    }


    if (!tujuanStation) {

        setStatus(
            `"${tujuan}" tidak ditemukan di MASTER_STASIUN.`,
            "error"
        );

        return;
    }


    if (
        normalizeStation(asalStation.nama) ===
        normalizeStation(tujuanStation.nama)
    ) {

        setStatus(
            "Stasiun asal dan tujuan tidak boleh sama.",
            "error"
        );

        return;
    }


    setStatus(
        "Mencari tarif khusus...",
        "loading"
    );


    const results =
        searchTarif(
            asalStation.nama,
            tujuanStation.nama
        );


    renderResults(
        results,
        asalStation.nama,
        tujuanStation.nama
    );


    if (results.length) {

        setStatus(
            `${results.length} tarif khusus ditemukan.`,
            "success"
        );

    } else {

        setStatus(
            "Tidak ada tarif khusus untuk rute tersebut.",
            "normal"
        );

    }

}


/* =========================================================
   SWAP
   ========================================================= */

function swapStations() {

    const asal =
        document.getElementById("asal");

    const tujuan =
        document.getElementById("tujuan");

    if (!asal || !tujuan) {
        return;
    }

    const temp =
        asal.value;

    asal.value =
        tujuan.value;

    tujuan.value =
        temp;

}


/* =========================================================
   ENTER KEY
   ========================================================= */

function setupEnterSearch() {

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

                    executeSearch();

                }

            }
        );

    });

}


/* =========================================================
   INITIALIZATION
   ========================================================= */

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

        setupEnterSearch();

        const searchButton =
            document.getElementById("searchBtn");

        if (searchButton) {

            searchButton.addEventListener(
                "click",
                executeSearch
            );

        }


        const swapButton =
            document.getElementById("swapBtn");

        if (swapButton) {

            swapButton.addEventListener(
                "click",
                swapStations
            );

        }


        loadDatabase();

    }
);
