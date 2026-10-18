/* NOVA landing page — progressive enhancements. The page is fully usable without this file. */
(() => {
  'use strict';

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const mobileNavQuery = window.matchMedia('(max-width: 860px)');
  const prefersReducedMotion = () => motionQuery.matches;

  /* ---------- Copyright year ---------- */
  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });

  /* ---------- Sticky header state ---------- */
  const header = document.querySelector('[data-header]');
  const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 8);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  /* ---------- Mobile menu ---------- */
  const toggle = document.querySelector('[data-menu-toggle]');
  const nav = document.querySelector('[data-nav]');

  if (toggle && nav) {
    const setMenu = (open, { returnFocus = false } = {}) => {
      nav.classList.toggle('is-open', open);
      header?.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      if (open) nav.querySelector('a')?.focus({ preventScroll: true });
      else if (returnFocus) toggle.focus();
    };
    const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';

    toggle.addEventListener('click', () => setMenu(!isOpen()));

    nav.addEventListener('click', (event) => {
      if (event.target.closest('a') && isOpen()) setMenu(false);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isOpen()) setMenu(false, { returnFocus: true });
    });

    document.addEventListener('click', (event) => {
      if (isOpen() && !nav.contains(event.target) && !toggle.contains(event.target)) setMenu(false);
    });

    // Close the menu when focus moves out of it (e.g. tabbing past the last link)
    nav.addEventListener('focusout', (event) => {
      if (isOpen() && mobileNavQuery.matches && event.relatedTarget &&
          !nav.contains(event.relatedTarget) && event.relatedTarget !== toggle) {
        setMenu(false);
      }
    });

    mobileNavQuery.addEventListener('change', (event) => {
      if (!event.matches) setMenu(false);
    });
  }

  /* ---------- Active section in navigation ---------- */
  const navLinks = [...document.querySelectorAll('.nav-link')];
  if ('IntersectionObserver' in window && navLinks.length) {
    const linkFor = new Map(navLinks.map((link) => [link.getAttribute('href').slice(1), link]));
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => link.removeAttribute('aria-current'));
        linkFor.get(entry.target.id)?.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main section[id]').forEach((section) => spy.observe(section));
  }

  /* ---------- Scroll reveal ---------- */
  const revealItems = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !prefersReducedMotion()) {
    revealItems.forEach((el) => {
      const siblings = [...el.parentElement.children].filter((child) => child.classList.contains('reveal'));
      el.style.setProperty('--reveal-delay', `${Math.min(siblings.indexOf(el), 4) * 0.08}s`);
    });
    const revealer = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealItems.forEach((el) => revealer.observe(el));
  } else {
    revealItems.forEach((el) => el.classList.add('is-visible'));
  }

  /* ---------- Feature card spotlight ---------- */
  document.querySelectorAll('.feature').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${event.clientX - rect.left}px`);
      card.style.setProperty('--my', `${event.clientY - rect.top}px`);
    });
  });

  /* ---------- Hero viewport tilt ---------- */
  const tiltTarget = document.querySelector('[data-tilt]');
  const tiltArea = document.querySelector('.hero-visual');
  if (tiltTarget && tiltArea) {
    tiltArea.addEventListener('pointermove', (event) => {
      if (prefersReducedMotion() || !finePointer.matches) return;
      const rect = tiltArea.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      tiltTarget.style.setProperty('--tilt-y', `${(x * 10 - 4).toFixed(2)}deg`);
      tiltTarget.style.setProperty('--tilt-x', `${(-y * 8 + 2).toFixed(2)}deg`);
    });
    tiltArea.addEventListener('pointerleave', () => {
      tiltTarget.style.removeProperty('--tilt-x');
      tiltTarget.style.removeProperty('--tilt-y');
    });
  }

  /* ---------- Hero wireframe mesh (icosphere, 42 verts / 80 faces) ---------- */
  const meshSvg = document.querySelector('[data-mesh]');
  if (meshSvg) initMesh(meshSvg);

  function buildIcosphere() {
    const t = (1 + Math.sqrt(5)) / 2;
    const verts = [
      [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
      [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
      [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
    ].map(normalize);
    let faces = [
      [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
      [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
      [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
      [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
    ];

    // One subdivision step: split every triangle into four.
    const midCache = new Map();
    const midpoint = (a, b) => {
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      if (!midCache.has(key)) {
        const [va, vb] = [verts[a], verts[b]];
        verts.push(normalize([(va[0] + vb[0]) / 2, (va[1] + vb[1]) / 2, (va[2] + vb[2]) / 2]));
        midCache.set(key, verts.length - 1);
      }
      return midCache.get(key);
    };
    faces = faces.flatMap(([a, b, c]) => {
      const ab = midpoint(a, b), bc = midpoint(b, c), ca = midpoint(c, a);
      return [[a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]];
    });

    const edgeSet = new Set();
    const edges = [];
    faces.forEach(([a, b, c]) => {
      [[a, b], [b, c], [c, a]].forEach(([p, q]) => {
        const key = p < q ? `${p}_${q}` : `${q}_${p}`;
        if (!edgeSet.has(key)) { edgeSet.add(key); edges.push([p, q]); }
      });
    });
    return { verts, faces, edges };
  }

  function normalize([x, y, z]) {
    const len = Math.hypot(x, y, z);
    return [x / len, y / len, z / len];
  }

  function initMesh(svg) {
    const NS = 'http://www.w3.org/2000/svg';
    const R = 112;
    const TILT = -0.42;
    const SPEED = 0.16; // radians per second — deliberately slow
    const LIGHT = normalize([-0.5, 0.65, 0.6]);
    const SELECTED_FACE = 37;
    const { verts, faces, edges } = buildIcosphere();

    const make = (tag, cls, parent) => {
      const el = document.createElementNS(NS, tag);
      el.setAttribute('class', cls);
      parent.appendChild(el);
      return el;
    };
    const faceEls = faces.map((_, i) => make('polygon', i === SELECTED_FACE ? 'mesh-face is-selected' : 'mesh-face', svg.querySelector('[data-mesh-faces]')));
    const edgeEls = edges.map(() => make('line', 'mesh-edge', svg.querySelector('[data-mesh-edges]')));
    const vertEls = verts.map(() => make('circle', 'mesh-vert', svg.querySelector('[data-mesh-verts]')));

    const projected = verts.map(() => ({ x: 0, y: 0, z: 0 }));

    function render(angle) {
      const cy = Math.cos(angle), sy = Math.sin(angle);
      const cx = Math.cos(TILT), sx = Math.sin(TILT);

      verts.forEach(([x, y, z], i) => {
        // rotate around Y, then tilt around X
        const x1 = x * cy + z * sy;
        const z1 = -x * sy + z * cy;
        const y2 = y * cx - z1 * sx;
        const z2 = y * sx + z1 * cx;
        const p = projected[i];
        p.x = x1 * R; p.y = -y2 * R; p.z = z2;
      });

      faces.forEach(([a, b, c], i) => {
        const pa = projected[a], pb = projected[b], pc = projected[c];
        const el = faceEls[i];
        const nz = (pa.z + pb.z + pc.z) / 3;
        if (nz <= 0.02) { el.setAttribute('points', ''); return; }
        el.setAttribute('points', `${pa.x.toFixed(1)},${pa.y.toFixed(1)} ${pb.x.toFixed(1)},${pb.y.toFixed(1)} ${pc.x.toFixed(1)},${pc.y.toFixed(1)}`);
        if (i !== SELECTED_FACE) {
          const nx = (pa.x + pb.x + pc.x) / 3 / R, ny = -(pa.y + pb.y + pc.y) / 3 / R;
          const light = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
          el.setAttribute('fill', `rgba(139, 92, 246, ${(0.03 + light * 0.2).toFixed(3)})`);
        }
      });

      edges.forEach(([a, b], i) => {
        const pa = projected[a], pb = projected[b];
        const depth = ((pa.z + pb.z) / 2 + 1) / 2; // 0 = back, 1 = front
        const el = edgeEls[i];
        el.setAttribute('x1', pa.x.toFixed(1)); el.setAttribute('y1', pa.y.toFixed(1));
        el.setAttribute('x2', pb.x.toFixed(1)); el.setAttribute('y2', pb.y.toFixed(1));
        el.setAttribute('stroke-opacity', (0.08 + depth * depth * 0.8).toFixed(3));
      });

      projected.forEach((p, i) => {
        const depth = (p.z + 1) / 2;
        const el = vertEls[i];
        el.setAttribute('cx', p.x.toFixed(1)); el.setAttribute('cy', p.y.toFixed(1));
        el.setAttribute('r', (0.8 + depth * 1.6).toFixed(2));
        el.setAttribute('fill-opacity', (depth * depth).toFixed(3));
      });
    }

    let angle = 0.6;
    let last = 0;
    let frame = 0;
    let inView = true;

    const tick = (now) => {
      if (last) angle += Math.min(now - last, 64) / 1000 * SPEED;
      last = now;
      render(angle);
      frame = requestAnimationFrame(tick);
    };
    const start = () => {
      if (frame || prefersReducedMotion() || !inView || document.hidden) return;
      last = 0;
      frame = requestAnimationFrame(tick);
    };
    const stop = () => { cancelAnimationFrame(frame); frame = 0; };

    render(angle);
    start();

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
        inView ? start() : stop();
      }).observe(svg);
    }
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    motionQuery.addEventListener('change', () => (prefersReducedMotion() ? stop() : start()));
  }
})();
