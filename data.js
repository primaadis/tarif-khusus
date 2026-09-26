const SHEET_ID =
    "1a4Ln_wASazV35F2M3MKZcJHEmiAV8G-0WmkMmU4Csls";

const SHEETS = {
    tarif: "MASTER_TARIF",
    lintasan: "MASTER_LINTASAN",
    stasiun: "MASTER_STASIUN"
};

const asalInput =
    document.getElementById("asal");

const tujuanInput =
    document.getElementById("tujuan");

const suggestionsAsal =
    document.getElementById("suggestionsAsal");

const suggestionsTujuan =
    document.getElementById("suggestionsTujuan");

const swapBtn =
    document.getElementById("swapBtn");

const searchBtn =
    document.getElementById("searchBtn");

const results =
    document.getElementById("results");

const resultCount =
    document.getElementById("resultCount");

const loading =
    document.getElementById("loading");

const empty =
    document.getElementById("empty");

const errorBox =
    document.getElementById("errorBox");

const status =
    document.getElementById("status");

let masterTarif = [];
let masterLintasan = [];
let masterStasiun = [];
let stations = [];
let databaseReady = false;

function normalizeText(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

function normalizeHeader(value) {
    return normalizeText(value)
        .replace(/[^a-z0-9]/g, "");
}

function escapeHTML(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatRupiah(value) {
    if (
        value === null ||
        value === undefined ||
        String(value).trim() === ""
    ) {
        return "-";
    }

    const number =
        Number(
            String(value)
                .replace(/[^\d]/g, "")
        );

    if (
        !Number.isFinite(number) ||
        number <= 0
    ) {
        return "-";
    }

    return (
        "Rp" +
        number.toLocaleString("id-ID")
    );
}
function parseCSV(text) {

    const rows = [];

    let row = [];
    let value = "";
    let insideQuotes = false;

    for (
        let i = 0;
        i < text.length;
        i++
    ) {

        const char = text[i];
        const next = text[i + 1];

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
            insideQuotes =
                !insideQuotes;
            continue;
        }

        if (
            char === "," &&
            !insideQuotes
        ) {
            row.push(value);
            value = "";
            continue;
        }

        if (
            (char === "\n" ||
             char === "\r") &&
            !insideQuotes
        ) {

            if (
                char === "\r" &&
                next === "\n"
            ) {
                i++;
            }

            row.push(value);
            value = "";

            if (
                row.some(
                    cell =>
                        String(cell).trim() !== ""
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

        row.push(value);

        if (
            row.some(
                cell =>
                    String(cell).trim() !== ""
            )
        ) {
            rows.push(row);
        }
    }

    return rows;
}


async function loadSheet(sheetName) {

    const url =
        "https://docs.google.com/spreadsheets/d/" +
        SHEET_ID +
        "/gviz/tq?tqx=out:csv&sheet=" +
        encodeURIComponent(sheetName);

    const response =
        await fetch(
            url,
            {
                cache: "no-store"
            }
        );

    if (!response.ok) {
        throw new Error(
            "Gagal mengambil sheet " +
            sheetName
        );
    }

    const text =
        await response.text();

    if (
        !text ||
        !text.trim()
    ) {
        throw new Error(
            "Sheet " +
            sheetName +
            " kosong"
        );
    }

    const rows =
        parseCSV(text);

    if (!rows.length) {
        throw new Error(
            "Sheet " +
            sheetName +
            " tidak memiliki data"
        );
    }

    return rows;
}


function createHeaderMap(headers) {

    const map = {};

    headers.forEach(
        (header, index) => {

            const key =
                normalizeHeader(header);

            if (key) {
                map[key] = index;
            }

        }
    );

    return map;
}


function getCell(
    row,
    headerMap,
    names
) {

    for (
        const name of names
    ) {

        const key =
            normalizeHeader(name);

        if (
            headerMap[key] !== undefined
        ) {

            return String(
                row[
                    headerMap[key]
                ] ?? ""
            ).trim();

        }
    }

    return "";
}


function showLoading() {

    if (loading) {
        loading.style.display =
            "block";
    }

}


function hideLoading() {

    if (loading) {
        loading.style.display =
            "none";
    }

}


function showError(message) {

    if (!errorBox) {
        return;
    }

    errorBox.textContent =
        message;

    errorBox.style.display =
        "block";
}


function hideError() {

    if (!errorBox) {
        return;
    }

    errorBox.textContent = "";

    errorBox.style.display =
        "none";
    }
async function loadDatabase() {

    try {

        showLoading();

        hideError();

        databaseReady = false;

        if (status) {
            status.textContent =
                "Menghubungkan database...";
        }

        const [
            tarifRows,
            lintasanRows,
            stasiunRows
        ] =
            await Promise.all([

                loadSheet(
                    SHEETS.tarif
                ),

                loadSheet(
                    SHEETS.lintasan
                ),

                loadSheet(
                    SHEETS.stasiun
                )

            ]);


        const tarifHeader =
            createHeaderMap(
                tarifRows[0]
            );


        masterTarif =
            tarifRows
                .slice(1)
                .map(row => ({

                    kereta:
                        getCell(
                            row,
                            tarifHeader,
                            ["Kereta"]
                        ),

                    asal:
                        getCell(
                            row,
                            tarifHeader,
                            [
                                "Asal Tarif",
                                "Asal"
                            ]
                        ),

                    tujuan:
                        getCell(
                            row,
                            tarifHeader,
                            [
                                "Tujuan Tarif",
                                "Tujuan"
                            ]
                        ),

                    eksekutif:
                        getCell(
                            row,
                            tarifHeader,
                            ["Eksekutif"]
                        ),

                    bisnis:
                        getCell(
                            row,
                            tarifHeader,
                            ["Bisnis"]
                        ),

                    ekonomi:
                        getCell(
                            row,
                            tarifHeader,
                            ["Ekonomi"]
                        ),

                    arah:
                        getCell(
                            row,
                            tarifHeader,
                            ["Arah"]
                        ) || "PP",

                    status:
                        getCell(
                            row,
                            tarifHeader,
                            ["Status"]
                        ),

                    sumber:
                        getCell(
                            row,
                            tarifHeader,
                            ["Sumber"]
                        )

                }))
                .filter(
                    row =>
                        row.kereta &&
                        row.asal &&
                        row.tujuan
                );


        const lintasanHeader =
            createHeaderMap(
                lintasanRows[0]
            );


        masterLintasan =
            lintasanRows
                .slice(1)
                .map(row => ({

                    kereta:
                        getCell(
                            row,
                            lintasanHeader,
                            ["Kereta"]
                        ),

                    urutan:
                        Number(
                            getCell(
                                row,
                                lintasanHeader,
                                ["Urutan"]
                            )
                        ),

                    stasiun:
                        getCell(
                            row,
                            lintasanHeader,
                            ["Stasiun"]
                        ),

                    kode:
                        getCell(
                            row,
                            lintasanHeader,
                            [
                                "Kode Stasiun",
                                "Kode"
                            ]
                        )

                }))
                .filter(
                    row =>
                        row.kereta &&
                        row.stasiun &&
                        Number.isFinite(
                            row.urutan
                        )
                );


        const stasiunHeader =
            createHeaderMap(
                stasiunRows[0]
            );


        masterStasiun =
            stasiunRows
                .slice(1)
                .map(row => ({

                    kode:
                        getCell(
                            row,
                            stasiunHeader,
                            [
                                "Kode Stasiun",
                                "Kode"
                            ]
                        ),

                    nama:
                        getCell(
                            row,
                            stasiunHeader,
                            [
                                "Nama Stasiun",
                                "Stasiun"
                            ]
                        ),

                    alternatif:
                        getCell(
                            row,
                            stasiunHeader,
                            [
                                "Nama Alternatif",
                                "Alternatif"
                            ]
                        ),

                    kota:
                        getCell(
                            row,
                            stasiunHeader,
                            ["Kota"]
                        ),

                    daop:
                        getCell(
                            row,
                            stasiunHeader,
                            ["Daop"]
                        ),

                    aktif:
                        getCell(
                            row,
                            stasiunHeader,
                            ["Aktif"]
                        )

                }))
                .filter(
                    row =>
                        row.nama
                );


        masterLintasan.sort(
            (a, b) => {

                const train =
                    normalizeText(
                        a.kereta
                    ).localeCompare(
                        normalizeText(
                            b.kereta
                        ),
                        "id"
                    );

                if (train !== 0) {
                    return train;
                }

                return (
                    a.urutan -
                    b.urutan
                );
            }
        );


        const stationMap =
            new Map();


        masterStasiun.forEach(
            station => {

                const nama =
                    station.nama.trim();

                if (!nama) {
                    return;
                }

                const key =
                    normalizeText(
                        nama
                    );

                if (
                    !stationMap.has(key)
                ) {

                    stationMap.set(
                        key,
                        nama
                    );

                }

            }
        );


        stations =
            Array.from(
                stationMap.values()
            );


        stations.sort(
            (a, b) =>
                a.localeCompare(
                    b,
                    "id"
                )
        );


        databaseReady = true;

        hideLoading();


        if (status) {

            status.textContent =
                masterTarif.length +
                " tarif • " +
                masterLintasan.length +
                " lintasan • " +
                masterStasiun.length +
                " stasiun";

        }


    } catch (error) {

        console.error(
            "TARSUS FINDER ERROR:",
            error
        );

        databaseReady = false;

        hideLoading();

        showError(
            "Database gagal dimuat. " +
            error.message
        );

        if (status) {

            status.textContent =
                "Database gagal dimuat";

        }

    }

}
function getTrainRoute(kereta) {

    return masterLintasan
        .filter(
            item =>
                normalizeText(
                    item.kereta
                ) ===
                normalizeText(
                    kereta
                )
        )
        .sort(
            (a, b) =>
                a.urutan -
                b.urutan
        );

}


function getStationIndex(
    route,
    stationName
) {

    const target =
        normalizeText(
            stationName
        );

    return route.findIndex(
        item =>
            normalizeText(
                item.stasiun
            ) === target
    );

}


function isActiveTarif(tarif) {

    const value =
        normalizeText(
            tarif.status
        );

    if (!value) {
        return true;
    }

    return ![
        "nonaktif",
        "non aktif",
        "inactive",
        "tidak aktif",
        "false",
        "0"
    ].includes(value);

}


function isOneWay(arah) {

    const value =
        normalizeText(
            arah
        );

    return [
        "oneway",
        "one way",
        "searah"
    ].includes(value);

}


function findTarif(
    kereta,
    asalUser,
    tujuanUser
) {

    const route =
        getTrainRoute(
            kereta
        );

    if (!route.length) {
        return null;
    }


    const userStart =
        getStationIndex(
            route,
            asalUser
        );


    const userEnd =
        getStationIndex(
            route,
            tujuanUser
        );


    if (
        userStart === -1 ||
        userEnd === -1 ||
        userStart === userEnd
    ) {
        return null;
    }


    const candidates =
        masterTarif.filter(
            tarif => {

                if (
                    normalizeText(
                        tarif.kereta
                    ) !==
                    normalizeText(
                        kereta
                    )
                ) {
                    return false;
                }


                if (
                    !isActiveTarif(
                        tarif
                    )
                ) {
                    return false;
                }


                const tarifStart =
                    getStationIndex(
                        route,
                        tarif.asal
                    );


                const tarifEnd =
                    getStationIndex(
                        route,
                        tarif.tujuan
                    );


                if (
                    tarifStart === -1 ||
                    tarifEnd === -1
                ) {
                    return false;
                }


                const userMin =
                    Math.min(
                        userStart,
                        userEnd
                    );


                const userMax =
                    Math.max(
                        userStart,
                        userEnd
                    );


                const tarifMin =
                    Math.min(
                        tarifStart,
                        tarifEnd
                    );


                const tarifMax =
                    Math.max(
                        tarifStart,
                        tarifEnd
                    );


                if (
                    userMin < tarifMin ||
                    userMax > tarifMax
                ) {
                    return false;
                }


                if (
                    isOneWay(
                        tarif.arah
                    )
                ) {

                    const userForward =
                        userStart <
                        userEnd;

                    const tarifForward =
                        tarifStart <
                        tarifEnd;


                    if (
                        userForward !==
                        tarifForward
                    ) {
                        return false;
                    }

                }


                return true;

            }
        );


    if (
        !candidates.length
    ) {
        return null;
    }


    candidates.sort(
        (a, b) => {

            const aStart =
                getStationIndex(
                    getTrainRoute(
                        a.kereta
                    ),
                    a.asal
                );


            const aEnd =
                getStationIndex(
                    getTrainRoute(
                        a.kereta
                    ),
                    a.tujuan
                );


            const bStart =
                getStationIndex(
                    getTrainRoute(
                        b.kereta
                    ),
                    b.asal
                );


            const bEnd =
                getStationIndex(
                    getTrainRoute(
                        b.kereta
                    ),
                    b.tujuan
                );


            return (
                Math.abs(
                    aEnd -
                    aStart
                ) -
                Math.abs(
                    bEnd -
                    bStart
                )
            );

        }
    );


    return candidates[0];

}


function getAllTrains() {

    return [
        ...new Set(
            masterLintasan
                .map(
                    item =>
                        item.kereta
                )
                .filter(Boolean)
        )
    ];

}


function searchTarif() {

    hideError();


    if (!databaseReady) {

        resultCount.textContent =
            "Database belum siap";

        return;

    }


    const asal =
        asalInput.value.trim();


    const tujuan =
        tujuanInput.value.trim();


    if (
        !asal ||
        !tujuan
    ) {

        results.innerHTML = "";

        empty.style.display =
            "none";

        resultCount.textContent =
            "Isi stasiun asal dan tujuan";

        return;

    }


    if (
        normalizeText(asal) ===
        normalizeText(tujuan)
    ) {

        results.innerHTML = "";

        empty.style.display =
            "none";

        resultCount.textContent =
            "Asal dan tujuan tidak boleh sama";

        return;

    }


    results.innerHTML = "";

    empty.style.display =
        "none";


    const matches = [];


    getAllTrains().forEach(
        kereta => {

            const tarif =
                findTarif(
                    kereta,
                    asal,
                    tujuan
                );


            if (tarif) {

                matches.push({
                    kereta:
                        kereta,

                    tarif:
                        tarif
                });

            }

        }
    );


    if (
        !matches.length
    ) {

        resultCount.textContent =
            "0 kereta ditemukan";

        empty.style.display =
            "block";

        return;

    }


    matches.sort(
        (a, b) =>
            a.kereta.localeCompare(
                b.kereta,
                "id"
            )
    );


    renderResults(
        matches,
        asal,
        tujuan
    );

                }
function renderFareItem(
    label,
    value
) {

    if (
        value === null ||
        value === undefined ||
        String(value).trim() === ""
    ) {
        return "";
    }


    return `
        <div class="fare-item">

            <div class="fare-label">
                ${escapeHTML(label)}
            </div>

            <div class="fare-price">
                ${formatRupiah(value)}
            </div>

        </div>
    `;

}


function renderResults(
    matches,
    asal,
    tujuan
) {

    results.innerHTML = "";


    matches.forEach(
        (item, index) => {

            const tarif =
                item.tarif;


            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "result-card";


            card.style.animationDelay =
                (index * 0.05) +
                "s";


            card.innerHTML = `

                <div class="result-train">

                    🚆
                    ${escapeHTML(
                        item.kereta
                    )}

                </div>


                <div class="result-route">

                    ${escapeHTML(
                        asal
                    )}

                    →

                    ${escapeHTML(
                        tujuan
                    )}

                </div>


                <div class="special-route">

                    Tarif khusus mengacu pada:

                    <strong>

                        ${escapeHTML(
                            tarif.asal
                        )}

                        →

                        ${escapeHTML(
                            tarif.tujuan
                        )}

                    </strong>

                </div>


                <div class="fare-list">

                    ${renderFareItem(
                        "Eksekutif",
                        tarif.eksekutif
                    )}

                    ${renderFareItem(
                        "Bisnis",
                        tarif.bisnis
                    )}

                    ${renderFareItem(
                        "Ekonomi",
                        tarif.ekonomi
                    )}

                </div>

            `;


            results.appendChild(
                card
            );

        }
    );


    resultCount.textContent =
        matches.length +
        " kereta ditemukan";


    empty.style.display =
        "none";

}


function setupAutocomplete(
    input,
    container
) {

    if (
        !input ||
        !container
    ) {
        return;
    }


    input.addEventListener(
        "input",
        () => {

            const keyword =
                normalizeText(
                    input.value
                );


            container.innerHTML =
                "";


            if (!keyword) {
                return;
            }


            const matches =
                stations
                    .filter(
                        station =>
                            normalizeText(
                                station
                            ).includes(
                                keyword
                            )
                    )
                    .slice(0, 8);


            matches.forEach(
                station => {

                    const item =
                        document.createElement(
                            "div"
                        );


                    item.className =
                        "suggestion-item";


                    item.textContent =
                        station;


                    item.addEventListener(
                        "click",
                        () => {

                            input.value =
                                station;

                            container.innerHTML =
                                "";

                        }
                    );


                    container.appendChild(
                        item
                    );

                }
            );

        }
    );

}


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


            if (
                asalInput.value &&
                tujuanInput.value
            ) {

                searchTarif();

            }

        }
    );

}


if (searchBtn) {

    searchBtn.addEventListener(
        "click",
        searchTarif
    );

}


if (asalInput) {

    asalInput.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter"
            ) {

                searchTarif();

            }

        }
    );

}


if (tujuanInput) {

    tujuanInput.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter"
            ) {

                searchTarif();

            }

        }
    );

}


document.addEventListener(
    "click",
    event => {

        if (
            asalInput &&
            suggestionsAsal &&
            !asalInput.contains(
                event.target
            ) &&
            !suggestionsAsal.contains(
                event.target
            )
        ) {

            suggestionsAsal.innerHTML =
                "";

        }


        if (
            tujuanInput &&
            suggestionsTujuan &&
            !tujuanInput.contains(
                event.target
            ) &&
            !suggestionsTujuan.contains(
                event.target
            )
        ) {

            suggestionsTujuan.innerHTML =
                "";

        }

    }
);


setupAutocomplete(
    asalInput,
    suggestionsAsal
);


setupAutocomplete(
    tujuanInput,
    suggestionsTujuan
);


loadDatabase();
