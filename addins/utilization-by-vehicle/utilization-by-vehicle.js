/* Utilization by Vehicle - MyGeotab Add-In */
(function() {
    "use strict";

    var MAX_DAYS = 31;
    var DEFAULT_DAYS = 7;
    var KM_TO_MILES = 0.621371;

    var apiRef = null;
    var allDevices = [];
    var allGroups = [];
    var aggregatedByDevice = [];
    var deviceMap = {};
    var detailChartInstance = null;
    var DETAIL_DAYS = 31;

    function setLoading(visible) {
        var el = document.getElementById("loading");
        if (el) el.classList.toggle("visible", !!visible);
    }

    function showMessage(text, isError) {
        var el = document.getElementById("message");
        if (!el) return;
        el.textContent = text || "";
        el.className = "message" + (text ? (isError ? " error" : " success") : "");
    }

    function getDateRange() {
        var fromInput = document.getElementById("fromDate");
        var toInput = document.getElementById("toDate");
        var from = fromInput ? new Date(fromInput.value) : new Date();
        var to = toInput ? new Date(toInput.value) : new Date();
        return { from: from, to: to };
    }

    function setDateRange(days) {
        var to = new Date();
        var from = new Date(to);
        from.setDate(from.getDate() - days);
        var fromInput = document.getElementById("fromDate");
        var toInput = document.getElementById("toDate");
        if (fromInput) fromInput.value = from.toISOString().slice(0, 10);
        if (toInput) toInput.value = to.toISOString().slice(0, 10);
    }

    function clampDateRange() {
        var fromInput = document.getElementById("fromDate");
        var toInput = document.getElementById("toDate");
        if (!fromInput || !toInput) return;
        var from = new Date(fromInput.value);
        var to = new Date(toInput.value);
        var diffDays = Math.round((to - from) / (24 * 60 * 60 * 1000));
        if (diffDays > MAX_DAYS) {
            from.setDate(to.getDate() - MAX_DAYS);
            fromInput.value = from.toISOString().slice(0, 10);
        }
    }

    function getSelectedGroupId() {
        var sel = document.getElementById("groupSelect");
        return sel && sel.value !== "all" ? sel.value : null;
    }

    function aggregateTrips(trips) {
        var byDevice = {};
        for (var i = 0; i < trips.length; i++) {
            var trip = trips[i];
            var deviceId = trip.device && trip.device.id;
            if (!deviceId) continue;
            if (!byDevice[deviceId]) {
                byDevice[deviceId] = { deviceId: deviceId, distanceKm: 0, tripCount: 0, drivingSeconds: 0 };
            }
            byDevice[deviceId].distanceKm += trip.distance || 0;
            byDevice[deviceId].tripCount += 1;
            if (trip.drivingDuration != null) {
                byDevice[deviceId].drivingSeconds += trip.drivingDuration;
            } else if (trip.start && trip.stop) {
                var startMs = new Date(trip.start).getTime();
                var stopMs = new Date(trip.stop).getTime();
                byDevice[deviceId].drivingSeconds += (stopMs - startMs) / 1000;
            }
        }
        var list = [];
        for (var id in byDevice) if (byDevice.hasOwnProperty(id)) list.push(byDevice[id]);
        list.sort(function(a, b) { return b.distanceKm - a.distanceKm; });
        return list;
    }

    function filterByGroup(rows, groupId) {
        if (!groupId) return rows;
        var out = [];
        for (var i = 0; i < rows.length; i++) {
            var r = rows[i];
            var dev = null;
            for (var j = 0; j < allDevices.length; j++) {
                if (allDevices[j].id === r.deviceId) { dev = allDevices[j]; break; }
            }
            if (dev && dev.groups) {
                for (var k = 0; k < dev.groups.length; k++) {
                    if (dev.groups[k].id === groupId) { out.push(r); break; }
                }
            }
        }
        return out;
    }

    function formatHours(seconds) {
        if (seconds == null || isNaN(seconds)) return "—";
        var h = seconds / 3600;
        return h.toFixed(1) + " h";
    }

    function renderTable(rows) {
        var container = document.getElementById("tableContainer");
        if (!container) return;
        showMessage("");

        if (!rows || rows.length === 0) {
            container.innerHTML = "<div class=\"empty-state\">No utilization data for the selected period and filters.</div>";
            return;
        }

        var html = "<table class=\"utilization-table\"><thead><tr>" +
            "<th>Vehicle</th><th class=\"num\">Distance (km)</th><th class=\"num\">Distance (mi)</th>" +
            "<th class=\"num\">Trips</th><th class=\"num\">Driving time</th><th></th></tr></thead><tbody>";

        for (var i = 0; i < rows.length; i++) {
            var r = rows[i];
            var name = deviceMap[r.deviceId] || r.deviceId;
            var km = r.distanceKm.toFixed(1);
            var mi = (r.distanceKm * KM_TO_MILES).toFixed(1);
            var link = "<a href=\"#\" class=\"vehicle-link\" data-device-id=\"" + r.deviceId + "\">" + escapeHtml(name) + "</a>";
            var btn = "<button type=\"button\" class=\"view-details-btn\" data-device-id=\"" + r.deviceId + "\">View Details</button>";
            html += "<tr><td>" + link + "</td><td class=\"num\">" + km + "</td><td class=\"num\">" + mi + "</td>" +
                "<td class=\"num\">" + r.tripCount + "</td><td class=\"num\">" + formatHours(r.drivingSeconds) + "</td><td>" + btn + "</td></tr>";
        }
        html += "</tbody></table>";
        container.innerHTML = html;

        container.querySelectorAll(".vehicle-link").forEach(function(a) {
            a.addEventListener("click", function(e) {
                e.preventDefault();
                var id = a.getAttribute("data-device-id");
                if (id) showDetailView(id);
            });
        });
        container.querySelectorAll(".view-details-btn").forEach(function(btn) {
            btn.addEventListener("click", function() {
                var id = btn.getAttribute("data-device-id");
                if (id) showDetailView(id);
            });
        });
    }

    function escapeHtml(s) {
        if (!s) return "";
        var div = document.createElement("div");
        div.textContent = s;
        return div.innerHTML;
    }

    function showListView() {
        var listEl = document.getElementById("listView");
        var detailEl = document.getElementById("detailView");
        if (listEl) listEl.style.display = "";
        if (detailEl) detailEl.style.display = "none";
    }

    function showDetailView(deviceId) {
        var listEl = document.getElementById("listView");
        var detailEl = document.getElementById("detailView");
        if (listEl) listEl.style.display = "none";
        if (detailEl) detailEl.style.display = "block";
        var titleEl = document.getElementById("detailTitle");
        if (titleEl) titleEl.textContent = "Distance over time – " + (deviceMap[deviceId] || deviceId);
        loadVehicleChart(deviceId);
    }

    function aggregateTripsByDay(trips) {
        var byDay = {};
        for (var i = 0; i < trips.length; i++) {
            var trip = trips[i];
            var dayKey = (trip.start || trip.stop) ? new Date((trip.start || trip.stop)).toISOString().slice(0, 10) : null;
            if (!dayKey) continue;
            if (!byDay[dayKey]) byDay[dayKey] = 0;
            byDay[dayKey] += trip.distance || 0;
        }
        var keys = Object.keys(byDay).sort();
        return keys.map(function(k) { return { date: k, distanceKm: byDay[k] }; });
    }

    function loadVehicleChart(deviceId) {
        if (!apiRef || !deviceId) return;
        setLoading(true);
        showMessage("");
        var toDate = new Date();
        var fromDate = new Date(toDate);
        fromDate.setDate(fromDate.getDate() - DETAIL_DAYS);
        apiRef.call("Get", {
            typeName: "Trip",
            search: {
                deviceSearch: { id: deviceId },
                fromDate: fromDate.toISOString(),
                toDate: toDate.toISOString()
            }
        }, function(trips) {
            setLoading(false);
            var points = aggregateTripsByDay(trips || []);
            if (points.length === 0) {
                showMessage("No trip data for this vehicle in the last " + DETAIL_DAYS + " days.", true);
            }
            renderDistanceChart(points);
        }, function(err) {
            setLoading(false);
            showMessage("Failed to load trips: " + (err && err.message ? err.message : String(err)), true);
        });
    }

    function renderDistanceChart(series) {
        var canvas = document.getElementById("detailChart");
        if (!canvas || typeof Chart === "undefined") return;
        if (detailChartInstance) {
            detailChartInstance.destroy();
            detailChartInstance = null;
        }
        var labels = series.map(function(p) { return p.date; });
        var data = series.map(function(p) { return Math.round(p.distanceKm * 10) / 10; });
        detailChartInstance = new Chart(canvas, {
            type: "bar",
            data: {
                labels: labels,
                datasets: [{
                    label: "Distance (km)",
                    data: data,
                    backgroundColor: "rgba(0, 102, 204, 0.6)",
                    borderColor: "rgb(0, 102, 204)",
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: "Distance (km)" }
                    },
                    x: {
                        title: { display: true, text: "Date" }
                    }
                }
            }
        });
    }

    function loadData() {
        if (!apiRef) return;
        setLoading(true);
        showMessage("");

        var range = getDateRange();
        var fromDate = range.from;
        var toDate = range.to;
        clampDateRange();
        fromDate = new Date(document.getElementById("fromDate").value);
        toDate = new Date(document.getElementById("toDate").value);

        apiRef.multiCall([
            ["Get", { typeName: "Device" }],
            ["Get", { typeName: "Group" }]
        ], function(results) {
            allDevices = results[0] || [];
            allGroups = results[1] || [];
            deviceMap = {};
            for (var i = 0; i < allDevices.length; i++) {
                deviceMap[allDevices[i].id] = allDevices[i].name || allDevices[i].id;
            }

            var groupSelect = document.getElementById("groupSelect");
            if (groupSelect) {
                var savedGroupId = groupSelect.value;
                groupSelect.innerHTML = "<option value=\"all\">All vehicles</option>";
                for (var j = 0; j < allGroups.length; j++) {
                    if (allGroups[j].name) {
                        var opt = document.createElement("option");
                        opt.value = allGroups[j].id;
                        opt.textContent = allGroups[j].name;
                        groupSelect.appendChild(opt);
                    }
                }
                if (savedGroupId && savedGroupId !== "all") groupSelect.value = savedGroupId;
            }

            apiRef.call("Get", {
                typeName: "Trip",
                search: {
                    fromDate: fromDate.toISOString(),
                    toDate: toDate.toISOString()
                }
            }, function(trips) {
                aggregatedByDevice = aggregateTrips(trips || []);
                var groupId = getSelectedGroupId();
                var filtered = filterByGroup(aggregatedByDevice, groupId);
                renderTable(filtered);
                setLoading(false);
            }, function(err) {
                setLoading(false);
                showMessage("Failed to load trips: " + (err && err.message ? err.message : String(err)), true);
            });
        }, function(err) {
            setLoading(false);
            showMessage("Failed to load vehicles and groups: " + (err && err.message ? err.message : String(err)), true);
        });
    }

    function exportCsv() {
        var groupId = getSelectedGroupId();
        var rows = filterByGroup(aggregatedByDevice, groupId);
        if (!rows.length) {
            showMessage("No data to export.", true);
            return;
        }
        var csv = "Vehicle,Distance_km,Distance_mi,Trip_Count,Driving_Hours\n";
        for (var i = 0; i < rows.length; i++) {
            var r = rows[i];
            var name = (deviceMap[r.deviceId] || r.deviceId).replace(/"/g, '""');
            var km = r.distanceKm.toFixed(2);
            var mi = (r.distanceKm * KM_TO_MILES).toFixed(2);
            var hours = (r.drivingSeconds / 3600).toFixed(2);
            csv += "\"" + name + "\"," + km + "," + mi + "," + r.tripCount + "," + hours + "\n";
        }
        var blob = new Blob([csv], { type: "text/csv" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "utilization-by-vehicle.csv";
        a.click();
        URL.revokeObjectURL(url);
    }

    function setupPresets() {
        function setActive(btn) {
            document.querySelectorAll(".preset-btn").forEach(function(b) { b.classList.remove("active"); });
            if (btn) btn.classList.add("active");
        }
        document.getElementById("preset7").addEventListener("click", function() {
            setDateRange(7);
            setActive(this);
            loadData();
        });
        document.getElementById("preset14").addEventListener("click", function() {
            setDateRange(14);
            setActive(this);
            loadData();
        });
        document.getElementById("preset30").addEventListener("click", function() {
            setDateRange(30);
            setActive(this);
            loadData();
        });
    }

    function setupControls() {
        var groupSelect = document.getElementById("groupSelect");
        if (groupSelect) {
            groupSelect.addEventListener("change", function() {
                var groupId = getSelectedGroupId();
                var filtered = filterByGroup(aggregatedByDevice, groupId);
                renderTable(filtered);
            });
        }
        var refreshBtn = document.getElementById("refreshBtn");
        if (refreshBtn) refreshBtn.addEventListener("click", loadData);
        var exportBtn = document.getElementById("exportCsvBtn");
        if (exportBtn) exportBtn.addEventListener("click", exportCsv);
        var backLink = document.getElementById("backToList");
        if (backLink) {
            backLink.addEventListener("click", function(e) {
                e.preventDefault();
                showListView();
            });
        }
    }

    geotab.addin["utilizationByVehicle"] = function() {
        return {
            initialize: function(api, state, callback) {
                apiRef = api;
                setDateRange(DEFAULT_DAYS);
                setupPresets();
                setupControls();
                loadData();
                callback();
            },
            focus: function(api, state) {
                apiRef = api;
            },
            blur: function(api, state) {}
        };
    };
})();
