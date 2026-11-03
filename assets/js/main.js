/* Nokhada — small progressive enhancements. The site works without this file. */
(function () {
  "use strict";
  document.documentElement.classList.remove("no-js");

  /* Contact address lives in one place. Change it here and in the footer links. */
  var CONTACT_EMAIL = "hello@nokhada.ae";
  var isArabic = document.documentElement.lang === "ar";

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

  /* Reveal on scroll. Anything visible at load stays visible; only sections
     below the fold start faded and ease in as they arrive. */
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.remove("pre");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -6% 0px" });
    var fold = window.innerHeight || 800;
    document.querySelectorAll(".reveal").forEach(function (el) {
      if (el.getBoundingClientRect().top > fold) {
        el.classList.add("pre");
        io.observe(el);
      }
    });
  }

  /* Copy helper: clipboard where allowed, otherwise select the text for the visitor. */
  function copyText(text, fallbackEl, button) {
    var done = function () {
      if (!button) return;
      var old = button.textContent;
      button.textContent = isArabic ? "تم النسخ" : "Copied";
      setTimeout(function () { button.textContent = old; }, 1600);
    };
    var selectFallback = function () {
      if (!fallbackEl) return;
      var r = document.createRange();
      r.selectNodeContents(fallbackEl);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
      if (button) button.textContent = isArabic ? "النص محدد — انسخه" : "Text selected — press copy";
    };
    try {
      navigator.clipboard.writeText(text).then(done, selectFallback);
    } catch (e) { selectFallback(); }
  }
  window.NokhadaCopy = copyText;

  /* Contact form: we can't send from a static page, so we prepare the message
     and show it with our address. The visitor sends it from their own email. */
  document.querySelectorAll("form[data-contact]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = new FormData(form);
      var get = function (k) { return (d.get(k) || "").toString().trim(); };
      var subject = (isArabic ? "طلب جلسة تشخيص — " : "Diagnostic enquiry — ") + (get("firm") || get("name") || "website");
      var body = [
        (isArabic ? "الاسم: " : "Name: ") + get("name"),
        (isArabic ? "المؤسسة: " : "Organisation: ") + get("firm"),
        (isArabic ? "المسمى الوظيفي: " : "Role: ") + get("role"),
        (isArabic ? "البريد: " : "Email: ") + get("email"),
        (isArabic ? "القطاع: " : "Sector: ") + get("segment"),
        "",
        get("message")
      ].join("\n");
      var full = subject + "\n\n" + body;
      var panel = document.createElement("div");
      panel.className = "sent";
      panel.setAttribute("role", "status");
      panel.innerHTML =
        "<h3 style=\"margin:0;color:#f3f7f6\">" + (isArabic ? "رسالتكم جاهزة" : "Your message is ready") + "</h3>" +
        "<p style=\"margin:0\">" + (isArabic
          ? "أرسلوها من بريدكم الإلكتروني إلى <span class=\"addr\" dir=\"ltr\">" + CONTACT_EMAIL + "</span> ونردّ خلال يوم عمل واحد."
          : "Send it from your own email to <span class=\"addr\">" + CONTACT_EMAIL + "</span>. We reply within one business day.") + "</p>" +
        "<pre></pre>" +
        "<div class=\"row-btns\">" +
          "<button type=\"button\" class=\"btn btn-light\" data-copy>" + (isArabic ? "انسخ الرسالة" : "Copy message") + "</button>" +
          "<a class=\"btn btn-outline-light\" href=\"mailto:" + CONTACT_EMAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body) + "\">" + (isArabic ? "افتح في تطبيق البريد" : "Open in email app") + "</a>" +
          "<button type=\"button\" class=\"btn btn-outline-light\" data-edit>" + (isArabic ? "تعديل" : "Edit") + "</button>" +
        "</div>";
      var pre = panel.querySelector("pre");
      pre.textContent = full;
      panel.querySelector("[data-copy]").addEventListener("click", function (ev) { copyText(full, pre, ev.currentTarget); });
      panel.querySelector("[data-edit]").addEventListener("click", function () { panel.remove(); form.hidden = false; });
      form.hidden = true;
      form.parentNode.insertBefore(panel, form.nextSibling);
    });
  });
})();
