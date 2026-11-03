/* Nokhada — small progressive enhancements. The site works without this file. */
(function () {
  "use strict";
  document.documentElement.classList.remove("no-js");

  /* Contact address lives in one place. Change it here and in the footer links. */
  var CONTACT_EMAIL = "hello@nokhada.ae";

  /* Mobile menu */
  var toggle = document.querySelector(".menu-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* Footer year */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  /* Reveal on scroll */
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* Terminal: type lines out one by one (static if reduced motion) */
  document.querySelectorAll("[data-terminal]").forEach(function (term) {
    var lines = Array.prototype.slice.call(term.querySelectorAll("p"));
    if (reduce || !("IntersectionObserver" in window)) return;
    lines.forEach(function (l) { l.style.visibility = "hidden"; });
    var started = false;
    var obs = new IntersectionObserver(function (entries) {
      if (started || !entries[0].isIntersecting) return;
      started = true;
      obs.disconnect();
      var i = 0;
      (function next() {
        if (i >= lines.length) return;
        var line = lines[i];
        line.style.visibility = "visible";
        var isPrompt = line.classList.contains("t-prompt");
        if (isPrompt) {
          var full = line.textContent;
          line.textContent = "";
          var c = 0;
          (function type() {
            line.textContent = full.slice(0, ++c);
            if (c < full.length) setTimeout(type, 18);
            else { i++; setTimeout(next, 380); }
          })();
        } else {
          i++;
          setTimeout(next, line.textContent.trim() === "" ? 120 : 260);
        }
      })();
    }, { threshold: 0.35 });
    obs.observe(term);
  });

  /* Contact form → opens the visitor's mail client with a pre-filled message.
     Swap this for a real endpoint (Formspree, HubSpot, your CRM) when ready. */
  document.querySelectorAll("form[data-contact]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = new FormData(form);
      var get = function (k) { return (d.get(k) || "").toString().trim(); };
      var subject = "Diagnostic enquiry — " + (get("firm") || get("name") || "website");
      var body = [
        "Name: " + get("name"),
        "Firm: " + get("firm"),
        "Role: " + get("role"),
        "Email: " + get("email"),
        "Segment: " + get("segment"),
        "",
        get("message")
      ].join("\n");
      window.location.href = "mailto:" + CONTACT_EMAIL +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(body);
    });
  });
})();
