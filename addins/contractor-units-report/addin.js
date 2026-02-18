/* Contractor Units Activity Report — MyGeotab Add-In. No backend; API only. */
(function () {
    "use strict";

    var U = window.CONTRACTOR_REPORT_UTILS;
    if (!U) throw new Error("reportUtils.js must load before addin.js");

    var CONTRACTOR_GROUP_ID = "b27A5";
    var HOME_ZONE_ID = "b1";
    var PREVIEW_ROWS = 200;
    var STOP_THRESHOLD_MS = 10 * 60 * 1000;

    var apiRef = null;
    var reportRows = [];
    var reportDateFrom = null;
    var reportDateTo = null;

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
        if (section) section.classList.add("hidden");
    }

    function showMessage(text, isError, detail) {
        var section = getEl("message-section");
        var msgEl = getEl("message-text");
        var detailsEl = getEl("message-details");
        var preEl = getEl("message-pre");
        if (!section || !msgEl) return;
        section.classList.remove("hidden");
        msgEl.textContent = text || "";
        msgEl.className = "message-text" + (isError ? " error" : "");
        if (detailsEl && preEl) {
            if (detail) {
                detailsEl.classList.remove("hidden");
                preEl.textContent = detail;
            } else {
                detailsEl.classList.add("hidden");
            }
        }
    }

    function hideMessage() {
        var section = getEl("message-section");
        if (section) section.classList.add("hidden");
    }

    function setExportEnabled(enabled) {
        var btn = getEl("export-excel-btn");
        if (btn) btn.disabled = !enabled;
    }

    function setGenerateEnabled(enabled) {
        var btn = getEl("generate-btn");
        if (btn) btn.disabled = !enabled;
    }

    function toISODate(d) {
        return d.toISOString ? d.toISOString().slice(0, 10) : "";
    }

    function toISODateTime(d) {
        if (!d || !d.toISOString) return "";
        return d.toISOString();
    }

    function dateKey(d) {
        return U.dateKey(d);
    }

    geotab.addin["contractorUnitsReport"] = function () {
        return {
            initialize: function (api, state, callback) {
                apiRef = api;
                hideProgress();
                hideMessage();
                setExportEnabled(false);
                setGenerateEnabled(true);

                var preset = getEl("timeframe-preset");
                var customGroup = getEl("custom-range-group");
                if (preset) {
                    preset.onchange = function () {
                        if (customGroup) customGroup.classList.toggle("hidden", preset.value !== "custom");
                    };
                    if (customGroup) customGroup.classList.toggle("hidden", preset.value !== "custom");
                }

                var genBtn = getEl("generate-btn");
                if (genBtn) genBtn.onclick = function () { onGenerate(api); };

                var exportBtn = getEl("export-excel-btn");
                if (exportBtn) exportBtn.onclick = function () { onExportExcel(); };

                callback();
            },
            focus: function (api, state) {
                apiRef = api;
            },
            blur: function () {}
        };
    };

    function getDateRangeFromUI() {
        var preset = getEl("timeframe-preset");
        var fromInput = getEl("from-date");
        var toInput = getEl("to-date");
        var to = new Date();
        var from = new Date();
        if (preset && preset.value === "custom" && fromInput && toInput) {
            from = new Date(fromInput.value || to);
            to = new Date(toInput.value || to);
        } else if (preset && preset.value === "lastMonth") {
            from.setMonth(from.getMonth() - 1);
            from.setDate(1);
            to = new Date(from.getFullYear(), from.getMonth() + 1, 0);
        } else {
            from.setDate(1);
        }
        return { from: from, to: to };
    }

    function setDefaultCustomDates() {
        var to = new Date();
        var from = new Date(to);
        from.setMonth(from.getMonth() - 1);
        var fromInput = getEl("from-date");
        var toInput = getEl("to-date");
        if (fromInput) fromInput.value = from.toISOString().slice(0, 10);
        if (toInput) toInput.value = to.toISOString().slice(0, 10);
    }

    function onGenerate(api) {
        if (!api) return;
        hideMessage();
        setGenerateEnabled(false);
        setExportEnabled(false);
        reportRows = [];
        var range = getDateRangeFromUI();
        var fromDate = range.from;
        var toDate = range.to;
        if (fromDate > toDate) {
            showMessage("Start date must be before end date.", true);
            setGenerateEnabled(true);
            return;
        }
        var fromStr = toISODateTime(fromDate);
        var toStr = toISODateTime(toDate);

        showProgress("Loading devices (Contractor Units)…");
        api.call("Get", {
            typeName: "Device",
            search: { groups: [{ id: CONTRACTOR_GROUP_ID }] }
        }, function (devices) {
            if (!devices || devices.length === 0) {
                hideProgress();
                setGenerateEnabled(true);
                showMessage("No devices in group Contractor Units (b27A5).", false);
                return;
            }
            showProgress("Loading Home zones…");
            api.call("Get", { typeName: "ZoneType" }, function (zoneTypes) {
                var homeTypeId = null;
                if (zoneTypes && zoneTypes.length) {
                    for (var i = 0; i < zoneTypes.length; i++) {
                        if (zoneTypes[i].name && zoneTypes[i].name.toLowerCase().indexOf("home") !== -1) {
                            homeTypeId = zoneTypes[i].id;
                            break;
                        }
                    }
                }
                function ensureHomeZoneB1(homeZones, next) {
                    var hasB1 = false;
                    for (var h = 0; h < homeZones.length; h++) {
                        if (homeZones[h].id === HOME_ZONE_ID) { hasB1 = true; break; }
                    }
                    if (hasB1) {
                        next(homeZones);
                        return;
                    }
                    api.call("Get", { typeName: "Zone", search: { id: HOME_ZONE_ID } }, function (zoneB1List) {
                        if (zoneB1List && zoneB1List.length > 0) {
                            homeZones = homeZones.slice();
                            homeZones.push(zoneB1List[0]);
                        }
                        next(homeZones);
                    }, function () {
                        next(homeZones);
                    });
                }
                function onHomeZonesLoaded(homeZones) {
                    homeZones = homeZones || [];
                    var allZones = homeZones.slice();
                    api.call("Get", { typeName: "Zone" }, function (allZonesResult) {
                        if (allZonesResult && allZonesResult.length) {
                            for (var a = 0; a < allZonesResult.length; a++) {
                                var already = false;
                                for (var b = 0; b < allZones.length; b++) {
                                    if (allZones[b].id === allZonesResult[a].id) { already = true; break; }
                                }
                                if (!already) allZones.push(allZonesResult[a]);
                            }
                        }
                        runPerDevice(api, devices, homeZones, allZones, fromStr, toStr, fromDate, toDate, 0);
                    }, function (err) {
                        runPerDevice(api, devices, homeZones, homeZones, fromStr, toStr, fromDate, toDate, 0);
                    });
                }
                if (homeTypeId) {
                    api.call("Get", {
                        typeName: "Zone",
                        search: { zoneTypes: [{ id: homeTypeId }] }
                    }, function (homeZones) {
                        ensureHomeZoneB1(homeZones || [], onHomeZonesLoaded);
                    }, function (err) {
                        api.call("Get", { typeName: "Zone", search: { id: HOME_ZONE_ID } }, function (zoneB1List) {
                            var homeZones = (zoneB1List && zoneB1List.length > 0) ? zoneB1List : [];
                            onHomeZonesLoaded(homeZones);
                        }, function (err2) {
                            hideProgress();
                            setGenerateEnabled(true);
                            showMessage("Unable to load zones. Check add-in permissions (Zones). Home zone id: " + HOME_ZONE_ID + ".", true, err && (err.message || JSON.stringify(err)));
                        });
                    });
                } else {
                    api.call("Get", { typeName: "Zone", search: { id: HOME_ZONE_ID } }, function (zoneB1List) {
                        var homeZones = (zoneB1List && zoneB1List.length > 0) ? zoneB1List : [];
                        if (homeZones.length === 0) {
                            hideProgress();
                            setGenerateEnabled(true);
                            showMessage("Home zone (id " + HOME_ZONE_ID + ") not found. Check that the zone exists.", false);
                            return;
                        }
                        onHomeZonesLoaded(homeZones);
                    }, function (err) {
                        hideProgress();
                        setGenerateEnabled(true);
                        showMessage("Unable to load home zone (id " + HOME_ZONE_ID + "). Check add-in permissions (Zones).", true, err && (err.message || JSON.stringify(err)));
                    });
                }
            }, function (err) {
                hideProgress();
                setGenerateEnabled(true);
                showMessage("Unable to load zone types. Check add-in permissions.", true, err && (err.message || JSON.stringify(err)));
            });
        }, function (err) {
            hideProgress();
            setGenerateEnabled(true);
            showMessage("Unable to load devices. Check add-in permissions (Devices) and that group b27A5 exists.", true, err && (err.message || JSON.stringify(err)));
        });
    }

    function runPerDevice(api, devices, homeZones, allZones, fromStr, toStr, fromDate, toDate, deviceIndex) {
        if (deviceIndex >= devices.length) {
            reportDateFrom = fromDate;
            reportDateTo = toDate;
            hideProgress();
            setGenerateEnabled(true);
            setExportEnabled(true);
            renderPreview();
            var subtitle = getEl("header-subtitle");
            if (subtitle) subtitle.textContent = "Group: Contractor Units (b27A5). " + toISODate(fromDate) + " to " + toISODate(toDate) + ". " + reportRows.length + " rows.";
            return;
        }
        var device = devices[deviceIndex];
        var deviceId = device.id;
        var deviceName = device.name || deviceId;
        var deviceSerialNumber = (device.serialNumber != null && device.serialNumber !== "") ? String(device.serialNumber) : "";
        showProgress("Processing device " + (deviceIndex + 1) + " of " + devices.length + ": " + deviceName + "…");

        api.multiCall([
            ["Get", {
                typeName: "Trip",
                search: { deviceSearch: { id: deviceId }, fromDate: fromStr, toDate: toStr }
            }],
            ["Get", {
                typeName: "LogRecord",
                search: { deviceSearch: { id: deviceId }, fromDate: fromStr, toDate: toStr }
            }]
        ], function (results) {
            var trips = (results && results[0]) ? results[0] : [];
            var logs = (results && results[1]) ? results[1] : [];
            if (trips && !trips.sort) trips = [];
            trips.sort(function (a, b) {
                return new Date(a.start).getTime() - new Date(b.start).getTime();
            });

            var dayKeys = [];
            var daySet = {};
            for (var d = new Date(fromDate.getTime()); d <= toDate; d.setDate(d.getDate() + 1)) {
                var k = dateKey(d);
                if (!daySet[k]) {
                    daySet[k] = true;
                    dayKeys.push(k);
                }
            }

            var rowsData = [];
            var coordsFlat = [];
            var coordToRowEntry = [];

            for (var di = 0; di < dayKeys.length; di++) {
                var dayKey = dayKeys[di];
                var dayStart = new Date(dayKey + "T00:00:00");
                var dayEnd = new Date(dayKey + "T23:59:59.999");
                var dayStartMs = dayStart.getTime();
                var dayEndMs = dayEnd.getTime();

                var dayTrips = [];
                for (var ti = 0; ti < trips.length; ti++) {
                    var st = new Date(trips[ti].start).getTime();
                    if (st >= dayStartMs && st <= dayEndMs) dayTrips.push(trips[ti]);
                }

                var startHomeZone = null;
                var firstTripStartMs = null;
                if (dayTrips.length > 0) {
                    firstTripStartMs = new Date(dayTrips[0].start).getTime();
                    var pos = U.getPositionAtTime(logs, firstTripStartMs);
                    if (pos && pos.lat != null && pos.lng != null) {
                        for (var hz = 0; hz < homeZones.length; hz++) {
                            if (U.pointInZone(pos.lat, pos.lng, homeZones[hz])) {
                                startHomeZone = homeZones[hz];
                                break;
                            }
                        }
                    }
                    if (!startHomeZone && logs.length) {
                        for (var li = logs.length - 1; li >= 0; li--) {
                            var logT = new Date(logs[li].dateTime).getTime();
                            if (logT < dayStartMs) break;
                            if (logT > firstTripStartMs) continue;
                            var lat = logs[li].latitude;
                            var lng = logs[li].longitude;
                            if (lat == null || lng == null) continue;
                            for (var hz2 = 0; hz2 < homeZones.length; hz2++) {
                                if (U.pointInZone(lat, lng, homeZones[hz2])) {
                                    startHomeZone = homeZones[hz2];
                                    break;
                                }
                            }
                            if (startHomeZone) break;
                        }
                    }
                }

                var ignitionSeconds = 0;
                var idleInZoneSeconds = 0;
                var idleOutZoneSeconds = 0;
                /* Idling = ignition on and no movement (Trip.idlingDuration); split in-zone vs out-of-zone by position at trip end vs Start Home Zone */
                for (var t = 0; t < dayTrips.length; t++) {
                    var trip = dayTrips[t];
                    var driveSec = U.getTotalSeconds(trip.drivingDuration);
                    var idleSec = U.getTotalSeconds(trip.idlingDuration);
                    if (driveSec === 0 && idleSec === 0 && trip.start && trip.stop) {
                        driveSec = (new Date(trip.stop).getTime() - new Date(trip.start).getTime()) / 1000;
                    }
                    ignitionSeconds += driveSec + idleSec;
                    var stopMs = new Date(trip.stop).getTime();
                    var posEnd = U.getPositionAtTime(logs, stopMs);
                    var inZone = startHomeZone && posEnd && U.pointInZone(posEnd.lat, posEnd.lng, startHomeZone);
                    if (inZone) idleInZoneSeconds += idleSec;
                    else idleOutZoneSeconds += idleSec;
                }

                var stops = [];
                for (var s = 0; s < dayTrips.length - 1; s++) {
                    var gapStart = new Date(dayTrips[s].stop).getTime();
                    var gapEnd = new Date(dayTrips[s + 1].start).getTime();
                    var gapMs = gapEnd - gapStart;
                    if (gapMs >= STOP_THRESHOLD_MS) {
                        stops.push({
                            durationMs: gapMs,
                            position: U.getPositionAtTime(logs, gapStart)
                        });
                    }
                }
                var stopCount = stops.length;
                var totalStoppedMs = 0;
                for (var si = 0; si < stops.length; si++) totalStoppedMs += stops[si].durationMs;
                var locationParts = [];
                for (var sl = 0; sl < stops.length; sl++) {
                    var pos = stops[sl].position;
                    if (!pos || pos.lat == null || pos.lng == null) continue;
                    if (startHomeZone && U.pointInZone(pos.lat, pos.lng, startHomeZone)) continue;
                    var zoneName = U.findZoneAtPoint(pos.lat, pos.lng, allZones, startHomeZone ? startHomeZone.id : null);
                    if (zoneName) {
                        locationParts.push(zoneName);
                    } else {
                        locationParts.push({ needAddress: true, lat: pos.lat, lng: pos.lng });
                        coordsFlat.push({ latitude: pos.lat, longitude: pos.lng });
                        coordToRowEntry.push({ rowIndex: di, partIndex: locationParts.length - 1 });
                    }
                }

                var shiftStartMs = dayTrips.length ? new Date(dayTrips[0].start).getTime() : null;
                var shiftEndMs = dayTrips.length ? new Date(dayTrips[dayTrips.length - 1].stop).getTime() : null;
                var shiftDurationMs = (shiftStartMs != null && shiftEndMs != null) ? (shiftEndMs - shiftStartMs) : 0;
                var allowedBreakMin = U.getAllowedBreakMinutes(shiftDurationMs);
                var breakStopMinutes = 0;
                var adjustedStopCount = stopCount;
                var adjustedStoppedMs = totalStoppedMs;
                if (stops.length > 0) {
                    var bestIdx = -1;
                    var bestDiff = Infinity;
                    for (var bi = 0; bi < stops.length; bi++) {
                        var durMin = stops[bi].durationMs / (60 * 1000);
                        if (durMin < allowedBreakMin) continue;
                        var diff = durMin - allowedBreakMin;
                        if (diff < bestDiff) {
                            bestDiff = diff;
                            bestIdx = bi;
                        }
                    }
                    if (bestIdx >= 0) {
                        breakStopMinutes = stops[bestIdx].durationMs / (60 * 1000);
                        adjustedStopCount = stopCount - 1;
                        var deductionMs = Math.min(stops[bestIdx].durationMs, allowedBreakMin * 60 * 1000);
                        adjustedStoppedMs = totalStoppedMs - deductionMs;
                    }
                }

                var stopLocationsStr = [];
                for (var pi = 0; pi < locationParts.length; pi++) {
                    var part = locationParts[pi];
                    stopLocationsStr.push(typeof part === "string" ? part : U.formatLatLng(part.lat, part.lng));
                }
                rowsData.push({
                    Date: dayKey,
                    DeviceName: deviceName,
                    SerialNumber: deviceSerialNumber,
                    StartHomeZone: startHomeZone ? (startHomeZone.name || "") : "",
                    IgnitionOnTimeSeconds: ignitionSeconds,
                    IdleInZoneSeconds: idleInZoneSeconds,
                    IdleOutZoneSeconds: idleOutZoneSeconds,
                    StopCount: stopCount,
                    StopLocations: stopLocationsStr.join("; "),
                    TotalStoppedTimeSeconds: totalStoppedMs / 1000,
                    AllowedBreakMinutes: allowedBreakMin,
                    BreakStopMatchedMinutes: breakStopMinutes,
                    AdjustedStopCount: adjustedStopCount,
                    AdjustedStoppedTimeSeconds: adjustedStoppedMs / 1000,
                    _locationParts: locationParts
                });
            }

            function finishDeviceAndContinue() {
                for (var r = 0; r < rowsData.length; r++) {
                    delete rowsData[r]._locationParts;
                }
                for (var r = 0; r < rowsData.length; r++) {
                    reportRows.push(rowsData[r]);
                }
                runPerDevice(api, devices, homeZones, allZones, fromStr, toStr, fromDate, toDate, deviceIndex + 1);
            }

            if (coordsFlat.length === 0) {
                finishDeviceAndContinue();
                return;
            }

            showProgress("Looking up addresses for " + deviceName + " (" + coordsFlat.length + " locations)…");
            api.call("GetAddresses", { coordinates: coordsFlat }, function (addresses) {
                var numAddr = (addresses && addresses.length) ? addresses.length : 0;
                for (var ai = 0; ai < numAddr && ai < coordToRowEntry.length; ai++) {
                    var ref = coordToRowEntry[ai];
                    var part = rowsData[ref.rowIndex]._locationParts[ref.partIndex];
                    if (part && part.needAddress) {
                        var addrStr = U.formatAddress(addresses[ai]);
                        rowsData[ref.rowIndex]._locationParts[ref.partIndex] = addrStr || U.formatLatLng(part.lat, part.lng);
                    }
                }
                for (var ri = 0; ri < rowsData.length; ri++) {
                    var parts = rowsData[ri]._locationParts;
                    var strs = [];
                    for (var p = 0; p < parts.length; p++) {
                        strs.push(typeof parts[p] === "string" ? parts[p] : U.formatLatLng(parts[p].lat, parts[p].lng));
                    }
                    rowsData[ri].StopLocations = strs.join("; ");
                }
                finishDeviceAndContinue();
            }, function (err) {
                for (var ri = 0; ri < rowsData.length; ri++) {
                    var parts = rowsData[ri]._locationParts;
                    var strs = [];
                    for (var p = 0; p < parts.length; p++) {
                        strs.push(typeof parts[p] === "string" ? parts[p] : U.formatLatLng(parts[p].lat, parts[p].lng));
                    }
                    rowsData[ri].StopLocations = strs.join("; ");
                }
                finishDeviceAndContinue();
            });
        }, function (err) {
            hideProgress();
            setGenerateEnabled(true);
            showMessage("Error loading trips or log records for " + (device.name || deviceId) + ". Check permissions (Trips, LogRecord).", true, err && (err.message || JSON.stringify(err)));
        });
    }

    var COLUMNS = [
        { key: "Date", label: "Date" },
        { key: "DeviceName", label: "Device Name" },
        { key: "SerialNumber", label: "Geotab Serial Number" },
        { key: "StartHomeZone", label: "Start Home Zone" },
        { key: "IgnitionOnTimeSeconds", label: "Ignition On Time", format: "duration" },
        { key: "IdleInZoneSeconds", label: "Idle In Zone", format: "duration" },
        { key: "IdleOutZoneSeconds", label: "Idle Out Zone", format: "duration" },
        { key: "StopCount", label: "Stop Count" },
        { key: "StopLocations", label: "Stop Locations" },
        { key: "TotalStoppedTimeSeconds", label: "Total Stopped Time", format: "duration" },
        { key: "AllowedBreakMinutes", label: "Allowed Break (min)" },
        { key: "BreakStopMatchedMinutes", label: "Break Stop Matched (min)" },
        { key: "AdjustedStopCount", label: "Adjusted Stop Count" },
        { key: "AdjustedStoppedTimeSeconds", label: "Adjusted Stopped Time", format: "duration" }
    ];

    function renderPreview() {
        var section = getEl("preview-section");
        var thead = getEl("preview-thead");
        var tbody = getEl("preview-tbody");
        if (!section || !thead || !tbody) return;
        section.classList.remove("hidden");
        thead.innerHTML = "";
        tbody.innerHTML = "";
        var tr = document.createElement("tr");
        for (var c = 0; c < COLUMNS.length; c++) {
            var th = document.createElement("th");
            th.scope = "col";
            th.textContent = COLUMNS[c].label;
            tr.appendChild(th);
        }
        thead.appendChild(tr);
        var limit = Math.min(PREVIEW_ROWS, reportRows.length);
        for (var r = 0; r < limit; r++) {
            var row = reportRows[r];
            var tr2 = document.createElement("tr");
            for (var c2 = 0; c2 < COLUMNS.length; c2++) {
                var td = document.createElement("td");
                var val = row[COLUMNS[c2].key];
                if (COLUMNS[c2].format === "duration" && typeof val === "number") {
                    td.textContent = U.formatDurationHHMM(val);
                } else if (val !== undefined && val !== null) {
                    td.textContent = val;
                } else {
                    td.textContent = "";
                }
                tr2.appendChild(td);
            }
            tbody.appendChild(tr2);
        }
    }

    function onExportExcel() {
        if (typeof XLSX === "undefined") {
            showMessage("Excel library not loaded. Refresh the page.", true);
            return;
        }
        if (!reportRows.length) {
            showMessage("No data to export. Generate the report first.", false);
            return;
        }
        var headers = [];
        for (var c = 0; c < COLUMNS.length; c++) headers.push(COLUMNS[c].label);
        var data = [headers];
        for (var r = 0; r < reportRows.length; r++) {
            var row = reportRows[r];
            var arr = [];
            for (var c2 = 0; c2 < COLUMNS.length; c2++) {
                var key = COLUMNS[c2].key;
                var val = row[key];
                if (COLUMNS[c2].format === "duration" && typeof val === "number") {
                    var h = Math.floor(val / 3600);
                    var m = Math.floor((val % 3600) / 60);
                    arr.push(h + ":" + (m < 10 ? "0" : "") + m);
                } else {
                    arr.push(val !== undefined && val !== null ? val : "");
                }
            }
            data.push(arr);
        }
        var ws = XLSX.utils.aoa_to_sheet(data);
        var colWidths = [];
        for (var w = 0; w < COLUMNS.length; w++) {
            colWidths.push({ wch: Math.min(Math.max(COLUMNS[w].label.length + 2, 12), 50) });
        }
        ws["!cols"] = colWidths;
        if (ws["!freeze"] === undefined) {
            ws["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", state: "frozen" };
        }
        if (ws["!autofilter"] === undefined && data.length > 1) {
            var lastCol = COLUMNS.length < 27 ? String.fromCharCode(64 + COLUMNS.length) : "A" + String.fromCharCode(64 + COLUMNS.length - 26);
            ws["!autofilter"] = { ref: "A1:" + lastCol + data.length };
        }
        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Report");
        var fromStr = reportDateFrom ? toISODate(reportDateFrom).replace(/-/g, "") : "";
        var toStr = reportDateTo ? toISODate(reportDateTo).replace(/-/g, "") : "";
        var filename = "Contractor_Units_Activity_Report_" + fromStr + "-" + toStr + ".xlsx";
        XLSX.writeFile(wb, filename);
        hideMessage();
    }

    (function initDates() {
        setDefaultCustomDates();
    })();
})();
