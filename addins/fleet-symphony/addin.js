/* Fleet Symphony — MyGeotab Custom Page Add-In. Safety & Trip Sonification. */

(function () {
    "use strict";

    var CACHE_BUST = "4"; /* Bump when deploying; also update ?v= on styles.css, music.js, and addin.js in index.html */

    var apiRef = null;
    var POLL_INTERVAL_MS = 5000;
    var DEFAULT_TRIPS_COUNT = 10;
    var BPM_MIN = 70;
    var BPM_MAX = 150;
    var SPEED_RANGE_KMH = 110;
    var SAFETY_MOTIF_RATE_MS = 3000;
    var SCALE_MAJOR = [0, 2, 4, 5, 7, 9, 11];
    var SCALE_MINOR = [0, 2, 3, 5, 7, 8, 10];
    var BPM_LIGHT_MIN = 88;
    var BPM_LIGHT_MAX = 112;
    var BPM_DARK_MIN = 56;
    var BPM_DARK_MAX = 76;
    var EXCEPTION_THRESHOLD_DARK = 5;
    var ROOT_MIDI = 48;

    var statusPollTimerId = null;
    var lastStatus = null;
    var speedHistory = [];
    var lastSafetyMotifAt = 0;
    var midiAccess = null;
    var midiOut = null;
    var audioStarted = false;
    var transportStarted = false;

    var melodySynth = null;
    var altoSynth = null;
    var chordSynth = null;
    var bassSynth = null;
    var alarmSynth = null;
    var reverb = null;
    var limiter = null;
    var meterAnalyser = null;
    var meterData = null;
    var meterAnimationId = null;

    function getEl(id) {
        return document.getElementById(id);
    }

    function escapeHtml(s) {
        if (s == null) return "";
        var div = document.createElement("div");
        div.textContent = String(s);
        return div.innerHTML;
    }

    function hashString(str) {
        var h = 0;
        var s = String(str || "");
        for (var i = 0; i < s.length; i++) {
            h = ((h << 5) - h) + s.charCodeAt(i) | 0;
        }
        return Math.abs(h);
    }

    function keyFromVehicleName(name) {
        var h = hashString(name);
        var notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        return notes[h % 12];
    }

    function speedToBPM(speedKmh) {
        var t = Math.max(0, Math.min(SPEED_RANGE_KMH, speedKmh || 0)) / SPEED_RANGE_KMH;
        return Math.round(BPM_MIN + t * (BPM_MAX - BPM_MIN));
    }

    function avgSpeedLastN(n) {
        if (!speedHistory.length || n < 1) return 0;
        var len = Math.min(n, speedHistory.length);
        var sum = 0;
        for (var i = speedHistory.length - len; i < speedHistory.length; i++) {
            sum += speedHistory[i];
        }
        return sum / len;
    }

    function initAudio() {
        if (typeof Tone === "undefined") return false;
        try {
            Tone.Destination.volume.value = -12;
            limiter = new Tone.Limiter(-1).toDestination();
            /* All synths connect via reverb -> limiter -> Destination (system speakers/headphones). MIDI is optional. */
            reverb = new Tone.Reverb({ decay: 2.5, wet: 0.35 }).connect(limiter);
            var vol = (getEl("volume-slider") && getEl("volume-slider").value) ? parseInt(getEl("volume-slider").value, 10) : 25;
            setMasterVolume(vol);
            melodySynth = new Tone.Synth({
                oscillator: { type: "triangle" },
                envelope: { attack: 0.03, decay: 0.15, sustain: 0.6, release: 0.4 }
            }).connect(reverb);
            altoSynth = new Tone.Synth({
                oscillator: { type: "sine" },
                envelope: { attack: 0.04, decay: 0.2, sustain: 0.5, release: 0.5 }
            }).connect(reverb);
            chordSynth = new Tone.PolySynth(Tone.Synth, {
                maxPolyphony: 6,
                oscillator: { type: "sine" },
                envelope: { attack: 0.06, decay: 0.25, sustain: 0.65, release: 0.8 }
            }).connect(reverb);
            bassSynth = new Tone.Synth({
                oscillator: { type: "sine" },
                envelope: { attack: 0.02, decay: 0.2, sustain: 0.5, release: 0.35 }
            }).connect(reverb);
            alarmSynth = new Tone.Synth({
                oscillator: { type: "sine" },
                envelope: { attack: 0.02, decay: 0.2, sustain: 0, release: 0.4 }
            }).connect(reverb);
            meterAnalyser = new Tone.Analyser("waveform", 256);
            Tone.Destination.connect(meterAnalyser);
            meterData = new Float32Array(256);
            return true;
        } catch (e) {
            console.error("Fleet Symphony audio init:", e);
            return false;
        }
    }

    function setMasterVolume(percent) {
        var p = Math.max(0, Math.min(100, percent));
        if (getEl("volume-value")) getEl("volume-value").textContent = p + "%";
        var db = p <= 0 ? -100 : -36 + (p / 100) * 30;
        if (typeof Tone !== "undefined" && Tone.Destination && Tone.Destination.volume) {
            Tone.Destination.volume.value = db;
        }
    }

    function disposeAudio() {
        if (meterAnimationId != null) {
            cancelAnimationFrame(meterAnimationId);
            meterAnimationId = null;
        }
        try {
            if (typeof Tone !== "undefined") {
                Tone.Transport.stop();
                Tone.Transport.cancel();
                if (melodySynth) melodySynth.dispose();
                if (altoSynth) altoSynth.dispose();
                if (chordSynth) chordSynth.dispose();
                if (bassSynth) bassSynth.dispose();
                if (alarmSynth) alarmSynth.dispose();
                if (reverb) reverb.dispose();
                if (limiter) limiter.dispose();
                if (meterAnalyser) meterAnalyser.dispose();
            }
        } catch (e) {}
        melodySynth = altoSynth = chordSynth = bassSynth = alarmSynth = reverb = limiter = meterAnalyser = null;
        audioStarted = false;
        transportStarted = false;
    }

    function darknessFromExceptions(exceptionCount) {
        if (!exceptionCount) return 0;
        return Math.min(1, exceptionCount / EXCEPTION_THRESHOLD_DARK);
    }

    function bpmFromDarkness(dark) {
        var bpmOverride = getEl("tempo-override") && getEl("tempo-override").value ? parseInt(getEl("tempo-override").value, 10) : null;
        if (bpmOverride != null && !isNaN(bpmOverride)) return Math.max(40, Math.min(140, bpmOverride));
        if (dark >= 0.5) return BPM_DARK_MIN + (1 - dark) * (BPM_DARK_MAX - BPM_DARK_MIN);
        return BPM_LIGHT_MIN + (1 - dark) * (BPM_LIGHT_MAX - BPM_LIGHT_MIN);
    }

    function getScale(isDark) {
        return isDark ? SCALE_MINOR : SCALE_MAJOR;
    }

    function getClassicalProgression(isDark, barIndex) {
        if (isDark) {
            var darkProg = [[0, 3, 7], [5, 8, 12], [7, 11, 14], [0, 3, 7]];
            return darkProg[barIndex % 4];
        }
        var lightProg = [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]];
        return lightProg[barIndex % 4];
    }

    function getBassQuarterNotes(chordSemitones, rootMidi) {
        var r = chordSemitones[0];
        var third = chordSemitones[1];
        var fifth = chordSemitones[2] >= 12 ? chordSemitones[2] - 12 : chordSemitones[2];
        return [rootMidi + r, rootMidi + fifth, rootMidi + third, rootMidi + fifth];
    }

    function startClassicalLoop(trips, exceptions, deviceName) {
        if (typeof Tone === "undefined" || !audioStarted) return;
        Tone.Transport.cancel();
        if (window.FleetSymphonyMusic) window.FleetSymphonyMusic.stopLoop();
        var exceptionCount = exceptions ? exceptions.length : 0;
        var dark = darknessFromExceptions(exceptionCount);
        var isDark = dark >= 0.5;
        var rootMidi = ROOT_MIDI + (hashString(deviceName) % 12);
        var mood = isDark ? "dark" : "light";
        var bpm = window.FleetSymphonyMusic ? window.FleetSymphonyMusic.getBpm(mood) : 96;
        Tone.Transport.bpm.value = bpm;
        if (window.FleetSymphonyMusic && melodySynth && altoSynth && chordSynth && bassSynth) {
            window.FleetSymphonyMusic.scheduleLoop(mood, rootMidi, {
                melody: melodySynth,
                alto: altoSynth,
                chord: chordSynth,
                bass: bassSynth
            });
        }
        var lastTripSummary = trips && trips.length ? (trips[trips.length - 1].distance != null ? trips[trips.length - 1].distance.toFixed(1) + " km" : "—") : "—";
        var moodLabel = isDark ? "Minor (dark)" : "Major (light)";
        if (exceptionCount > 0) moodLabel = moodLabel + " (" + exceptionCount + " ex)";
        updateNowPlayingCards(bpm, keyFromVehicleName(deviceName), moodLabel, lastTripSummary);
    }

    function scheduleLiveDriving(status) {
        if (typeof Tone === "undefined" || !melodySynth || !audioStarted) return;
        var speed = status.speed != null ? status.speed : 0;
        speedHistory.push(speed);
        if (speedHistory.length > 60) speedHistory.shift();
        var dark = status.isDeviceCommunicating === false ? 0.8 : 0;
        var bpm = Math.round(bpmFromDarkness(dark));
        Tone.Transport.bpm.value = bpm;
        var rootMidi = ROOT_MIDI + 12 + (hashString(status.device && status.device.name) % 12);
        var scale = getScale(dark >= 0.5);
        var degree = Math.min(6, Math.max(0, Math.floor((speed / (SPEED_RANGE_KMH + 1)) * 7)));
        var midiNote = rootMidi + scale[degree];
        var now = Tone.now();
        var dur = 0.4 + (1 - dark) * 0.3;
        melodySynth.triggerAttackRelease(Tone.Frequency(midiNote, "midi").toFrequency(), dur, now);
    }

    function playSafetyMotif() {
        var now = Date.now();
        if (now - lastSafetyMotifAt < SAFETY_MOTIF_RATE_MS) return;
        lastSafetyMotifAt = now;
        if (typeof Tone === "undefined" || !alarmSynth || !audioStarted) return;
        var t = Tone.now();
        var root = 392;
        alarmSynth.triggerAttackRelease(root, 0.25, t);
        alarmSynth.triggerAttackRelease(root * (6 / 5), 0.25, t + 0.2);
        alarmSynth.triggerAttackRelease(root * 0.8, 0.35, t + 0.45);
        if (midiOut) {
            try {
                midiOut.send([0x90, 68, 70]);
                midiOut.send([0x80, 68, 0]);
                midiOut.send([0x90, 72, 70]);
                midiOut.send([0x80, 72, 0]);
            } catch (err) {}
        }
    }

    function updateNowPlayingCards(bpm, key, safetyMood, lastTrip) {
        var el;
        if ((el = getEl("np-bpm"))) el.textContent = bpm != null ? bpm : "—";
        if ((el = getEl("np-key"))) el.textContent = key || "—";
        if ((el = getEl("np-safety"))) el.textContent = safetyMood || "—";
        if ((el = getEl("np-last-trip"))) el.textContent = lastTrip != null ? lastTrip : "—";
        var container = getEl("now-playing-cards");
        var placeholder = getEl("now-playing-content");
        if (container && placeholder) {
            container.classList.remove("hidden");
            placeholder.classList.add("hidden");
        }
    }

    function drawMeter() {
        if (meterAnalyser == null) return;
        var canvas = getEl("level-meter");
        if (!canvas) return;
        var ctx = canvas.getContext("2d");
        if (!ctx) return;
        try {
            meterAnalyser.getValue(meterData);
        } catch (e) {
            meterAnimationId = requestAnimationFrame(drawMeter);
            return;
        }
        var w = canvas.width;
        var h = canvas.height;
        ctx.fillStyle = "#1a2332";
        ctx.fillRect(0, 0, w, h);
        var sum = 0;
        for (var i = 0; i < meterData.length; i++) sum += Math.abs(meterData[i]);
        var level = Math.min(1, (sum / meterData.length) * 4);
        var barW = w * level;
        ctx.fillStyle = "#58a6ff";
        ctx.fillRect(0, 0, barW, h);
        meterAnimationId = requestAnimationFrame(drawMeter);
    }

    function addTimelineMarker(label, type) {
        var container = getEl("timeline-content");
        if (!container) return;
        var span = document.createElement("span");
        span.className = "timeline-marker " + (type || "trip");
        span.textContent = label;
        container.appendChild(span);
    }

    function loadDevices(api) {
        var select = getEl("device-select");
        if (!select) return;
        select.innerHTML = '<option value="">— Select device —</option>';
        api.call("Get", { typeName: "Device" }, function (devices) {
            for (var i = 0; i < devices.length; i++) {
                var d = devices[i];
                var opt = document.createElement("option");
                opt.value = d.id;
                opt.textContent = (d.name != null ? d.name : d.id);
                select.appendChild(opt);
            }
        }, function (err) {
            console.error("Fleet Symphony: load devices", err);
        });
    }

    function fetchStatus(api, deviceId, onResult) {
        if (!deviceId) {
            if (onResult) onResult(null);
            return;
        }
        api.call("Get", {
            typeName: "DeviceStatusInfo",
            search: { deviceSearch: { id: deviceId } }
        }, function (results) {
            if (onResult) onResult(results && results.length ? results[0] : null);
        }, function (err) {
            if (onResult) onResult(null);
        });
    }

    function fetchTrips(api, deviceId, days, onResult) {
        if (!deviceId) {
            if (onResult) onResult([]);
            return;
        }
        var toDate = new Date();
        var fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - (days || 7));
        api.call("Get", {
            typeName: "Trip",
            search: {
                deviceSearch: { id: deviceId },
                fromDate: fromDate.toISOString(),
                toDate: toDate.toISOString()
            },
            resultsLimit: Math.min(DEFAULT_TRIPS_COUNT * 2, 100)
        }, function (trips) {
            if (!trips || !trips.length) {
                if (onResult) onResult([]);
                return;
            }
            trips.sort(function (a, b) {
                var ta = a.start ? new Date(a.start).getTime() : 0;
                var tb = b.start ? new Date(b.start).getTime() : 0;
                return tb - ta;
            });
            if (onResult) onResult(trips.slice(0, DEFAULT_TRIPS_COUNT));
        }, function (err) {
            if (onResult) onResult([]);
        });
    }

    function fetchExceptions(api, deviceId, days, onResult) {
        if (!deviceId) {
            if (onResult) onResult([]);
            return;
        }
        var toDate = new Date();
        var fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - (days || 7));
        api.call("Get", {
            typeName: "ExceptionEvent",
            search: {
                deviceSearch: { id: deviceId },
                fromDate: fromDate.toISOString(),
                toDate: toDate.toISOString()
            },
            resultsLimit: 200
        }, function (events) {
            if (onResult) onResult(events || []);
        }, function () {
            if (onResult) onResult([]);
        });
    }

    function pollStatus(api) {
        if (statusPollTimerId) return;
        var deviceId = getEl("device-select") && getEl("device-select").value;
        if (!deviceId) return;
        function poll() {
            fetchStatus(api, deviceId, function (status) {
                lastStatus = status;
                if (status && getEl("mode-toggle") && getEl("mode-toggle").value === "live") {
                    updateNowPlayingFromStatus(status);
                    if (status.isDeviceCommunicating === false) {
                        playSafetyMotif();
                    }
                }
            });
        }
        poll();
        statusPollTimerId = setInterval(poll, POLL_INTERVAL_MS);
    }

    function stopPolling() {
        if (statusPollTimerId) {
            clearInterval(statusPollTimerId);
            statusPollTimerId = null;
        }
    }

    function updateNowPlayingFromStatus(status) {
        var dark = status.isDeviceCommunicating === false ? 0.8 : 0;
        var bpm = Math.round(bpmFromDarkness(dark));
        var deviceName = status.device && status.device.name ? status.device.name : "";
        var key = keyFromVehicleName(deviceName);
        var safetyMood = dark >= 0.5 ? "Minor (dark)" : "Major (light)";
        updateNowPlayingCards(bpm, key, safetyMood, status.speed != null ? status.speed + " km/h" : "—");
    }

    function renderLiveStatus(status) {
        var content = getEl("now-playing-content");
        if (!content) return;
        if (!status) {
            content.innerHTML = '<p class="placeholder">Select a device and click Start.</p>';
            content.classList.remove("hidden");
            var cards = getEl("now-playing-cards");
            if (cards) cards.classList.add("hidden");
            return;
        }
        var speed = status.speed != null ? status.speed + " km/h" : "—";
        var bearing = status.bearing != null ? status.bearing : "—";
        var dateTime = status.dateTime ? new Date(status.dateTime).toLocaleString() : "—";
        var comm = status.isDeviceCommunicating != null ? (status.isDeviceCommunicating ? "Yes" : "No") : "—";
        content.innerHTML =
            "<table class=\"status-table\"><tr><th>Speed</th><td>" + escapeHtml(speed) + "</td></tr>" +
            "<tr><th>Bearing</th><td>" + escapeHtml(bearing) + "</td></tr>" +
            "<tr><th>Date / Time</th><td>" + escapeHtml(dateTime) + "</td></tr>" +
            "<tr><th>Communicating</th><td>" + escapeHtml(comm) + "</td></tr></table>";
        content.classList.remove("hidden");
    }

    function requestMIDI() {
        if (typeof navigator.requestMIDIAccess === "undefined") return;
        if (location.protocol !== "https:" && location.hostname !== "localhost") return;
        navigator.requestMIDIAccess({ sysex: false }).then(function (access) {
            midiAccess = access;
            var select = getEl("midi-device-select");
            if (!select) return;
            select.innerHTML = '<option value="">— No device —</option>';
            var outs = access.outputs.values();
            var out;
            while ((out = outs.next()) && !out.done) {
                var opt = document.createElement("option");
                opt.value = out.value.id;
                opt.textContent = out.value.name || out.value.id;
                select.appendChild(opt);
            }
        }).catch(function (err) {
            console.warn("Fleet Symphony MIDI:", err);
        });
    }

    function bindUI(api) {
        var deviceSelect = getEl("device-select");
        var modeToggle = getEl("mode-toggle");
        var playbackRange = getEl("playback-range");
        var playbackRangeGroup = getEl("playback-range-group");
        var btnStart = getEl("btn-start");
        var btnPause = getEl("btn-pause");
        var btnStop = getEl("btn-stop");
        var volumeSlider = getEl("volume-slider");
        var midiToggle = getEl("midi-toggle");
        var midiSelect = getEl("midi-device-select");

        function showPlaybackRange(show) {
            if (playbackRangeGroup) playbackRangeGroup.classList.toggle("hidden", !show);
        }

        if (modeToggle) {
            modeToggle.addEventListener("change", function () {
                showPlaybackRange(modeToggle.value === "playback");
            });
            showPlaybackRange(modeToggle.value === "playback");
        }

        if (deviceSelect) {
            deviceSelect.addEventListener("change", function () {
                stopPolling();
                lastStatus = null;
                speedHistory = [];
                renderLiveStatus(null);
            });
        }

        if (btnStart) {
            btnStart.addEventListener("click", function () {
                var deviceId = deviceSelect && deviceSelect.value;
                if (!deviceId) return;
                if (typeof Tone === "undefined") {
                    renderLiveStatus(lastStatus);
                    return;
                }
                if (!audioStarted) {
                    Tone.start().then(function () {
                        audioStarted = true;
                        if (!initAudio()) return;
                        setMasterVolume(volumeSlider ? parseInt(volumeSlider.value, 10) : 25);
                        drawMeter();
                        transportStarted = true;
                        Tone.Transport.start();
                        if (modeToggle && modeToggle.value === "live") {
                            pollStatus(api);
                            var deviceNameLive = "";
                            for (var i = 0; i < deviceSelect.options.length; i++) {
                                if (deviceSelect.options[i].value === deviceId) {
                                    deviceNameLive = deviceSelect.options[i].text;
                                    break;
                                }
                            }
                            fetchStatus(api, deviceId, function (s) {
                                lastStatus = s;
                                renderLiveStatus(s);
                                updateNowPlayingFromStatus(s);
                                var mood = s && s.isDeviceCommunicating === false ? "dark" : "light";
                                var rootMidiLive = ROOT_MIDI + (hashString(deviceNameLive) % 12);
                                if (window.FleetSymphonyMusic && melodySynth && altoSynth && chordSynth && bassSynth) {
                                    window.FleetSymphonyMusic.scheduleLoop(mood, rootMidiLive, {
                                        melody: melodySynth,
                                        alto: altoSynth,
                                        chord: chordSynth,
                                        bass: bassSynth
                                    });
                                }
                            });
                        } else {
                            var days = playbackRange ? parseInt(playbackRange.value, 10) : 7;
                            fetchTrips(api, deviceId, days, function (trips) {
                                fetchExceptions(api, deviceId, days, function (exceptions) {
                                    var deviceName = "";
                                    for (var i = 0; i < deviceSelect.options.length; i++) {
                                        if (deviceSelect.options[i].value === deviceId) {
                                            deviceName = deviceSelect.options[i].text;
                                            break;
                                        }
                                    }
                                    startClassicalLoop(trips, exceptions, deviceName);
                                    var tc = getEl("timeline-content");
                                    if (tc) {
                                        tc.innerHTML = "";
                                        for (var j = 0; j < (trips || []).length; j++) {
                                            addTimelineMarker("Trip " + (j + 1), "trip");
                                        }
                                        for (var k = 0; k < (exceptions || []).length; k++) {
                                            addTimelineMarker("Exception", "exception");
                                        }
                                    }
                                });
                            });
                        }
                        if (btnPause) btnPause.disabled = false;
                        if (btnStop) btnStop.disabled = false;
                    });
                } else {
                    transportStarted = true;
                    Tone.Transport.start();
                    if (modeToggle && modeToggle.value === "live") {
                        pollStatus(api);
                        var deviceNameResume = "";
                        for (var i = 0; i < deviceSelect.options.length; i++) {
                            if (deviceSelect.options[i].value === deviceId) {
                                deviceNameResume = deviceSelect.options[i].text;
                                break;
                            }
                        }
                        var rootMidiResume = ROOT_MIDI + (hashString(deviceNameResume) % 12);
                        if (window.FleetSymphonyMusic && melodySynth && altoSynth && chordSynth && bassSynth) {
                            window.FleetSymphonyMusic.scheduleLoop(lastStatus && lastStatus.isDeviceCommunicating === false ? "dark" : "light", rootMidiResume, {
                                melody: melodySynth,
                                alto: altoSynth,
                                chord: chordSynth,
                                bass: bassSynth
                            });
                        }
                    }
                    if (btnPause) btnPause.disabled = false;
                    if (btnStop) btnStop.disabled = false;
                }
            });
        }

        if (btnPause) {
            btnPause.addEventListener("click", function () {
                if (typeof Tone !== "undefined") Tone.Transport.pause();
            });
        }

        if (btnStop) {
            btnStop.addEventListener("click", function () {
                if (window.FleetSymphonyMusic) window.FleetSymphonyMusic.stopLoop();
                if (typeof Tone !== "undefined") Tone.Transport.stop();
                transportStarted = false;
                stopPolling();
                if (btnPause) btnPause.disabled = true;
                if (btnStop) btnStop.disabled = true;
            });
        }

        if (volumeSlider) {
            volumeSlider.addEventListener("input", function () {
                setMasterVolume(parseInt(volumeSlider.value, 10));
            });
        }

        if (midiToggle && midiSelect) {
            midiToggle.addEventListener("change", function () {
                midiSelect.disabled = !midiToggle.checked;
                if (midiToggle.checked && midiSelect.value) {
                    var outs = midiAccess && midiAccess.outputs ? midiAccess.outputs : [];
                    var it = outs.values && outs.values();
                    if (it) {
                        var next = it.next();
                        while (!next.done) {
                            if (next.value.id === midiSelect.value) {
                                midiOut = next.value;
                                break;
                            }
                            next = it.next();
                        }
                    }
                } else {
                    midiOut = null;
                }
            });
            midiSelect.addEventListener("change", function () {
                midiOut = null;
                if (!midiAccess || !midiAccess.outputs) return;
                var it = midiAccess.outputs.values();
                var n;
                while ((n = it.next()) && !n.done) {
                    if (n.value.id === midiSelect.value) {
                        midiOut = n.value;
                        break;
                    }
                }
            });
        }
    }

    function showMidiWarning() {
        var warn = getEl("midi-warning");
        if (!warn) return;
        if (location.protocol !== "https:" && location.hostname !== "localhost") {
            warn.textContent = "MIDI requires HTTPS. Not available here. Sound still plays through system audio.";
        } else {
            warn.textContent = "Optional: send a copy to an external MIDI device. Sound always uses system audio.";
        }
    }

    geotab.addin.fleetSymphony = function () {
        return {
            initialize: function (api, state, callback) {
                apiRef = api;
                var versionEl = getEl("app-version");
                if (versionEl) versionEl.textContent = "v" + CACHE_BUST;
                loadDevices(api);
                bindUI(api);
                showMidiWarning();
                if (typeof navigator.requestMIDIAccess !== "undefined" && (location.protocol === "https:" || location.hostname === "localhost")) {
                    requestMIDI();
                }
                if (typeof callback === "function") callback();
            },
            focus: function (api, state) {
                apiRef = api;
            },
            blur: function (api, state) {
                if (window.FleetSymphonyMusic) window.FleetSymphonyMusic.stopLoop();
                if (typeof Tone !== "undefined") Tone.Transport.stop();
                stopPolling();
                disposeAudio();
            }
        };
    };
})();
