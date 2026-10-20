// 符合真實 API 格式的假資料 + 路由攔截（不連任何外部服務）。
// 時間欄位相對於「現在」產生，METAR 年齡永遠是 25 分鐘。

const PNG_1PX = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
	"base64",
);

const pilot = (i, dep, arr, lat, lon, alt, gs, hdg) => ({
	callsign: `CAL${100 + i}`, cid: 900000 + i, name: "P",
	aircraft_short: ["B77W", "A359", "B738", "A321", "B789"][i % 5],
	departure: dep, arrival: arr, altitude: alt, groundspeed: gs, latitude: lat, longitude: lon, heading: hdg,
});

export const makeBriefing = (icao = "RCTP") => {
	const now = Date.now();
	const arrivals = Array.from({ length: 6 }, (_, i) =>
		pilot(i, "RJAA", icao, 25.2 + i * 0.12, 121.9 - i * 0.1, [2500, 8000, 12000, 3500, 24000, 6000][i], 200 + i * 30, 250 + i * 7));
	const departures = Array.from({ length: 5 }, (_, i) =>
		pilot(10 + i, icao, "VHHH", 25.0 - i * 0.1, 121.0 + i * 0.15, [1500, 6000, 14000, 9000, 20000][i], 150 + i * 60, 200 + i * 9));
	const cruisings = Array.from({ length: 3 }, (_, i) =>
		pilot(20 + i, "RJAA", icao, 24.0 + i * 0.5, 123.0 - i * 0.4, 35000 + i * 2000, 470 + i * 10, 240));
	const fc = (type, s, e, wd, ws, vis, fr, clouds, wx = []) => ({
		type, start_time: { repr: s }, end_time: { repr: e },
		wind_direction: { value: wd, repr: String(wd).padStart(3, "0") }, wind_speed: { value: ws },
		visibility: { repr: vis }, flight_rules: fr, clouds: clouds.map((c) => ({ repr: c, type: c.slice(0, 3) })), wx_codes: wx,
	});
	const notam = (id, category, state, raw, extra = {}) => ({
		id, category, state, raw, start_time: "2026-10-15 22:00Z", end_time: "2026-10-20 06:00Z",
		closed_runways: [], aerodrome_closed: false, ...extra,
	});
	return {
		icao,
		weather: {
			station: icao, flight_rules: "MVFR", elevation_ft: 106, latitude: 25.0777, longitude: 121.2328,
			wind_direction: { value: 50, repr: "050" }, wind_speed: { value: 14, repr: "14" }, wind_gust: { value: 24, repr: "24" },
			visibility: { value: 4000, repr: "4000" }, altimeter: { value: 1011, repr: "Q1011" }, temperature: { value: 27 },
			dewpoint: { value: 23 }, clouds: [{ type: "FEW", altitude: 8, repr: "FEW008" }, { type: "BKN", altitude: 15, repr: "BKN015" }],
			time: { dt: new Date(now - 25 * 60000).toISOString(), repr: "171205Z" },
			raw: `METAR ${icao} 171205Z 05014G24KT 4000 -RA FEW008 BKN015 27/23 Q1011 TEMPO 3000 RA`,
			units: { visibility: "m", altimeter: "hPa", wind_speed: "kt", temperature: "C" },
		},
		taf: {
			raw: `TAF ${icao} 171100Z 1712/1818 05012KT 4000 -RA BKN015`, units: { wind_speed: "kt" },
			forecast: [
				fc("FROM", "1712", "1718", 50, 12, "4000", "MVFR", ["BKN015"], ["-RA"]),
				fc("TEMPO", "1713", "1718", 60, 18, "3000", "IFR", ["BKN008"], ["RA"]),
				fc("FROM", "1718", "1800", 30, 8, "6000", "MVFR", ["SCT020", "BKN030"]),
				fc("BECMG", "1800", "1806", 360, 6, "9999", "VFR", ["FEW025"]),
				fc("FROM", "1806", "1818", 10, 10, "9999", "VFR", ["FEW030"]),
			],
		},
		runways: [{ name: "05L", heading: 49 }, { name: "23R", heading: 229 }, { name: "05R", heading: 49 }, { name: "23L", heading: 229 }],
		closures: { aerodrome_closed: false, closed_runways: ["05R", "23L"], notam_ids: ["A0412/26"] },
		notams: [
			notam("A0412/26", "🚨 跑道關閉", "active", "E) RWY 05R/23L CLSD DUE TO MAINT WIP.", { closed_runways: ["05R", "23L"] }),
			notam("A0398/26", "🚧 滑行道關閉", "active", "E) TWY N3 CLSD BTN TWY N AND TWY NP."),
			notam("A0377/26", "📡 導航設施", "active", "E) ILS RWY 05L LOC U/S DUE TO FLT CHECK."),
			notam("A0501/26", "🚨 跑道關閉", "upcoming", "E) RWY 05L/23R CLSD FOR RESURFACING.", { closed_runways: ["05L", "23R"] }),
			...Array.from({ length: 6 }, (_, i) => notam(`A03${i}0/26`, "📝 一般資訊", "active", "E) AIP SUP 12/26 EFFECTIVE. REFER TO AIP SUPPLEMENT.")),
		],
		warnings: [], fetched_at: Math.floor(now / 1000),
		vatsim: {
			controllers: [
				{ callsign: `${icao}_TWR`, cid: 1, name: "A", frequency: "118.100" },
				{ callsign: `${icao}_APP`, cid: 2, name: "B", frequency: "119.700" },
				{ callsign: `${icao}_GND`, cid: 3, name: "C", frequency: "121.700" },
			],
			arrivals, departures, cruisings,
		},
	};
};

/** 攔截 API 與地圖圖磚；回傳實際收到的 gateway 請求與所有第三方主機，供斷言使用。 */
export const mockNetwork = async (page, { briefing = makeBriefing, failWith = null } = {}) => {
	const gatewayCalls = [];
	const externalHosts = new Set();
	await page.route("**/*", async (route) => {
		const url = new URL(route.request().url());
		if (url.host.startsWith("localhost")) return route.continue();
		externalHosts.add(url.host);
		if (url.pathname === "/api/gateway") {
			const body = JSON.parse(route.request().postData() || "{}");
			gatewayCalls.push(body);
			if (failWith) {
				return route.fulfill({ status: failWith.status, contentType: "application/json",
					body: JSON.stringify({ success: false, data: null, error: { message: failWith.message } }) });
			}
			return route.fulfill({ status: 200, contentType: "application/json",
				headers: { "access-control-allow-origin": "*" },
				body: JSON.stringify({ success: true, data: briefing(body.payload?.icao || "RCTP"), error: null }) });
		}
		if (route.request().resourceType() === "image") {
			return route.fulfill({ status: 200, contentType: "image/png", body: PNG_1PX });
		}
		return route.abort();
	});
	return { gatewayCalls, externalHosts };
};
