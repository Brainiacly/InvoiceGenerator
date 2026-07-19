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
      if (event.target.tagName === "A" || event.target.id === "nav-sign-out") {
        nav.classList.remove("is-open");
        toggleButton.setAttribute("aria-expanded", "false");
      }
    });
  }

  function escapeForNav(value) {
    var div = document.createElement("div");
    div.textContent = value == null ? "" : String(value);
    return div.innerHTML;
  }

  function renderAuthNav() {
    var InvoiceApp = window.InvoiceApp;
    if (!InvoiceApp || typeof InvoiceApp.getSession !== "function") {
      return;
    }

    var session = InvoiceApp.getSession();
    if (!session) {
      return;
    }

    var navList = document.querySelector(".primary-nav__list");
    if (!navList) {
      return;
    }

    var signInLink = navList.querySelector('a[href="sign-in.html"]');
    var signUpLink = navList.querySelector('a[href="sign-up.html"]');
    if (!signInLink || !signUpLink) {
      return;
    }

    var signInItem = signInLink.closest("li");
    var signUpItem = signUpLink.closest("li");
    if (!signInItem || !signUpItem) {
      return;
    }

    var accountItem = document.createElement("li");
    accountItem.className = "primary-nav__account";
    accountItem.innerHTML = "Signed in as <strong>" + escapeForNav(session.email) + "</strong>";

    var signOutItem = document.createElement("li");
    var signOutButton = document.createElement("button");
    signOutButton.type = "button";
    signOutButton.className = "primary-nav__signup";
    signOutButton.id = "nav-sign-out";
    signOutButton.textContent = "Sign out";
    signOutButton.addEventListener("click", function () {
      InvoiceApp.clearSession();
      window.location.href = "index.html";
    });
    signOutItem.appendChild(signOutButton);

    signInItem.replaceWith(accountItem);
    signUpItem.replaceWith(signOutItem);
  }

  document.addEventListener("DOMContentLoaded", function () {
    setUpNavToggle();
    renderAuthNav();
  });
})();

var InvoiceApp = window.InvoiceApp || {};

InvoiceApp.qs = function (selector, scope) {
  return (scope || document).querySelector(selector);
};

InvoiceApp.qsa = function (selector, scope) {
  return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
};

window.InvoiceApp = InvoiceApp;