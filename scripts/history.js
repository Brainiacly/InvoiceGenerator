(function () {
  "use strict";

  var InvoiceApp = window.InvoiceApp;

  var listElement = document.getElementById("history-list");
  var emptyState = document.getElementById("history-empty-state");
  var countHint = document.getElementById("history-count-hint");
  var statusMessage = document.getElementById("history-status");

  function showStatus(message) {
    statusMessage.textContent = message;
  }

  function formatSavedAt(isoString) {
    var date = new Date(isoString);
    if (isNaN(date.getTime())) {
      return "";
    }
    return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) +
      " at " + date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }

  function escapeHtml(value) {
    var div = document.createElement("div");
    div.textContent = value == null ? "" : String(value);
    return div.innerHTML;
  }

  function renderAccountBanner() {
    var banner = document.getElementById("account-banner");
    var text = document.getElementById("account-banner-text");
    var actions = document.getElementById("account-banner-actions");
    if (!banner || !text || !actions) {
      return;
    }

    var session = InvoiceApp.getSession();
    banner.hidden = false;
    actions.innerHTML = "";

    if (session) {
      text.innerHTML = "Signed in as <strong>" + escapeHtml(session.email) + "</strong>. These invoices are saved to your local account on this device.";
      return;
    }

    text.textContent = "You're browsing as a guest. These invoices are saved to this browser only, with no account attached yet.";
    actions.innerHTML =
      '<a class="button button--secondary button--small" href="sign-up.html">Create a local account</a>' +
      '<a class="button button--ghost button--small" href="sign-in.html">Sign in</a>';
  }

  function buildItemMarkup(entry) {
    var totals = InvoiceApp.calculateTotals(entry);
    var customerName = entry.customer.name || "Unnamed customer";
    var businessName = entry.business.name || "Unnamed business";
    var savedAt = entry.savedAt ? formatSavedAt(entry.savedAt) : "";

    return (
      '<li class="history-item" data-invoice-id="' + escapeHtml(entry.id) + '">' +
        '<div class="history-item__main">' +
          '<p class="history-item__number">' + escapeHtml(entry.invoiceNumber || "Untitled invoice") + '</p>' +
          '<p class="history-item__customer">' + escapeHtml(customerName) + ' &middot; ' + escapeHtml(businessName) + '</p>' +
          '<p class="history-item__meta">' +
            (savedAt ? 'Saved ' + escapeHtml(savedAt) : 'Not saved yet') +
            ' &middot; ' + entry.items.length + (entry.items.length === 1 ? ' item' : ' items') +
          '</p>' +
        '</div>' +
        '<div class="history-item__amount">' +
          '<span class="history-item__amount-label">Amount due</span>' +
          '<span class="history-item__amount-value">' + InvoiceApp.formatCurrency(totals.amountDue) + '</span>' +
        '</div>' +
        '<div class="history-item__actions">' +
          '<a class="button button--secondary button--small" href="builder.html?id=' + encodeURIComponent(entry.id) + '">Open in builder</a>' +
          '<a class="button button--primary button--small" href="print-preview.html?id=' + encodeURIComponent(entry.id) + '">Print preview</a>' +
          '<button type="button" class="button button--ghost button--small" data-action="duplicate" data-invoice-id="' + escapeHtml(entry.id) + '">Duplicate</button>' +
          '<button type="button" class="button button--danger button--small" data-action="delete" data-invoice-id="' + escapeHtml(entry.id) + '">Delete</button>' +
        '</div>' +
      '</li>'
    );
  }

  function render() {
    var entries = InvoiceApp.listHistory();

    countHint.textContent = entries.length
      ? entries.length + (entries.length === 1 ? " saved invoice on this device." : " saved invoices on this device.")
      : "No saved invoices on this device yet.";

    emptyState.hidden = entries.length > 0;
    listElement.hidden = entries.length === 0;
    listElement.innerHTML = entries.map(buildItemMarkup).join("");
  }

  function handleListClick(event) {
    var duplicateButton = event.target.closest('[data-action="duplicate"]');
    if (duplicateButton) {
      var duplicated = InvoiceApp.duplicateHistoryEntry(duplicateButton.dataset.invoiceId);
      if (duplicated) {
        showStatus("Duplicated as " + (duplicated.invoiceNumber || "a new invoice") + ".");
        render();
      } else {
        showStatus("That invoice could not be duplicated.");
      }
      return;
    }

    var deleteButton = event.target.closest('[data-action="delete"]');
    if (deleteButton) {
      var confirmed = window.confirm("Delete this saved invoice? This cannot be undone.");
      if (!confirmed) {
        return;
      }
      InvoiceApp.deleteFromHistory(deleteButton.dataset.invoiceId);
      showStatus("Invoice deleted.");
      render();
    }
  }

  function init() {
    if (!InvoiceApp || typeof InvoiceApp.listHistory !== "function") {
      return;
    }
    renderAccountBanner();
    render();
    listElement.addEventListener("click", handleListClick);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
