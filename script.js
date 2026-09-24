/* Hurein Kaiser portfolio
   No dependencies. Everything here is progressive enhancement:
   if this file fails to load, the page still reads top to bottom. */

(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.add("js");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* Theme toggle. Saved choice wins, otherwise follow the system. */
  var toggle = document.querySelector(".theme-toggle");
  var systemDark = window.matchMedia("(prefers-color-scheme: dark)");

  function currentTheme() {
    return root.getAttribute("data-theme") || (systemDark.matches ? "dark" : "light");
  }

  function paintToggle() {
    if (!toggle) return;
    var dark = currentTheme() === "dark";
    toggle.textContent = dark ? "Light" : "Dark";
    toggle.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    toggle.setAttribute("aria-pressed", dark ? "true" : "false");
  }

  try {
    var saved = localStorage.getItem("theme");
    if (saved === "dark" || saved === "light") root.setAttribute("data-theme", saved);
  } catch (e) {}

  paintToggle();

  if (toggle) {
    toggle.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
      paintToggle();
    });
  }

  systemDark.addEventListener("change", paintToggle);

  /* Hero name: split into letters for the masked rise on load. */
  var title = document.querySelector(".hero h1");
  if (title && !reduceMotion) {
    var words = title.textContent.trim().split(/\s+/);
    var index = 0;
    title.textContent = "";
    words.forEach(function (word, w) {
      var span = document.createElement("span");
      span.className = "word";
      span.setAttribute("aria-hidden", "true");
      word.split("").forEach(function (ch) {
        var l = document.createElement("span");
        l.className = "letter";
        l.style.setProperty("--i", index++);
        l.textContent = ch;
        span.appendChild(l);
      });
      title.appendChild(span);
      if (w < words.length - 1) title.appendChild(document.createElement("br"));
    });
  }

  /* Hero field: a grid of dots that drifts and bends toward the cursor. */
  (function heroField() {
    var canvas = document.querySelector(".hero-field");
    var hero = document.querySelector(".hero");
    if (!canvas || !hero || reduceMotion || !canvas.getContext) return;

    var ctx = canvas.getContext("2d");
    var dots = [];
    var W = 0, H = 0;
    var mouse = { x: -9999, y: -9999 };
    var running = false;
    var color = readAccent();
    var GAP = 34;
    var RADIUS = 200;
    var PULL = 18;

    function readAccent() {
      return getComputedStyle(root).getPropertyValue("--accent").trim() || "#2f6b4f";
    }

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dots = [];
      for (var y = GAP / 2; y < H; y += GAP) {
        for (var x = GAP / 2; x < W; x += GAP) {
          dots.push({ ox: x, oy: y, x: x, y: y, seed: Math.random() * 6.28 });
        }
      }
    }

    function frame(t) {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = color;
      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];
        var dx = mouse.x - d.ox;
        var dy = mouse.y - d.oy;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var k = dist < RADIUS ? 1 - dist / RADIUS : 0;
        k = k * k;
        var driftX = Math.sin(t * 0.0004 + d.seed) * 2;
        var driftY = Math.cos(t * 0.0003 + d.seed * 1.3) * 2;
        var tx = d.ox + driftX + (dist ? dx / dist : 0) * k * PULL;
        var ty = d.oy + driftY + (dist ? dy / dist : 0) * k * PULL;
        d.x += (tx - d.x) * 0.1;
        d.y += (ty - d.y) * 0.1;
        ctx.globalAlpha = 0.22 + k * 0.6;
        ctx.beginPath();
        ctx.arc(d.x, d.y, 1 + k * 1.8, 0, 6.2832);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      window.requestAnimationFrame(frame);
    }

    function start() {
      if (running) return;
      running = true;
      window.requestAnimationFrame(frame);
    }

    function stop() { running = false; }

    if (finePointer) {
      hero.addEventListener("mousemove", function (e) {
        var r = canvas.getBoundingClientRect();
        mouse.x = e.clientX - r.left;
        mouse.y = e.clientY - r.top;
      });
      hero.addEventListener("mouseleave", function () {
        mouse.x = -9999;
        mouse.y = -9999;
      });
    }

    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 120);
    });

    new MutationObserver(function () { color = readAccent(); })
      .observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    systemDark.addEventListener("change", function () { color = readAccent(); });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries[0].isIntersecting ? start() : stop();
      }).observe(hero);
    } else {
      start();
    }

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop();
      else if (hero.getBoundingClientRect().bottom > 0) start();
    });

    resize();
  })();

  /* Header: hides on scroll down, returns on scroll up. Progress line. */
  var header = document.querySelector(".site-header");
  var progress = document.querySelector(".scroll-progress");
  var lastY = window.scrollY;
  var ticking = false;

  function onScroll() {
    var y = window.scrollY;
    if (header && !root.classList.contains("menu-open")) {
      header.classList.toggle("is-hidden", y > lastY && y > 120);
      header.classList.toggle("is-scrolled", y > 8);
    }
    if (progress) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = "scaleX(" + (max > 0 ? Math.min(y / max, 1) : 0) + ")";
    }
    lastY = y;
    ticking = false;
  }

  window.addEventListener("scroll", function () {
    if (!ticking) {
      window.requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });

  onScroll();

  /* Mobile menu. */
  var menuButton = document.querySelector(".menu-toggle");
  var nav = document.querySelector(".site-nav");

  function closeMenu() {
    root.classList.remove("menu-open");
    if (menuButton) menuButton.setAttribute("aria-expanded", "false");
  }

  if (menuButton && nav) {
    menuButton.addEventListener("click", function () {
      var open = root.classList.toggle("menu-open");
      menuButton.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") closeMenu();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });
    window.matchMedia("(min-width: 641px)").addEventListener("change", closeMenu);
  }

  /* Active nav link and the sliding indicator behind it. */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".site-nav a"));
  var indicator = document.querySelector(".nav-indicator");
  var sections = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute("href")); })
    .filter(Boolean);

  function moveIndicator(link) {
    if (!indicator) return;
    if (!link) {
      indicator.classList.remove("is-on");
      return;
    }
    indicator.style.width = link.offsetWidth + "px";
    indicator.style.transform = "translateX(" + link.offsetLeft + "px)";
    indicator.classList.add("is-on");
  }

  function setActive(id) {
    var active = null;
    navLinks.forEach(function (a) {
      var on = a.getAttribute("href") === "#" + id;
      a.classList.toggle("is-active", on);
      if (on) active = a;
    });
    moveIndicator(active);
  }

  if ("IntersectionObserver" in window && sections.length) {
    var visible = {};
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        visible[entry.target.id] = entry.isIntersecting ? entry.intersectionRatio : 0;
      });
      var best = null;
      sections.forEach(function (s) {
        if (visible[s.id] && (!best || visible[s.id] > visible[best.id])) best = s;
      });
      if (best) setActive(best.id);
      else if (window.scrollY < 200) setActive("");
    }, { rootMargin: "-40% 0px -50% 0px", threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] });
    sections.forEach(function (s) { spy.observe(s); });

    window.addEventListener("resize", function () {
      var current = document.querySelector(".site-nav a.is-active");
      moveIndicator(current);
    });
  }

  /* Section heading rules draw in when the section arrives. */
  if ("IntersectionObserver" in window) {
    var sectionWatch = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          sectionWatch.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -20% 0px" });
    document.querySelectorAll(".section").forEach(function (s) { sectionWatch.observe(s); });
  }

  /* Scroll reveals. The .reveal class is added here, not in the markup,
     so nothing is ever hidden without JavaScript. */
  if (!reduceMotion && "IntersectionObserver" in window) {
    var targets = document.querySelectorAll(
      ".about-summary, .timeline-item, .education, .case, .card, .skills-group, .contact-links"
    );
    targets.forEach(function (el) { el.classList.add("reveal"); });

    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealer.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.1 });
    targets.forEach(function (el) { revealer.observe(el); });

    document.querySelectorAll(".card").forEach(function (card, i) {
      card.style.transitionDelay = (i % 3) * 70 + "ms";
    });
  }

  /* Card tilt and spotlight, pointer devices only. */
  if (finePointer && !reduceMotion) {
    var MAX_TILT = 5;
    document.querySelectorAll(".card").forEach(function (card) {
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        card.classList.add("is-tilting");
        card.style.transitionDelay = "0ms";
        card.style.setProperty("--ry", ((px - 0.5) * MAX_TILT * 2).toFixed(2) + "deg");
        card.style.setProperty("--rx", ((0.5 - py) * MAX_TILT * 2).toFixed(2) + "deg");
        card.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
        card.style.setProperty("--my", (py * 100).toFixed(1) + "%");
      });
      card.addEventListener("mouseleave", function () {
        card.classList.remove("is-tilting");
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
      });
    });
  }
})();
