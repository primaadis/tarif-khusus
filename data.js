/* =========================================================
   TARSUS FINDER
   DATA ENGINE
   ========================================================= */


/* =========================================================
   GOOGLE SHEET
========================================================= */

const SHEET_ID =
    "1a4Ln_wASazV35F2M3MKZcJHEmiAV8G-0WmkMmU4Csls";


const SHEETS = {

    ka: "MASTER_KA",

    stasiun: "MASTER_STASIUN",

    tarif: "MASTER_TARIF"

};


/* =========================================================
   DATABASE
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
    document.getElementById(
        "asal-suggestions"
    );

const tujuanSuggestions =
    document.getElementById(
        "tujuan-suggestions"
    );

const searchBtn =
    document.getElementById(
        "searchBtn"
    );

const swapBtn =
    document.getElementById(
        "swapBtn"
    );

const statusEl =
    document.getElementById(
        "status"
    );

const resultsEl =
    document.getElementById(
        "results"
    );


/* =========================================================
   CLEAN
========================================================= */

function clean(value) {

    return String(value ?? "")

        .replace(/\uFEFF/g, "")

        .replace(/\r/g, "")

        .trim();

}


/* =========================================================
   NORMALIZE
========================================================= */

function normalize(value) {

    return clean(value)

        .toLowerCase()

        .replace(/\s+/g, " ");

}


/* =========================================================
   ESCAPE HTML
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
   CSV PARSER
========================================================= */

function parseCSV(text) {

    const rows = [];

    let row = [];

    let cell = "";

    let insideQuotes = false;


    for (
        let i = 0;
        i < text.length;
        i++
    ) {

        const char =
            text[i];

        const next =
            text[i + 1];


        if (
            char === '"' &&
            insideQuotes &&
            next === '"'
        ) {

            cell += '"';

            i++;

        }

        else if (
            char === '"'
        ) {

            insideQuotes =
                !insideQuotes;

        }

        else if (
            char === "," &&
            !insideQuotes
        ) {

            row.push(cell);

            cell = "";

        }

        else if (
            (
                char === "\n" ||
                char === "\r"
            ) &&
            !insideQuotes
        ) {

            if (
                char === "\r" &&
                next === "\n"
            ) {

                i++;

            }


            row.push(cell);

            cell = "";


            if (
                row.some(
                    value =>
                        clean(value) !== ""
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


    if (
        cell !== "" ||
        row.length > 0
    ) {

        row.push(cell);


        if (
            row.some(
                value =>
                    clean(value) !== ""
            )
        ) {

            rows.push(row);

        }

    }


    return rows;

}


/* =========================================================
   GET SHEET
========================================================= */

async function getSheet(
    sheetName
) {

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

function csvToObjects(
    csvText
) {

    const rows =
        parseCSV(csvText);


    if (!rows.length) {

        return [];

    }


    const headers =
        rows[0].map(
            header =>
                clean(header)
        );


    console.log(
        "HEADER:",
        headers
    );


    return rows
        .slice(1)
        .map(row => {

            const obj = {};


            headers.forEach(
                (
                    header,
                    index
                ) => {

                    obj[header] =
                        clean(
                            row[index] ?? ""
                        );

                }
            );


            return obj;

        });

}


/* =========================================================
   MASTER KA
========================================================= */

function parseMasterKA(
    rows
) {

    return rows

        .filter(row => {

            return (

                clean(
                    row.ID_KA
                ) !== ""

                &&

                normalize(
                    row.AKTIF
                ) === "ya"

            );

        })


        .map(row => {

            return {

                idKA:
                    clean(
                        row.ID_KA
                    ),

                namaKA:
                    clean(
                        row.NAMA_KA
                    )

            };

        });

}


/* =========================================================
   MASTER STASIUN
========================================================= */

function parseMasterStasiun(
    rows
) {

    return rows

        .filter(row => {

            return (

                clean(
                    row.ID_STASIUN
                ) !== ""

                &&

                clean(
                    row.NAMA_STASIUN
                ) !== ""

                &&

                normalize(
                    row.AKTIF
                ) === "ya"

            );

        })


        .map(row => {

            return {

                idStasiun:
                    clean(
                        row.ID_STASIUN
                    ),

                namaStasiun:
                    clean(
                        row.NAMA_STASIUN
                    ),

                daop:
                    clean(
                        row.DAOP_DIVRE
                    ),

                provinsi:
                    clean(
                        row.PROVINSI
                    )

            };

        });

}


/* =========================================================
   MASTER TARIF
========================================================= */

function parseMasterTarif(
    rows
) {

    const stationColumns = [];


    for (
        let i = 1;
        i <= 15;
        i++
    ) {

        stationColumns.push(
            `STASIUN_${i}`
        );

    }


    return rows

        .filter(row => {

            return (

                clean(
                    row.ID_TARIF
                ) !== ""

                &&

                clean(
                    row.ID_KA
                ) !== ""

                &&

                normalize(
                    row.STATUS
                ) === "aktif"

            );

        })


        .map(row => {

            const stations =
                stationColumns

                    .map(
                        column =>
                            clean(
                                row[column]
                            )
                    )

                    .filter(Boolean);


            return {

                idTarif:
                    clean(
                        row.ID_TARIF
                    ),

                idKA:
                    clean(
                        row.ID_KA
                    ),

                arah:
                    normalize(
                        row.ARAH
                    ),

                polaRelasi:
                    clean(
                        row.POLA_RELASI
                    ),

                stations,

                eks:
                    parseFare(
                        row.EKS
                    ),

                bis:
                    parseFare(
                        row.BIS
                    ),

                eko:
                    parseFare(
                        row.EKO
                    )

            };

        });

}


/* =========================================================
   FARE PARSER
========================================================= */

function parseFare(
    value
) {

    const raw =
        clean(value);


    if (

        raw === ""

        ||

        raw === "-"

        ||

        normalize(raw) ===
        "tidak tersedia"

    ) {

        return null;

    }


    const number =
        raw

            .replace(
                /rp/gi,
                ""
            )

            .replace(
                /\./g,
                ""
            )

            .replace(
                /,/g,
                ""
            )

            .replace(
                /[^\d]/g,
                ""
            );


    if (!number) {

        return null;

    }


    return Number(number);

}


/* =========================================================
   FORMAT RUPIAH
========================================================= */

function formatRupiah(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "—";

    }


    return new Intl.NumberFormat(
        "id-ID",
        {

            style:
                "currency",

            currency:
                "IDR",

            minimumFractionDigits:
                0,

            maximumFractionDigits:
                0

        }
    ).format(value);

}


/* =========================================================
   LOAD DATABASE
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

            getSheet(
                SHEETS.ka
            ),

            getSheet(
                SHEETS.stasiun
            ),

            getSheet(
                SHEETS.tarif
            )

        ]);


        MASTER_KA =
            parseMasterKA(
                csvToObjects(
                    kaCSV
                )
            );


        MASTER_STASIUN =
            parseMasterStasiun(
                csvToObjects(
                    stasiunCSV
                )
            );


        MASTER_TARIF =
            parseMasterTarif(
                csvToObjects(
                    tarifCSV
                )
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


        statusEl.textContent =
            `${MASTER_TARIF.length} tarif khusus aktif`;


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
            "ERROR DATABASE:",
            error
        );


        statusEl.textContent =
            "Database gagal dimuat.";

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
                normalize(
                    input.value
                );


            suggestionsBox.innerHTML =
                "";


            if (!query) {

                return;

            }


            const suggestions =
                MASTER_STASIUN

                    .filter(
                        station =>
                            normalize(
                                station.namaStasiun
                            )
                            .includes(
                                query
                            )
                    )

                    .sort(
                        (a, b) => {

                            const aName =
                                normalize(
                                    a.namaStasiun
                                );

                            const bName =
                                normalize(
                                    b.namaStasiun
                                );


                            const aStart =
                                aName.startsWith(
                                    query
                                );

                            const bStart =
                                bName.startsWith(
                                    query
                                );


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

                        }
                    )

                    .slice(
                        0,
                        7
                    );


            suggestions.forEach(
                station => {

                    const item =
                        document.createElement(
                            "div"
                        );


                    item.className =
                        "suggestion-item";


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

}


/* =========================================================
   CLOSE SUGGESTIONS
========================================================= */

document.addEventListener(
    "click",
    event => {

        if (
            !event.target.closest(
                ".field"
            )
        ) {

            asalSuggestions.innerHTML =
                "";

            tujuanSuggestions.innerHTML =
                "";

        }

    }
);


/* =========================================================
   CARI POSISI STASIUN
========================================================= */

function getStationIndex(
    stations,
    stationName
) {

    return stations.findIndex(
        station =>
            normalize(station) ===
            normalize(stationName)
    );

}


/* =========================================================
   CEK APAKAH PERJALANAN ADA
   DALAM SATU RELASI TARIF
========================================================= */

function routeIsCovered(
    tarif,
    asal,
    tujuan
) {

    const from =
        getStationIndex(
            tarif.stations,
            asal
        );


    const to =
        getStationIndex(
            tarif.stations,
            tujuan
        );


    if (
        from === -1 ||
        to === -1
    ) {

        return false;

    }


    if (
        from === to
    ) {

        return false;

    }


    /*
       PP = dua arah.
    */

    if (
        tarif.arah === "pp"
    ) {

        return true;

    }


    /*
       Jika bukan PP,
       perjalanan mengikuti urutan
       stasiun dalam relasi tarif.
    */

    return from < to;

}


/* =========================================================
   ACUAN RELASI TARIF
=========================================================

   Contoh:

   STASIUN_1 = Gambir
   STASIUN_2 = Jatinegara
   STASIUN_3 = Bekasi

   Search:
   Gambir → Jatinegara

   Maka:

   Acuan Tarif:
   Gambir → Bekasi

   Search:
   Jatinegara → Bekasi

   Maka:

   Acuan Tarif:
   Gambir → Bekasi

========================================================= */

function getReferenceRoute(
    tarif
) {

    const stations =
        tarif.stations;


    if (
        !stations ||
        stations.length < 2
    ) {

        return [];

    }


    /*
       Untuk relasi tarif khusus,
       batas tarif adalah:

       STASIUN PERTAMA
       →
       STASIUN TERAKHIR
    */

    return [

        stations[0],

        stations[
            stations.length - 1
        ]

    ];

}


/* =========================================================
   HTML RELASI
========================================================= */

function relationHTML(
    stations
) {

    if (
        !stations ||
        stations.length < 2
    ) {

        return "—";

    }


    return stations
        .map(
            station =>
                `<span>${escapeHTML(
                    station
                )}</span>`
        )
        .join(
            `<span class="relation-arrow">→</span>`
        );

}


/* =========================================================
   CARI TARIF
========================================================= */

function searchTarif(
    asal,
    tujuan
) {

    const results = [];


    MASTER_TARIF.forEach(
        tarif => {

            if (
                routeIsCovered(
                    tarif,
                    asal,
                    tujuan
                )
            ) {

                results.push(
                    tarif
                );

            }

        }
    );


    return results;

}


/* =========================================================
   NAMA KA
========================================================= */

function getNamaKA(
    idKA
) {

    const ka =
        MASTER_KA.find(
            item =>
                normalize(
                    item.idKA
                ) ===
                normalize(
                    idKA
                )
        );


    if (!ka) {

        return idKA;

    }


    return (
        ka.namaKA ||
        idKA
    );

}


/* =========================================================
   FARE ITEM
========================================================= */

function createFare(
    label,
    price
) {

    const unavailable =
        price === null ||
        price === undefined;


    return `

        <div class="fare-item">

            <span class="fare-class">
                ${label}
            </span>

            <span class="fare-price ${
                unavailable
                    ? "fare-unavailable"
                    : ""
            }">

                ${
                    unavailable
                        ? "—"
                        : formatRupiah(
                            price
                        )
                }

            </span>

        </div>

    `;

}


/* =========================================================
   RENDER RESULT
========================================================= */

function renderResults(
    tarifResults,
    asal,
    tujuan
) {

    resultsEl.innerHTML =
        "";


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
                    Belum ada tarif khusus yang
                    mencakup perjalanan
                    ${escapeHTML(asal)}
                    →
                    ${escapeHTML(tujuan)}.
                </p>

            </div>

        `;

        return;

    }


    /* =====================================================
       HEADER HASIL
    ===================================================== */

    resultsEl.innerHTML = `

        <div class="results-heading">

            <span>
                Tarif Khusus Ditemukan
            </span>

            <span>
                ${tarifResults.length}
                hasil
            </span>

        </div>

    `;


    /* =====================================================
       RENDER SATU-SATU
    ===================================================== */

    tarifResults.forEach(
        (
            tarif,
            index
        ) => {

            const namaKA =
                getNamaKA(
                    tarif.idKA
                );


            /*
               INI BAGIAN PALING PENTING.

               Acuan tarif bukan:

               asal → tujuan

               tetapi:

               STASIUN PERTAMA
               →
               STASIUN TERAKHIR

               dari MASTER_TARIF.
            */

            const reference =
                getReferenceRoute(
                    tarif
                );


            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "result-card";


            card.style.animationDelay =
                `${Math.min(
                    index * 70,
                    350
                )}ms`;


            card.innerHTML = `

                <!-- NAMA KA -->

                <div class="result-name">

                    ${escapeHTML(
                        namaKA
                    )}

                </div>


                <!-- PERJALANAN YANG DICARI -->

                <div class="journey">

                    <span>
                        ${escapeHTML(
                            asal
                        )}
                    </span>

                    <span class="journey-arrow">
                        →
                    </span>

                    <span>
                        ${escapeHTML(
                            tujuan
                        )}
                    </span>

                </div>


                <!-- ACUAN TARIF -->

                <div class="reference-box">

                    <div class="reference-label">

                        Acuan Tarif Khusus

                    </div>


                    <div class="reference-route">

                        ${relationHTML(
                            reference
                        )}

                    </div>

                </div>


                <!-- TARIF -->

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

            `;


            resultsEl.appendChild(
                card
            );

        }
    );

}


/* =========================================================
   SEARCH
========================================================= */

function performSearch() {

    const asal =
        clean(
            asalInput.value
        );


    const tujuan =
        clean(
            tujuanInput.value
        );


    resultsEl.innerHTML =
        "";


    if (
        !asal ||
        !tujuan
    ) {

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


    setTimeout(
        () => {

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


            if (
                results.length
            ) {

                statusEl.textContent =
                    `${results.length} tarif khusus ditemukan`;

            }

            else {

                statusEl.textContent =
                    "Tidak ada tarif khusus untuk rute tersebut.";

            }

        },
        180
    );

}


/* =========================================================
   SEARCH BUTTON
========================================================= */

searchBtn.addEventListener(
    "click",
    performSearch
);


/* =========================================================
   ENTER
========================================================= */

[
    asalInput,
    tujuanInput
].forEach(
    input => {

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

    }
);


/* =========================================================
   SWAP
========================================================= */

swapBtn.addEventListener(
    "click",
    () => {

        const temp =
            asalInput.value;


        asalInput.value =
            tujuanInput.value;


        tujuanInput.value =
            temp;


        if (
            clean(
                asalInput.value
            ) &&
            clean(
                tujuanInput.value
            )
        ) {

            performSearch();

        }

    }
);


/* =========================================================
   START
========================================================= */

loadData();
