(function () {
  "use strict";

  const fineHover = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $ = (sel, scope) => (scope || document).querySelector(sel);
  const $$ = (sel, scope) => Array.from((scope || document).querySelectorAll(sel));

  function safe(fn, name) {
    try { fn(); } catch (e) { console.warn("[" + name + "]", e); }
  }

  /* ---------- Nav ---------- */
  function initNav() {
    const nav = $(".nav");
    const burger = $(".nav-burger");
    const mobileMenu = $(".mobile-menu");
    if (!nav) return;

    const onScroll = () => {
      if (window.scrollY > 40) nav.classList.add("is-solid");
      else nav.classList.remove("is-solid");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    if (burger && mobileMenu) {
      burger.addEventListener("click", () => {
        const open = burger.classList.toggle("is-open");
        mobileMenu.classList.toggle("is-open", open);
        document.body.style.overflow = open ? "hidden" : "";
        burger.setAttribute("aria-expanded", String(open));
      });
      $$("a", mobileMenu).forEach(a => a.addEventListener("click", () => {
        burger.classList.remove("is-open");
        mobileMenu.classList.remove("is-open");
        document.body.style.overflow = "";
      }));
    }
  }

  /* ---------- Smooth in-page anchor scroll (FAQ links, footer, etc.) ---------- */
  function initAnchorScroll() {
    document.addEventListener("click", (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute("href");
      if (!id || id === "#") return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      const top = el.getBoundingClientRect().top + window.scrollY - 76;
      window.scrollTo({ top, behavior: "smooth" });
    });
  }

  /* ---------- Reveal on scroll ---------- */
  function initReveals() {
    const els = $$(".reveal");
    if (!els.length) return;

    const safety = setTimeout(() => {
      els.forEach(el => el.classList.add("is-visible"));
    }, 6000);

    if (!("IntersectionObserver" in window)) {
      els.forEach(el => el.classList.add("is-visible"));
      clearTimeout(safety);
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05, rootMargin: "0px 0px -40px 0px" });

    els.forEach(el => io.observe(el));
  }

  /* ---------- Card cursor-follow halo ---------- */
  function initCardHalo() {
    if (!fineHover) return;
    $$(".card").forEach(card => {
      if (card.dataset.haloBound) return;
      card.dataset.haloBound = "1";
      card.addEventListener("mousemove", e => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--mx", (e.clientX - rect.left) + "px");
        card.style.setProperty("--my", (e.clientY - rect.top) + "px");
      });
    });
  }

  /* ---------- FAQ accordion ---------- */
  function initFaqAccordion() {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".faq-q");
      if (!btn) return;
      const item = btn.closest(".faq-item");
      const answer = item.querySelector(".faq-a");
      const isOpen = item.classList.contains("is-open");

      $$(".faq-item.is-open").forEach(openItem => {
        if (openItem !== item) {
          openItem.classList.remove("is-open");
          openItem.querySelector(".faq-a").style.maxHeight = null;
          openItem.querySelector(".faq-q").setAttribute("aria-expanded", "false");
        }
      });

      if (isOpen) {
        item.classList.remove("is-open");
        answer.style.maxHeight = null;
        btn.setAttribute("aria-expanded", "false");
      } else {
        item.classList.add("is-open");
        answer.style.maxHeight = answer.scrollHeight + "px";
        btn.setAttribute("aria-expanded", "true");
      }
    });
  }

  /* ---------- Lightbox (reads directly from DOM, no data layer needed) ---------- */
  function initLightbox() {
    const lb = $(".lightbox");
    if (!lb) return;
    const imgEl = $(".lightbox img", lb);
    const captionEl = $(".lightbox-caption", lb);
    const items = $$("[data-lightbox-trigger] img");
    if (!items.length) return;
    let idx = 0;

    function show(i) {
      idx = (i + items.length) % items.length;
      const item = items[idx];
      imgEl.src = item.src;
      imgEl.alt = item.alt;
      captionEl.textContent = item.alt;
    }
    function open(i) {
      show(i);
      lb.classList.add("is-open");
      document.body.style.overflow = "hidden";
    }
    function close() {
      lb.classList.remove("is-open");
      document.body.style.overflow = "";
    }
    document.addEventListener("click", (e) => {
      const trigger = e.target.closest("[data-lightbox-trigger]");
      if (trigger) { open(parseInt(trigger.dataset.index, 10) || 0); return; }
      if (e.target.closest(".lightbox-close") || e.target === lb) close();
      if (e.target.closest(".lightbox-next")) show(idx + 1);
      if (e.target.closest(".lightbox-prev")) show(idx - 1);
    });
    document.addEventListener("keydown", (e) => {
      if (!lb.classList.contains("is-open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") show(idx + 1);
      if (e.key === "ArrowLeft") show(idx - 1);
    });
  }

  /* ---------- Contact form: real AJAX submit, success card, then form reappears empty ---------- */
  function initContactForm() {
    const form = $("[data-contact-form]");
    if (!form) return;
    const wrap = form.closest(".contact-form-wrap");
    const successEl = wrap ? $(".form-success", wrap) : null;
    const status = $(".form-status", form);
    const submitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;

      const action = form.getAttribute("action") || "";
      if (!action || action.indexOf("REPLACE_WITH_YOUR_FORM_ID") !== -1) {
        if (status) status.textContent = "El formulario todavía no está conectado. Contáctanos por WhatsApp mientras tanto.";
        return;
      }

      if (status) status.textContent = "Enviando…";
      if (submitBtn) submitBtn.disabled = true;

      fetch(action, {
        method: "POST",
        body: new FormData(form),
        headers: { "Accept": "application/json" }
      }).then(function (res) {
        if (res.ok) {
          if (status) status.textContent = "";
          form.reset();
          if (successEl) {
            form.style.display = "none";
            successEl.hidden = false;
            setTimeout(function () {
              successEl.hidden = true;
              form.style.display = "";
            }, 4500);
          } else if (status) {
            status.textContent = "Gracias. Tu mensaje ha sido enviado, te contactaremos pronto.";
          }
        } else {
          return res.json().catch(function () { return null; }).then(function (data) {
            var msg = (data && data.errors) ? data.errors.map(function (x) { return x.message; }).join(", ")
              : "Hubo un problema al enviar. Intenta de nuevo o escríbenos por WhatsApp.";
            if (status) status.textContent = msg;
          });
        }
      }).catch(function () {
        if (status) status.textContent = "Hubo un problema de conexión. Intenta de nuevo o escríbenos por WhatsApp.";
      }).finally(function () {
        if (submitBtn) submitBtn.disabled = false;
      });
    });
  }

  /* ---------- Splash: static logo on interior pages + mobile/slow connections, one-time video reveal on desktop homepage ---------- */
  function shouldSkipVideoIntro() {
    try {
      const conn = navigator.connection || navigator.webkitConnection || navigator.mozConnection;
      const isSlowOrSaveData = conn && (conn.saveData || /2g/.test(conn.effectiveType || ""));
      return !!isSlowOrSaveData; // only skip on save-data / very slow connections — otherwise show the video everywhere, including mobile
    } catch (e) {
      return false;
    }
  }

  function initSplash() {
    const splash = $(".splash");
    if (!splash) return;

    const video = $(".splash-video", splash);
    if (!video || shouldSkipVideoIntro()) {
      if (video) video.remove();
      const skipBtn = $(".splash-skip", splash);
      if (skipBtn) skipBtn.remove(); // nothing to skip — the static logo is already quick
      setTimeout(() => { splash.style.display = "none"; }, 2600);
      return;
    }

    let seen = false;
    try { seen = sessionStorage.getItem("larq_intro_seen") === "1"; } catch (e) { /* storage unavailable, treat as unseen */ }

    if (seen) {
      splash.style.display = "none";
      return;
    }
    try { sessionStorage.setItem("larq_intro_seen", "1"); } catch (e) { /* ignore */ }

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      splash.classList.add("is-hiding");
      setTimeout(() => { splash.style.display = "none"; }, 750);
    };

    video.addEventListener("ended", finish);
    video.addEventListener("error", finish);
    setTimeout(finish, 9000); // safety net if video can't play for any reason

    const skipBtn = $(".splash-skip", splash);
    if (skipBtn) skipBtn.addEventListener("click", finish);
    document.addEventListener("keydown", function onEsc(e) {
      if (e.key === "Escape") { finish(); document.removeEventListener("keydown", onEsc); }
    });

    // Only now, on desktop/fast connections, do we inject the actual video sources and start loading bytes.
    const webm = document.createElement("source");
    webm.src = "assets/video/logo-reveal.webm";
    webm.type = "video/webm";
    const mp4 = document.createElement("source");
    mp4.src = "assets/video/logo-reveal.mp4";
    mp4.type = "video/mp4";
    video.appendChild(webm);
    video.appendChild(mp4);
    video.load();

    const playPromise = video.play();
    if (playPromise && playPromise.catch) playPromise.catch(finish);
  }

  /* ---------- Hero background carousel — crossfades every ~3.2s ---------- */
  function initHeroCarousel() {
    const wrap = $(".hero-bg");
    if (!wrap) return;
    const imgs = $$("img", wrap);
    if (imgs.length < 2) return;
    let i = 0;
    imgs[0].classList.add("is-active");
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setInterval(() => {
      imgs[i].classList.remove("is-active");
      i = (i + 1) % imgs.length;
      imgs[i].classList.add("is-active");
    }, 3200);
  }

  function boot() {
    safe(initNav, "initNav");
    safe(initAnchorScroll, "initAnchorScroll");
    safe(initReveals, "initReveals");
    safe(initCardHalo, "initCardHalo");
    safe(initFaqAccordion, "initFaqAccordion");
    safe(initLightbox, "initLightbox");
    safe(initContactForm, "initContactForm");
    safe(initSplash, "initSplash");
    safe(initHeroCarousel, "initHeroCarousel");
    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
