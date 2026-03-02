/* Contractor Units Activity Report — MyGeotab Add-In. No backend; API only. */
(function () {
    "use strict";

    var U = window.CONTRACTOR_REPORT_UTILS;
    if (!U) throw new Error("reportUtils.js must load before addin.js");

    var CONTRACTOR_GROUP_ID = "b27A5";
    var HOME_ZONE_ID = "b1";
    var PREVIEW_ROWS = 200;
    var STOP_THRESHOLD_MS = 10 * 60 * 1000;
    var ADDRESS_LOOKUP_ENABLED = true;

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

    function nominatimReverse(lat, lng, callback) {
        var url = "https://nominatim.openstreetmap.org/reverse?lat=" + encodeURIComponent(lat) + "&lon=" + encodeURIComponent(lng) + "&format=json";
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url);
        xhr.setRequestHeader("User-Agent", "ContractorUnitsReportAddIn/1.0 (MyGeotab Add-In)");
        xhr.onload = function () {
            if (xhr.status === 200) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    callback(null, data.display_name || U.formatAddress(data));
                } catch (e) {
                    callback(e);
                }
            } else {
                callback(new Error("Nominatim " + xhr.status));
            }
        };
        xhr.onerror = function () { callback(new Error("Network error")); };
        xhr.timeout = 10000;
        xhr.send();
    }

    function runNominatimFallback(fallbackList, rowsData, coordToRowEntry, progressPrefix, doneCallback) {
        if (fallbackList.length === 0) {
            doneCallback();
            return;
        }
        var NOMINATIM_DELAY_MS = 1100;
        var idx = 0;
        function next() {
            if (idx >= fallbackList.length) {
                doneCallback();
                return;
            }
            var item = fallbackList[idx];
            showProgress(progressPrefix + " (" + (idx + 1) + " of " + fallbackList.length + ")…");
            nominatimReverse(item.lat, item.lng, function (err, displayName) {
                if (!err && displayName) {
                    var parts = rowsData[item.ref.rowIndex]._locationParts;
                    var part = parts && parts[item.ref.partIndex];
                    if (part && typeof part === "object") part.display = displayName;
                }
                idx++;
                setTimeout(next, NOMINATIM_DELAY_MS);
            });
        }
        next();
    }

    function toISODate(d) {
        return d.toISOString ? d.toISOString().slice(0, 10) : "";
    }

    function toISODateTime(d) {
        if (!d || !d.toISOString) return "";
        return d.toISOString();
    }

    function formatDateTimeLocal(d) {
        if (!d || !d.getFullYear) return "";
        var y = d.getFullYear();
        var m = d.getMonth() + 1;
        var day = d.getDate();
        var h = d.getHours();
        var min = d.getMinutes();
        return y + "-" + (m < 10 ? "0" : "") + m + "-" + (day < 10 ? "0" : "") + day + " " + (h < 10 ? "0" : "") + h + ":" + (min < 10 ? "0" : "") + min;
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
            }],
            ["Get", {
                typeName: "StatusData",
                search: {
                    deviceSearch: { id: deviceId },
                    diagnosticSearch: { id: "DiagnosticIgnitionId" },
                    fromDate: fromStr,
                    toDate: toStr
                }
            }]
        ], function (results) {
            var trips = (results && results[0]) ? results[0] : [];
            var logs = (results && results[1]) ? results[1] : [];
            var ignitionStatus = (results && results[2]) ? results[2] : [];
            if (trips && !trips.sort) trips = [];
            if (ignitionStatus && !ignitionStatus.sort) ignitionStatus = [];
            ignitionStatus.sort(function (a, b) {
                return new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime();
            });
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
                var parts = dayKey.split("-");
                var year = parseInt(parts[0], 10);
                var month = parseInt(parts[1], 10) - 1;
                var day = parseInt(parts[2], 10);
                var dayStart = new Date(year, month, day, 0, 0, 0, 0);
                var dayEnd = new Date(year, month, day, 23, 59, 59, 999);
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

                /* Ignition on time from StatusData (DiagnosticIgnitionId) — sum segments when data=1 */
                var ignitionSeconds = 0;
                var dayIgnitionRecords = [];
                for (var isi = 0; isi < ignitionStatus.length; isi++) {
                    var sd = ignitionStatus[isi];
                    var sdMs = new Date(sd.dateTime).getTime();
                    if (sdMs >= dayStartMs && sdMs <= dayEndMs) dayIgnitionRecords.push(sd);
                }
                var prevForDay = null;
                for (var isi = 0; isi < ignitionStatus.length; isi++) {
                    var sd = ignitionStatus[isi];
                    var sdMs = new Date(sd.dateTime).getTime();
                    if (sdMs < dayStartMs) prevForDay = sd;
                    else break;
                }
                var orderedForDay = (prevForDay ? [prevForDay] : []).concat(dayIgnitionRecords);
                for (var i = 0; i < orderedForDay.length; i++) {
                    var sd = orderedForDay[i];
                    var sdMs = new Date(sd.dateTime).getTime();
                    var ignitionOn = (sd.data != null && sd.data !== 0 && sd.data !== "0");
                    if (!ignitionOn) continue;
                    var segStart = Math.max(sdMs, dayStartMs);
                    var segEnd = (i + 1 < orderedForDay.length)
                        ? new Date(orderedForDay[i + 1].dateTime).getTime()
                        : (dayEndMs + 1);
                    segEnd = Math.min(segEnd, dayEndMs + 1);
                    ignitionSeconds += Math.max(0, (segEnd - segStart) / 1000);
                }
                /* Fallback: Trip-based ignition if no StatusData for the day */
                if (ignitionSeconds === 0 && dayTrips.length > 0) {
                    for (var t = 0; t < dayTrips.length; t++) {
                        var trip = dayTrips[t];
                        var driveSec = U.getTotalSeconds(trip.drivingDuration);
                        var idleSec = U.getTotalSeconds(trip.idlingDuration);
                        if (driveSec === 0 && idleSec === 0 && trip.start && trip.stop) {
                            driveSec = (new Date(trip.stop).getTime() - new Date(trip.start).getTime()) / 1000;
                        }
                        ignitionSeconds += driveSec + idleSec;
                    }
                }
                var timeOutsideHomeZoneSeconds = 0;
                var stoppedInsideHomeZoneSeconds = 0;
                for (var t = 0; t < dayTrips.length; t++) {
                    var trip = dayTrips[t];
                    var driveSec = U.getTotalSeconds(trip.drivingDuration);
                    var idleSec = U.getTotalSeconds(trip.idlingDuration);
                    if (driveSec === 0 && idleSec === 0 && trip.start && trip.stop) {
                        driveSec = (new Date(trip.stop).getTime() - new Date(trip.start).getTime()) / 1000;
                    }
                    var tripDurationSec = driveSec + idleSec;
                    var stopMs = new Date(trip.stop).getTime();
                    var posEnd = U.getPositionAtTime(logs, stopMs);
                    if (!startHomeZone || !posEnd || !U.pointInZone(posEnd.lat, posEnd.lng, startHomeZone)) {
                        timeOutsideHomeZoneSeconds += tripDurationSec;
                    }
                }

                /* Build all stops (gaps >= 10 min), including inside and outside home zone */
                var stops = [];
                var stopCount = 0;
                var totalStoppedMs = 0;
                for (var s = 0; s < dayTrips.length - 1; s++) {
                    var gapStart = new Date(dayTrips[s].stop).getTime();
                    var gapEnd = new Date(dayTrips[s + 1].start).getTime();
                    var gapMs = gapEnd - gapStart;
                    if (gapMs < STOP_THRESHOLD_MS) continue;
                    var pos = U.getPositionAtTime(logs, gapStart);
                    var inZoneB1 = !!(startHomeZone && pos && pos.lat != null && pos.lng != null && U.pointInZone(pos.lat, pos.lng, startHomeZone));
                    var nearOpsCentre = !!(pos && pos.lat != null && pos.lng != null && U.isWithinOperationsCentre(pos.lat, pos.lng));
                    var inHomeZone = inZoneB1 || nearOpsCentre;
                    stops.push({ gapStart: gapStart, gapEnd: gapEnd, durationMs: gapMs, position: pos, inHomeZone: inHomeZone });
                    if (inHomeZone) {
                        stoppedInsideHomeZoneSeconds += gapMs / 1000;
                    } else {
                        stopCount += 1;
                        totalStoppedMs += gapMs;
                        timeOutsideHomeZoneSeconds += gapMs / 1000;
                    }
                }
                var shiftStartMs = dayTrips.length ? new Date(dayTrips[0].start).getTime() : null;
                var shiftEndMs = dayTrips.length ? new Date(dayTrips[dayTrips.length - 1].stop).getTime() : null;
                var shiftDurationMs = (shiftStartMs != null && shiftEndMs != null) ? (shiftEndMs - shiftStartMs) : 0;
                var allowedBreakMin = U.getAllowedBreakMinutes(shiftDurationMs);

                /* Start time = first ignition-on signal (StatusData DiagnosticIgnitionId) for the day, regardless of location.
                   Skip midnight UTC timestamps (00:00:00.000 UTC) as these are often placeholder values, not actual ignition times. */
                var startTimeInsideHomeZone = null;
                for (var isi = 0; isi < ignitionStatus.length; isi++) {
                    var sd = ignitionStatus[isi];
                    var dtStr = (sd && sd.dateTime) ? String(sd.dateTime) : "";
                    if (dtStr.indexOf("T") < 0) continue;
                    var sdDate = new Date(sd.dateTime);
                    var sdMs = sdDate.getTime();
                    if (isNaN(sdMs) || sdMs < dayStartMs || sdMs > dayEndMs) continue;
                    var ignitionOn = (sd.data != null && sd.data !== 0 && sd.data !== "0");
                    if (!ignitionOn) continue;
                    if (sdDate.getUTCHours() === 0 && sdDate.getUTCMinutes() === 0 && sdDate.getUTCSeconds() === 0) continue;
                    startTimeInsideHomeZone = sdMs;
                    break;
                }
                /* Fallback: first trip start if no valid StatusData match */
                if (startTimeInsideHomeZone == null && dayTrips.length > 0) {
                    var firstTripStartMs = new Date(dayTrips[0].start).getTime();
                    if (firstTripStartMs >= dayStartMs && firstTripStartMs <= dayEndMs) {
                        startTimeInsideHomeZone = firstTripStartMs;
                    }
                }

                /* End time = last stop end time, or last trip stop time if no stops >= 10 min.
                   If ignition remains ON past the last activity, use 23:59:59 as end time. */
                var endTimeInsideHomeZone = null;
                
                /* Use the last stop end time if we have stops */
                if (stops.length > 0) {
                    var lastStopEnd = stops[stops.length - 1].gapEnd;
                    endTimeInsideHomeZone = lastStopEnd;
                }
                
                /* If no stops (or stops list is empty), use last trip stop time */
                if (endTimeInsideHomeZone == null && dayTrips.length > 0) {
                    var lastTripStopMs = new Date(dayTrips[dayTrips.length - 1].stop).getTime();
                    if (lastTripStopMs >= dayStartMs && lastTripStopMs <= dayEndMs) {
                        endTimeInsideHomeZone = lastTripStopMs;
                    }
                }
                
                /* Check if ignition is still ON after the last activity — if so, use 23:59:59 as end time */
                if (endTimeInsideHomeZone != null && endTimeInsideHomeZone < dayEndMs) {
                    var lastIgnitionState = null;
                    for (var isi = 0; isi < ignitionStatus.length; isi++) {
                        var sd = ignitionStatus[isi];
                        var sdMs = new Date(sd.dateTime).getTime();
                        if (sdMs > dayEndMs) break;
                        if (sdMs >= endTimeInsideHomeZone) lastIgnitionState = sd;
                    }
                    if (lastIgnitionState) {
                        var ignitionStillOn = (lastIgnitionState.data != null && lastIgnitionState.data !== 0 && lastIgnitionState.data !== "0");
                        if (ignitionStillOn) {
                            endTimeInsideHomeZone = dayEndMs;
                        }
                    }
                } else if (endTimeInsideHomeZone == null) {
                    /* No trips or stops found, but check if ignition was on during the day */
                    for (var isi = 0; isi < ignitionStatus.length; isi++) {
                        var sd = ignitionStatus[isi];
                        var sdMs = new Date(sd.dateTime).getTime();
                        if (sdMs >= dayStartMs && sdMs <= dayEndMs) {
                            var ignitionOn = (sd.data != null && sd.data !== 0 && sd.data !== "0");
                            if (ignitionOn) {
                                endTimeInsideHomeZone = dayEndMs;
                                break;
                            }
                        }
                    }
                }

                if (ignitionSeconds === 0) continue;

                /* Shift time = (end - start) - stops outside zone + min(allowed break, stopped outside) */
                var shiftTimeSeconds = null;
                if (startTimeInsideHomeZone != null && endTimeInsideHomeZone != null && endTimeInsideHomeZone >= startTimeInsideHomeZone) {
                    var spanSeconds = (endTimeInsideHomeZone - startTimeInsideHomeZone) / 1000;
                    var stoppedOutsideSeconds = totalStoppedMs / 1000;
                    var allowedBreakSeconds = (allowedBreakMin || 0) * 60;
                    var breakCredit = Math.min(allowedBreakSeconds, stoppedOutsideSeconds);
                    shiftTimeSeconds = Math.max(0, spanSeconds - stoppedOutsideSeconds + breakCredit);
                }

                /* Trip data from Geotab trip history: first trip start, last trip end, total trip duration */
                var tripStartTime = null;
                var tripEndTime = null;
                var tripDurationSeconds = 0;
                if (dayTrips.length > 0) {
                    tripStartTime = formatDateTimeLocal(new Date(dayTrips[0].start));
                    tripEndTime = formatDateTimeLocal(new Date(dayTrips[dayTrips.length - 1].stop));
                    for (var t = 0; t < dayTrips.length; t++) {
                        var trip = dayTrips[t];
                        var driveSec = U.getTotalSeconds(trip.drivingDuration);
                        var idleSec = U.getTotalSeconds(trip.idlingDuration);
                        if (driveSec === 0 && idleSec === 0 && trip.start && trip.stop) {
                            driveSec = (new Date(trip.stop).getTime() - new Date(trip.start).getTime()) / 1000;
                        }
                        tripDurationSeconds += driveSec + idleSec;
                    }
                }

                /* Summary row (first line for this vehicle/day) */
                rowsData.push({
                    Date: dayKey,
                    DeviceName: deviceName,
                    // SerialNumber: deviceSerialNumber,
                    StartTime: startTimeInsideHomeZone != null ? formatDateTimeLocal(new Date(startTimeInsideHomeZone)) : "",
                    EndTime: endTimeInsideHomeZone != null ? formatDateTimeLocal(new Date(endTimeInsideHomeZone)) : "",
                    IgnitionOnTimeSeconds: ignitionSeconds,
                    TimeOutsideHomeZoneSeconds: timeOutsideHomeZoneSeconds,
                    StoppedInsideHomeZoneSeconds: stoppedInsideHomeZoneSeconds,
                    StopCount: stopCount,
                    TotalStoppedTimeSeconds: totalStoppedMs / 1000,
                    AllowedBreakMinutes: allowedBreakMin,
                    StopStart: "",
                    StopEnd: "",
                    DurationSeconds: null,
                    Location: "",
                    InHomeZone: "",
                    ShiftTimeSeconds: shiftTimeSeconds,
                    TripStartTime: tripStartTime || "",
                    TripDurationSeconds: tripDurationSeconds,
                    TripEndTime: tripEndTime || "",
                    isSummaryRow: true
                });

                /* One detail row per stop — inside Operations Centre (b1) → "Operations Centre"; outside → address lookup (or coordinates) */
                for (var si = 0; si < stops.length; si++) {
                    var stop = stops[si];
                    var pos = stop.position;
                    var locationPart;
                    if (stop.inHomeZone) {
                        locationPart = { display: "Operations Centre" };
                    } else if (pos && pos.lat != null && pos.lng != null) {
                        locationPart = { needAddress: true, lat: pos.lat, lng: pos.lng };
                    } else {
                        locationPart = { display: "" };
                    }
                    var locationParts = [locationPart];
                    var locationDisplay = (locationPart.display != null && locationPart.display !== "") ? locationPart.display : (locationPart.lat != null && locationPart.lng != null ? U.formatLatLng(locationPart.lat, locationPart.lng) : "");
                    var rowIdx = rowsData.length;
                    if (locationPart.needAddress && locationPart.lat != null && locationPart.lng != null) {
                        coordsFlat.push({ latitude: locationPart.lat, longitude: locationPart.lng });
                        coordToRowEntry.push({ rowIndex: rowIdx, partIndex: 0 });
                    }
                    var stopStartDate = new Date(stop.gapStart);
                    var stopEndDate = new Date(stop.gapEnd);
                    rowsData.push({
                        Date: dayKey,
                        DeviceName: deviceName,
                        // SerialNumber: deviceSerialNumber,
                        StartTime: "",
                        EndTime: "",
                        IgnitionOnTimeSeconds: null,
                        TimeOutsideHomeZoneSeconds: null,
                        StoppedInsideHomeZoneSeconds: null,
                        StopCount: null,
                        TotalStoppedTimeSeconds: null,
                        AllowedBreakMinutes: null,
                        StopStart: formatDateTimeLocal(stopStartDate),
                        StopEnd: formatDateTimeLocal(stopEndDate),
                        DurationSeconds: stop.durationMs / 1000,
                        Location: locationDisplay,
                        InHomeZone: stop.inHomeZone ? "Yes" : "No",
                        ShiftTimeSeconds: null,
                        TripStartTime: "",
                        TripDurationSeconds: null,
                        TripEndTime: "",
                        isSummaryRow: false,
                        _locationParts: locationParts
                    });
                }
            }

            function finishDeviceAndContinue() {
                for (var r = 0; r < rowsData.length; r++) {
                    if (rowsData[r]._locationParts !== undefined) delete rowsData[r]._locationParts;
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

            if (!ADDRESS_LOOKUP_ENABLED) {
                for (var ri = 0; ri < rowsData.length; ri++) {
                    var parts = rowsData[ri]._locationParts;
                    var part = parts && parts[0];
                    if (part) {
                        rowsData[ri].Location = (part.display != null && part.display !== "") ? part.display : (part.lat != null && part.lng != null ? U.formatLatLng(part.lat, part.lng) : "");
                    }
                }
                finishDeviceAndContinue();
                return;
            }

            showProgress("Looking up addresses (Geotab) for " + deviceName + "…");
            api.call("GetAddresses", { coordinates: coordsFlat }, function (addresses) {
                var numAddr = (addresses && addresses.length) ? addresses.length : 0;
                for (var ai = 0; ai < numAddr && ai < coordToRowEntry.length; ai++) {
                    var ref = coordToRowEntry[ai];
                    var parts = rowsData[ref.rowIndex]._locationParts;
                    var part = parts && parts[ref.partIndex];
                    if (part && part.needAddress) {
                        var addrStr = U.formatAddress(addresses[ai]);
                        if (addrStr && addrStr.trim() !== "") {
                            part.display = addrStr;
                        }
                    }
                }
                var fallbackList = [];
                for (var fi = 0; fi < coordToRowEntry.length; fi++) {
                    var ref = coordToRowEntry[fi];
                    var parts = rowsData[ref.rowIndex]._locationParts;
                    var part = parts && parts[ref.partIndex];
                    if (part && part.needAddress && part.lat != null && part.lng != null) {
                        fallbackList.push({ ref: ref, lat: part.lat, lng: part.lng });
                    }
                }
                function rebuildLocationAndFinish() {
                    for (var ri = 0; ri < rowsData.length; ri++) {
                        var parts = rowsData[ri]._locationParts;
                        var part = parts && parts[0];
                        if (part) {
                            rowsData[ri].Location = (part.display != null && part.display !== "") ? part.display : (part.lat != null && part.lng != null ? U.formatLatLng(part.lat, part.lng) : "");
                        }
                    }
                    finishDeviceAndContinue();
                }
                if (fallbackList.length === 0) {
                    rebuildLocationAndFinish();
                    return;
                }
                runNominatimFallback(fallbackList, rowsData, coordToRowEntry, "Looking up addresses (OpenStreetMap)", rebuildLocationAndFinish);
            }, function (err) {
                var fallbackList = [];
                for (var fi = 0; fi < coordToRowEntry.length; fi++) {
                    var ref = coordToRowEntry[fi];
                    var parts = rowsData[ref.rowIndex]._locationParts;
                    var part = parts && parts[ref.partIndex];
                    if (part && part.needAddress && part.lat != null && part.lng != null) {
                        fallbackList.push({ ref: ref, lat: part.lat, lng: part.lng });
                    }
                }
                function rebuildLocationAndFinish() {
                    for (var ri = 0; ri < rowsData.length; ri++) {
                        var parts = rowsData[ri]._locationParts;
                        var part = parts && parts[0];
                        if (part) {
                            rowsData[ri].Location = (part.display != null && part.display !== "") ? part.display : (part.lat != null && part.lng != null ? U.formatLatLng(part.lat, part.lng) : "");
                        }
                    }
                    finishDeviceAndContinue();
                }
                if (fallbackList.length === 0) {
                    rebuildLocationAndFinish();
                    return;
                }
                showProgress("Geotab address lookup unavailable; using OpenStreetMap (Nominatim)…");
                runNominatimFallback(fallbackList, rowsData, coordToRowEntry, "Looking up addresses (OpenStreetMap)", rebuildLocationAndFinish);
            });
        }, function (err) {
            hideProgress();
            setGenerateEnabled(true);
            showMessage("Error loading trips, log records, or ignition status for " + (device.name || deviceId) + ". Check permissions (Trips, LogRecord, StatusData).", true, err && (err.message || JSON.stringify(err)));
        });
    }

    var COLUMNS = [
        { key: "Date", label: "Date" },
        { key: "DeviceName", label: "Device Name" },
        // { key: "SerialNumber", label: "Geotab Serial\nNumber" },
        { key: "StartTime", label: "Start Time" },
        { key: "EndTime", label: "End Time" },
        { key: "IgnitionOnTimeSeconds", label: "Ignition On\nTime", format: "duration" },
        { key: "TimeOutsideHomeZoneSeconds", label: "Time Outside\nHome Zone", format: "duration" },
        { key: "StoppedInsideHomeZoneSeconds", label: "Stopped Inside\nHome Zone", format: "duration" },
        { key: "StopCount", label: "Stop Count" },
        { key: "TotalStoppedTimeSeconds", label: "Total Stopped\nTime", format: "duration" },
        { key: "AllowedBreakMinutes", label: "Allowed Break (min)" },
        { key: "StopStart", label: "Stop Start" },
        { key: "StopEnd", label: "Stop End" },
        { key: "DurationSeconds", label: "Duration", format: "duration" },
        { key: "Location", label: "Location" },
        { key: "InHomeZone", label: "In Home\nZone" },
        { key: "ShiftTimeSeconds", label: "Shift Time", format: "duration" },
        { key: "TripStartTime", label: "Trip Start\nTime" },
        { key: "TripDurationSeconds", label: "Trip Duration", format: "duration" },
        { key: "TripEndTime", label: "Trip End\nTime" }
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
            if (row.isSummaryRow) tr2.classList.add("summary-row");
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
