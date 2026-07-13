(function () {
  "use strict";

  function setUpNavToggle() {
    var toggleButton = document.querySelector(".nav-toggle");
    var nav = document.getElementById("primary-navigation");

    if (!toggleButton || !nav) {
      return;
    }

    toggleButton.addEventListener("click", function () {
      var isOpen = nav.classList.toggle("is-open");
      toggleButton.setAttribute("aria-expanded", String(isOpen));
    });

    // Closing the menu after a link is chosen keeps a screen reader
    // user from landing on a new page with a stale open menu behind them.
    nav.addEventListener("click", function (event) {
      if (event.target.tagName === "A") {
        nav.classList.remove("is-open");
        toggleButton.setAttribute("aria-expanded", "false");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", setUpNavToggle);
})();

var InvoiceApp = window.InvoiceApp || {};

InvoiceApp.qs = function (selector, scope) {
  return (scope || document).querySelector(selector);
};

InvoiceApp.qsa = function (selector, scope) {
  return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
};

window.InvoiceApp = InvoiceApp;
