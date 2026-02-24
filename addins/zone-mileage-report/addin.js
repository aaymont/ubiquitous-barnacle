(function () {
    "use strict";

    var ZONE_ID = "b2";
    var apiRef = null;
    var devices = [];

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

        var search = {
            fromDate: toIsoDateTime(fromDate),
            toDate: toIsoDateTime(toDate)
        };
        if (selectedDeviceId && selectedDeviceId !== "all") {
            search.deviceSearch = { id: selectedDeviceId };
        }

        showProgress("Loading zone and GPS logs…");
        api.multiCall([
            ["Get", { typeName: "Zone", search: { id: ZONE_ID } }],
            ["Get", { typeName: "LogRecord", search: search }]
        ], function (results) {
            var zones = results && results[0] ? results[0] : [];
            var logs = results && results[1] ? results[1] : [];
            if (!zones || zones.length === 0) {
                hideProgress();
                setCalculateEnabled(true);
                showMessage("Zone with id " + ZONE_ID + " not found. Check that the zone exists and the user has Zone permissions.", true);
                return;
            }
            if (!logs || !logs.length) {
                hideProgress();
                setCalculateEnabled(true);
                showMessage("No GPS logs found for the selected range and vehicle scope.", false);
                setResults(0, 0, 0, "No data for the selected period.");
                return;
            }

            var zone = zones[0];
            showProgress("Computing distances inside and outside zone " + ZONE_ID + "…");
            var totals = computeTotalsFromLogs(logs, zone);

            hideProgress();
            setCalculateEnabled(true);

            var label = "Computed from " + logs.length + " GPS points between " +
                fromDate.toISOString().slice(0, 10) + " and " +
                toDate.toISOString().slice(0, 10) +
                ". Total miles equals inside + outside.";
            setResults(totals.totalMiles, totals.insideMiles, totals.outsideMiles, label);
        }, function (err) {
            hideProgress();
            setCalculateEnabled(true);
            showMessage("Error loading zone or log records. Check permissions (Zone, LogRecord) and try a smaller date range.", true);
        });
    }

    function computeTotalsFromLogs(logs, zone) {
        var totalMeters = 0;
        var insideMeters = 0;
        var outsideMeters = 0;
        if (!logs || logs.length < 2) {
            return { totalMiles: 0, insideMiles: 0, outsideMiles: 0 };
        }
        logs.sort(function (a, b) {
            var ta = new Date(a.dateTime).getTime();
            var tb = new Date(b.dateTime).getTime();
            return ta - tb;
        });
        for (var i = 1; i < logs.length; i++) {
            var prev = logs[i - 1];
            var curr = logs[i];
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
            if (prevIn && currIn) {
                insideMeters += dist;
            } else if (!prevIn && !currIn) {
                outsideMeters += dist;
            } else {
                insideMeters += dist / 2;
                outsideMeters += dist / 2;
            }
        }
        var metersPerMile = 1609.34;
        var insideMiles = insideMeters / metersPerMile;
        var outsideMiles = outsideMeters / metersPerMile;
        var totalMiles = insideMiles + outsideMiles;
        return {
            totalMiles: totalMiles,
            insideMiles: insideMiles,
            outsideMiles: outsideMiles
        };
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

