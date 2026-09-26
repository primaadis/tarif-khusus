/* =========================================================
   TARSUS FINDER
   DATA ENGINE — FINAL
   ========================================================= */


/* =========================================================
   KONFIGURASI GOOGLE SHEET
========================================================= */

const SHEET_ID =
    "1a4Ln_wASazV35F2M3MKZcJHEmiAV8G-0WmkMmU4Csls";

const SHEETS = {
    ka: "MASTER_KA",
    stasiun: "MASTER_STASIUN",
    tarif: "MASTER_TARIF"
};


/* =========================================================
   GLOBAL DATA
========================================================= */

let MASTER_KA = [];
let MASTER_STASIUN = [];
let MASTER_TARIF = [];


/* =========================================================
   ELEMENT
========================================================= */

const asalInput =
    document.getElementById("asal");

const tujuanInput =
    document.getElementById("tujuan");

const asalSuggestions =
    document.getElementById("asal-suggestions");

const tujuanSuggestions =
    document.getElementById("tujuan-suggestions");

const searchBtn =
    document.getElementById("searchBtn");

const swapBtn =
    document.getElementById("swapBtn");

const statusEl =
    document.getElementById("status");

const resultsEl =
    document.getElementById("results");


/* =========================================================
   UTILITAS
========================================================= */

function clean(value) {

    return String(value ?? "")
        .replace(/\uFEFF/g, "")
        .replace(/\r/g, "")
        .trim();

}


function normalize(value) {

    return clean(value)
        .toLowerCase()
        .replace(/\s+/g, " ");

}


function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =========================================================
   PARSE CSV GOOGLE SHEETS
========================================================= */

function parseCSV(text) {

    const rows = [];

    let row = [];
    let cell = "";
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {

        const char = text[i];
        const next = text[i + 1];

        if (char === '"' && insideQuotes && next === '"') {

            cell += '"';
            i++;

        }

        else if (char === '"') {

            insideQuotes = !insideQuotes;

        }

        else if (char === "," && !insideQuotes) {

            row.push(cell);
            cell = "";

        }

        else if (
            (char === "\n" || char === "\r") &&
            !insideQuotes
        ) {

            if (char === "\r" && next === "\n") {
                i++;
            }

            row.push(cell);
            cell = "";

            if (
                row.some(
                    value => clean(value) !== ""
                )
            ) {
                rows.push(row);
            }

            row = [];

        }

        else {

            cell += char;

        }

    }


    if (cell !== "" || row.length > 0) {

        row.push(cell);

        if (
            row.some(
                value => clean(value) !== ""
            )
        ) {
            rows.push(row);
        }

    }

    return rows;

}


/* =========================================================
   AMBIL SHEET
========================================================= */

async function getSheet(sheetName) {

    const url =
        `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;

    const response =
        await fetch(url);

    if (!response.ok) {

        throw new Error(
            `Gagal mengambil ${sheetName}`
        );

    }

    return await response.text();

}


/* =========================================================
   CSV → OBJECT
========================================================= */

function csvToObjects(csvText) {

    const rows =
        parseCSV(csvText);

    if (!rows.length) {
        return [];
    }

    const headers =
        rows[0].map(
            header => clean(header)
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

                    obj[header] =
                        clean(row[index] ?? "");

                }
            );

            return obj;

        });

}


/* =========================================================
   PARSE MASTER KA
========================================================= */

function parseMasterKA(rows) {

    return rows
        .filter(row => {

            return (
                clean(row.ID_KA) !== "" &&
                normalize(row.AKTIF) === "ya"
            );

        })
        .map(row => {

            return {

                idKA:
                    clean(row.ID_KA),

                namaKA:
                    clean(row.NAMA_KA)

            };

        });

}


/* =========================================================
   PARSE MASTER STASIUN
========================================================= */

function parseMasterStasiun(rows) {

    return rows
        .filter(row => {

            return (
                clean(row.ID_STASIUN) !== "" &&
                clean(row.NAMA_STASIUN) !== "" &&
                normalize(row.AKTIF) === "ya"
            );

        })
        .map(row => {

            return {

                idStasiun:
                    clean(row.ID_STASIUN),

                namaStasiun:
                    clean(row.NAMA_STASIUN),

                daop:
                    clean(row.DAOP_DIVRE),

                provinsi:
                    clean(row.PROVINSI)

            };

        });

}


/* =========================================================
   PARSE TARIF
========================================================= */

function parseMasterTarif(rows) {

    const stationColumns = [];

    for (let i = 1; i <= 15; i++) {

        stationColumns.push(
            `STASIUN_${i}`
        );

    }


    return rows
        .filter(row => {

            return (
                clean(row.ID_TARIF) !== "" &&
                clean(row.ID_KA) !== "" &&
                normalize(row.STATUS) === "aktif"
            );

        })
        .map(row => {

            const stations =
                stationColumns
                    .map(column =>
                        clean(row[column])
                    )
                    .filter(Boolean);


            return {

                idTarif:
                    clean(row.ID_TARIF),

                idKA:
                    clean(row.ID_KA),

                arah:
                    normalize(row.ARAH),

                polaRelasi:
                    clean(row.POLA_RELASI),

                stations,

                eks:
                    parseFare(row.EKS),

                bis:
                    parseFare(row.BIS),

                eko:
                    parseFare(row.EKO)

            };

        });

}


/* =========================================================
   PARSE TARIF / HARGA
========================================================= */

function parseFare(value) {

    const raw =
        clean(value);

    if (
        raw === "" ||
        raw === "-" ||
        normalize(raw) === "tidak tersedia"
    ) {

        return null;

    }


    const number =
        raw
            .replace(/rp/gi, "")
            .replace(/\./g, "")
            .replace(/,/g, "")
            .replace(/[^\d]/g, "");


    if (!number) {
        return null;
    }


    return Number(number);

}


/* =========================================================
   FORMAT RUPIAH
========================================================= */

function formatRupiah(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "—";

    }


    return new Intl.NumberFormat(
        "id-ID",
        {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }
    ).format(value);

}


/* =========================================================
   INIT DATA
========================================================= */

async function loadData() {

    try {

        statusEl.textContent =
            "Memuat database tarif khusus…";


        const [
            kaCSV,
            stasiunCSV,
            tarifCSV
        ] = await Promise.all([

            getSheet(SHEETS.ka),

            getSheet(SHEETS.stasiun),

            getSheet(SHEETS.tarif)

        ]);


        const kaRaw =
            csvToObjects(kaCSV);

        const stasiunRaw =
            csvToObjects(stasiunCSV);

        const tarifRaw =
            csvToObjects(tarifCSV);


        console.log(
            "MASTER_KA raw:",
            kaRaw
        );

        console.log(
            "MASTER_STASIUN raw:",
            stasiunRaw
        );

        console.log(
            "MASTER_TARIF raw:",
            tarifRaw
        );


        MASTER_KA =
            parseMasterKA(kaRaw);

        MASTER_STASIUN =
            parseMasterStasiun(stasiunRaw);

        MASTER_TARIF =
            parseMasterTarif(tarifRaw);


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


        statusEl.textContent =
            `${MASTER_KA.length} KA · ${MASTER_STASIUN.length} stasiun · database tarif aktif`;


        initAutocomplete(
            asalInput,
            asalSuggestions
        );


        initAutocomplete(
            tujuanInput,
            tujuanSuggestions
        );


    }

    catch (error) {

        console.error(
            "GAGAL MEMUAT DATA:",
            error
        );


        statusEl.textContent =
            "Database tidak dapat dimuat. Periksa koneksi atau Google Sheet.";

    }

}


/* =========================================================
   AUTOCOMPLETE
========================================================= */

function initAutocomplete(
    input,
    suggestionsBox
) {

    input.addEventListener(
        "input",
        () => {

            const query =
                normalize(input.value);


            suggestionsBox.innerHTML = "";


            if (!query) {
                return;
            }


            const results =
                MASTER_STASIUN
                    .filter(station => {

                        return normalize(
                            station.namaStasiun
                        ).includes(query);

                    })
                    .sort((a, b) => {

                        const aName =
                            normalize(
                                a.namaStasiun
                            );

                        const bName =
                            normalize(
                                b.namaStasiun
                            );


                        const aStart =
                            aName.startsWith(query);

                        const bStart =
                            bName.startsWith(query);


                        if (
                            aStart &&
                            !bStart
                        ) {
                            return -1;
                        }

                        if (
                            !aStart &&
                            bStart
                        ) {
                            return 1;
                        }

                        return aName.localeCompare(
                            bName,
                            "id"
                        );

                    })
                    .slice(0, 7);


            results.forEach(
                station => {

                    const item =
                        document.createElement(
                            "div"
                        );


                    item.className =
                        "suggestion-item";


                    /*
                       PENTING:
                       Hanya nama stasiun.
                       Tidak ada DAOP / provinsi.
                    */

                    item.textContent =
                        station.namaStasiun;


                    item.addEventListener(
                        "click",
                        () => {

                            input.value =
                                station.namaStasiun;

                            suggestionsBox.innerHTML =
                                "";

                        }
                    );


                    suggestionsBox.appendChild(
                        item
                    );

                }
            );

        }
    );


    input.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape"
            ) {

                suggestionsBox.innerHTML =
                    "";

            }

        }
    );

}


/* =========================================================
   TUTUP AUTOCOMPLETE KETIKA KLIK DI LUAR
========================================================= */

document.addEventListener(
    "click",
    event => {

        if (
            !event.target.closest(".field")
        ) {

            if (asalSuggestions) {
                asalSuggestions.innerHTML =
                    "";
            }

            if (tujuanSuggestions) {
                tujuanSuggestions.innerHTML =
                    "";
            }

        }

    }
);


/* =========================================================
   CARI RELASI
========================================================= */

function findRoute(
    stations,
    asal,
    tujuan
) {

    const normalizedStations =
        stations.map(
            station => normalize(station)
        );


    const from =
        normalizedStations.indexOf(
            normalize(asal)
        );

    const to =
        normalizedStations.indexOf(
            normalize(tujuan)
        );


    if (
        from === -1 ||
        to === -1
    ) {

        return false;

    }


    /*
       PP:
       Dua arah diperbolehkan.

       Jadi:
       Gambir → Bekasi
       dan
       Bekasi → Gambir

       sama-sama valid.
    */

    if (from < to) {
        return true;
    }


    if (from > to) {

        return true;

    }


    return false;

}


/* =========================================================
   CEK TARIF
========================================================= */

function searchTarif(
    asal,
    tujuan
) {

    const asalNorm =
        normalize(asal);

    const tujuanNorm =
        normalize(tujuan);


    if (
        !asalNorm ||
        !tujuanNorm
    ) {

        return [];

    }


    const results = [];


    MASTER_TARIF.forEach(
        tarif => {

            const stations =
                tarif.stations;


            const normalizedStations =
                stations.map(
                    station =>
                        normalize(station)
                );


            const asalIndex =
                normalizedStations.indexOf(
                    asalNorm
                );

            const tujuanIndex =
                normalizedStations.indexOf(
                    tujuanNorm
                );


            if (
                asalIndex === -1 ||
                tujuanIndex === -1
            ) {

                return;

            }


            /*
               KORIDOR:

               Stasiun asal dan tujuan harus
               sama-sama berada dalam satu
               relasi tarif.

               Tidak harus bersebelahan.
            */

            if (
                tarif.polaRelasi &&
                normalize(
                    tarif.polaRelasi
                ) === "koridor"
            ) {

                if (
                    asalIndex === tujuanIndex
                ) {

                    return;

                }

            }


            /*
               Kalau PP:
               dua arah valid.
            */

            if (
                tarif.arah === "pp"
            ) {

                results.push(tarif);

                return;

            }


            /*
               Untuk relasi searah,
               asal harus berada sebelum tujuan.
            */

            if (
                asalIndex < tujuanIndex
            ) {

                results.push(tarif);

            }

        }
    );


    return results;

}


/* =========================================================
   CARI NAMA KA
========================================================= */

function getNamaKA(idKA) {

    const ka =
        MASTER_KA.find(
            item =>
                normalize(item.idKA) ===
                normalize(idKA)
        );


    if (!ka) {

        return idKA;

    }


    return ka.namaKA || idKA;

}


/* =========================================================
   BUAT RELASI LENGKAP
========================================================= */

function getRouteName(
    tarif,
    asal,
    tujuan
) {

    /*
       Untuk tampilan hasil,
       kita menggunakan stasiun yang
       dipilih user.

       Jadi hasil:
       Gambir → Bekasi

       bukan daftar semua stasiun
       di koridor.
    */

    return `
        <span>${escapeHTML(asal)}</span>
        <span class="route-arrow">→</span>
        <span>${escapeHTML(tujuan)}</span>
    `;

}


/* =========================================================
   RENDER HASIL
========================================================= */

function renderResults(
    tarifResults,
    asal,
    tujuan
) {

    resultsEl.innerHTML = "";


    if (
        !tarifResults.length
    ) {

        resultsEl.innerHTML = `

            <div class="empty-state">

                <div class="empty-symbol">
                    ◇
                </div>

                <h3>
                    Tarif khusus tidak ditemukan
                </h3>

                <p>
                    Belum ada relasi tarif khusus
                    yang sesuai untuk rute
                    ${escapeHTML(asal)}
                    → 
                    ${escapeHTML(tujuan)}.
                </p>

            </div>

        `;

        return;

    }


    /*
       Kelompokkan berdasarkan KA
    */

    const grouped = {};


    tarifResults.forEach(
        tarif => {

            if (
                !grouped[tarif.idKA]
            ) {

                grouped[tarif.idKA] = [];

            }

            grouped[tarif.idKA].push(
                tarif
            );

        }
    );


    const kaGroups =
        Object.entries(grouped);


    resultsEl.innerHTML = `

        <div class="results-heading">

            <span>
                Tarif ditemukan
            </span>

            <span>
                ${tarifResults.length} relasi
            </span>

        </div>

    `;


    kaGroups.forEach(
        ([idKA, tarifs], groupIndex) => {

            const namaKA =
                getNamaKA(idKA);


            tarifs.forEach(
                (tarif, index) => {

                    const card =
                        document.createElement(
                            "div"
                        );


                    card.className =
                        "result-card";


                    card.style.animationDelay =
                        `${Math.min(
                            (groupIndex + index) * 70,
                            350
                        )}ms`;


                    card.innerHTML = `

                        <div class="result-top">

                            <div>

                                <div class="result-name">
                                    ${escapeHTML(namaKA)}
                                </div>

                                <div class="result-route">
                                    ${getRouteName(
                                        tarif,
                                        asal,
                                        tujuan
                                    )}
                                </div>

                            </div>


                            <div class="fare-list">

                                ${createFare(
                                    "EKS",
                                    tarif.eks
                                )}

                                ${createFare(
                                    "BIS",
                                    tarif.bis
                                )}

                                ${createFare(
                                    "EKO",
                                    tarif.eko
                                )}

                            </div>

                        </div>

                    `;


                    resultsEl.appendChild(
                        card
                    );

                }
            );

        }
    );

}


/* =========================================================
   BUAT ITEM TARIF
========================================================= */

function createFare(
    className,
    price
) {

    const unavailable =
        price === null ||
        price === undefined;


    return `

        <div class="fare-item">

            <span class="fare-class">
                ${className}
            </span>

            <span
                class="fare-price ${
                    unavailable
                        ? "fare-unavailable"
                        : ""
                }"
            >
                ${
                    unavailable
                        ? "—"
                        : formatRupiah(price)
                }
            </span>

        </div>

    `;

}


/* =========================================================
   SEARCH BUTTON
========================================================= */

if (searchBtn) {

    searchBtn.addEventListener(
        "click",
        performSearch
    );

}


/* =========================================================
   ENTER UNTUK SEARCH
========================================================= */

[asalInput, tujuanInput]
    .forEach(input => {

        if (!input) {
            return;
        }


        input.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter"
                ) {

                    event.preventDefault();

                    performSearch();

                }

            }
        );

    });


/* =========================================================
   PROSES SEARCH
========================================================= */

function performSearch() {

    const asal =
        clean(asalInput.value);

    const tujuan =
        clean(tujuanInput.value);


    resultsEl.innerHTML =
        "";


    if (!asal || !tujuan) {

        statusEl.textContent =
            "Pilih stasiun asal dan tujuan terlebih dahulu.";

        return;

    }


    if (
        normalize(asal) ===
        normalize(tujuan)
    ) {

        statusEl.textContent =
            "Stasiun asal dan tujuan tidak boleh sama.";

        return;

    }


    statusEl.textContent =
        "Mencari tarif khusus…";


    /*
       Sedikit delay agar animasi
       loading terasa lebih smooth.
    */

    setTimeout(() => {

        const tarifResults =
            searchTarif(
                asal,
                tujuan
            );


        renderResults(
            tarifResults,
            asal,
            tujuan
        );


        if (
            tarifResults.length
        ) {

            statusEl.textContent =
                `${tarifResults.length} tarif khusus ditemukan`;

        }
        else {

            statusEl.textContent =
                "Tidak ada tarif khusus untuk rute tersebut.";

        }

    }, 180);

}


/* =========================================================
   SWAP
========================================================= */

if (swapBtn) {

    swapBtn.addEventListener(
        "click",
        () => {

            const temp =
                asalInput.value;


            asalInput.value =
                tujuanInput.value;

            tujuanInput.value =
                temp;


            /*
               Kalau sudah ada dua stasiun,
               langsung refresh hasil.
            */

            if (
                clean(asalInput.value) &&
                clean(tujuanInput.value)
            ) {

                performSearch();

            }

        }
    );

}


/* =========================================================
   START
========================================================= */

loadData();
