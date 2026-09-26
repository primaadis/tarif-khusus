/* =========================================================
   TARSUS FINDER
   DATA ENGINE
   ---------------------------------------------------------
   DATABASE:
   1. MASTER_KA
   2. MASTER_TARIF
   3. MASTER_STASIUN

   FITUR:
   - Pencarian tarif khusus berdasarkan stasiun
   - MASTER_TARIF = 1 baris = 1 relasi tarif
   - Nama KA diambil dari MASTER_KA
   - KA yang sama digabung menjadi 1 hasil
   - Tarif termurah menjadi TARIF UTAMA
   - Tarif lainnya menjadi TARIF KHUSUS ALTERNATIF
   - Alternatif dapat dibuka/tutup
   - Acuan tarif = stasiun pertama → stasiun terakhir
   ========================================================= */


/* =========================================================
   GOOGLE SHEET
========================================================= */

const SHEET_ID =
    "1a4Ln_wASazV35F2M3MKZcJHEmiAV8G-0WmkMmU4Csls";


const SHEETS = {

    ka: "MASTER_KA",

    tarif: "MASTER_TARIF",

    stasiun: "MASTER_STASIUN"

};


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
   DATA STORAGE
========================================================= */

let MASTER_KA = [];

let MASTER_TARIF = [];

let MASTER_STASIUN = [];


/* =========================================================
   UTILITY
========================================================= */


/*
   Membersihkan teks
*/
function clean(value) {

    return String(value ?? "")
        .replace(/\u00A0/g, " ")
        .trim();

}


/*
   Normalisasi untuk pencarian
*/
function normalize(value) {

    return clean(value)
        .toLowerCase()
        .replace(/\s+/g, " ");

}


/*
   Escape HTML
*/
function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/*
   Escape untuk atribut HTML
*/
function escapeAttr(value) {

    return escapeHTML(value);

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


        if (char === '"' && insideQuotes && next === '"') {

            cell += '"';

            i++;

            continue;

        }


        if (char === '"') {

            insideQuotes = !insideQuotes;

            continue;

        }


        if (char === "," && !insideQuotes) {

            row.push(cell);

            cell = "";

            continue;

        }


        if (
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
                    item => clean(item) !== ""
                )
            ) {

                rows.push(row);

            }


            row = [];

            continue;

        }


        cell += char;

    }


    row.push(cell);


    if (
        row.some(
            item => clean(item) !== ""
        )
    ) {

        rows.push(row);

    }


    return rows;

}


/* =========================================================
   GOOGLE SHEET LOADER
========================================================= */

async function loadSheet(sheetName) {

    const url =
        "https://docs.google.com/spreadsheets/d/" +
        SHEET_ID +
        "/gviz/tq?tqx=out:csv&sheet=" +
        encodeURIComponent(sheetName);


    const response =
        await fetch(url);


    if (!response.ok) {

        throw new Error(
            "Gagal mengambil sheet: " +
            sheetName
        );

    }


    return await response.text();

}


/* =========================================================
   CSV → OBJECT
========================================================= */

function rowsToObjects(rows) {

    if (!rows || rows.length === 0) {

        return [];

    }


    const headers =
        rows[0].map(
            header => clean(header)
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
   MASTER KA
========================================================= */

function parseMasterKA(csv) {

    const rows =
        parseCSV(csv);


    const objects =
        rowsToObjects(rows);


    return objects
        .filter(row => {

            return (
                clean(row.ID_KA) !== ""
            );

        })
        .map(row => {

            return {

                idKA:
                    clean(row.ID_KA),

                namaKA:
                    clean(row.NAMA_KA),

                aktif:
                    clean(row.AKTIF)

            };

        });

}


/* =========================================================
   MASTER STASIUN
========================================================= */

function parseMasterStasiun(csv) {

    const rows =
        parseCSV(csv);


    const objects =
        rowsToObjects(rows);


    return objects
        .filter(row => {

            return (
                clean(row.ID_STASIUN) !== "" &&
                clean(row.NAMA_STASIUN) !== ""
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
                    clean(row.PROVINSI),

                aktif:
                    clean(row.AKTIF)

            };

        });

}


/* =========================================================
   MASTER TARIF
========================================================= */

function parseMasterTarif(csv) {

    const rows =
        parseCSV(csv);


    const objects =
        rowsToObjects(rows);


    return objects
        .filter(row => {

            return (
                clean(row.ID_TARIF) !== "" &&
                clean(row.ID_KA) !== ""
            );

        })
        .map(row => {


            const stations = [];


            /*
               MASTER_TARIF menggunakan
               STASIUN_1 sampai STASIUN_15
            */

            for (
                let i = 1;
                i <= 15;
                i++
            ) {

                const station =
                    clean(
                        row["STASIUN_" + i]
                    );


                if (station !== "") {

                    stations.push(station);

                }

            }


            return {

                idTarif:
                    clean(row.ID_TARIF),

                idKA:
                    clean(row.ID_KA),

                arah:
                    clean(row.ARAH).toUpperCase(),

                polaRelasi:
                    clean(row.POLA_RELASI),

                stations,

                eks:
                    parseFare(row.EKS),

                bis:
                    parseFare(row.BIS),

                eko:
                    parseFare(row.EKO),

                status:
                    clean(row.STATUS)

            };

        });

}


/* =========================================================
   PARSE FARE
========================================================= */

function parseFare(value) {

    const raw =
        clean(value);


    /*
       -, kosong, — dianggap tidak tersedia
    */

    if (
        raw === "" ||
        raw === "-" ||
        raw === "—" ||
        raw.toLowerCase() === "null"
    ) {

        return null;

    }


    /*
       Hapus Rp dan karakter non angka
    */

    const numberText =
        raw
            .replace(/rp/gi, "")
            .replace(/\s/g, "")
            .replace(/\./g, "")
            .replace(/,/g, "");


    const number =
        Number(numberText);


    if (
        !Number.isFinite(number)
    ) {

        return null;

    }


    return number;

}


/* =========================================================
   FORMAT RUPIAH
========================================================= */

function formatRupiah(value) {

    if (
        value === null ||
        value === undefined ||
        !Number.isFinite(value)
    ) {

        return "—";

    }


    return "Rp " +
        new Intl.NumberFormat(
            "id-ID"
        ).format(value);

}


/* =========================================================
   GET LOWEST FARE
========================================================= */

function getLowestFare(tarif) {

    const fares = [

        tarif.eks,

        tarif.bis,

        tarif.eko

    ].filter(
        value =>
            value !== null &&
            Number.isFinite(value)
    );


    if (fares.length === 0) {

        return Infinity;

    }


    return Math.min(...fares);

}


/* =========================================================
   GET REFERENCE ROUTE
========================================================= */

function getReferenceRoute(tarif) {

    const stations =
        tarif.stations;


    if (
        !stations ||
        stations.length < 2
    ) {

        return [];

    }


    /*
       Acuan tarif khusus menggunakan
       batas awal dan batas akhir relasi.

       Contoh:

       Gambir
       Jatinegara
       Bekasi

       menjadi:

       Gambir → Bekasi
    */

    return [

        stations[0],

        stations[stations.length - 1]

    ];

}


/* =========================================================
   RELATION HTML
========================================================= */

function relationHTML(stations) {

    if (
        !stations ||
        stations.length === 0
    ) {

        return "—";

    }


    return stations
        .map(
            station =>
                escapeHTML(station)
        )
        .join(
            '<span class="relation-arrow">→</span>'
        );

}


/* =========================================================
   ROUTE MATCHING
========================================================= */

function routeIsCovered(
    tarif,
    asal,
    tujuan
) {

    const stations =
        tarif.stations;


    if (
        !stations ||
        stations.length < 2
    ) {

        return false;

    }


    const asalNorm =
        normalize(asal);

    const tujuanNorm =
        normalize(tujuan);


    const stationNorms =
        stations.map(
            station =>
                normalize(station)
        );


    const asalIndex =
        stationNorms.indexOf(
            asalNorm
        );


    const tujuanIndex =
        stationNorms.indexOf(
            tujuanNorm
        );


    /*
       Kedua stasiun harus ada
    */

    if (
        asalIndex === -1 ||
        tujuanIndex === -1
    ) {

        return false;

    }


    /*
       PP = kedua arah diperbolehkan
    */

    if (
        tarif.arah === "PP"
    ) {

        return true;

    }


    /*
       Untuk arah selain PP,
       mengikuti urutan stasiun.
    */

    return asalIndex < tujuanIndex;

}


/* =========================================================
   GET NAMA KA
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


    return (
        clean(ka.namaKA) ||
        idKA
    );

}


/* =========================================================
   CHECK KA ACTIVE
========================================================= */

function isKAActive(idKA) {

    const ka =
        MASTER_KA.find(
            item =>
                normalize(item.idKA) ===
                normalize(idKA)
        );


    /*
       Jika KA tidak ditemukan,
       jangan langsung membuang data.
    */

    if (!ka) {

        return true;

    }


    const status =
        normalize(ka.aktif);


    /*
       Jika AKTIF kosong,
       tetap dianggap bisa digunakan.
    */

    if (status === "") {

        return true;

    }


    return (
        status === "ya" ||
        status === "aktif" ||
        status === "yes" ||
        status === "1"
    );

}


/* =========================================================
   CHECK TARIF ACTIVE
========================================================= */

function isTarifActive(tarif) {

    const status =
        normalize(tarif.status);


    if (status === "") {

        return true;

    }


    return (
        status === "aktif" ||
        status === "ya" ||
        status === "active" ||
        status === "yes" ||
        status === "1"
    );

}


/* =========================================================
   CREATE FARE ITEM
========================================================= */

function fareItem(
    label,
    value
) {

    const unavailable =
        value === null ||
        value === undefined;


    return `
        <div class="fare-item">

            <span class="fare-class">
                ${escapeHTML(label)}
            </span>

            <span class="fare-price ${
                unavailable
                    ? "fare-unavailable"
                    : ""
            }">

                ${
                    unavailable
                        ? "—"
                        : formatRupiah(value)
                }

            </span>

        </div>
    `;

}


/* =========================================================
   GET UNIQUE ID
========================================================= */

function makeSafeId(value) {

    return String(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

}


/* =========================================================
   CREATE TARIF DETAIL
========================================================= */

function createTarifDetail(
    tarif,
    index,
    isMain
) {

    const reference =
        getReferenceRoute(tarif);


    const referenceHTML =
        relationHTML(reference);


    const title =
        isMain
            ? "TARIF UTAMA"
            : "TARIF KHUSUS ALTERNATIF";


    return `
        <div
            class="tariff-detail ${
                isMain
                    ? "tariff-main"
                    : "tariff-alternative"
            }"
        >

            <div class="reference-box">

                <div class="reference-label">

                    ${title}

                </div>


                <div class="reference-route">

                    ${referenceHTML}

                </div>

            </div>


            <div class="fare-list">

                ${fareItem(
                    "EKS",
                    tarif.eks
                )}

                ${fareItem(
                    "BIS",
                    tarif.bis
                )}

                ${fareItem(
                    "EKO",
                    tarif.eko
                )}

            </div>

        </div>
    `;

}


/* =========================================================
   CREATE GROUPED KA CARD
========================================================= */

function createKAGroupCard(
    namaKA,
    group,
    asal,
    tujuan,
    index
) {

    const cardId =
        "ka-" +
        makeSafeId(namaKA) +
        "-" +
        index;


    /*
       Tarif pertama = tarif utama
       karena sebelumnya sudah diurutkan
       dari tarif termurah.
    */

    const mainTarif =
        group[0];


    const alternativeTarif =
        group.slice(1);


    const actualJourney = `
        <div class="journey">

            <span>
                ${escapeHTML(asal)}
            </span>

            <span class="journey-arrow">
                →
            </span>

            <span>
                ${escapeHTML(tujuan)}
            </span>

        </div>
    `;


    let alternativeHTML = "";


    /*
       Jika terdapat tarif alternatif,
       buat area expandable.
    */

    if (
        alternativeTarif.length > 0
    ) {

        const alternativeDetails =
            alternativeTarif
                .map(
                    (tarif, i) =>
                        createTarifDetail(
                            tarif,
                            i + 1,
                            false
                        )
                )
                .join("");


        alternativeHTML = `

            <details
                class="tariff-alternatives"
            >

                <summary>

                    <span>
                        Lihat
                        ${alternativeTarif.length}
                        tarif khusus alternatif
                    </span>

                    <span class="alternative-arrow">
                        +
                    </span>

                </summary>


                <div class="alternative-content">

                    ${alternativeDetails}

                </div>

            </details>

        `;

    }


    /*
       Tarif utama
    */

    const mainHTML =
        createTarifDetail(
            mainTarif,
            0,
            true
        );


    return `

        <article
            class="result-card grouped-result-card"
            id="${escapeAttr(cardId)}"
        >

            <div class="result-name">

                ${escapeHTML(namaKA)}

            </div>


            ${actualJourney}


            ${mainHTML}


            ${alternativeHTML}

        </article>

    `;

}


/* =========================================================
   SEARCH TARIF
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


    if (
        asalNorm === tujuanNorm
    ) {

        return [];

    }


    /*
       Cari semua relasi tarif
       yang mencakup rute.
    */

    const matches =
        MASTER_TARIF.filter(
            tarif => {

                if (
                    !isTarifActive(tarif)
                ) {

                    return false;

                }


                if (
                    !isKAActive(tarif.idKA)
                ) {

                    return false;

                }


                return routeIsCovered(
                    tarif,
                    asal,
                    tujuan
                );

            }
        );


    /*
       Kelompok berdasarkan NAMA KA,
       bukan ID_KA.

       Jadi:

       KA002 ARGO MURIA
       KA003 ARGO MURIA

       tetap akan berada dalam
       satu kelompok ARGO MURIA
       apabila keduanya cocok.
    */

    const grouped =
        new Map();


    matches.forEach(
        tarif => {

            const namaKA =
                getNamaKA(
                    tarif.idKA
                );


            const key =
                normalize(namaKA);


            if (
                !grouped.has(key)
            ) {

                grouped.set(
                    key,
                    {

                        namaKA,

                        tarif: []

                    }
                );

            }


            grouped
                .get(key)
                .tarif
                .push(tarif);

        }
    );


    /*
       Urutkan setiap grup:
       tarif termurah → termahal
    */

    grouped.forEach(
        group => {

            group.tarif.sort(
                (a, b) => {

                    const fareA =
                        getLowestFare(a);

                    const fareB =
                        getLowestFare(b);


                    if (
                        fareA !== fareB
                    ) {

                        return fareA - fareB;

                    }


                    /*
                       Jika harga sama,
                       gunakan jumlah stasiun
                       sebagai pembeda.

                       Relasi lebih pendek
                       ditaruh lebih dulu.
                    */

                    return (
                        a.stations.length -
                        b.stations.length
                    );

                }
            );

        }
    );


    /*
       Urutkan nama KA
       berdasarkan tarif utama termurah.
    */

    const groups =
        Array.from(
            grouped.values()
        );


    groups.sort(
        (a, b) => {

            const fareA =
                getLowestFare(
                    a.tarif[0]
                );

            const fareB =
                getLowestFare(
                    b.tarif[0]
                );


            return fareA - fareB;

        }
    );


    return groups;

}


/* =========================================================
   RENDER RESULTS
========================================================= */

function renderResults(
    groups,
    asal,
    tujuan
) {

    /*
       Tidak ada hasil
    */

    if (
        !groups ||
        groups.length === 0
    ) {

        resultsEl.innerHTML = `

            <div class="empty-state">

                <div class="empty-symbol">
                    ⌕
                </div>


                <h3>
                    Tarif khusus tidak ditemukan
                </h3>


                <p>
                    Belum ditemukan tarif khusus
                    untuk perjalanan
                    ${escapeHTML(asal)}
                    →
                    ${escapeHTML(tujuan)}.
                </p>

            </div>

        `;

        return;

    }


    /*
       Heading hasil
    */

    let html = `

        <div class="results-heading">

            <span>
                Tarif Ditemukan
            </span>

            <span>
                ${groups.length}
                KA
            </span>

        </div>

    `;


    /*
       Setiap nama KA = 1 card
    */

    groups.forEach(
        (group, index) => {

            html +=
                createKAGroupCard(
                    group.namaKA,
                    group.tarif,
                    asal,
                    tujuan,
                    index
                );

        }
    );


    resultsEl.innerHTML =
        html;

}


/* =========================================================
   AUTOCOMPLETE
========================================================= */

function showSuggestions(
    input,
    container
) {

    const keyword =
        normalize(input.value);


    if (!keyword) {

        container.innerHTML = "";

        return;

    }


    /*
       Hanya nama stasiun.
       Tidak menampilkan DAOP,
       provinsi, ID, dan data lainnya.
    */

    const matches =
        MASTER_STASIUN
            .filter(
                station => {

                    if (
                        normalize(
                            station.aktif
                        ) === "tidak"
                    ) {

                        return false;

                    }


                    return normalize(
                        station.namaStasiun
                    ).includes(keyword);

                }
            )
            .slice(0, 8);


    if (
        matches.length === 0
    ) {

        container.innerHTML = "";

        return;

    }


    container.innerHTML =
        matches
            .map(
                station => `

                    <div
                        class="suggestion-item"
                        data-station="${escapeAttr(
                            station.namaStasiun
                        )}"
                    >

                        ${escapeHTML(
                            station.namaStasiun
                        )}

                    </div>

                `
            )
            .join("");


    container
        .querySelectorAll(
            ".suggestion-item"
        )
        .forEach(
            item => {

                item.addEventListener(
                    "click",
                    () => {

                        input.value =
                            item.dataset.station;

                        container.innerHTML =
                            "";

                        input.focus();

                    }
                );

            }
        );

}


/* =========================================================
   CLOSE SUGGESTIONS
========================================================= */

function closeSuggestions() {

    asalSuggestions.innerHTML =
        "";

    tujuanSuggestions.innerHTML =
        "";

}


/* =========================================================
   SEARCH BUTTON
========================================================= */

function performSearch() {

    const asal =
        clean(asalInput.value);

    const tujuan =
        clean(tujuanInput.value);


    closeSuggestions();


    /*
       Validasi kosong
    */

    if (
        !asal ||
        !tujuan
    ) {

        statusEl.textContent =
            "Silakan pilih stasiun asal dan tujuan.";

        resultsEl.innerHTML =
            "";

        return;

    }


    /*
       Validasi stasiun sama
    */

    if (
        normalize(asal) ===
        normalize(tujuan)
    ) {

        statusEl.textContent =
            "Stasiun asal dan tujuan tidak boleh sama.";

        resultsEl.innerHTML =
            "";

        return;

    }


    statusEl.textContent =
        "Mencari tarif khusus...";


    /*
       Beri sedikit delay visual
       agar animasi tetap terasa halus.
    */

    setTimeout(
        () => {

            const groups =
                searchTarif(
                    asal,
                    tujuan
                );


            if (
                groups.length > 0
            ) {

                statusEl.textContent =
                    "Ditemukan " +
                    groups.length +
                    " KA dengan tarif khusus.";

            } else {

                statusEl.textContent =
                    "Tidak ditemukan tarif khusus.";

            }


            renderResults(
                groups,
                asal,
                tujuan
            );

        },
        120
    );

}


/* =========================================================
   SWAP
========================================================= */

function swapStations() {

    const oldAsal =
        asalInput.value;

    asalInput.value =
        tujuanInput.value;

    tujuanInput.value =
        oldAsal;


    closeSuggestions();


    /*
       Jika kedua field sudah terisi,
       langsung cari ulang.
    */

    if (
        clean(asalInput.value) &&
        clean(tujuanInput.value)
    ) {

        performSearch();

    }

}


/* =========================================================
   ENTER KEY
========================================================= */

function handleEnter(event) {

    if (
        event.key === "Enter"
    ) {

        event.preventDefault();

        performSearch();

    }

}


/* =========================================================
   DYNAMIC CSS
   ---------------------------------------------------------
   CSS ini hanya untuk bagian baru:
   - alternatif tarif
   - tombol buka/tutup
   - animasi detail

   Tampilan utama index.html tetap dipertahankan.
========================================================= */

function injectDynamicStyles() {

    const style =
        document.createElement("style");


    style.id =
        "tarsus-dynamic-styles";


    style.textContent = `

        /* ==============================================
           GROUPED RESULT
        ============================================== */

        .grouped-result-card {
            transition:
                transform .25s ease,
                border-color .25s ease,
                box-shadow .25s ease;
        }


        /* ==============================================
           TARIFF DETAIL
        ============================================== */

        .tariff-detail {
            animation:
                tariffReveal .35s
                cubic-bezier(.2,.8,.2,1)
                both;
        }


        .tariff-detail .reference-box {
            margin-top: 17px;
        }


        .tariff-detail .fare-list {
            margin-bottom: 0;
        }


        /* ==============================================
           MAIN TARIFF
        ============================================== */

        .tariff-main {
            position: relative;
        }


        .tariff-main .reference-box {
            border-color:
                rgba(255,160,55,.20);
        }


        /* ==============================================
           ALTERNATIVE DETAILS
        ============================================== */

        .tariff-alternatives {
            margin-top: 14px;

            border:
                1px solid
                rgba(255,255,255,.055);

            border-radius: 14px;

            overflow: hidden;

            background:
                rgba(255,255,255,.018);
        }


        .tariff-alternatives summary {

            display: flex;

            align-items: center;

            justify-content: space-between;

            gap: 12px;

            padding:
                13px 15px;

            list-style: none;

            cursor: pointer;

            color:
                var(--soft);

            font-size: 10px;

            font-weight: 700;

            letter-spacing: .04em;

            transition:
                background .2s ease,
                color .2s ease;
        }


        .tariff-alternatives summary::-webkit-details-marker {
            display: none;
        }


        .tariff-alternatives summary:hover {

            color:
                var(--gold);

            background:
                rgba(255,157,49,.045);
        }


        .alternative-arrow {

            display: grid;

            place-items: center;

            width: 24px;
            height: 24px;

            flex-shrink: 0;

            border:
                1px solid
                rgba(255,157,49,.16);

            border-radius: 8px;

            color:
                var(--gold);

            font-size: 15px;

            line-height: 1;

            transition:
                transform .25s ease,
                background .2s ease;
        }


        .tariff-alternatives[open]
        .alternative-arrow {

            transform:
                rotate(45deg);

            background:
                rgba(255,157,49,.07);
        }


        .alternative-content {

            padding:
                0 14px 14px;
        }


        .alternative-content
        .tariff-detail {

            padding-top: 1px;

            border-top:
                1px solid
                rgba(255,255,255,.045);
        }


        .alternative-content
        .tariff-detail:first-child {

            border-top: none;
        }


        .alternative-content
        .reference-box {

            margin-top: 14px;

            border-color:
                rgba(255,255,255,.065);

            background:
                rgba(255,255,255,.018);
        }


        .alternative-content
        .reference-label {

            color:
                var(--muted);
        }


        .alternative-content
        .reference-label::before {

            background:
                #657287;

            box-shadow: none;
        }


        .alternative-content
        .reference-route {

            color:
                #cbd4df;
        }


        /* ==============================================
           ANIMATION
        ============================================== */

        @keyframes tariffReveal {

            from {

                opacity: 0;

                transform:
                    translateY(6px);

            }

            to {

                opacity: 1;

                transform:
                    translateY(0);

            }

        }


        /* ==============================================
           MOBILE
        ============================================== */

        @media (max-width: 680px) {

            .tariff-alternatives summary {

                padding:
                    12px 13px;

                font-size:
                    9px;

            }


            .alternative-content {

                padding:
                    0 10px 10px;

            }

        }

    `;


    document.head.appendChild(style);

}


/* =========================================================
   LOAD ALL DATA
========================================================= */

async function loadData() {

    try {

        statusEl.textContent =
            "Menghubungkan ke database tarif...";


        /*
           Ambil 3 sheet secara bersamaan
        */

        const [
            kaCSV,
            tarifCSV,
            stasiunCSV
        ] = await Promise.all([

            loadSheet(
                SHEETS.ka
            ),

            loadSheet(
                SHEETS.tarif
            ),

            loadSheet(
                SHEETS.stasiun
            )

        ]);


        /*
           Parse database
        */

        MASTER_KA =
            parseMasterKA(
                kaCSV
            );


        MASTER_TARIF =
            parseMasterTarif(
                tarifCSV
            );


        MASTER_STASIUN =
            parseMasterStasiun(
                stasiunCSV
            );


        /*
           Status siap
        */

        statusEl.textContent =
            "Database tarif siap digunakan.";


        console.log(
            "TARSUS FINDER — DATABASE LOADED"
        );


        console.log(
            "MASTER_KA:",
            MASTER_KA.length
        );


        console.log(
            "MASTER_TARIF:",
            MASTER_TARIF.length
        );


        console.log(
            "MASTER_STASIUN:",
            MASTER_STASIUN.length
        );


    } catch (error) {

        console.error(
            "TARSUS FINDER ERROR:",
            error
        );


        statusEl.textContent =
            "Gagal memuat database. Periksa Google Sheet dan koneksi.";


        resultsEl.innerHTML = `

            <div class="empty-state">

                <div class="empty-symbol">
                    !
                </div>


                <h3>
                    Database tidak dapat dimuat
                </h3>


                <p>
                    Silakan periksa koneksi
                    dan konfigurasi Google Sheet.
                </p>

            </div>

        `;

    }

}


/* =========================================================
   EVENT LISTENER
========================================================= */


/*
   Autocomplete asal
*/

asalInput.addEventListener(
    "input",
    () => {

        showSuggestions(
            asalInput,
            asalSuggestions
        );

    }
);


/*
   Autocomplete tujuan
*/

tujuanInput.addEventListener(
    "input",
    () => {

        showSuggestions(
            tujuanInput,
            tujuanSuggestions
        );

    }
);


/*
   Enter asal
*/

asalInput.addEventListener(
    "keydown",
    handleEnter
);


/*
   Enter tujuan
*/

tujuanInput.addEventListener(
    "keydown",
    handleEnter
);


/*
   Tombol pencarian
*/

searchBtn.addEventListener(
    "click",
    performSearch
);


/*
   Tombol swap
*/

swapBtn.addEventListener(
    "click",
    swapStations
);


/*
   Klik di luar autocomplete
*/

document.addEventListener(
    "click",
    event => {

        if (
            !event.target.closest(
                ".input-wrap"
            )
        ) {

            closeSuggestions();

        }

    }
);


/* =========================================================
   INITIALIZE
========================================================= */

injectDynamicStyles();

loadData();
