(function () {
    "use strict";

    var ZONE_ID = "b2";
    var apiRef = null;
    var devices = [];
    var deviceNameMap = {};
    var lastSummary = null;
    var lastDeviceRows = [];

    function getEl(id) {
        return document.getElementById(id);
    }

    function showProgress(text) {
        var section = getEl("progress-section");
        var el = getEl("progress-text");
        if (section && el) {
            section.classList.remove("hidden");
            el.textContent = text || "Preparing…";
        }
    }

    function hideProgress() {
        var section = getEl("progress-section");
        if (section) {
            section.classList.add("hidden");
        }
    }

    function showMessage(text, isError) {
        var section = getEl("message-section");
        var msgEl = getEl("message-text");
        if (!section || !msgEl) {
            return;
        }
        section.classList.remove("hidden");
        msgEl.textContent = text || "";
        msgEl.className = "message-text" + (isError ? " error" : "");
    }

    function hideMessage() {
        var section = getEl("message-section");
        if (section) {
            section.classList.add("hidden");
        }
    }

    function setCalculateEnabled(enabled) {
        var btn = getEl("calculate-btn");
        if (btn) {
            btn.disabled = !enabled;
        }
    }

    function setExportEnabled(enabled) {
        var btn = getEl("export-excel-btn");
        if (btn) {
            btn.disabled = !enabled;
        }
    }

    function setResults(totalMiles, insideMiles, outsideMiles, label) {
        var resultsSection = getEl("results-section");
        var totalEl = getEl("total-miles");
        var inEl = getEl("inside-miles");
        var outEl = getEl("outside-miles");
        var noteEl = getEl("results-note");
        if (!resultsSection || !totalEl || !inEl || !outEl) {
            return;
        }
        resultsSection.classList.remove("hidden");
        totalEl.textContent = totalMiles.toFixed(1);
        inEl.textContent = insideMiles.toFixed(1);
        outEl.textContent = outsideMiles.toFixed(1);
        if (noteEl && label) {
            noteEl.textContent = label;
        }
    }

    function setDefaultDates() {
        var to = new Date();
        var from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
        var fromInput = getEl("from-date");
        var toInput = getEl("to-date");
        if (fromInput) {
            fromInput.value = from.toISOString().slice(0, 10);
        }
        if (toInput) {
            toInput.value = to.toISOString().slice(0, 10);
        }
        var preset = getEl("timeframe-preset");
        var customGroup = getEl("custom-range-group");
        if (preset && customGroup) {
            customGroup.classList.add("hidden");
        }
    }

    function getDateRangeFromUI() {
        var preset = getEl("timeframe-preset");
        var fromInput = getEl("from-date");
        var toInput = getEl("to-date");
        var now = new Date();
        var from = new Date(now);
        var to = new Date(now);

        if (preset && preset.value === "last7") {
            from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (preset && preset.value === "thisMonth") {
            from = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (preset && preset.value === "lastMonth") {
            var m = now.getMonth() - 1;
            var y = now.getFullYear();
            if (m < 0) {
                m = 11;
                y = y - 1;
            }
            from = new Date(y, m, 1);
            to = new Date(y, m + 1, 0, 23, 59, 59, 999);
        } else if (preset && preset.value === "custom" && fromInput && toInput) {
            if (fromInput.value) {
                from = new Date(fromInput.value);
            }
            if (toInput.value) {
                to = new Date(toInput.value);
                to.setHours(23, 59, 59, 999);
            }
        } else {
            from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        }

        return { from: from, to: to };
    }

    function toIsoDateTime(d) {
        return d && d.toISOString ? d.toISOString() : "";
    }

    function haversineMeters(lat1, lon1, lat2, lon2) {
        if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
            return 0;
        }
        var R = 6371000;
        var p1 = lat1 * Math.PI / 180;
        var p2 = lat2 * Math.PI / 180;
        var dLat = (lat2 - lat1) * Math.PI / 180;
        var dLon = (lon2 - lon1) * Math.PI / 180;
        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    function pointInPolygon(lat, lng, points) {
        var n = points.length;
        var inside = false;
        var j = n - 1;
        for (var i = 0; i < n; i++) {
            var xi = points[i].y != null ? points[i].y : points[i].latitude;
            var yi = points[i].x != null ? points[i].x : points[i].longitude;
            var xj = points[j].y != null ? points[j].y : points[j].latitude;
            var yj = points[j].x != null ? points[j].x : points[j].longitude;
            if (xi == null) {
                xi = points[i].lat;
            }
            if (yi == null) {
                yi = points[i].lng;
            }
            if (xj == null) {
                xj = points[j].lat;
            }
            if (yj == null) {
                yj = points[j].lng;
            }
            var intersect = ((yi > lng) !== (yj > lng)) &&
                (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
            if (intersect) {
                inside = !inside;
            }
            j = i;
        }
        return inside;
    }

    function isInsideZone(lat, lng, zone) {
        if (lat == null || lng == null || !zone || !zone.points || zone.points.length < 3) {
            return false;
        }
        return pointInPolygon(lat, lng, zone.points);
    }

    function populateDevicesSelect() {
        var select = getEl("device-select");
        if (!select) {
            return;
        }
        while (select.options.length > 1) {
            select.remove(1);
        }
        for (var i = 0; i < devices.length; i++) {
            var d = devices[i];
            deviceNameMap[d.id] = d.name || d.serialNumber || d.id;
            var opt = document.createElement("option");
            opt.value = d.id;
            opt.textContent = d.name || d.serialNumber || d.id;
            select.appendChild(opt);
        }
    }

    function onCalculate(api) {
        if (!api) {
            return;
        }
        hideMessage();
        setCalculateEnabled(false);
        setExportEnabled(false);
        showProgress("Preparing…");

        var range = getDateRangeFromUI();
        var fromDate = range.from;
        var toDate = range.to;
        if (fromDate > toDate) {
            hideProgress();
            setCalculateEnabled(true);
            showMessage("Start date must be before end date.", true);
            return;
        }

        var deviceSelect = getEl("device-select");
        var selectedDeviceId = deviceSelect ? deviceSelect.value : "all";

        var fromStr = toIsoDateTime(fromDate);
        var toStr = toIsoDateTime(toDate);

        showProgress("Loading zone and diagnostics…");
        api.multiCall([
            ["Get", { typeName: "Zone", search: { id: ZONE_ID } }],
            ["Get", {
                typeName: "StatusData",
                search: {
                    diagnosticSearch: { id: "DiagnosticOdometerId" },
                    fromDate: fromStr,
                    toDate: toStr
                }
            }],
            ["Get", {
                typeName: "StatusData",
                search: {
                    diagnosticSearch: { id: "DiagnosticEngineHoursId" },
                    fromDate: fromStr,
                    toDate: toStr
                }
            }]
        ], function (zoneResults) {
            var zones = zoneResults && zoneResults[0] ? zoneResults[0] : [];
            var odoStatus = zoneResults && zoneResults[1] ? zoneResults[1] : [];
            var engStatus = zoneResults && zoneResults[2] ? zoneResults[2] : [];
            if (!zones || zones.length === 0) {
                hideProgress();
                setCalculateEnabled(true);
                showMessage("Zone with id " + ZONE_ID + " not found. Check that the zone exists and the user has Zone permissions.", true);
                return;
            }

            function runWithLogs(logs) {
                if (!logs || !logs.length) {
                    hideProgress();
                    setCalculateEnabled(true);
                    showMessage("No GPS logs found for the selected range and vehicle scope.", false);
                    setResults(0, 0, 0, "No data for the selected period.");
                    lastSummary = null;
                    lastDeviceRows = [];
                    renderDeviceTable([]);
                    return;
                }
                var zone = zones[0];
                showProgress("Computing distances inside and outside zone " + ZONE_ID + "…");
                var odoMap = {};
                var engMap = {};
                var i, r, deviceId, dateMs, best;
                for (i = 0; i < odoStatus.length; i++) {
                    r = odoStatus[i];
                    if (!r || !r.device || !r.device.id || typeof r.data !== "number") continue;
                    deviceId = r.device.id;
                    dateMs = new Date(r.dateTime).getTime();
                    best = odoMap[deviceId];
                    if (best == null || dateMs > best.dateMs) {
                        odoMap[deviceId] = { dateMs: dateMs, miles: r.data / 1609.34 };
                    }
                }
                for (i = 0; i < engStatus.length; i++) {
                    r = engStatus[i];
                    if (!r || !r.device || !r.device.id || typeof r.data !== "number") continue;
                    deviceId = r.device.id;
                    dateMs = new Date(r.dateTime).getTime();
                    best = engMap[deviceId];
                    if (best == null || dateMs > best.dateMs) {
                        engMap[deviceId] = { dateMs: dateMs, hours: r.data / 3600 };
                    }
                }
                var odoValues = {};
                for (var id in odoMap) { if (odoMap.hasOwnProperty(id)) odoValues[id] = odoMap[id].miles; }
                var engValues = {};
                for (var id in engMap) { if (engMap.hasOwnProperty(id)) engValues[id] = engMap[id].hours; }
                var totals = computeTotalsFromLogs(logs, zone, deviceNameMap, odoValues, engValues);
                hideProgress();
                setCalculateEnabled(true);
                setExportEnabled(true);
                lastSummary = {
                    totalMiles: totals.totalMiles,
                    insideMiles: totals.insideMiles,
                    outsideMiles: totals.outsideMiles,
                    fromDate: fromDate,
                    toDate: toDate,
                    points: logs.length
                };
                lastDeviceRows = totals.perDevice || [];
                var label = "Mileage (total, inside zone, outside zone) is for the entire period " +
                    fromDate.toISOString().slice(0, 10) + " to " + toDate.toISOString().slice(0, 10) +
                    " (" + logs.length + " GPS points). Odometer and engine hours are the values at period end.";
                setResults(totals.totalMiles, totals.insideMiles, totals.outsideMiles, label);
                renderDeviceTable(lastDeviceRows);
            }

            if (selectedDeviceId && selectedDeviceId !== "all") {
                showProgress("Loading GPS logs for selected vehicle…");
                api.call("Get", {
                    typeName: "LogRecord",
                    search: {
                        deviceSearch: { id: selectedDeviceId },
                        fromDate: fromStr,
                        toDate: toStr
                    }
                }, function (logs) {
                    runWithLogs(logs || []);
                }, function (err) {
                    hideProgress();
                    setCalculateEnabled(true);
                    showMessage("Error loading log records. Check permissions (LogRecord).", true);
                });
            } else {
                showProgress("Loading GPS logs per vehicle (to avoid API limit)…");
                var BATCH_SIZE = 25;
                var allLogs = [];
                var deviceIndex = 0;

                function fetchNextBatch() {
                    if (deviceIndex >= devices.length) {
                        runWithLogs(allLogs);
                        return;
                    }
                    var batch = devices.slice(deviceIndex, deviceIndex + BATCH_SIZE);
                    deviceIndex += batch.length;
                    showProgress("Loading GPS logs for vehicles " + (deviceIndex - batch.length + 1) + "–" + deviceIndex + " of " + devices.length + "…");
                    var calls = batch.map(function (d) {
                        return ["Get", {
                            typeName: "LogRecord",
                            search: {
                                deviceSearch: { id: d.id },
                                fromDate: fromStr,
                                toDate: toStr
                            }
                        }];
                    });
                    api.multiCall(calls, function (results) {
                        var j;
                        for (j = 0; j < (results || []).length; j++) {
                            if (results[j] && results[j].length) {
                                allLogs.push.apply(allLogs, results[j]);
                            }
                        }
                        fetchNextBatch();
                    }, function (err) {
                        hideProgress();
                        setCalculateEnabled(true);
                        showMessage("Error loading log records for some vehicles. Check permissions (LogRecord).", true);
                    });
                }
                fetchNextBatch();
            }
        }, function (err) {
            hideProgress();
            setCalculateEnabled(true);
            showMessage("Error loading zone or diagnostics. Check permissions (Zone, StatusData).", true);
        });
    }

    function computeTotalsFromLogs(logs, zone, nameMap, odoMap, engMap) {
        var totalMeters = 0;
        var insideMeters = 0;
        var outsideMeters = 0;
        var perDeviceMeters = {};
        if (!logs || logs.length < 2) {
            return { totalMiles: 0, insideMiles: 0, outsideMiles: 0, perDevice: [] };
        }
        logs.sort(function (a, b) {
            var ta = new Date(a.dateTime).getTime();
            var tb = new Date(b.dateTime).getTime();
            return ta - tb;
        });
        for (var i = 1; i < logs.length; i++) {
            var prev = logs[i - 1];
            var curr = logs[i];
            var prevDevice = prev.device && prev.device.id;
            var currDevice = curr.device && curr.device.id;
            if (!prevDevice || !currDevice || prevDevice !== currDevice) {
                continue;
            }
            var lat1 = prev.latitude;
            var lon1 = prev.longitude;
            var lat2 = curr.latitude;
            var lon2 = curr.longitude;
            var dist = haversineMeters(lat1, lon1, lat2, lon2);
            if (!dist || dist <= 0) {
                continue;
            }
            totalMeters += dist;
            var prevIn = isInsideZone(lat1, lon1, zone);
            var currIn = isInsideZone(lat2, lon2, zone);
            if (!perDeviceMeters[prevDevice]) {
                perDeviceMeters[prevDevice] = {
                    total: 0,
                    inside: 0,
                    outside: 0
                };
            }
            var devTotals = perDeviceMeters[prevDevice];
            if (prevIn && currIn) {
                insideMeters += dist;
                devTotals.inside += dist;
                devTotals.total += dist;
            } else if (!prevIn && !currIn) {
                outsideMeters += dist;
                devTotals.outside += dist;
                devTotals.total += dist;
            } else {
                insideMeters += dist / 2;
                outsideMeters += dist / 2;
                devTotals.inside += dist / 2;
                devTotals.outside += dist / 2;
                devTotals.total += dist;
            }
        }
        var metersPerMile = 1609.34;
        var insideMiles = insideMeters / metersPerMile;
        var outsideMiles = outsideMeters / metersPerMile;
        var totalMiles = insideMiles + outsideMiles;
        var perDeviceRows = [];
        for (var id in perDeviceMeters) {
            if (!perDeviceMeters.hasOwnProperty(id)) {
                continue;
            }
            var m = perDeviceMeters[id];
            var odoMiles = odoMap && typeof odoMap[id] === "number" ? odoMap[id] : null;
            var engHours = engMap && typeof engMap[id] === "number" ? engMap[id] : null;
            perDeviceRows.push({
                deviceId: id,
                deviceName: (nameMap && nameMap[id]) ? nameMap[id] : id,
                totalMiles: m.total / metersPerMile,
                insideMiles: m.inside / metersPerMile,
                outsideMiles: m.outside / metersPerMile,
                odometerMiles: odoMiles,
                engineHours: engHours
            });
        }
        perDeviceRows.sort(function (a, b) {
            if (a.deviceName < b.deviceName) return -1;
            if (a.deviceName > b.deviceName) return 1;
            return 0;
        });
        return {
            totalMiles: totalMiles,
            insideMiles: insideMiles,
            outsideMiles: outsideMiles,
            perDevice: perDeviceRows
        };
    }

    function renderDeviceTable(perDeviceRows) {
        var thead = getEl("device-table-head");
        var tbody = getEl("device-table-body");
        if (!thead || !tbody) {
            return;
        }
        thead.innerHTML = "";
        tbody.innerHTML = "";
        if (!perDeviceRows || !perDeviceRows.length) {
            return;
        }
        var headerRow = document.createElement("tr");
        var headers = [
            "Vehicle",
            "Total miles",
            "Miles inside zone b2",
            "Miles outside zone b2",
            "Odometer at period end (mi)",
            "Engine hours at period end"
        ];
        for (var i = 0; i < headers.length; i++) {
            var th = document.createElement("th");
            th.scope = "col";
            th.textContent = headers[i];
            headerRow.appendChild(th);
        }
        thead.appendChild(headerRow);
        for (var r = 0; r < perDeviceRows.length; r++) {
            var row = perDeviceRows[r];
            var tr = document.createElement("tr");
            var cols = [
                row.deviceName,
                row.totalMiles,
                row.insideMiles,
                row.outsideMiles,
                row.odometerMiles,
                row.engineHours
            ];
            for (var c = 0; c < cols.length; c++) {
                var td = document.createElement("td");
                if (c === 0) {
                    td.textContent = cols[c];
                } else if (c >= 1 && c <= 4) {
                    td.textContent = typeof cols[c] === "number" ? cols[c].toFixed(1) : "";
                } else {
                    td.textContent = typeof cols[c] === "number" ? cols[c].toFixed(2) : "";
                }
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        }
    }

    function onExportExcel() {
        if (typeof XLSX === "undefined") {
            showMessage("Excel library not loaded. Refresh the page.", true);
            return;
        }
        if (!lastDeviceRows || !lastDeviceRows.length || !lastSummary) {
            showMessage("No data to export. Calculate results first.", false);
            return;
        }
        var data = [];
        data.push([
            "Vehicle",
            "Total miles",
            "Miles inside zone b2",
            "Miles outside zone b2",
            "Odometer at period end (mi)",
            "Engine hours at period end"
        ]);
        for (var i = 0; i < lastDeviceRows.length; i++) {
            var r = lastDeviceRows[i];
            data.push([
                r.deviceName,
                Number(r.totalMiles.toFixed(1)),
                Number(r.insideMiles.toFixed(1)),
                Number(r.outsideMiles.toFixed(1)),
                r.odometerMiles != null ? Number(r.odometerMiles.toFixed(1)) : "",
                r.engineHours != null ? Number(r.engineHours.toFixed(2)) : ""
            ]);
        }
        var ws = XLSX.utils.aoa_to_sheet(data);
        var colWidths = [
            { wch: 24 },
            { wch: 14 },
            { wch: 22 },
            { wch: 22 },
            { wch: 26 },
            { wch: 24 }
        ];
        ws["!cols"] = colWidths;
        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Zone mileage");
        var fromStr = lastSummary.fromDate ? lastSummary.fromDate.toISOString().slice(0, 10).replace(/-/g, "") : "";
        var toStr = lastSummary.toDate ? lastSummary.toDate.toISOString().slice(0, 10).replace(/-/g, "") : "";
        var filename = "Zone_Mileage_b2_" + fromStr + "-" + toStr + ".xlsx";
        XLSX.writeFile(wb, filename);
        hideMessage();
    }

    geotab.addin["zoneMileageReport"] = function () {
        return {
            initialize: function (api, state, callback) {
                apiRef = api;
                hideProgress();
                hideMessage();
                setCalculateEnabled(true);
                setDefaultDates();

                var preset = getEl("timeframe-preset");
                var customGroup = getEl("custom-range-group");
                if (preset && customGroup) {
                    preset.onchange = function () {
                        var isCustom = preset.value === "custom";
                        customGroup.classList.toggle("hidden", !isCustom);
                    };
                }

                var btn = getEl("calculate-btn");
                if (btn) {
                    btn.onclick = function () {
                        onCalculate(api);
                    };
                }

                var exportBtn = getEl("export-excel-btn");
                if (exportBtn) {
                    exportBtn.onclick = function () {
                        onExportExcel();
                    };
                }

                showProgress("Loading vehicles…");
                api.call("Get", { typeName: "Device" }, function (result) {
                    devices = result || [];
                    populateDevicesSelect();
                    hideProgress();
                    callback();
                }, function () {
                    devices = [];
                    populateDevicesSelect();
                    hideProgress();
                    callback();
                });
            },
            focus: function (api, state) {
                apiRef = api;
            },
            blur: function () {
            }
        };
    };
})();

