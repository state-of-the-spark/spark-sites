/**
 * Node mirror of includes/class-spark-living-stats.php.
 * Run: node tests/stats-check.js
 *
 * The functions below are a line-for-line port of the PHP math. If you change
 * the PHP, change this and re-run it.
 */
'use strict';

const S = {
	MIN_DAYS: 7, MIN_SESSIONS: 100, HARD_STOP_DAYS: 14,
	WIN_P: 0.90, LOSE_P: 0.10, FLOOR: 0.20, GUARD_P: 0.80,
	REVERT_DROP: 0.30, REVERT_DAYS: 7,
};

const C = [
	0.99999999999980993, 676.5203681218851, -1259.1392167224028,
	771.32342877765313, -176.61502916214059, 12.507343278686905,
	-0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];

function lnGamma(x) {
	x -= 1.0;
	let a = C[0];
	const t = x + 7.5;
	for (let i = 1; i < 9; i++) a += C[i] / (x + i);
	return 0.5 * Math.log(2.0 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}
const lnBeta = (a, b) => lnGamma(a) + lnGamma(b) - lnGamma(a + b);

function probXBeatsY(aX, bX, aY, bY) {
	const lnBY = lnBeta(aY, bY);
	let sum = 0.0;
	for (let i = 0; i < aX; i++) {
		sum += Math.exp(lnBeta(aY + i, bY + bX) - Math.log(bX + i) - lnBeta(1 + i, bX) - lnBY);
	}
	return sum;
}

function probBBeatsA(sA, nA, sB, nB) {
	nA = Math.max(0, nA); nB = Math.max(0, nB);
	sA = Math.min(nA, Math.max(0, sA)); sB = Math.min(nB, Math.max(0, sB));
	const aA = 1 + sA, bA = 1 + nA - sA, aB = 1 + sB, bB = 1 + nB - sB;
	const p = aB <= aA ? probXBeatsY(aB, bB, aA, bA) : 1.0 - probXBeatsY(aA, bA, aB, bB);
	return Math.min(1.0, Math.max(0.0, p));
}

const rate = (s, n) => (n > 0 ? s / n : 0.0);

function allocate(pBBest, floor = S.FLOOR) {
	const wB = Math.min(1.0 - floor, Math.max(floor, pBBest));
	const r4 = (v) => Math.round(v * 1e4) / 1e4;
	return { A: r4(1.0 - wB), B: r4(wB) };
}

function decide(a, b, daysRunning) {
	const nA = Math.max(0, a.sessions | 0), nB = Math.max(0, b.sessions | 0);
	const sA = Math.min(nA, Math.max(0, a.intent | 0)), sB = Math.min(nB, Math.max(0, b.intent | 0));
	const lA = Math.min(nA, Math.max(0, a.leads | 0)), lB = Math.min(nB, Math.max(0, b.leads | 0));
	const p = probBBeatsA(sA, nA, sB, nB);
	const pLead = probBBeatsA(lA, nA, lB, nB);
	const pLeadWorse = 1.0 - pLead;
	const out = { verdict: 'continue', reason: '', p, pLead, guardBlocked: false, weights: allocate(p), minRunMet: false };
	const minMet = daysRunning >= S.MIN_DAYS && Math.min(nA, nB) >= S.MIN_SESSIONS;
	out.minRunMet = minMet;
	if (!minMet) {
		if (daysRunning >= S.HARD_STOP_DAYS) { out.verdict = 'no_difference'; out.reason = 'hard stop before minimum run'; }
		else { out.reason = 'minimum run not met'; }
		return out;
	}
	if (p >= S.WIN_P) {
		if (pLeadWorse >= S.GUARD_P) { out.verdict = 'guard_blocked'; out.guardBlocked = true; out.reason = 'guard'; }
		else { out.verdict = 'ship_b'; out.reason = 'win'; }
		return out;
	}
	if (p <= S.LOSE_P) { out.verdict = 'keep_a'; out.reason = 'A wins'; return out; }
	if (daysRunning >= S.HARD_STOP_DAYS) { out.verdict = 'no_difference'; out.reason = 'hard stop, no winner'; return out; }
	out.reason = 'keep running';
	return out;
}

function autoRevertCheck(leadsSinceShip, priorDailyAvg, daysSinceShip) {
	const expected = priorDailyAvg * S.REVERT_DAYS;
	const threshold = expected * (1.0 - S.REVERT_DROP);
	const due = daysSinceShip >= S.REVERT_DAYS;
	return { due, revert: due && priorDailyAvg > 0 && leadsSinceShip < threshold, threshold };
}

// ---- Independent cross-check: seeded Monte Carlo (not used by the plugin) ---
function mulberry32(seed) {
	return function () {
		seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
function gaussian(rnd) {
	let u = 0, v = 0;
	while (u === 0) u = rnd();
	while (v === 0) v = rnd();
	return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}
function gammaSample(shape, rnd) { // Marsaglia-Tsang, shape >= 1.
	const d = shape - 1 / 3, c = 1 / Math.sqrt(9 * d);
	for (;;) {
		let x, v;
		do { x = gaussian(rnd); v = 1 + c * x; } while (v <= 0);
		v = v * v * v;
		const u = rnd();
		if (u < 1 - 0.0331 * x * x * x * x || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
	}
}
function betaSample(a, b, rnd) { const x = gammaSample(a, rnd), y = gammaSample(b, rnd); return x / (x + y); }
function monteCarlo(sA, nA, sB, nB, draws, seed) {
	const rnd = mulberry32(seed);
	let wins = 0;
	for (let i = 0; i < draws; i++) {
		if (betaSample(1 + sB, 1 + nB - sB, rnd) > betaSample(1 + sA, 1 + nA - sA, rnd)) wins++;
	}
	return wins / draws;
}

// ---- Test harness -----------------------------------------------------------
let pass = 0, fail = 0;
function check(name, ok, detail) {
	if (ok) pass++; else fail++;
	console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  [' + detail + ']' : ''));
}
const f = (v) => v.toFixed(4);

console.log('--- Probability B beats A ---');
const pEq = probBBeatsA(40, 100, 40, 100);
check('equal arms (40/100 vs 40/100) is about 0.5', Math.abs(pEq - 0.5) < 1e-9, 'p=' + f(pEq));
const pEq0 = probBBeatsA(0, 0, 0, 0);
check('no data (0/0 vs 0/0) is exactly 0.5', Math.abs(pEq0 - 0.5) < 1e-12, 'p=' + f(pEq0));
const pEqBig = probBBeatsA(300, 1000, 300, 1000);
check('equal arms at scale (300/1000 each) is 0.5', Math.abs(pEqBig - 0.5) < 1e-9, 'p=' + f(pEqBig));
const pWin = probBBeatsA(30, 100, 50, 100);
check('clear winner (A 30/100, B 50/100) climbs above 0.9', pWin > 0.9, 'p=' + f(pWin));
const pLose = probBBeatsA(50, 100, 30, 100);
check('mirror (A 50/100, B 30/100) falls below 0.1', pLose < 0.1, 'p=' + f(pLose));
check('P(B>A) + P(A>B) = 1', Math.abs(pWin + pLose - 1) < 1e-9, 'sum=' + (pWin + pLose).toFixed(12));
const mc = monteCarlo(30, 100, 50, 100, 200000, 12345);
check('exact formula agrees with seeded Monte Carlo (200k draws, 30/100 vs 50/100)', Math.abs(mc - pWin) < 0.005, 'exact=' + f(pWin) + ' mc=' + f(mc));
const mc2 = monteCarlo(40, 120, 47, 118, 200000, 777);
const ex2 = probBBeatsA(40, 120, 47, 118);
check('exact formula agrees with seeded Monte Carlo (unequal n, 40/120 vs 47/118)', Math.abs(mc2 - ex2) < 0.005, 'exact=' + f(ex2) + ' mc=' + f(mc2));
const tBig = Date.now();
const pBig = probBBeatsA(3000, 10000, 3300, 10000);
check('large counts (3000/10000 vs 3300/10000) compute fast and sensibly', pBig > 0.99 && Date.now() - tBig < 2000, 'p=' + f(pBig) + ' ' + (Date.now() - tBig) + 'ms');

console.log('\n--- Thompson allocation, 20% floor ---');
let floorOk = true, minSeen = 1, maxSeen = 0;
for (let sB = 0; sB <= 100; sB += 5) {
	for (let sA = 0; sA <= 100; sA += 5) {
		const w = allocate(probBBeatsA(sA, 100, sB, 100));
		minSeen = Math.min(minSeen, w.A, w.B);
		maxSeen = Math.max(maxSeen, w.A, w.B);
		if (w.A < 0.2 - 1e-9 || w.B < 0.2 - 1e-9 || Math.abs(w.A + w.B - 1) > 1e-3) floorOk = false;
	}
}
check('floor holds over a 21x21 grid of outcomes (neither arm under 20%, shares sum to 1)', floorOk, 'min=' + minSeen + ' max=' + maxSeen);
const wClear = allocate(probBBeatsA(30, 100, 50, 100));
check('clear winner allocation is pinned at 80/20', wClear.A === 0.2 && wClear.B === 0.8, JSON.stringify(wClear));
const wEq = allocate(probBBeatsA(40, 100, 40, 100));
check('equal arms allocation is 50/50', wEq.A === 0.5 && wEq.B === 0.5, JSON.stringify(wEq));
const wMid = allocate(0.65);
check('moderate evidence (p=0.65) allocates 35/65', wMid.A === 0.35 && wMid.B === 0.65, JSON.stringify(wMid));

console.log('\n--- decide(): every rule in section 3 ---');
const arm = (sessions, intent, leads) => ({ sessions, intent, leads });
const scenarios = [
	{ name: '1. Minimum run (days): day 3, huge gap, 500 sessions each -> continue',
		a: arm(500, 100, 20), b: arm(500, 250, 60), days: 3, want: 'continue' },
	{ name: '2. Minimum run (sessions): day 9, big gap but B has 99 sessions -> continue',
		a: arm(300, 60, 15), b: arm(99, 50, 14), days: 9, want: 'continue' },
	{ name: '3. Win call: day 8, A 30/100 vs B 50/100, leads fine -> ship_b',
		a: arm(100, 30, 12), b: arm(100, 50, 20), days: 8, want: 'ship_b' },
	{ name: '4. Loss call: day 8, A 50/100 vs B 30/100 -> keep_a',
		a: arm(100, 50, 20), b: arm(100, 30, 12), days: 8, want: 'keep_a' },
	{ name: '5. Undecided: day 8, 40/100 vs 40/100 -> continue',
		a: arm(100, 40, 15), b: arm(100, 40, 15), days: 8, want: 'continue' },
	{ name: '6. Hard stop, no winner: day 14, 40/100 vs 42/100 -> no_difference',
		a: arm(100, 40, 15), b: arm(100, 42, 15), days: 14, want: 'no_difference' },
	{ name: '7. Hard stop before minimum run: day 14, only 60 sessions each -> no_difference',
		a: arm(60, 20, 6), b: arm(60, 30, 9), days: 14, want: 'no_difference' },
	{ name: '8. Guard metric: B wins on intent (50 vs 30) but leads 5/100 vs 20/100 -> guard_blocked',
		a: arm(100, 30, 20), b: arm(100, 50, 5), days: 8, want: 'guard_blocked' },
	{ name: '9. Guard passes when lead drop is not significant: leads 12/100 vs 11/100 -> ship_b',
		a: arm(100, 30, 12), b: arm(100, 50, 11), days: 8, want: 'ship_b' },
	{ name: '10. Win called on day 14 beats hard stop (win takes precedence) -> ship_b',
		a: arm(200, 60, 24), b: arm(200, 100, 40), days: 14, want: 'ship_b' },
];
for (const s of scenarios) {
	const d = decide(s.a, s.b, s.days);
	check(s.name, d.verdict === s.want,
		'got=' + d.verdict + ' P(B>A)=' + f(d.p) + ' P(lead B>A)=' + f(d.pLead) + ' weights=' + JSON.stringify(d.weights));
}

console.log('\n--- Auto-revert ---');
const r1 = autoRevertCheck(20, 5, 7);   // expected 35, threshold 24.5 -> 20 is below
check('leads 20 vs prior 5/day (35 expected, threshold 24.5) at day 7 -> revert', r1.revert === true, JSON.stringify(r1));
const r2 = autoRevertCheck(25, 5, 7);   // 25 >= 24.5
check('leads 25 vs prior 5/day (30% line is 24.5) -> keep', r2.revert === false, JSON.stringify(r2));
const r3 = autoRevertCheck(24.5, 5, 7); // exactly at the line is not "more than 30% below"
check('leads exactly at the 30% line -> keep (must be MORE than 30% below)', r3.revert === false, JSON.stringify(r3));
const r4 = autoRevertCheck(0, 5, 6.5);
check('day 6.5 is before the 7-day window closes -> not due, no revert', r4.due === false && r4.revert === false, JSON.stringify(r4));
const r5 = autoRevertCheck(0, 0, 9);
check('prior average of zero never triggers a revert', r5.revert === false, JSON.stringify(r5));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
