/* Safety Report Add-In — MyGeotab Custom Page. No inline JS. */

(function () {
    "use strict";

    var apiRef = null;
    var INACTIVITY_MS = 20000;
    var DRAIN_INTERVAL_MS = 200;
    var DRAIN_PERCENT_PER_INTERVAL = 0.3;
    var ACTIVITY_THROTTLE_MS = 250;
    var POWER_DECAY_AFTER_MS = 700;
    var POWER_DECAY_AMOUNT = 3;
    var POWER_PER_REVOLUTION = 20;
    var POWER_PER_CLICK = 8;
    var POWER_RING_R = 48;
    var POWER_RING_CIRCUMFERENCE = 2 * Math.PI * POWER_RING_R;
    var WHEEL_CX = 100;
    var WHEEL_CY = 100;
    var WHEEL_INNER_R = 60;
    var WHEEL_OUTER_R = 85;

    var inactivityTimerId = null;
    var drainIntervalId = null;
    var powerDecayTimerId = null;
    var lastActivityAt = 0;
    var throttleScheduled = false;
    var presentationMode = true;
    var visibility = 100;
    var lastWheelAngle = null;
    var accumulatedAngle = 0;
    var wheelRotation = 0;
    var lastWheelActivityAt = 0;

    var reportEl = null;
    var overlayEl = null;
    var generatorSection = null;
    var powerRing = null;
    var powerPercentEl = null;
    var wheelSpokes = null;
    var deviceSelect = null;
    var refreshBtn = null;
    var presentationCheckbox = null;
    var inactivityLabel = null;
    var liveStatusContent = null;
    var liveStatusLoading = null;
    var liveStatusError = null;

    function getEl(id) {
        return document.getElementById(id);
    }

    function resetInactivityTimer() {
        lastActivityAt = Date.now();
        updateInactivityLabel();
    }

    function updateInactivityLabel() {
        if (!inactivityLabel) return;
        if (!presentationMode) {
            inactivityLabel.textContent = "Inactivity: —";
            return;
        }
        if (visibility < 100) {
            inactivityLabel.textContent = "Charge: " + Math.round(visibility) + "%";
            return;
        }
        var elapsed = Math.floor((Date.now() - lastActivityAt) / 1000);
        var remaining = Math.max(0, INACTIVITY_MS / 1000 - elapsed);
        inactivityLabel.textContent = "Inactivity: " + remaining + "s";
    }

    function applyVisibility() {
        visibility = Math.max(0, Math.min(100, visibility));
        if (overlayEl) {
            if (visibility >= 100) {
                overlayEl.setAttribute("aria-hidden", "true");
                if (generatorSection) generatorSection.classList.add("hidden");
                if (overlayEl.classList.contains("visible")) {
                    overlayEl.style.opacity = "0";
                    setTimeout(function () {
                        overlayEl.classList.remove("visible");
                        overlayEl.style.opacity = "";
                    }, 450);
                } else {
                    overlayEl.classList.remove("visible");
                    overlayEl.style.opacity = "";
                }
            } else {
                overlayEl.classList.add("visible");
                overlayEl.setAttribute("aria-hidden", "false");
                overlayEl.style.opacity = String(1 - visibility / 100);
                if (generatorSection) generatorSection.classList.remove("hidden");
            }
        }
        updatePowerUI();
        updateInactivityLabel();
    }

    function tickDrain() {
        if (!presentationMode || visibility <= 0) return;
        var inactive = Date.now() - lastActivityAt;
        if (inactive < INACTIVITY_MS) return;
        visibility = Math.max(0, visibility - DRAIN_PERCENT_PER_INTERVAL);
        applyVisibility();
    }

    function startDrainInterval() {
        if (drainIntervalId) return;
        drainIntervalId = setInterval(tickDrain, DRAIN_INTERVAL_MS);
    }

    function stopDrainInterval() {
        if (drainIntervalId) {
            clearInterval(drainIntervalId);
            drainIntervalId = null;
        }
    }

    function onActivity() {
        if (!presentationMode) return;
        resetInactivityTimer();
    }

    function throttleActivity(fn) {
        var now = Date.now();
        if (now - lastActivityAt >= ACTIVITY_THROTTLE_MS) {
            lastActivityAt = now;
            fn();
            return;
        }
        if (!throttleScheduled) {
            throttleScheduled = true;
            setTimeout(function () {
                throttleScheduled = false;
                lastActivityAt = Date.now();
                fn();
            }, ACTIVITY_THROTTLE_MS - (now - lastActivityAt));
        }
    }

    function handleWheelMouseMove(e) {
        if (visibility >= 100) return;
        var rect = getEl("wheel-svg").getBoundingClientRect();
        var scaleX = 200 / rect.width;
        var scaleY = 200 / rect.height;
        var mx = (e.clientX - rect.left) * scaleX;
        var my = (e.clientY - rect.top) * scaleY;
        var dx = mx - WHEEL_CX;
        var dy = my - WHEEL_CY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < WHEEL_INNER_R || dist > WHEEL_OUTER_R) return;
        var angle = Math.atan2(dy, dx);
        if (lastWheelAngle !== null) {
            var delta = angle - lastWheelAngle;
            if (delta > Math.PI) delta -= 2 * Math.PI;
            if (delta < -Math.PI) delta += 2 * Math.PI;
            accumulatedAngle += Math.abs(delta);
            wheelRotation += delta;
            while (accumulatedAngle >= 2 * Math.PI) {
                accumulatedAngle -= 2 * Math.PI;
                visibility = Math.min(100, visibility + POWER_PER_REVOLUTION);
            }
            if (wheelSpokes) {
                wheelSpokes.setAttribute("transform", "translate(100,100) rotate(" + (wheelRotation * 180 / Math.PI) + ")");
            }
        }
        lastWheelAngle = angle;
        lastWheelActivityAt = Date.now();
        if (powerDecayTimerId) {
            clearTimeout(powerDecayTimerId);
            powerDecayTimerId = null;
        }
        powerDecayTimerId = setTimeout(schedulePowerDecay, POWER_DECAY_AFTER_MS);
        applyVisibility();
        if (visibility >= 100) {
            resetInactivityTimer();
        }
    }

    function schedulePowerDecay() {
        powerDecayTimerId = null;
        var idle = Date.now() - lastWheelActivityAt;
        if (idle >= POWER_DECAY_AFTER_MS && visibility < 100) {
            visibility = Math.max(0, visibility - POWER_DECAY_AMOUNT);
            applyVisibility();
            powerDecayTimerId = setTimeout(schedulePowerDecay, 500);
        }
    }

    function handleWheelClick(e) {
        if (visibility >= 100) return;
        e.preventDefault();
        visibility = Math.min(100, visibility + POWER_PER_CLICK);
        lastWheelActivityAt = Date.now();
        if (powerDecayTimerId) {
            clearTimeout(powerDecayTimerId);
            powerDecayTimerId = null;
        }
        powerDecayTimerId = setTimeout(schedulePowerDecay, POWER_DECAY_AFTER_MS);
        applyVisibility();
        if (visibility >= 100) {
            resetInactivityTimer();
        }
    }

    function updatePowerUI() {
        var pct = Math.round(visibility);
        if (powerPercentEl) powerPercentEl.textContent = pct + "%";
        if (powerRing) {
            var offset = (1 - visibility / 100) * POWER_RING_CIRCUMFERENCE;
            powerRing.setAttribute("stroke-dashoffset", String(offset));
        }
    }

    function pauseAllAndShowVisible() {
        stopDrainInterval();
        if (powerDecayTimerId) {
            clearTimeout(powerDecayTimerId);
            powerDecayTimerId = null;
        }
        visibility = 100;
        if (overlayEl) {
            overlayEl.classList.remove("visible");
            overlayEl.setAttribute("aria-hidden", "true");
            overlayEl.style.opacity = "";
        }
        if (generatorSection) generatorSection.classList.add("hidden");
        updateInactivityLabel();
    }

    function bindActivityListeners() {
        var onMove = function () { throttleActivity(onActivity); };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mousedown", onActivity);
        document.addEventListener("click", onActivity);
        document.addEventListener("keydown", onActivity);
        document.addEventListener("touchstart", onActivity, { passive: true });
        document.addEventListener("wheel", onActivity, { passive: true });
        document.addEventListener("scroll", onActivity, { passive: true });

        var wheelSvg = getEl("wheel-svg");
        if (wheelSvg) {
            wheelSvg.addEventListener("mousemove", handleWheelMouseMove);
            wheelSvg.addEventListener("click", handleWheelClick);
        }
    }

    function loadDevices(api) {
        api.call("Get", { typeName: "Device" }, function (devices) {
            deviceSelect.innerHTML = "";
            var opt0 = document.createElement("option");
            opt0.value = "";
            opt0.textContent = "— Select device —";
            deviceSelect.appendChild(opt0);
            for (var i = 0; i < devices.length; i++) {
                var d = devices[i];
                var opt = document.createElement("option");
                opt.value = d.id;
                opt.textContent = (d.name != null ? d.name : d.id);
                deviceSelect.appendChild(opt);
            }
        }, function (err) {
            showLiveStatusError("Failed to load devices.", err);
        });
    }

    function showLiveStatusLoading() {
        liveStatusContent.classList.add("hidden");
        liveStatusLoading.classList.remove("hidden");
        liveStatusLoading.removeAttribute("hidden");
        liveStatusError.classList.add("hidden");
        liveStatusError.setAttribute("hidden", "hidden");
    }

    function showLiveStatusError(message, technical) {
        liveStatusContent.classList.add("hidden");
        liveStatusLoading.classList.add("hidden");
        liveStatusLoading.setAttribute("hidden", "hidden");
        liveStatusError.classList.remove("hidden");
        liveStatusError.removeAttribute("hidden");
        liveStatusError.querySelector(".error-message").textContent = message;
        liveStatusError.querySelector(".error-pre").textContent = technical ? (typeof technical === "string" ? technical : JSON.stringify(technical, null, 2)) : "";
    }

    function showLiveStatusData(info) {
        liveStatusLoading.classList.add("hidden");
        liveStatusLoading.setAttribute("hidden", "hidden");
        liveStatusError.classList.add("hidden");
        liveStatusError.setAttribute("hidden", "hidden");
        liveStatusContent.classList.remove("hidden");
        var speed = info.speed != null ? String(info.speed) + " km/h" : "—";
        var bearing = info.bearing != null ? String(info.bearing) : "—";
        var dateTime = info.dateTime != null ? new Date(info.dateTime).toLocaleString() : "—";
        var lat = info.latitude != null ? String(info.latitude) : "—";
        var lon = info.longitude != null ? String(info.longitude) : "—";
        var loc = (info.latitude != null && info.longitude != null) ? lat + ", " + lon : "—";
        var communicating = info.isDeviceCommunicating != null ? (info.isDeviceCommunicating ? "Yes" : "No") : "—";
        liveStatusContent.innerHTML =
            "<table class=\"status-table\">" +
            "<tr><th>Speed</th><td>" + escapeHtml(speed) + "</td></tr>" +
            "<tr><th>Bearing</th><td>" + escapeHtml(bearing) + "</td></tr>" +
            "<tr><th>Date / Time</th><td>" + escapeHtml(dateTime) + "</td></tr>" +
            "<tr><th>Location</th><td>" + escapeHtml(loc) + "</td></tr>" +
            "<tr><th>Device communicating</th><td>" + escapeHtml(communicating) + "</td></tr>" +
            "</table>";
    }

    function escapeHtml(s) {
        var div = document.createElement("div");
        div.textContent = s;
        return div.innerHTML;
    }

    function fetchStatusForDevice(api, deviceId) {
        if (!deviceId) {
            liveStatusContent.innerHTML = "<p class=\"placeholder\">Select a device to view status.</p>";
            return;
        }
        showLiveStatusLoading();
        api.call("Get", {
            typeName: "DeviceStatusInfo",
            search: { deviceSearch: { id: deviceId } }
        }, function (results) {
            if (results && results.length > 0) {
                showLiveStatusData(results[0]);
            } else {
                showLiveStatusError("No status returned for this device.", null);
            }
        }, function (err) {
            showLiveStatusError("Failed to load device status.", err);
        });
    }

    function bindUi(api) {
        deviceSelect.addEventListener("change", function () {
            fetchStatusForDevice(api, deviceSelect.value);
        });
        refreshBtn.addEventListener("click", function () {
            fetchStatusForDevice(api, deviceSelect.value);
        });
        presentationCheckbox.addEventListener("change", function () {
            presentationMode = presentationCheckbox.checked;
            if (!presentationMode) {
                pauseAllAndShowVisible();
            } else {
                resetInactivityTimer();
                startDrainInterval();
            }
        });
    }

    function cacheElements() {
        reportEl = getEl("report-container");
        overlayEl = getEl("inactivity-overlay");
        generatorSection = getEl("generator-section");
        powerRing = getEl("power-ring");
        powerPercentEl = getEl("power-percent");
        wheelSpokes = getEl("wheel-spokes");
        deviceSelect = getEl("device-select");
        refreshBtn = getEl("refresh-btn");
        presentationCheckbox = getEl("presentation-mode");
        inactivityLabel = getEl("inactivity-label");
        liveStatusContent = getEl("live-status-content");
        liveStatusLoading = getEl("live-status-loading");
        liveStatusError = getEl("live-status-error");
        if (powerRing) {
            powerRing.setAttribute("stroke-dasharray", String(POWER_RING_CIRCUMFERENCE));
            powerRing.setAttribute("stroke-dashoffset", String(POWER_RING_CIRCUMFERENCE));
        }
    }

    geotab.addin.safetyReport = function () {
        return {
            initialize: function (api, state, callback) {
                apiRef = api;
                cacheElements();
                bindActivityListeners();
                bindUi(api);
                loadDevices(api);
                presentationMode = presentationCheckbox ? presentationCheckbox.checked : true;
                visibility = 100;
                applyVisibility();
                resetInactivityTimer();
                if (presentationMode) startDrainInterval();
                var inactivityInterval = setInterval(updateInactivityLabel, 1000);
                if (typeof callback === "function") callback();
            },
            focus: function (api, state) {
                apiRef = api;
                pauseAllAndShowVisible();
                resetInactivityTimer();
                if (presentationMode) startDrainInterval();
            },
            blur: function (api, state) {
                pauseAllAndShowVisible();
            }
        };
    };
})();
