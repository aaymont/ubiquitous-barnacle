/**
 * Fleet Symphony — 20-second classical loop (Bach/Beethoven style).
 * Light = major, 96 BPM, 8 bars. Dark = minor, 72 BPM, 6 bars.
 * Exposed as window.FleetSymphonyMusic.
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

    function lightProgression(bar) {
        var p = [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]];
        return p[bar % 4];
    }

    function darkProgression(bar) {
        var p = [[0, 3, 7], [5, 8, 12], [7, 11, 14], [0, 3, 7]];
        return p[bar % 4];
    }

    function buildScore(mood) {
        var isDark = mood === "dark";
        var bpm = isDark ? DARK_BPM : LIGHT_BPM;
        var bars = isDark ? DARK_BARS : LIGHT_BARS;
        var scale = isDark ? SCALE_MINOR : SCALE_MAJOR;
        var getProg = isDark ? darkProgression : lightProgression;
        var beatDur = 60 / bpm;
        var barDur = beatDur * 4;
        var eighthDur = beatDur / 2;

        var events = [];
        var melodyPhraseA = [{ d: 4, e: 2 }, { d: 4, e: 2 }, { d: 5, e: 1 }, { d: 4, e: 1 }, { d: 3, e: 2 }, { d: 2, e: 2 }, { d: 1, e: 2 }, { d: 0, e: 4 }];
        var melodyPhraseB = [{ d: 2, e: 2 }, { d: 3, e: 2 }, { d: 4, e: 2 }, { d: 3, e: 2 }, { d: 2, e: 2 }, { d: 1, e: 2 }, { d: 0, e: 2 }, { d: 0, e: 4 }];

        for (var bar = 0; bar < bars; bar++) {
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

            var phrase = bar % 2 === 0 ? melodyPhraseA : melodyPhraseB;
            var elapsed = 0;
            for (var i = 0; i < phrase.length; i++) {
                var deg = phrase[i].d;
                if (deg >= scale.length) deg = scale.length - 1;
                var melMidi = 24 + scale[deg];
                var altoDeg = deg - 2 >= 0 ? deg - 2 : 0;
                var altoMidi = 12 + scale[altoDeg];
                var noteT = barT + elapsed * eighthDur;
                var noteDur = phrase[i].e * eighthDur * 0.9;
                events.push({ t: noteT, type: "melody", midi: melMidi, dur: noteDur });
                events.push({ t: noteT, type: "alto", midi: altoMidi, dur: noteDur });
                elapsed += phrase[i].e;
            }
        }

        return { events: events, bpm: bpm };
    }

    var lightScore = buildScore("light");
    var darkScore = buildScore("dark");

    function scheduleSegment(startTime, mood, rootMidi, instruments) {
        if (typeof Tone === "undefined") return;
        var score = mood === "dark" ? darkScore : lightScore;
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

    function scheduleLoop(mood, rootMidi, instruments) {
        if (loopIntervalId != null) {
            clearInterval(loopIntervalId);
            loopIntervalId = null;
        }
        if (typeof Tone === "undefined" || !instruments) return null;
        var t0 = Tone.now();
        scheduleSegment(t0, mood, rootMidi, instruments);
        loopIntervalId = setInterval(function () {
            var start = Tone.now();
            scheduleSegment(start, mood, rootMidi, instruments);
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
        getBpm: function (mood) { return mood === "dark" ? darkScore.bpm : lightScore.bpm; }
    };
})();
