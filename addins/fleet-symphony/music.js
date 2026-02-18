/**
 * Fleet Symphony — 20-second classical loops (public domain).
 * Light: 2 major pieces (Ode to Joy, Minuet in G). Dark: 2 minor pieces (Moonlight Sonata, Funeral March).
 */
(function () {
    "use strict";

    var LOOP_DURATION_SEC = 20;

    var SCALE_MAJOR = [0, 2, 4, 5, 7, 9, 11];
    var SCALE_MINOR = [0, 2, 3, 5, 7, 8, 10];
    var LIGHT_BPM = 96;
    var DARK_BPM = 72;
    var LIGHT_BARS = 8;
    var DARK_BARS = 6;

    /* Public domain melodies: scale degree (0–6), duration in eighths. */

    /* Light 0: Ode to Joy (Beethoven, Symphony No. 9) — major, 4 bars then repeat */
    var ODE_TO_JOY = [
        { d: 4, e: 2 }, { d: 4, e: 2 }, { d: 5, e: 2 }, { d: 6, e: 2 }, { d: 6, e: 2 }, { d: 5, e: 2 }, { d: 4, e: 2 }, { d: 3, e: 2 },
        { d: 0, e: 2 }, { d: 0, e: 2 }, { d: 1, e: 2 }, { d: 2, e: 2 }, { d: 2, e: 2 }, { d: 1, e: 4 },
        { d: 2, e: 2 }, { d: 2, e: 2 }, { d: 3, e: 2 }, { d: 4, e: 2 }, { d: 4, e: 2 }, { d: 3, e: 2 }, { d: 2, e: 2 }, { d: 1, e: 2 },
        { d: 0, e: 2 }, { d: 0, e: 2 }, { d: 1, e: 2 }, { d: 2, e: 2 }, { d: 1, e: 2 }, { d: 0, e: 4 }
    ];

    /* Light 1: Minuet in G (Bach, BWV Anh 114) — major */
    var MINUET_G = [
        { d: 0, e: 2 }, { d: 2, e: 2 }, { d: 1, e: 2 }, { d: 0, e: 2 }, { d: 4, e: 2 }, { d: 0, e: 2 }, { d: 2, e: 2 }, { d: 1, e: 2 },
        { d: 0, e: 4 }, { d: 2, e: 2 }, { d: 3, e: 2 }, { d: 4, e: 2 }, { d: 4, e: 2 }, { d: 3, e: 2 }, { d: 2, e: 2 }, { d: 0, e: 4 },
        { d: 4, e: 2 }, { d: 4, e: 2 }, { d: 5, e: 2 }, { d: 6, e: 2 }, { d: 6, e: 2 }, { d: 5, e: 2 }, { d: 4, e: 2 }, { d: 3, e: 2 },
        { d: 2, e: 2 }, { d: 2, e: 2 }, { d: 3, e: 2 }, { d: 4, e: 2 }, { d: 3, e: 2 }, { d: 2, e: 2 }, { d: 1, e: 2 }, { d: 0, e: 4 }
    ];

    /* Dark 0: Moonlight Sonata theme (Beethoven, Op 27 No 2) — minor, slow */
    var MOONLIGHT = [
        { d: 0, e: 4 }, { d: 2, e: 4 }, { d: 4, e: 4 }, { d: 2, e: 4 }, { d: 0, e: 4 }, { d: 2, e: 4 }, { d: 4, e: 4 }, { d: 4, e: 4 },
        { d: 2, e: 4 }, { d: 0, e: 8 }, { d: 2, e: 4 }, { d: 4, e: 4 }, { d: 5, e: 4 }, { d: 4, e: 4 }, { d: 2, e: 4 }, { d: 0, e: 8 },
        { d: 0, e: 4 }, { d: 2, e: 4 }, { d: 4, e: 4 }, { d: 2, e: 4 }, { d: 0, e: 4 }, { d: 2, e: 4 }, { d: 4, e: 4 }, { d: 4, e: 4 },
        { d: 2, e: 4 }, { d: 0, e: 8 }
    ];

    /* Dark 1: Funeral March theme (Chopin, Op 35) — minor */
    var FUNERAL_MARCH = [
        { d: 0, e: 4 }, { d: 0, e: 4 }, { d: 1, e: 4 }, { d: 0, e: 4 }, { d: 4, e: 4 }, { d: 3, e: 4 }, { d: 2, e: 4 }, { d: 1, e: 4 },
        { d: 0, e: 8 }, { d: 2, e: 4 }, { d: 3, e: 4 }, { d: 4, e: 4 }, { d: 4, e: 4 }, { d: 3, e: 4 }, { d: 2, e: 4 }, { d: 0, e: 8 },
        { d: 0, e: 4 }, { d: 0, e: 4 }, { d: 1, e: 4 }, { d: 0, e: 4 }, { d: 4, e: 4 }, { d: 3, e: 4 }, { d: 2, e: 4 }, { d: 1, e: 4 },
        { d: 0, e: 8 }
    ];

    var LIGHT_MELODIES = [ODE_TO_JOY, MINUET_G];
    var DARK_MELODIES = [MOONLIGHT, FUNERAL_MARCH];

    function lightProgression(bar) {
        var p = [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]];
        return p[bar % 4];
    }

    function darkProgression(bar) {
        var p = [[0, 3, 7], [5, 8, 12], [7, 11, 14], [0, 3, 7]];
        return p[bar % 4];
    }

    function buildScore(mood, songIndex) {
        var isDark = mood === "dark";
        var bpm = isDark ? DARK_BPM : LIGHT_BPM;
        var bars = isDark ? DARK_BARS : LIGHT_BARS;
        var scale = isDark ? SCALE_MINOR : SCALE_MAJOR;
        var getProg = isDark ? darkProgression : lightProgression;
        var beatDur = 60 / bpm;
        var barDur = beatDur * 4;
        var eighthDur = beatDur / 2;

        var melodySource = isDark ? DARK_MELODIES[songIndex % 2] : LIGHT_MELODIES[songIndex % 2];
        var events = [];
        var noteIndex = 0;
        var bar;
        for (bar = 0; bar < bars; bar++) {
            var barT = bar * barDur;
            var chord = getProg(bar);
            var root = chord[0];
            var third = chord[1];
            var fifth = chord[2];

            for (var b = 0; b < 4; b++) {
                var bassMidi = b === 0 ? root : (b === 1 || b === 3 ? fifth : third);
                events.push({ t: barT + b * beatDur, type: "bass", midi: bassMidi, dur: beatDur * 0.85 });
            }
            events.push({ t: barT, type: "chord", midis: [chord[0], chord[1], chord[2]], dur: beatDur * 1.9 });
            events.push({ t: barT + beatDur * 2, type: "chord", midis: [chord[0], chord[1], chord[2]], dur: beatDur * 1.9 });

            var phraseEighths = 0;
            while (phraseEighths < 16) {
                var note = melodySource[noteIndex % melodySource.length];
                if (phraseEighths + note.e > 16) break;
                var deg = note.d;
                if (deg >= scale.length) deg = scale.length - 1;
                var melMidi = 24 + scale[deg];
                var altoDeg = deg - 2 >= 0 ? deg - 2 : 0;
                var altoMidi = 12 + scale[altoDeg];
                var noteT = barT + phraseEighths * eighthDur;
                var noteDur = note.e * eighthDur * 0.9;
                events.push({ t: noteT, type: "melody", midi: melMidi, dur: noteDur });
                events.push({ t: noteT, type: "alto", midi: altoMidi, dur: noteDur });
                phraseEighths += note.e;
                noteIndex++;
            }
        }

        return { events: events, bpm: bpm };
    }

    var lightScore0 = buildScore("light", 0);
    var lightScore1 = buildScore("light", 1);
    var darkScore0 = buildScore("dark", 0);
    var darkScore1 = buildScore("dark", 1);

    function getScore(mood, songIndex) {
        var idx = (songIndex == null ? 0 : songIndex) % 2;
        if (mood === "dark") return idx === 0 ? darkScore0 : darkScore1;
        return idx === 0 ? lightScore0 : lightScore1;
    }

    function scheduleSegment(startTime, mood, rootMidi, instruments, songIndex) {
        if (typeof Tone === "undefined") return;
        var score = getScore(mood, songIndex);
        var events = score.events;
        Tone.Transport.bpm.value = score.bpm;
        for (var i = 0; i < events.length; i++) {
            var ev = events[i];
            var t = startTime + ev.t;
            if (ev.type === "bass" && instruments.bass) {
                instruments.bass.triggerAttackRelease(Tone.Frequency(rootMidi + ev.midi, "midi").toFrequency(), ev.dur, t);
            } else if (ev.type === "chord" && instruments.chord) {
                for (var c = 0; c < ev.midis.length; c++) {
                    instruments.chord.triggerAttackRelease(Tone.Frequency(rootMidi + 12 + ev.midis[c], "midi").toFrequency(), ev.dur, t);
                }
            } else if (ev.type === "melody" && instruments.melody) {
                instruments.melody.triggerAttackRelease(Tone.Frequency(rootMidi + ev.midi, "midi").toFrequency(), ev.dur, t);
            } else if (ev.type === "alto" && instruments.alto) {
                instruments.alto.triggerAttackRelease(Tone.Frequency(rootMidi + ev.midi, "midi").toFrequency(), ev.dur, t);
            }
        }
    }

    var loopIntervalId = null;
    var currentSongIndex = 0;

    function scheduleLoop(mood, rootMidi, instruments, songIndex) {
        if (loopIntervalId != null) {
            clearInterval(loopIntervalId);
            loopIntervalId = null;
        }
        if (typeof Tone === "undefined" || !instruments) return null;
        currentSongIndex = (songIndex != null ? songIndex : 0) % 2;
        var t0 = Tone.now();
        scheduleSegment(t0, mood, rootMidi, instruments, currentSongIndex);
        loopIntervalId = setInterval(function () {
            scheduleSegment(Tone.now(), mood, rootMidi, instruments, currentSongIndex);
        }, LOOP_DURATION_SEC * 1000);
        return loopIntervalId;
    }

    function stopLoop() {
        if (loopIntervalId != null) {
            clearInterval(loopIntervalId);
            loopIntervalId = null;
        }
    }

    window.FleetSymphonyMusic = {
        LOOP_DURATION_SEC: LOOP_DURATION_SEC,
        scheduleLoop: scheduleLoop,
        stopLoop: stopLoop,
        scheduleSegment: scheduleSegment,
        getBpm: function (mood) { return mood === "dark" ? 72 : 96; }
    };
})();
