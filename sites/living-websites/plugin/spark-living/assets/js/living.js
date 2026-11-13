/*!
 * Spark Living 0.1.1: assignment, selector-swap engine and event listeners.
 * Printed inline in <head> by the plugin. Plain ES5, no dependencies.
 * window.sparkLiving is set just before this file by the plugin.
 */
(function (w, d) {
	'use strict';

	var C = w.sparkLiving;
	if (!C || !C.tests || !C.tests.length) { return; }

	// Bots never get assigned or counted; they see baseline A (the default CSS).
	var BOT = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|headless|lighthouse|pagespeed|gtmetrix|pingdom|uptime|monitor|python|curl|wget|httpclient|java\/|go-http|node-fetch|axios|phantom|selenium|puppeteer|playwright/i;
	if (BOT.test(navigator.userAgent || '') || navigator.webdriver) { return; }
	// Staff cookie (set at login for users who can edit posts).
	if (/(?:^|;\s*)spark_living_staff=1/.test(d.cookie)) { return; }

	var root = d.documentElement;

	// Device scope is decided here, in the browser, so cached pages still work.
	// Mobile = viewport 980px or narrower (Divi 4's mobile-menu breakpoint).
	var isMobile = w.matchMedia ? w.matchMedia('(max-width: 980px)').matches : ((w.innerWidth || root.clientWidth || 0) <= 980);
	function deviceOk(t) {
		var dv = t.device || 'all';
		return dv === 'all' || (dv === 'mobile') === isMobile;
	}

	function getCookie(name) {
		var m = d.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
		return m ? decodeURIComponent(m[1]) : '';
	}
	function setCookie(name, value, days) {
		var s = name + '=' + encodeURIComponent(value) + '; path=/; SameSite=Lax';
		if (days) { s += '; max-age=' + (days * 86400); }
		if (w.location.protocol === 'https:') { s += '; Secure'; }
		d.cookie = s;
	}
	function randHex(bytes) {
		var out = '', i, a;
		if (w.crypto && w.crypto.getRandomValues) {
			a = new Uint8Array(bytes);
			w.crypto.getRandomValues(a);
			for (i = 0; i < a.length; i++) { out += ('0' + a[i].toString(16)).slice(-2); }
			return out;
		}
		for (i = 0; i < bytes; i++) { out += ('0' + Math.floor(Math.random() * 256).toString(16)).slice(-2); }
		return out;
	}

	// ---- Identity: visitor id + bucket (0-9999), session id ------------------
	var vid, bucket;
	var m = /^([a-f0-9]{16,32})\.(\d{1,4})$/.exec(getCookie('spark_living'));
	if (m) {
		vid = m[1];
		bucket = parseInt(m[2], 10);
	} else {
		vid = randHex(8);
		bucket = Math.floor(Math.random() * 10000);
		setCookie('spark_living', vid + '.' + bucket, 180);
	}
	var sid = getCookie('spark_living_sid');
	if (!/^[a-f0-9]{16,32}$/.test(sid)) {
		sid = randHex(8);
		setCookie('spark_living_sid', sid, 0); // Session cookie.
	}

	// ---- Assignment ----------------------------------------------------------
	var holdoutLimit = Math.round((C.holdout || 0.1) * 10000);
	var isHoldout = bucket < holdoutLimit;
	var prevAssignment = /^(\d+):([ABHL])$/.exec(getCookie('spark_living_a'));

	var plan = [];
	var running = null;
	var i, t, variant, label, p;
	var skippedRunning = false;

	for (i = 0; i < C.tests.length; i++) {
		t = C.tests[i];
		// A test scoped to the other device: this session sees the original and logs nothing for it.
		if (!deviceOk(t)) {
			if (t.mode === 'running') { skippedRunning = true; }
			continue;
		}
		if (isHoldout) {
			variant = 'A';
			label = 'H';
		} else if (t.mode === 'running') {
			if (prevAssignment && parseInt(prevAssignment[1], 10) === t.id && (prevAssignment[2] === 'A' || prevAssignment[2] === 'B')) {
				variant = prevAssignment[2]; // Sticky.
			} else {
				var wA = (t.weights && typeof t.weights.A === 'number') ? t.weights.A : 0.5;
				var pos = (bucket - holdoutLimit) / (10000 - holdoutLimit); // 0..1 among non-holdout.
				variant = pos < wA ? 'A' : 'B';
			}
			label = variant;
		} else {
			variant = t.winner || 'B';
			label = 'L';
		}
		p = { t: t, variant: variant, label: label, applied: false };
		plan.push(p);
		if (t.mode === 'running') { running = p; }
	}

	// No running test applies to this session, and nothing live applies either, or
	// the running test is for the other device: count nothing (site watch is
	// rejected by the server while a test runs, and would mislabel original-only sessions).
	var noLog = !plan.length || (skippedRunning && !running);
	var eventExp = running ? running.t.id : 0;
	var eventLabel = running ? running.label : (isHoldout ? 'H' : 'L');
	setCookie('spark_living_a', eventExp + ':' + eventLabel, 180);

	// ---- Before first paint: hide what must not show -------------------------
	var blockCss = '';
	var hideSelectors = [];
	var cssBlocks = [];
	var vB, vChanges;
	for (i = 0; i < plan.length; i++) {
		p = plan[i];
		// Class on <html> for each applicable test (sl-v-<id>-A or -B), set before paint.
		root.className += (root.className ? ' ' : '') + 'sl-v-' + p.t.id + '-' + p.variant;
		if (p.variant === 'A') { continue; }
		vB = (p.t.variants && p.t.variants.B) || {};
		if (p.t.type !== 'block' && vB.css) { cssBlocks.push({ id: p.t.id, css: vB.css }); }
		if (p.t.type === 'block') {
			blockCss += '.spark-living-variant[data-living-exp="' + p.t.id + '"][data-living-variant="A"]{display:none!important}' +
				'.spark-living-variant[data-living-exp="' + p.t.id + '"][data-living-variant="B"]{display:block!important}';
		} else if (p.t.target) {
			vChanges = vB.changes || [];
			if (vChanges.length) { hideSelectors.push(p.t.target); } // A CSS-only variant needs no hiding.
		}
	}
	var blockStyle = null;
	var hideStyle = null;
	function addStyle(id, css) {
		var s = d.createElement('style');
		s.id = id;
		s.appendChild(d.createTextNode(css));
		(d.head || root).appendChild(s);
		return s;
	}
	if (blockCss) { blockStyle = addStyle('spark-living-blocks', blockCss); }
	// Visibility / CSS variant: one style element per test, created only for B, before first paint.
	for (i = 0; i < cssBlocks.length; i++) { addStyle('spark-living-css-' + cssBlocks[i].id, cssBlocks[i].css); }
	if (hideSelectors.length) { hideStyle = addStyle('spark-living-hide', hideSelectors.join(',') + '{visibility:hidden!important}'); }

	var revealed = false;
	function reveal() {
		if (revealed) { return; }
		revealed = true;
		if (hideStyle && hideStyle.parentNode) { hideStyle.parentNode.removeChild(hideStyle); }
	}
	// Safety timeout: content is never left hidden.
	w.setTimeout(reveal, C.timeout || 1200);

	// ---- Events --------------------------------------------------------------
	var sentOnce = {};
	function ga(name, params) {
		if (typeof w.gtag === 'function') {
			try { w.gtag('event', name, params); } catch (e) { /* ignore */ }
		} else if (w.dataLayer && typeof w.dataLayer.push === 'function') {
			// Google Tag Manager sites have no gtag(): push a dataLayer event a GTM tag can forward.
			try {
				var o = { event: name }, k;
				for (k in params) { if (Object.prototype.hasOwnProperty.call(params, k)) { o[k] = params[k]; } }
				w.dataLayer.push(o);
			} catch (e3) { /* ignore */ }
		}
	}
	function send(type, exp, lab) {
		var payload = JSON.stringify({ experiment_id: exp, variant: lab, visitor_id: vid, session_id: sid, event_type: type });
		var ok = false;
		try {
			if (navigator.sendBeacon) {
				ok = navigator.sendBeacon(C.endpoint, new Blob([payload], { type: 'application/json' }));
			}
		} catch (e) { ok = false; }
		if (!ok && w.fetch) {
			try {
				w.fetch(C.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true, credentials: 'omit' });
			} catch (e2) { /* ignore */ }
		}
		if (type === 'exposure') {
			ga('living_exposure', { living_experiment: exp, living_variant: lab });
		} else {
			ga('living_conversion', { living_experiment: exp, living_variant: lab, living_event: type });
		}
	}
	var exposed = false;
	function fire(type) {
		if (noLog || sentOnce[type]) { return; }
		sentOnce[type] = true;
		send(type, eventExp, eventLabel);
	}

	// ---- Apply changes once the DOM is parsed --------------------------------
	function applyChange(el, ch) {
		var v = ch.value || '';
		switch (ch.op) {
			case 'text': el.textContent = v; break;
			case 'href':
				if (!/^\s*(javascript|data|vbscript):/i.test(v)) { el.setAttribute('href', v); }
				break;
			case 'add_class': if (/^[A-Za-z_][A-Za-z0-9_-]*$/.test(v)) { el.classList.add(v); } break;
			case 'remove_class': if (/^[A-Za-z_][A-Za-z0-9_-]*$/.test(v)) { el.classList.remove(v); } break;
			case 'style': el.setAttribute('style', (el.getAttribute('style') || '') + ';' + v); break;
		}
	}
	function applyOne(pl) {
		var t2 = pl.t, els, j, k, vs, changes;
		if (t2.type === 'block') {
			vs = d.querySelectorAll('.spark-living-variant[data-living-exp="' + t2.id + '"]');
			if (!vs.length) { return false; }
			for (j = 0; j < vs.length; j++) {
				if (vs[j].getAttribute('data-living-variant') !== pl.variant && vs[j].parentNode) {
					vs[j].parentNode.removeChild(vs[j]);
				}
			}
			return true;
		}
		try { els = d.querySelectorAll(t2.target); } catch (e) { return false; }
		if (!els.length) { return false; }
		changes = (t2.variants && t2.variants[pl.variant] && t2.variants[pl.variant].changes) || [];
		for (j = 0; j < els.length; j++) {
			for (k = 0; k < changes.length; k++) { applyChange(els[j], changes[k]); }
		}
		return true;
	}
	function applyAll() {
		var any = false, j;
		for (j = 0; j < plan.length; j++) {
			try { plan[j].applied = applyOne(plan[j]); } catch (e) { plan[j].applied = false; }
			if (plan[j].applied) { any = true; }
		}
		reveal();
		if (!exposed) {
			if (running && running.applied) {
				exposed = true;
				fire('exposure');
			} else if (!running && any) {
				exposed = true;
				fire('exposure');
			}
		}
	}

	// ---- Listeners -----------------------------------------------------------
	// Any selector-based test (text, href, class, style or CSS variant): a click on the test's own
	// target selector is a cta_click (the element carries no data-living-cta), for A, B and holdout
	// sessions alike. Only the running test's target counts while a test runs; with none running,
	// promoted selector winners count for site watch.
	function targetClicked(el) {
		var cand = running ? [running] : plan, j, q;
		for (j = 0; j < cand.length; j++) {
			q = cand[j];
			if (q.t.type === 'block' || !q.t.target) { continue; }
			try { if (el.closest(q.t.target)) { return true; } } catch (e) { /* bad selector */ }
		}
		return false;
	}
	function onClick(e) {
		var el = e.target;
		if (!el || !el.closest) { return; }
		var a = el.closest('a[href]');
		if (a && /^tel:/i.test(a.getAttribute('href') || '')) { fire('tel_click'); }
		if (el.closest('[data-living-cta]') || targetClicked(el)) { fire('cta_click'); }
	}
	function onFocus(e) {
		var el = e.target;
		if (!el || !el.closest) { return; }
		var f = el.closest('form');
		if (f && f.getAttribute('role') !== 'search' && !f.__slStarted) {
			f.__slStarted = true;
			fire('form_start');
		}
	}

	function ready() {
		applyAll();
		d.addEventListener('click', onClick, true);
		d.addEventListener('focusin', onFocus, true);
		// Mirror AJAX Gravity Forms confirmations to GA4 only. The database row
		// for form_submit is written server-side.
		if (w.jQuery) {
			w.jQuery(d).on('gform_confirmation_loaded', function () {
				ga('living_conversion', { living_experiment: eventExp, living_variant: eventLabel, living_event: 'form_submit' });
			});
		}
	}

	if (d.readyState === 'loading') {
		d.addEventListener('DOMContentLoaded', ready);
	} else {
		ready();
	}
})(window, document);
