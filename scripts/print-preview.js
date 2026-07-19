(function () {
  "use strict";

  var InvoiceApp = window.InvoiceApp;

  function buildMailtoLink(invoice, totals) {
    var subject = "Invoice " + invoice.invoiceNumber + " from " + (invoice.business.name || "your business");
    var bodyLines = [
      "Hi " + (invoice.customer.name || "there") + ",",
      "",
      "Please find the invoice details below.",
      "",
      "Invoice: " + invoice.invoiceNumber,
      "Amount due: " + InvoiceApp.formatCurrency(totals.amountDue),
      "",
      "Thank you,",
      invoice.business.name || "Your business"
    ];

    var params = "subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(bodyLines.join("\n"));
    return "mailto:" + encodeURIComponent(invoice.customer.email || "") + "?" + params;
  }

  function getRequestedInvoiceId() {
    var params = new URLSearchParams(window.location.search);
    return params.get("id");
  }

  function resolveInvoiceLabel(invoice) {
    var customer = invoice.customer.name || "Unnamed customer";
    return (invoice.invoiceNumber || "Invoice") + " \u2014 " + customer;
  }

  function init() {
    var requestedId = getRequestedInvoiceId();
    var invoice = requestedId ? InvoiceApp.getHistoryById(requestedId) : InvoiceApp.loadDraft();

    var viewingHint = document.getElementById("viewing-invoice-hint");
    var invoicePreview = document.getElementById("invoice-preview");
    var printButton = document.getElementById("print-button");
    var savePdfButton = document.getElementById("save-pdf-button");
    var emailButton = document.getElementById("email-draft-button");

    if (!invoice || !invoice.items.length) {
      printButton.disabled = true;
      savePdfButton.disabled = true;
      emailButton.disabled = true;
      if (requestedId) {
        viewingHint.textContent = "That saved invoice could not be found. Go to History to pick another.";
      }
      return;
    }

    InvoiceApp.applyInvoiceStyleClass(invoicePreview, invoice.designStyle, invoice.format.spacing);
    invoicePreview.innerHTML = InvoiceApp.renderInvoiceMarkup(invoice);
    var totals = InvoiceApp.calculateTotals(invoice);

    viewingHint.innerHTML = "Viewing " + resolveInvoiceLabel(invoice) + ". <a href=\"history.html\">Choose a different saved invoice</a> or <a href=\"builder.html?id=" +
      encodeURIComponent(invoice.id || "") + "\">edit this one</a>.";

    printButton.addEventListener("click", function () {
      window.print();
    });

    savePdfButton.addEventListener("click", function () {
      window.print();
    });

    emailButton.addEventListener("click", function () {
      window.location.href = buildMailtoLink(invoice, totals);
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();