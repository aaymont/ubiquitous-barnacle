/* Contractor Units Activity Report — shared utilities (geometry, formatting, time). */
(function () {
    "use strict";

    var ALLOWED_BREAK_15 = 15;
    var ALLOWED_BREAK_30 = 30;
    var ALLOWED_BREAK_45 = 45;

    function pointInPolygon(lat, lng, points) {
        var n = points.length;
        var inside = false;
        var j = n - 1;
        for (var i = 0; i < n; i++) {
            var xi = points[i].latitude != null ? points[i].latitude : points[i].x;
            var yi = points[i].longitude != null ? points[i].longitude : points[i].y;
            var xj = points[j].latitude != null ? points[j].latitude : points[j].x;
            var yj = points[j].longitude != null ? points[j].longitude : points[j].y;
            if (xi == null) xi = points[i].lat;
            if (yi == null) yi = points[i].lng;
            if (xj == null) xj = points[j].lat;
            if (yj == null) yj = points[j].lng;
            var intersect = ((yi > lng) !== (yj > lng)) &&
                (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
            j = i;
        }
        return inside;
    }

    window.CONTRACTOR_REPORT_UTILS = {
        dateKey: function (d) {
            var y = d.getFullYear();
            var m = (d.getMonth() + 1);
            var day = d.getDate();
            return y + "-" + (m < 10 ? "0" : "") + m + "-" + (day < 10 ? "0" : "") + day;
        },
        getTotalSeconds: function (durationObj) {
            if (!durationObj || typeof durationObj.totalSeconds !== "number") return 0;
            return durationObj.totalSeconds;
        },
        pointInZone: function (lat, lng, zone) {
            if (lat == null || lng == null) return false;
            if (zone.points && zone.points.length >= 3) {
                return pointInPolygon(lat, lng, zone.points);
            }
            if (typeof zone.latitude === "number" && typeof zone.longitude === "number" && typeof zone.radius === "number") {
                var R = 6371000;
                var dLat = (zone.latitude - lat) * Math.PI / 180;
                var dLon = (zone.longitude - lng) * Math.PI / 180;
                var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(lat * Math.PI / 180) * Math.cos(zone.latitude * Math.PI / 180) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
                var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                return (R * c) <= zone.radius;
            }
            return false;
        },
        findZoneAtPoint: function (lat, lng, zones, excludeZoneId) {
            for (var z = 0; z < zones.length; z++) {
                if (zones[z].id === excludeZoneId) continue;
                if (window.CONTRACTOR_REPORT_UTILS.pointInZone(lat, lng, zones[z])) return zones[z].name || "Zone";
            }
            return null;
        },
        formatLatLng: function (lat, lng) {
            if (lat == null || lng == null) return "";
            return Number(lat).toFixed(5) + "," + Number(lng).toFixed(5);
        },
        formatAddress: function (addr) {
            if (!addr) return "";
            if (typeof addr === "string") return addr;
            if (addr.formattedAddress) return addr.formattedAddress;
            if (addr.displayName) return addr.displayName;
            if (addr.display_name) return addr.display_name;
            var a = addr.address || addr;
            var parts = [];
            if (a.street) parts.push(a.street);
            else if (a.road) parts.push(a.road);
            if (a.city) parts.push(a.city);
            else if (a.town) parts.push(a.town);
            else if (a.village) parts.push(a.village);
            if (a.suburb) parts.push(a.suburb);
            if (a.region || a.state) parts.push(a.region || a.state);
            if (a.country) parts.push(a.country);
            if (a.postalCode || a.postcode) parts.push(a.postalCode || a.postcode);
            if (parts.length > 0) return parts.join(", ");
            return "";
        },
        getPositionAtTime: function (logs, dateTimeMs) {
            var before = null;
            var bestTBefore = -Infinity;
            var after = null;
            var bestTAfter = Infinity;
            if (logs && logs.length) {
                for (var i = 0; i < logs.length; i++) {
                    var t = new Date(logs[i].dateTime).getTime();
                    if (t <= dateTimeMs && t > bestTBefore) {
                        bestTBefore = t;
                        before = logs[i];
                    }
                    if (t >= dateTimeMs && t < bestTAfter) {
                        bestTAfter = t;
                        after = logs[i];
                    }
                }
            }
            if (before && after && before === after) return { lat: before.latitude, lng: before.longitude };
            if (before && after) {
                return {
                    lat: before.latitude != null ? before.latitude : after.latitude,
                    lng: before.longitude != null ? before.longitude : after.longitude
                };
            }
            if (before) return { lat: before.latitude, lng: before.longitude };
            if (after) return { lat: after.latitude, lng: after.longitude };
            return null;
        },
        getAllowedBreakMinutes: function (shiftDurationMs) {
            var hours = shiftDurationMs / (60 * 60 * 1000);
            if (hours < 4) return ALLOWED_BREAK_15;
            if (hours < 8) return ALLOWED_BREAK_30;
            return ALLOWED_BREAK_45;
        },
        formatDurationHHMM: function (seconds) {
            if (seconds == null || isNaN(seconds)) return "";
            var h = Math.floor(seconds / 3600);
            var m = Math.floor((seconds % 3600) / 60);
            return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
        }
    };
})();
