(function () {
  "use strict";

  var InvoiceApp = window.InvoiceApp;
  var qs = InvoiceApp.qs;
  var qsa = InvoiceApp.qsa;

  var form = document.getElementById("invoice-form");
  var itemsBody = document.getElementById("items-body");
  var emptyHint = document.getElementById("items-empty-hint");
  var addItemButton = document.getElementById("add-item-button");
  var templatePicker = document.getElementById("template-slots");
  var logoInput = document.getElementById("business-logo");
  var showLogoCheckbox = document.getElementById("show-logo");
  var logoFormatFields = document.getElementById("logo-format-fields");
  var logoPreview = document.getElementById("logo-preview");
  var invoicePreview = document.getElementById("invoice-preview");
  var amountDueLive = document.getElementById("amount-due-live");
  var statusMessage = document.getElementById("builder-status");
  var taxRatesList = document.getElementById("tax-rates-list");
  var addTaxRateButton = document.getElementById("add-tax-rate-button");
  var watermarkEnabled = document.getElementById("watermark-enabled");
  var watermarkFields = document.getElementById("watermark-fields");
  var watermarkTextField = document.getElementById("watermark-text-field");
  var watermarkImageField = document.getElementById("watermark-image-field");
  var watermarkImageInput = document.getElementById("watermark-image");
  var watermarkImagePreview = document.getElementById("watermark-image-preview");
  var watermarkOpacity = document.getElementById("watermark-opacity");
  var watermarkOpacityValue = document.getElementById("watermark-opacity-value");
  var watermarkSize = document.getElementById("watermark-size");
  var watermarkSizeValue = document.getElementById("watermark-size-value");
  var watermarkPositionX = document.getElementById("watermark-position-x");
  var watermarkPositionXValue = document.getElementById("watermark-position-x-value");
  var watermarkPositionY = document.getElementById("watermark-position-y");
  var watermarkPositionYValue = document.getElementById("watermark-position-y-value");
  var logoSize = document.getElementById("logo-size");
  var logoSizeValue = document.getElementById("logo-size-value");
  var invoiceIdInput = document.getElementById("invoice-id");
  var showNoteCheckbox = document.getElementById("show-note");
  var noteTextField = document.getElementById("note-text-field");
  var panelLinks = document.querySelectorAll("[data-panel-link]");
  var expandAllButton = document.getElementById("expand-all-button");
  var collapseAllButton = document.getElementById("collapse-all-button");

  var rowIdCounter = 0;
  var taxRateIdCounter = 0;
  var currentLogoDataUrl = "";
  var currentWatermarkImageDataUrl = "";

  var REQUIRED_FIELDS = [
    { input: document.getElementById("business-name"), message: "Enter a business name." },
    { input: document.getElementById("customer-name"), message: "Enter a customer name." }
  ];

  /* ---------- accordion panels ---------- */

  function allPanels() {
    return qsa(".panel", form);
  }

  function openPanel(panel) {
    if (panel && "open" in panel) {
      panel.open = true;
    }
  }

  function openPanelContaining(element) {
    var panel = element.closest(".panel");
    openPanel(panel);
  }

  function setUpPanelNavigation() {
    panelLinks.forEach(function (link) {
      link.addEventListener("click", function () {
        var targetId = link.dataset.panelLink;
        var panel = document.getElementById(targetId);
        openPanel(panel);
      });
    });

    if (expandAllButton) {
      expandAllButton.addEventListener("click", function () {
        allPanels().forEach(openPanel);
      });
    }

    if (collapseAllButton) {
      collapseAllButton.addEventListener("click", function () {
        allPanels().forEach(function (panel) {
          panel.open = false;
        });
      });
    }
  }

  /* ---------- tax rates ---------- */

  function buildTaxRateRowMarkup(rateId) {
    return (
      '<div class="rate-row" data-tax-rate-id="' + rateId + '">' +
      '<div class="field rate-row__name">' +
        '<label class="field__label" for="' + rateId + '-label">Name</label>' +
        '<input class="field__input" type="text" id="' + rateId + '-label" data-field="label" placeholder="e.g. County tax">' +
      '</div>' +
      '<div class="field rate-row__rate">' +
        '<label class="field__label" for="' + rateId + '-rate">Rate (%)</label>' +
        '<input class="field__input" type="number" id="' + rateId + '-rate" data-field="rate" min="0" max="100" step="0.01" value="0">' +
      '</div>' +
      '<button type="button" class="data-table__remove rate-row__remove" data-action="remove-tax-rate">' +
        'Remove<span class="visually-hidden"> tax rate</span>' +
      '</button>' +
      "</div>"
    );
  }

  function addTaxRateRow(rateData) {
    taxRateIdCounter += 1;
    var rateId = "rate-" + taxRateIdCounter;
    taxRatesList.insertAdjacentHTML("beforeend", buildTaxRateRowMarkup(rateId));

    var row = taxRatesList.querySelector('[data-tax-rate-id="' + rateId + '"]');
    row.querySelector('[data-field="label"]').value = (rateData && rateData.label) || "";
    row.querySelector('[data-field="rate"]').value = (rateData && rateData.rate != null) ? rateData.rate : 0;

    return rateId;
  }

  function collectTaxRatesFromDom() {
    return qsa(".rate-row", taxRatesList).map(function (row) {
      return {
        id: row.dataset.taxRateId,
        label: row.querySelector('[data-field="label"]').value || "Tax",
        rate: Number(row.querySelector('[data-field="rate"]').value) || 0
      };
    });
  }

  function buildItemTaxOptionsMarkup(selectedId) {
    var rates = collectTaxRatesFromDom();
    var options = '<option value=""' + (selectedId ? "" : " selected") + '>No tax</option>';
    rates.forEach(function (rate) {
      var isSelected = rate.id === selectedId;
      options += '<option value="' + rate.id + '"' + (isSelected ? " selected" : "") + '>' +
        escapeForAttribute(rate.label) + " (" + rate.rate + "%)</option>";
    });
    return options;
  }

  function escapeForAttribute(value) {
    var div = document.createElement("div");
    div.textContent = value == null ? "" : String(value);
    return div.innerHTML;
  }

  function refreshAllItemTaxDropdowns() {
    qsa("tr", itemsBody).forEach(function (row) {
      var select = row.querySelector('[data-field="taxRateId"]');
      var currentValue = select.value;
      select.innerHTML = buildItemTaxOptionsMarkup(currentValue);
    });
  }

  function handleTaxRatesListInput() {
    refreshAllItemTaxDropdowns();
    recalculateAndRender();
  }

  function handleTaxRatesListClick(event) {
    var button = event.target.closest('[data-action="remove-tax-rate"]');
    if (!button) {
      return;
    }
    var row = button.closest(".rate-row");
    row.parentNode.removeChild(row);
    refreshAllItemTaxDropdowns();
    recalculateAndRender();
  }

  /* ---------- item rows ---------- */

  function buildRowMarkup(rowId, taxRateId) {
    return (
      '<tr data-row-id="' + rowId + '">' +
      '<td>' +
        '<label class="data-table__field-label" for="item-' + rowId + '-type">Type</label>' +
        '<select class="field__select" id="item-' + rowId + '-type" data-field="type">' +
          '<option>Labor</option><option>Materials</option><option>Service fee</option>' +
          '<option>Delivery fee</option><option>Deposit</option><option>Custom</option>' +
        '</select>' +
      '</td>' +
      '<td>' +
        '<label class="data-table__field-label" for="item-' + rowId + '-description">Description</label>' +
        '<input class="field__input" type="text" id="item-' + rowId + '-description" data-field="description" placeholder="Install sink and repair line">' +
      '</td>' +
      '<td class="is-numeric">' +
        '<label class="data-table__field-label" for="item-' + rowId + '-quantity">Qty</label>' +
        '<input class="field__input field__input--qty" type="number" id="item-' + rowId + '-quantity" data-field="quantity" min="0" step="1" value="1">' +
      '</td>' +
      '<td class="is-numeric">' +
        '<label class="data-table__field-label" for="item-' + rowId + '-rate">Rate</label>' +
        '<input class="field__input field__input--rate" type="number" id="item-' + rowId + '-rate" data-field="rate" min="0" step="0.01" value="0">' +
      '</td>' +
      '<td>' +
        '<label class="data-table__field-label" for="item-' + rowId + '-unit">Per</label>' +
        '<select class="field__select" id="item-' + rowId + '-unit" data-field="unit">' +
          '<option value="item" selected>Item</option>' +
          '<option value="hour">Hour</option>' +
          '<option value="day">Day</option>' +
          '<option value="week">Week</option>' +
          '<option value="sqft">Sq ft</option>' +
          '<option value="flat">Flat fee</option>' +
        '</select>' +
      '</td>' +
      '<td class="is-numeric">' +
        '<label class="data-table__field-label" for="item-' + rowId + '-tax">Tax</label>' +
        '<select class="field__select" id="item-' + rowId + '-tax" data-field="taxRateId">' + buildItemTaxOptionsMarkup(taxRateId) + '</select>' +
      '</td>' +
      '<td class="is-numeric">' +
        '<span class="data-table__field-label">Total</span>' +
        '<span data-field="lineTotal">$0.00</span>' +
      '</td>' +
      '<td>' +
        '<button type="button" class="data-table__remove" data-action="remove-row">' +
          'Remove<span class="visually-hidden"> row ' + rowId + '</span>' +
        '</button>' +
      '</td>' +
      "</tr>"
    );
  }

  function resolveTaxRateIdForItem(itemData) {
    if (!itemData) {
      return "";
    }
    if (itemData.taxRateId) {
      var stillExists = collectTaxRatesFromDom().some(function (rate) {
        return rate.id === itemData.taxRateId;
      });
      return stillExists ? itemData.taxRateId : "";
    }
    if (itemData.taxable) {
      var firstRate = collectTaxRatesFromDom()[0];
      return firstRate ? firstRate.id : "";
    }
    return "";
  }

  function addRow(itemData) {
    rowIdCounter += 1;
    var taxRateId = resolveTaxRateIdForItem(itemData);
    itemsBody.insertAdjacentHTML("beforeend", buildRowMarkup(rowIdCounter, taxRateId));

    if (itemData) {
      var row = itemsBody.querySelector('[data-row-id="' + rowIdCounter + '"]');
      row.querySelector('[data-field="type"]').value = itemData.type || "Labor";
      row.querySelector('[data-field="description"]').value = itemData.description || "";
      row.querySelector('[data-field="quantity"]').value = itemData.quantity != null ? itemData.quantity : 1;
      row.querySelector('[data-field="rate"]').value = itemData.rate != null ? itemData.rate : 0;
      row.querySelector('[data-field="unit"]').value = itemData.unit || "item";
    }

    return rowIdCounter;
  }

  function collectItemsFromDom() {
    return qsa("tr", itemsBody).map(function (row) {
      return {
        type: row.querySelector('[data-field="type"]').value,
        description: row.querySelector('[data-field="description"]').value,
        quantity: Number(row.querySelector('[data-field="quantity"]').value) || 0,
        rate: Number(row.querySelector('[data-field="rate"]').value) || 0,
        unit: row.querySelector('[data-field="unit"]').value,
        taxRateId: row.querySelector('[data-field="taxRateId"]').value
      };
    });
  }

  function updateLineTotalsInDom() {
    qsa("tr", itemsBody).forEach(function (row) {
      var quantity = Number(row.querySelector('[data-field="quantity"]').value) || 0;
      var rate = Number(row.querySelector('[data-field="rate"]').value) || 0;
      row.querySelector('[data-field="lineTotal"]').textContent = InvoiceApp.formatCurrency(quantity * rate);
    });
  }

  /* ---------- invoice assembly ---------- */

  function buildInvoiceFromForm() {
    var invoice = InvoiceApp.createEmptyInvoice();
    invoice.id = invoiceIdInput.value || "";
    invoice.invoiceNumber = qs("#invoice-number").value || invoice.invoiceNumber;
    invoice.invoiceDate = qs("#invoice-date").value || invoice.invoiceDate;
    invoice.dueDate = qs("#due-date").value || "";
    invoice.business.name = qs("#business-name").value;
    invoice.business.email = qs("#business-email").value;
    invoice.business.logoDataUrl = currentLogoDataUrl;
    invoice.customer.name = qs("#customer-name").value;
    invoice.customer.email = qs("#customer-email").value;
    invoice.taxRates = collectTaxRatesFromDom();
    invoice.items = collectItemsFromDom();
    invoice.adjustments = {
      discount: qs("#discount").value,
      fee: qs("#fee").value,
      amountPaid: qs("#amount-paid").value
    };
    var checkedDesign = form.querySelector('input[name="designStyle"]:checked');
    invoice.designStyle = checkedDesign ? checkedDesign.value : "simple";

    var checkedLogoPosition = form.querySelector('input[name="logoPosition"]:checked');
    var checkedLogoShape = form.querySelector('input[name="logoShape"]:checked');
    var checkedLogoNameDisplay = form.querySelector('input[name="logoNameDisplay"]:checked');
    var checkedSpacing = form.querySelector('input[name="spacing"]:checked');
    invoice.format = {
      showLogo: qs("#show-logo").checked,
      showBusinessEmail: qs("#show-business-email").checked,
      showCustomerEmail: qs("#show-customer-email").checked,
      showItemDescriptions: qs("#show-item-descriptions").checked,
      showDividerAfterHeader: qs("#show-divider-header").checked,
      showDividerBeforeTotals: qs("#show-divider-totals").checked,
      showNote: qs("#show-note").checked,
      noteText: qs("#note-text").value || "",
      logoPosition: checkedLogoPosition ? checkedLogoPosition.value : "top-right",
      logoShape: checkedLogoShape ? checkedLogoShape.value : "ellipse",
      logoNameDisplay: checkedLogoNameDisplay ? checkedLogoNameDisplay.value : "inside",
      logoSize: logoSize.value,
      spacing: checkedSpacing ? checkedSpacing.value : "normal",
      watermarkEnabled: watermarkEnabled.checked,
      watermarkType: (form.querySelector('input[name="watermarkType"]:checked') || {}).value || "text",
      watermarkText: qs("#watermark-text").value || "SAMPLE",
      watermarkImageDataUrl: currentWatermarkImageDataUrl,
      watermarkOpacity: watermarkOpacity.value,
      watermarkSize: watermarkSize.value,
      watermarkPositionX: watermarkPositionX.value,
      watermarkPositionY: watermarkPositionY.value
    };

    return invoice;
  }

  function recalculateAndRender() {
    updateLineTotalsInDom();
    emptyHint.hidden = itemsBody.children.length > 0;

    var invoice = buildInvoiceFromForm();
    InvoiceApp.applyInvoiceStyleClass(invoicePreview, invoice.designStyle, invoice.format.spacing);
    invoicePreview.innerHTML = InvoiceApp.renderInvoiceMarkup(invoice);

    if (invoice.items.length) {
      var totals = InvoiceApp.calculateTotals(invoice);
      amountDueLive.textContent = "Amount due updated: " + InvoiceApp.formatCurrency(totals.amountDue);
    } else {
      amountDueLive.textContent = "";
    }
  }

  /* ---------- templates ---------- */

  function renderTemplatePicker() {
    var markup = InvoiceApp.templates.map(function (template) {
      var bullets = ["Customer info", "Invoice rows", "Print copy"].map(function (bullet) {
        return '<li><span class="icon-dot icon-dot--' + template.colorClass + '" aria-hidden="true"></span> ' + bullet + "</li>";
      }).join("");

      return (
        '<div class="template-sample">' +
        '<div class="template-sample__icon template-sample__icon--' + template.colorClass + '" aria-hidden="true">' + template.icon + '</div>' +
        '<h3 class="template-sample__title">' + template.label + '</h3>' +
        '<p class="template-sample__desc">' + template.description + '</p>' +
        '<ul class="template-sample__list">' + bullets + '</ul>' +
        '<button type="button" class="button button--ghost button--small button--full template-sample__button" data-template-id="' + template.id + '">Use this template</button>' +
        '</div>'
      );
    }).join("");

    templatePicker.innerHTML = markup;

    qsa(".template-sample__button", templatePicker).forEach(function (button) {
      button.addEventListener("click", function () {
        loadTemplate(button.dataset.templateId);
      });
    });
  }

  function loadTemplate(templateId) {
    var template = InvoiceApp.templates.filter(function (item) {
      return item.id === templateId;
    })[0];

    if (!template) {
      return;
    }

    itemsBody.innerHTML = "";
    template.items.forEach(function (item) {
      addRow(item);
    });
    recalculateAndRender();
    openPanel(document.getElementById("section-items"));

    var firstInput = itemsBody.querySelector("select, input");
    if (firstInput) {
      firstInput.focus();
    }
  }

  /* ---------- logo ---------- */

  function handleLogoChange() {
    var file = logoInput.files && logoInput.files[0];
    if (!file) {
      return;
    }

    var reader = new FileReader();
    reader.onload = function () {
      currentLogoDataUrl = String(reader.result);
      logoPreview.innerHTML = '<img src="' + currentLogoDataUrl + '" alt="Business logo preview">';
      recalculateAndRender();
    };
    reader.readAsDataURL(file);
  }

  /* ---------- watermark ---------- */

  function handleWatermarkToggle() {
    watermarkFields.hidden = !watermarkEnabled.checked;
    recalculateAndRender();
  }

  function handleShowLogoToggle() {
    logoFormatFields.hidden = !showLogoCheckbox.checked;
    recalculateAndRender();
  }

  function handleShowNoteToggle() {
    noteTextField.hidden = !showNoteCheckbox.checked;
    recalculateAndRender();
  }

  function handleWatermarkOpacityInput() {
    watermarkOpacityValue.textContent = watermarkOpacity.value + "%";
  }

  function handleWatermarkSizeInput() {
    watermarkSizeValue.textContent = watermarkSize.value + "%";
  }

  function positionLabel(value, lowerLabel, higherLabel) {
    var position = Number(value);
    if (position === 50) {
      return "Centered";
    }
    var distance = Math.abs(position - 50);
    return distance + "% " + (position < 50 ? lowerLabel : higherLabel);
  }

  function handleWatermarkPositionXInput() {
    watermarkPositionXValue.textContent = positionLabel(watermarkPositionX.value, "left", "right");
  }

  function handleWatermarkPositionYInput() {
    watermarkPositionYValue.textContent = positionLabel(watermarkPositionY.value, "up", "down");
  }

  function handleLogoSizeInput() {
    logoSizeValue.textContent = logoSize.value + "%";
  }

  function handleWatermarkTypeChange() {
    var checkedType = (form.querySelector('input[name="watermarkType"]:checked') || {}).value || "text";
    watermarkTextField.hidden = checkedType !== "text";
    watermarkImageField.hidden = checkedType !== "image";
    recalculateAndRender();
  }

  function handleWatermarkImageChange() {
    var file = watermarkImageInput.files && watermarkImageInput.files[0];
    if (!file) {
      return;
    }

    var reader = new FileReader();
    reader.onload = function () {
      currentWatermarkImageDataUrl = String(reader.result);
      watermarkImagePreview.innerHTML = '<img src="' + currentWatermarkImageDataUrl + '" alt="Watermark image preview">';
      recalculateAndRender();
    };
    reader.readAsDataURL(file);
  }

  function handleItemsBodyClick(event) {
    var button = event.target.closest('[data-action="remove-row"]');
    if (!button) {
      return;
    }
    var row = button.closest("tr");
    row.parentNode.removeChild(row);
    recalculateAndRender();
  }

  /* ---------- status and validation ---------- */

  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.classList.remove("builder-status--success", "builder-status--error");
    statusMessage.classList.add("is-visible", "builder-status--" + type);
  }

  function hideStatus() {
    statusMessage.textContent = "";
    statusMessage.classList.remove("is-visible", "builder-status--success", "builder-status--error");
  }

  function setFieldError(fieldInput) {
    var wrapper = fieldInput.closest(".field");
    wrapper.classList.add("has-error");
    fieldInput.setAttribute("aria-invalid", "true");
    openPanelContaining(fieldInput);
  }

  function clearFieldError(fieldInput) {
    var wrapper = fieldInput.closest(".field");
    wrapper.classList.remove("has-error");
    fieldInput.setAttribute("aria-invalid", "false");
  }

  function validateRequiredFields() {
    var firstInvalidInput = null;

    REQUIRED_FIELDS.forEach(function (field) {
      var hasValue = field.input.value.trim().length > 0;
      if (hasValue) {
        clearFieldError(field.input);
      } else {
        setFieldError(field.input);
        firstInvalidInput = firstInvalidInput || field.input;
      }
    });

    return firstInvalidInput;
  }

  function handleFormSubmit(event) {
    event.preventDefault();

    var firstInvalidInput = validateRequiredFields();
    if (firstInvalidInput) {
      firstInvalidInput.focus();
      showStatus("Fix the highlighted field before saving.", "error");
      return;
    }

    var invoice = buildInvoiceFromForm();

    if (!invoice.items.length) {
      openPanel(document.getElementById("section-items"));
      showStatus("Add at least one item before saving the invoice.", "error");
      return;
    }

    var savedRecord = InvoiceApp.saveToHistory(invoice);
    if (savedRecord) {
      invoiceIdInput.value = savedRecord.id;
      InvoiceApp.saveDraft(savedRecord);
      showStatus("Invoice saved to your history. Opening print preview\u2026", "success");
      window.location.href = "print-preview.html?id=" + encodeURIComponent(savedRecord.id);
      return;
    }

    InvoiceApp.saveDraft(invoice);
    showStatus("Your browser blocked local saving, but the print preview will still work for this session.", "error");
    window.location.href = "print-preview.html";
  }

  function handleFormReset() {
    window.setTimeout(function () {
      invoiceIdInput.value = "";
      qs("#invoice-number").value = InvoiceApp.generateInvoiceNumber();
      qs("#invoice-date").value = InvoiceApp.todayIsoDate();
      qs("#due-date").value = "";
      qs("#note-text").value = "Thank you for your business.";
      noteTextField.hidden = false;
      itemsBody.innerHTML = "";
      taxRatesList.innerHTML = "";
      addTaxRateRow({ label: "Sales tax", rate: 9.5 });
      currentLogoDataUrl = "";
      logoPreview.innerHTML = '<span class="visually-hidden">No logo selected</span>';
      logoFormatFields.hidden = false;
      currentWatermarkImageDataUrl = "";
      watermarkImagePreview.innerHTML = '<span class="visually-hidden">No watermark image selected</span>';
      watermarkTextField.hidden = false;
      watermarkImageField.hidden = true;
      watermarkFields.hidden = true;
      handleWatermarkOpacityInput();
      handleWatermarkSizeInput();
      watermarkPositionX.value = 50;
      watermarkPositionY.value = 50;
      handleWatermarkPositionXInput();
      handleWatermarkPositionYInput();
      logoSize.value = 100;
      handleLogoSizeInput();
      hideStatus();
      REQUIRED_FIELDS.forEach(function (field) {
        clearFieldError(field.input);
      });
      recalculateAndRender();
    }, 0);
  }

  /* ---------- invoice persistence ---------- */

  function applyInvoiceToForm(invoice) {
    invoiceIdInput.value = invoice.id || "";
    qs("#invoice-number").value = invoice.invoiceNumber || InvoiceApp.generateInvoiceNumber();
    qs("#invoice-date").value = invoice.invoiceDate || InvoiceApp.todayIsoDate();
    qs("#due-date").value = invoice.dueDate || "";
    qs("#business-name").value = invoice.business.name || "";
    qs("#business-email").value = invoice.business.email || "";
    qs("#customer-name").value = invoice.customer.name || "";
    qs("#customer-email").value = invoice.customer.email || "";
    qs("#discount").value = invoice.adjustments.discount;
    qs("#fee").value = invoice.adjustments.fee;
    qs("#amount-paid").value = invoice.adjustments.amountPaid;

    taxRateIdCounter = 0;
    taxRatesList.innerHTML = "";
    var idMap = {};
    (invoice.taxRates && invoice.taxRates.length ? invoice.taxRates : [{ label: "Sales tax", rate: 9.5 }]).forEach(function (rate) {
      var oldId = rate.id;
      var newId = addTaxRateRow(rate);
      if (oldId) {
        idMap[oldId] = newId;
      }
    });

    var savedDesign = invoice.designStyle || "simple";
    var radioToCheck = form.querySelector('input[name="designStyle"][value="' + savedDesign + '"]');
    if (radioToCheck) {
      radioToCheck.checked = true;
    }

    var format = invoice.format || {};
    qs("#show-logo").checked = format.showLogo !== false;
    logoFormatFields.hidden = !qs("#show-logo").checked;
    qs("#show-business-email").checked = format.showBusinessEmail !== false;
    qs("#show-customer-email").checked = format.showCustomerEmail !== false;
    qs("#show-item-descriptions").checked = format.showItemDescriptions !== false;
    qs("#show-divider-header").checked = format.showDividerAfterHeader !== false;
    qs("#show-divider-totals").checked = format.showDividerBeforeTotals !== false;
    qs("#show-note").checked = format.showNote !== false;
    qs("#note-text").value = format.noteText != null ? format.noteText : "Thank you for your business.";
    noteTextField.hidden = !qs("#show-note").checked;

    var savedLogoPosition = format.logoPosition || "top-right";
    var logoPositionRadio = form.querySelector('input[name="logoPosition"][value="' + savedLogoPosition + '"]');
    if (logoPositionRadio) {
      logoPositionRadio.checked = true;
    }

    var savedLogoShape = format.logoShape || "ellipse";
    var logoShapeRadio = form.querySelector('input[name="logoShape"][value="' + savedLogoShape + '"]');
    if (logoShapeRadio) {
      logoShapeRadio.checked = true;
    }

    var savedLogoNameDisplay = format.logoNameDisplay || "inside";
    var logoNameDisplayRadio = form.querySelector('input[name="logoNameDisplay"][value="' + savedLogoNameDisplay + '"]');
    if (logoNameDisplayRadio) {
      logoNameDisplayRadio.checked = true;
    }

    logoSize.value = format.logoSize || 100;
    handleLogoSizeInput();

    var savedSpacing = format.spacing || "normal";
    var spacingRadio = form.querySelector('input[name="spacing"][value="' + savedSpacing + '"]');
    if (spacingRadio) {
      spacingRadio.checked = true;
    }

    watermarkEnabled.checked = Boolean(format.watermarkEnabled);
    watermarkFields.hidden = !watermarkEnabled.checked;
    qs("#watermark-text").value = format.watermarkText || "SAMPLE";
    watermarkOpacity.value = format.watermarkOpacity || 8;
    handleWatermarkOpacityInput();
    watermarkSize.value = format.watermarkSize || 135;
    handleWatermarkSizeInput();
    watermarkPositionX.value = format.watermarkPositionX != null ? format.watermarkPositionX : 50;
    watermarkPositionY.value = format.watermarkPositionY != null ? format.watermarkPositionY : 50;
    handleWatermarkPositionXInput();
    handleWatermarkPositionYInput();

    var savedWatermarkType = format.watermarkType || "text";
    var watermarkTypeRadio = form.querySelector('input[name="watermarkType"][value="' + savedWatermarkType + '"]');
    if (watermarkTypeRadio) {
      watermarkTypeRadio.checked = true;
    }
    watermarkTextField.hidden = savedWatermarkType !== "text";
    watermarkImageField.hidden = savedWatermarkType !== "image";

    if (format.watermarkImageDataUrl) {
      currentWatermarkImageDataUrl = format.watermarkImageDataUrl;
      watermarkImagePreview.innerHTML = '<img src="' + currentWatermarkImageDataUrl + '" alt="Watermark image preview">';
    }

    if (invoice.business.logoDataUrl) {
      currentLogoDataUrl = invoice.business.logoDataUrl;
      logoPreview.innerHTML = '<img src="' + currentLogoDataUrl + '" alt="Business logo preview">';
    }

    invoice.items.forEach(function (item) {
      var mappedItem = Object.assign({}, item);
      if (item.taxRateId && idMap[item.taxRateId]) {
        mappedItem.taxRateId = idMap[item.taxRateId];
      }
      addRow(mappedItem);
    });

    if (invoice.customer.name) {
      openPanel(document.getElementById("section-customer"));
    }
    if (invoice.items.length) {
      openPanel(document.getElementById("section-items"));
    }
  }

  function loadExistingDraft() {
    var draft = InvoiceApp.loadDraft();
    if (!draft) {
      qs("#invoice-number").value = InvoiceApp.generateInvoiceNumber();
      qs("#invoice-date").value = InvoiceApp.todayIsoDate();
      return;
    }
    applyInvoiceToForm(draft);
  }

  function getRequestedInvoiceId() {
    var params = new URLSearchParams(window.location.search);
    return params.get("id");
  }

  function loadRequestedHistoryInvoiceIfPresent() {
    var requestedId = getRequestedInvoiceId();
    if (!requestedId) {
      return false;
    }
    var historyInvoice = InvoiceApp.getHistoryById(requestedId);
    if (!historyInvoice) {
      qs("#invoice-number").value = InvoiceApp.generateInvoiceNumber();
      qs("#invoice-date").value = InvoiceApp.todayIsoDate();
      showStatus("That saved invoice could not be found. Starting a new one.", "error");
      return true;
    }
    applyInvoiceToForm(historyInvoice);
    showStatus("Loaded \u201c" + (historyInvoice.invoiceNumber || "this invoice") + "\u201d from your saved invoices.", "success");
    return true;
  }

  function loadTemplateFromUrlIfPresent() {
    var params = new URLSearchParams(window.location.search);
    var requestedTemplate = params.get("template");
    if (requestedTemplate) {
      loadTemplate(requestedTemplate);
    }
  }

  /* ---------- init ---------- */

  function init() {
    renderTemplatePicker();
    addTaxRateRow({ label: "Sales tax", rate: 9.5 });
    if (!loadRequestedHistoryInvoiceIfPresent()) {
      loadExistingDraft();
    }
    recalculateAndRender();
    loadTemplateFromUrlIfPresent();

    addItemButton.addEventListener("click", function () {
      addRow(null);
      recalculateAndRender();
      var newRow = itemsBody.lastElementChild;
      newRow.querySelector("select").focus();
    });

    itemsBody.addEventListener("input", recalculateAndRender);
    itemsBody.addEventListener("change", recalculateAndRender);
    itemsBody.addEventListener("click", handleItemsBodyClick);

    addTaxRateButton.addEventListener("click", function () {
      addTaxRateRow(null);
      refreshAllItemTaxDropdowns();
      recalculateAndRender();
      var newRow = taxRatesList.lastElementChild;
      newRow.querySelector('[data-field="label"]').focus();
    });

    taxRatesList.addEventListener("input", handleTaxRatesListInput);
    taxRatesList.addEventListener("click", handleTaxRatesListClick);

    form.addEventListener("input", function (event) {
      if (!itemsBody.contains(event.target) && !taxRatesList.contains(event.target)) {
        recalculateAndRender();
      }
    });

    form.addEventListener("change", function (event) {
      if (!itemsBody.contains(event.target) && !taxRatesList.contains(event.target)) {
        recalculateAndRender();
      }
    });

    logoInput.addEventListener("change", handleLogoChange);
    form.addEventListener("submit", handleFormSubmit);
    form.addEventListener("reset", handleFormReset);

    watermarkEnabled.addEventListener("change", handleWatermarkToggle);
    showLogoCheckbox.addEventListener("change", handleShowLogoToggle);
    showNoteCheckbox.addEventListener("change", handleShowNoteToggle);
    setUpPanelNavigation();
    watermarkOpacity.addEventListener("input", handleWatermarkOpacityInput);
    watermarkSize.addEventListener("input", handleWatermarkSizeInput);
    watermarkPositionX.addEventListener("input", handleWatermarkPositionXInput);
    watermarkPositionY.addEventListener("input", handleWatermarkPositionYInput);
    logoSize.addEventListener("input", handleLogoSizeInput);
    qsa('input[name="watermarkType"]', form).forEach(function (radio) {
      radio.addEventListener("change", handleWatermarkTypeChange);
    });
    watermarkImageInput.addEventListener("change", handleWatermarkImageChange);

    REQUIRED_FIELDS.forEach(function (field) {
      field.input.addEventListener("input", function () {
        if (field.input.value.trim().length > 0) {
          clearFieldError(field.input);
        }
      });
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();