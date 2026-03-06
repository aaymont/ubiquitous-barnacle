/* Fleet Cats — MyGeotab Add-In. Fleet vehicles displayed as cats on a map. */
(function () {
    "use strict";

    var apiRef = null;
    var map = null;
    var markersLayer = null;
    /* Twemoji cat images for consistent display across browsers */
    var CAT_IMAGES = [
        "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f431.png",
        "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f408.png",
        "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f63a.png"
    ];
    var DEFAULT_CENTER = [37.7749, -122.4194];
    var DEFAULT_ZOOM = 4;

    function getEl(id) {
        return document.getElementById(id);
    }

    function showLoading(text) {
        var loading = getEl("loading-section");
        var mapSection = getEl("map-section");
        var errorSection = getEl("error-section");
        var textEl = getEl("loading-text");
        if (loading) loading.classList.remove("hidden");
        if (mapSection) mapSection.classList.add("hidden");
        if (errorSection) errorSection.classList.add("hidden");
        if (textEl) textEl.textContent = text || "Loading cats…";
    }

    function showMap() {
        var loading = getEl("loading-section");
        var mapSection = getEl("map-section");
        var errorSection = getEl("error-section");
        if (loading) loading.classList.add("hidden");
        if (mapSection) mapSection.classList.remove("hidden");
        if (errorSection) errorSection.classList.add("hidden");
    }

    function showError(text) {
        var loading = getEl("loading-section");
        var mapSection = getEl("map-section");
        var errorSection = getEl("error-section");
        var textEl = getEl("error-text");
        if (loading) loading.classList.add("hidden");
        if (mapSection) mapSection.classList.add("hidden");
        if (errorSection) errorSection.classList.remove("hidden");
        if (textEl) textEl.textContent = text || "Something went wrong.";
    }

    function catImageForDevice(deviceId) {
        var h = 0;
        var s = String(deviceId || "");
        for (var i = 0; i < s.length; i++) {
            h = ((h << 5) - h) + s.charCodeAt(i) | 0;
        }
        return CAT_IMAGES[Math.abs(h) % CAT_IMAGES.length];
    }

    function createCatIcon(deviceId) {
        var src = catImageForDevice(deviceId);
        return L.divIcon({
            className: "cat-marker-icon",
            html: "<div class=\"cat-marker\"><img src=\"" + src + "\" alt=\"Vehicle\" width=\"36\" height=\"36\" /></div>",
            iconSize: [36, 36],
            iconAnchor: [18, 18]
        });
    }

    function initMap() {
        var mapEl = getEl("map");
        if (!mapEl || typeof L === "undefined") return null;

        if (map) {
            map.remove();
            map = null;
        }

        map = L.map("map", { preferCanvas: true }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap"
        }).addTo(map);

        markersLayer = L.layerGroup().addTo(map);

        /* Force Leaflet to recalculate size (critical when container was hidden during load) */
        setTimeout(function () {
            if (map) map.invalidateSize();
        }, 100);

        return map;
    }

    function addCatMarkers(statuses, deviceMap) {
        if (!markersLayer) return;

        markersLayer.clearLayers();
        hideEmptyState();

        var bounds = [];
        statuses.forEach(function (status) {
            var lat = status.latitude;
            var lng = status.longitude;
            if (lat == null || lng == null) return;

            var deviceId = status.device && status.device.id ? status.device.id : "";
            var device = deviceMap[deviceId];
            var name = (device && device.name) ? device.name : "Vehicle " + deviceId;

            var marker = L.marker([lat, lng], { icon: createCatIcon(deviceId) })
                .addTo(markersLayer)
                .bindPopup("<b>" + escapeHtml(name) + "</b><br>Location: " + lat.toFixed(5) + ", " + lng.toFixed(5));

            bounds.push([lat, lng]);
        });

        if (bounds.length > 1) {
            map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
        } else if (bounds.length === 1) {
            map.setView(bounds[0], 12);
        } else {
            var emptyEl = getEl("empty-state");
            if (emptyEl) emptyEl.classList.remove("hidden");
        }
    }

    function hideEmptyState() {
        var emptyEl = getEl("empty-state");
        if (emptyEl) emptyEl.classList.add("hidden");
    }

    function escapeHtml(s) {
        if (s == null) return "";
        var div = document.createElement("div");
        div.textContent = String(s);
        return div.innerHTML;
    }

    function refreshCats(api) {
        showLoading("Loading cats…");

        api.call("Get", { typeName: "Device" }, function (devices) {
            var deviceMap = {};
            devices.forEach(function (d) {
                deviceMap[d.id] = d;
            });

            api.call("Get", { typeName: "DeviceStatusInfo" }, function (statuses) {
                var withPosition = (statuses || []).filter(function (s) {
                    return s.latitude != null && s.longitude != null;
                });

                /* Show map section FIRST so Leaflet container has dimensions, then init */
                showMap();
                if (!map) initMap();

                if (map) {
                    addCatMarkers(withPosition, deviceMap);
                    if (withPosition.length === 0) {
                        map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
                    }
                    map.invalidateSize();

                    var refreshBtn = getEl("btn-refresh");
                    if (refreshBtn) {
                        refreshBtn.onclick = function () {
                            refreshCats(api);
                        };
                    }
                } else {
                    showError("Could not initialize map. Ensure Leaflet is loaded.");
                }
            }, function (err) {
                showError("Failed to load vehicle positions: " + (err && err.message ? err.message : "Unknown error"));
            });
        }, function (err) {
            showError("Failed to load vehicles: " + (err && err.message ? err.message : "Unknown error"));
        });
    }

    geotab.addin.fleetCats = function () {
        return {
            initialize: function (api, state, callback) {
                apiRef = api;
                /* Do not init map here - container is hidden; init in focus() after showMap() */
                if (typeof callback === "function") callback();
            },
            focus: function (api, state) {
                apiRef = api;
                refreshCats(api);
            },
            blur: function () {
                /* Cleanup optional */
            }
        };
    };
})();
