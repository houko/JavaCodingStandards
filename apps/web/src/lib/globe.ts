// Orthographic globe geometry for the metrics page. Coordinates are [longitude, latitude] in degrees; the view is centred on `center` and the projected disc has radius `r` around (cx, cy).

export type LonLat = [lon: number, lat: number];

export interface GlobeView {
	cx: number;
	cy: number;
	r: number;
	center: LonLat;
}

export interface Projected {
	x: number;
	y: number;
	// True when the point is on the hemisphere facing the viewer.
	visible: boolean;
	// Cosine of the angular distance from the view centre: 1 at the centre, 0 on the limb, negative behind.
	depth: number;
}

const RAD = Math.PI / 180;

export function project([lon, lat]: LonLat, view: GlobeView): Projected {
	const [lon0, lat0] = view.center;
	const phi = lat * RAD;
	const phi0 = lat0 * RAD;
	const dLambda = (lon - lon0) * RAD;
	const depth = Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(dLambda);
	const x = Math.cos(phi) * Math.sin(dLambda);
	const y = Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(dLambda);
	return { x: view.cx + x * view.r, y: view.cy - y * view.r, visible: depth >= 0, depth };
}

// A far-side point pushed out to the limb along its own direction, which is how a filled shape is clipped to the visible disc.
function onLimb(p: Projected, view: GlobeView): { x: number; y: number } {
	if (p.visible) return p;
	const dx = p.x - view.cx;
	const dy = p.y - view.cy;
	const length = Math.hypot(dx, dy) || 1;
	return { x: view.cx + (dx / length) * view.r, y: view.cy + (dy / length) * view.r };
}

// Straight edges between distant vertices are not straight on a sphere, so edges are split into steps of at most `step` degrees before projecting.
function densify(points: LonLat[], step: number, closed: boolean): LonLat[] {
	const out: LonLat[] = [];
	const count = closed ? points.length : points.length - 1;
	for (let i = 0; i < count; i++) {
		const a = points[i]!;
		const b = points[(i + 1) % points.length]!;
		const n = Math.max(1, Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) / step));
		for (let k = 0; k < n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
	}
	if (!closed && points.length > 0) out.push(points.at(-1)!);
	return out;
}

const round = (n: number) => Math.round(n * 10) / 10;

// A closed land shape as an SVG path, or undefined when it is entirely on the far side.
export function shapePath(shape: LonLat[], view: GlobeView): string | undefined {
	const projected = densify(shape, 3, true).map((point) => project(point, view));
	if (!projected.some((p) => p.visible)) return undefined;
	return `${projected.map((p, i) => { const q = onLimb(p, view); return `${i === 0 ? 'M' : 'L'}${round(q.x)} ${round(q.y)}`; }).join('')}Z`;
}

// An open line (a graticule circle) as an SVG path with the far-side stretches left out.
export function linePath(line: LonLat[], view: GlobeView): string {
	let d = '';
	let pen = false;
	for (const point of densify(line, 3, false)) {
		const p = project(point, view);
		if (!p.visible) {
			pen = false;
			continue;
		}
		d += `${pen ? 'L' : 'M'}${round(p.x)} ${round(p.y)}`;
		pen = true;
	}
	return d;
}

export function graticule(): LonLat[][] {
	const lines: LonLat[][] = [];
	for (let lat = -60; lat <= 60; lat += 30) lines.push(Array.from({ length: 37 }, (_, i): LonLat => [-180 + i * 10, lat]));
	for (let lon = -180; lon < 180; lon += 30) lines.push(Array.from({ length: 19 }, (_, i): LonLat => [lon, -90 + i * 10]));
	return lines;
}

export function normalizeLon(lon: number): number {
	return ((((lon + 180) % 360) + 360) % 360) - 180;
}

export function clampLat(lat: number): number {
	return Math.max(-70, Math.min(70, lat));
}

// Low-detail coastlines: enough to read continents on a 350 px globe without shipping a map dataset.
export const LAND: LonLat[][] = [
	// North and Central America
	[[-165, 68], [-156, 71], [-140, 70], [-128, 70], [-115, 68], [-95, 72], [-82, 73], [-80, 63], [-94, 59], [-90, 57], [-82, 55], [-79, 52], [-77, 60], [-70, 59], [-64, 60], [-61, 56], [-56, 52], [-60, 47], [-66, 44], [-70, 42], [-74, 40], [-76, 35], [-81, 31], [-80, 26], [-82, 28], [-84, 30], [-90, 30], [-94, 29], [-97, 26], [-97, 21], [-95, 18], [-91, 19], [-87, 21], [-88, 16], [-84, 15], [-83, 10], [-79, 9], [-77, 8], [-81, 7], [-85, 11], [-92, 14], [-96, 16], [-105, 20], [-106, 23], [-112, 29], [-110, 23], [-115, 30], [-117, 33], [-121, 35], [-124, 40], [-124, 46], [-123, 49], [-130, 54], [-136, 58], [-145, 60], [-152, 59], [-158, 56], [-165, 54], [-158, 58], [-162, 60], [-166, 62], [-165, 65], [-168, 66]],
	// Greenland
	[[-73, 78], [-60, 82], [-30, 83], [-20, 80], [-20, 72], [-24, 69], [-35, 65], [-43, 60], [-50, 62], [-53, 67], [-55, 71], [-60, 76], [-68, 77]],
	// Cuba
	[[-85, 22], [-80, 23], [-74, 20], [-78, 20]],
	// South America
	[[-80, 9], [-75, 11], [-72, 12], [-62, 11], [-60, 8], [-52, 5], [-50, 0], [-44, -2], [-35, -5], [-35, -9], [-39, -14], [-40, -21], [-48, -26], [-53, -34], [-58, -35], [-57, -38], [-62, -39], [-65, -42], [-67, -46], [-66, -50], [-69, -52], [-68, -55], [-72, -54], [-75, -48], [-74, -40], [-73, -30], [-71, -20], [-76, -14], [-81, -6], [-80, -2], [-78, 2], [-77, 6]],
	// Iceland
	[[-24, 65], [-22, 66], [-15, 66], [-13, 65], [-18, 63], [-22, 64]],
	// Great Britain and Ireland
	[[-5, 50], [1, 51], [2, 53], [0, 54], [-2, 56], [-2, 58], [-5, 59], [-6, 57], [-5, 55], [-3, 54], [-5, 52]],
	[[-10, 52], [-6, 52], [-6, 55], [-8, 55], [-10, 54]],
	// Europe and Asia
	[[-9, 37], [-9, 43], [-2, 43], [-1, 46], [-4, 48], [2, 51], [5, 53], [8, 54], [9, 57], [11, 56], [13, 55], [19, 54], [21, 57], [24, 59], [29, 60], [22, 60], [21, 63], [25, 65], [22, 66], [17, 63], [18, 60], [16, 56], [12, 56], [10, 59], [5, 59], [5, 62], [13, 66], [18, 70], [25, 71], [31, 70], [40, 67], [44, 68], [53, 68], [60, 69], [69, 73], [73, 68], [80, 73], [90, 75], [100, 77], [113, 74], [130, 71], [140, 72], [150, 71], [160, 70], [170, 70], [179, 69], [179, 65], [170, 60], [163, 58], [160, 52], [156, 51], [156, 57], [163, 62], [150, 59], [140, 55], [141, 50], [138, 46], [132, 43], [129, 40], [129, 35], [126, 35], [126, 38], [122, 40], [121, 37], [119, 35], [122, 31], [120, 27], [117, 23], [110, 21], [108, 21], [106, 19], [108, 16], [109, 12], [105, 9], [103, 10], [100, 13], [100, 7], [103, 5], [104, 1], [101, 3], [98, 8], [98, 16], [94, 17], [92, 22], [87, 22], [80, 16], [80, 10], [77, 8], [73, 16], [72, 21], [67, 24], [62, 25], [57, 26], [52, 28], [48, 30], [50, 26], [56, 26], [59, 22], [55, 17], [43, 13], [40, 16], [35, 28], [34, 31], [36, 36], [30, 36], [27, 37], [26, 40], [24, 40], [23, 37], [21, 39], [19, 42], [16, 43], [13, 45], [14, 42], [18, 40], [16, 38], [15, 40], [12, 42], [9, 44], [3, 43], [3, 42], [0, 39], [-1, 37], [-6, 36]],
	// Japan
	[[130, 31], [132, 34], [135, 34], [140, 35], [141, 38], [142, 41], [141, 43], [145, 44], [141, 45], [140, 42], [140, 40], [137, 37], [133, 36], [130, 34]],
	// Taiwan
	[[120, 22], [122, 25], [121, 25], [120, 23]],
	// Philippines
	[[120, 18], [122, 18], [124, 12], [126, 7], [122, 7], [121, 12]],
	// Sumatra, Java, Borneo, New Guinea
	[[95, 5], [98, 4], [104, -2], [106, -6], [101, -3], [96, 2]],
	[[105, -6], [114, -7], [114, -8], [106, -7]],
	[[109, 1], [111, -3], [116, -4], [118, 1], [119, 5], [116, 7], [113, 3]],
	[[131, -1], [138, -2], [147, -6], [150, -10], [142, -9], [138, -8], [133, -4]],
	// Africa
	[[-17, 21], [-13, 28], [-9, 33], [-6, 36], [3, 37], [10, 37], [11, 33], [20, 31], [25, 32], [32, 31], [34, 28], [39, 19], [43, 12], [51, 12], [48, 5], [41, -2], [40, -10], [40, -16], [35, -22], [33, -27], [28, -33], [20, -35], [18, -32], [15, -27], [12, -18], [13, -10], [12, -5], [9, -1], [9, 4], [5, 6], [-2, 5], [-8, 4], [-13, 8], [-17, 14]],
	// Madagascar
	[[44, -25], [47, -25], [50, -15], [49, -12], [44, -16]],
	// Australia
	[[114, -22], [114, -26], [115, -34], [118, -35], [124, -34], [131, -31], [135, -35], [138, -35], [140, -38], [144, -38], [150, -37], [153, -31], [153, -25], [146, -19], [145, -15], [142, -11], [141, -17], [136, -15], [137, -12], [130, -12], [126, -14], [122, -18]],
	// New Zealand
	[[172, -34], [175, -37], [178, -38], [175, -41], [171, -44], [167, -46], [170, -46], [174, -41]],
];

// Approximate centres of the countries Cloudflare reports in cf-ipcountry. A country missing here still appears in the region list, just not on the globe.
export const COUNTRY_CENTERS: Record<string, LonLat> = {
	US: [-98, 39], CA: [-106, 56], MX: [-102, 23], GT: [-90, 15], CR: [-84, 10], PA: [-80, 9], CU: [-79, 22], DO: [-70, 19], PR: [-66, 18], JM: [-77, 18],
	BR: [-52, -10], AR: [-64, -34], CL: [-71, -33], CO: [-74, 4], PE: [-76, -10], VE: [-66, 7], EC: [-78, -1], BO: [-64, -17], UY: [-56, -33], PY: [-58, -23],
	GB: [-2, 54], IE: [-8, 53], FR: [2, 46], DE: [10, 51], NL: [5, 52], BE: [4, 51], LU: [6, 50], CH: [8, 47], AT: [14, 47], IT: [12, 42], ES: [-4, 40], PT: [-8, 40],
	SE: [15, 62], NO: [10, 62], FI: [26, 64], DK: [10, 56], IS: [-19, 65], PL: [19, 52], CZ: [15, 50], SK: [19, 49], HU: [19, 47], RO: [25, 46], BG: [25, 43], GR: [22, 39],
	SI: [15, 46], HR: [16, 45], RS: [21, 44], BA: [18, 44], ME: [19, 43], MK: [22, 41], AL: [20, 41], MD: [29, 47], UA: [31, 49], BY: [28, 53], LT: [24, 55], LV: [25, 57], EE: [26, 59],
	RU: [100, 60], TR: [35, 39], CY: [33, 35], MT: [14, 36], GE: [44, 42], AM: [45, 40], AZ: [48, 40], KZ: [67, 48], UZ: [64, 41], KG: [75, 41], TJ: [71, 39], TM: [59, 39],
	CN: [104, 35], HK: [114, 22], MO: [113.5, 22], TW: [121, 24], JP: [138, 36], KR: [128, 36], KP: [127, 40], MN: [104, 47],
	IN: [79, 22], PK: [70, 30], BD: [90, 24], LK: [81, 8], NP: [84, 28], AF: [66, 34], IR: [53, 32], IQ: [44, 33], SY: [38, 35], LB: [36, 34], JO: [36, 31], IL: [35, 31], PS: [35, 32],
	SA: [45, 24], AE: [54, 24], QA: [51, 25], KW: [48, 29], BH: [50.5, 26], OM: [57, 21], YE: [48, 15],
	VN: [108, 16], TH: [101, 15], MY: [102, 4], SG: [104, 1], ID: [118, -2], PH: [122, 12], KH: [105, 12], LA: [103, 18], MM: [96, 21], BN: [115, 4.5],
	EG: [30, 27], MA: [-7, 32], DZ: [3, 28], TN: [9, 34], LY: [17, 27], NG: [8, 9], GH: [-1, 8], CI: [-5, 7], SN: [-14, 14], CM: [12, 6], KE: [38, 0], ET: [39, 8], TZ: [35, -6],
	UG: [32, 1], RW: [30, -2], SD: [30, 15], AO: [18, -12], MZ: [35, -18], ZW: [30, -19], ZM: [28, -14], ZA: [24, -29], MG: [47, -19], MU: [57.5, -20],
	AU: [134, -25], NZ: [174, -41], FJ: [178, -18], PG: [145, -6],
};
