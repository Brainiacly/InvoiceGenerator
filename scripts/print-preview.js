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
    var copiesCard = document.getElementById("copies-card");
    var copiesGrid = document.getElementById("copies-grid");
    var copiesRadios = document.querySelectorAll('input[name="copiesPerPage"]');
    var pairingField = document.getElementById("pairing-field");
    var pairingSelect = document.getElementById("pairing-select");
    var copiesStatus = document.getElementById("copies-status");

    var copySlots = [
      { wrapper: document.getElementById("copy-slot-2"), preview: document.getElementById("invoice-preview-2") },
      { wrapper: document.getElementById("copy-slot-3"), preview: document.getElementById("invoice-preview-3") },
      { wrapper: document.getElementById("copy-slot-4"), preview: document.getElementById("invoice-preview-4") }
    ];

    if (!invoice || !invoice.items.length) {
      printButton.disabled = true;
      savePdfButton.disabled = true;
      emailButton.disabled = true;
      copiesCard.hidden = true;
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

    var otherInvoices = InvoiceApp.listHistory().filter(function (entry) {
      return entry.id !== invoice.id;
    });

    otherInvoices.forEach(function (entry) {
      var option = document.createElement("option");
      option.value = entry.id;
      option.textContent = resolveInvoiceLabel(entry);
      pairingSelect.appendChild(option);
    });

    if (!otherInvoices.length) {
      pairingSelect.disabled = true;
      pairingSelect.querySelector("option").textContent = "Duplicate this invoice (no other saved invoices yet)";
    }

    function renderCopySlot(slot, sourceInvoice) {
      InvoiceApp.applyInvoiceStyleClass(slot.preview, sourceInvoice.designStyle, sourceInvoice.format.spacing);
      slot.preview.innerHTML = InvoiceApp.renderInvoiceMarkup(sourceInvoice);
    }

    var FIT_PROBE_TOLERANCE_PX = 2;

    function contentFitsCompactSlot(sourceInvoice, copyCount) {
      var probe = document.getElementById("print-fit-probe");
      var probeInvoice = document.getElementById("print-fit-probe-invoice");
      if (!probe || !probeInvoice || (copyCount !== 2 && copyCount !== 4)) {
        return true;
      }

      probe.className = "print-fit-probe no-print print-fit-probe--" + copyCount + "up";
      InvoiceApp.applyInvoiceStyleClass(probeInvoice, sourceInvoice.designStyle, sourceInvoice.format.spacing);
      probeInvoice.innerHTML = InvoiceApp.renderInvoiceMarkup(sourceInvoice);

      return probe.scrollHeight <= probe.clientHeight + FIT_PROBE_TOLERANCE_PX;
    }

    function updateCopiesLayout() {
      var checkedRadio = document.querySelector('input[name="copiesPerPage"]:checked');
      var copyCount = checkedRadio ? Number(checkedRadio.value) : 1;
      copiesGrid.dataset.copies = String(copyCount);
      pairingField.hidden = copyCount !== 2;

      var pairedId = pairingField.hidden ? "" : pairingSelect.value;
      var pairedInvoice = pairedId ? InvoiceApp.getHistoryById(pairedId) : null;

      copySlots.forEach(function (slot, index) {
        var slotNumber = index + 2;
        var shouldShow = slotNumber <= copyCount;
        slot.wrapper.hidden = !shouldShow;
        if (!shouldShow) {
          return;
        }
        var sourceInvoice = (slotNumber === 2 && pairedInvoice) ? pairedInvoice : invoice;
        renderCopySlot(slot, sourceInvoice);
      });

      var sourcesOnPage = [invoice];
      if (copyCount === 2 && pairedInvoice) {
        sourcesOnPage.push(pairedInvoice);
      }

      var fitsCompactly = copyCount === 1 || sourcesOnPage.every(function (sourceInvoice) {
        return contentFitsCompactSlot(sourceInvoice, copyCount);
      });
      copiesGrid.dataset.layout = fitsCompactly ? "compact" : "stacked";

      if (copyCount === 1) {
        copiesStatus.textContent = "Printing one copy on this page.";
      } else if (!fitsCompactly) {
        copiesStatus.textContent = "This invoice has too many items to fit " + copyCount + " per page. Printing " + copyCount +
          " full-size copies instead, each starting on its own page.";
      } else if (copyCount === 2 && pairedInvoice) {
        copiesStatus.textContent = "Printing this invoice paired with " + resolveInvoiceLabel(pairedInvoice) + ", two per page.";
      } else {
        copiesStatus.textContent = "Printing " + copyCount + " copies of this invoice on one page.";
      }
    }

    copiesRadios.forEach(function (radio) {
      radio.addEventListener("change", updateCopiesLayout);
    });
    pairingSelect.addEventListener("change", updateCopiesLayout);
    updateCopiesLayout();

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