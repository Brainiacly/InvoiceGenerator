var InvoiceApp = window.InvoiceApp || {};

InvoiceApp.STORAGE_KEY = "invoiceGeneratorDraft";
InvoiceApp.HISTORY_KEY = "invoiceGeneratorHistory";
InvoiceApp.ACCOUNTS_KEY = "invoiceGeneratorAccounts";
InvoiceApp.SESSION_KEY = "invoiceGeneratorSession";

InvoiceApp.formatCurrency = function (amount) {
  var safeAmount = Number.isFinite(amount) ? amount : 0;
  return "$" + safeAmount.toFixed(2);
};

// starter templates that fill the item table with example rows
InvoiceApp.templates = [
  {
    id: "kitchen-repair",
    label: "Kitchen repair",
    description: "Labor, parts, and tax on one invoice.",
    icon: "\ud83d\udd27",
    colorClass: "primary",
    items: [
      { type: "Labor", description: "Install sink and repair line", quantity: 3, rate: 75, taxable: false },
      { type: "Materials", description: "PVC pipe, valve, seal kit", quantity: 1, rate: 118, taxable: true },
      { type: "Service fee", description: "Trip and setup", quantity: 1, rate: 35, taxable: false }
    ]
  },
  {
    id: "weekly-service",
    label: "Weekly service",
    description: "A recurring cleaning or maintenance visit.",
    icon: "\ud83e\uddf9",
    colorClass: "teal",
    items: [
      { type: "Service", description: "Weekly cleaning visit", quantity: 1, rate: 85, taxable: false },
      { type: "Materials", description: "Cleaning supplies", quantity: 1, rate: 12, taxable: true }
    ]
  },
  {
    id: "landscape-work",
    label: "Landscape work",
    description: "Materials and a flat service fee.",
    icon: "\ud83c\udf3f",
    colorClass: "purple",
    items: [
      { type: "Labor", description: "Lawn care and trim", quantity: 2, rate: 45, taxable: false },
      { type: "Materials", description: "Mulch and soil", quantity: 1, rate: 60, taxable: true },
      { type: "Service fee", description: "Debris hauling", quantity: 1, rate: 25, taxable: false }
    ]
  },
  {
    id: "custom-invoice",
    label: "Custom invoice",
    description: "Start from one blank line and build it your way.",
    icon: "\ud83d\udcdd",
    colorClass: "green",
    items: [
      { type: "Labor", description: "", quantity: 1, rate: 0, taxable: false }
    ]
  }
];

InvoiceApp.VALID_DESIGN_STYLES = ["simple", "modern", "professional"];
InvoiceApp.VALID_LOGO_POSITIONS = ["top-left", "top-right", "bottom-left", "bottom-right"];
InvoiceApp.VALID_LOGO_SHAPES = ["square", "rounded", "circle", "ellipse"];
InvoiceApp.VALID_LOGO_NAME_DISPLAY = ["inside", "beside", "hidden"];
InvoiceApp.VALID_SPACING = ["compact", "normal", "spacious"];

InvoiceApp.generateInvoiceNumber = function () {
  var randomDigits = Math.floor(1000 + Math.random() * 9000);
  return "INV-" + randomDigits;
};

InvoiceApp.generateId = function () {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return "inv-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
};

InvoiceApp.todayIsoDate = function () {
  var now = new Date();
  var month = String(now.getMonth() + 1).padStart(2, "0");
  var day = String(now.getDate()).padStart(2, "0");
  return now.getFullYear() + "-" + month + "-" + day;
};

InvoiceApp.getSession = function () {
  try {
    var raw = window.localStorage.getItem(InvoiceApp.SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
};

InvoiceApp.setSession = function (session) {
  try {
    window.localStorage.setItem(InvoiceApp.SESSION_KEY, JSON.stringify(session));
    return true;
  } catch (error) {
    return false;
  }
};

InvoiceApp.clearSession = function () {
  try {
    window.localStorage.removeItem(InvoiceApp.SESSION_KEY);
    return true;
  } catch (error) {
    return false;
  }
};

InvoiceApp.listAccounts = function () {
  try {
    var raw = window.localStorage.getItem(InvoiceApp.ACCOUNTS_KEY);
    var parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

InvoiceApp.findAccountByEmail = function (email) {
  var normalized = String(email || "").trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  var match = InvoiceApp.listAccounts().filter(function (account) {
    return String(account.email || "").toLowerCase() === normalized;
  })[0];
  return match || null;
};

InvoiceApp.createAccount = function (accountDetails) {
  try {
    var accounts = InvoiceApp.listAccounts();
    var account = {
      id: InvoiceApp.generateId(),
      email: String(accountDetails.email || "").trim(),
      passwordHash: accountDetails.passwordHash,
      passwordSalt: accountDetails.passwordSalt,
      createdAt: new Date().toISOString()
    };
    accounts.push(account);
    window.localStorage.setItem(InvoiceApp.ACCOUNTS_KEY, JSON.stringify(accounts));
    return account;
  } catch (error) {
    return null;
  }
};

InvoiceApp.getStorageKeyForCurrentUser = function (baseKey) {
  var session = InvoiceApp.getSession();
  return session && session.accountId ? baseKey + ":" + session.accountId : baseKey;
};

InvoiceApp.migrateGuestDataToAccount = function (accountId) {
  try {
    var namespacedHistoryKey = InvoiceApp.HISTORY_KEY + ":" + accountId;
    var namespacedDraftKey = InvoiceApp.STORAGE_KEY + ":" + accountId;

    var guestHistoryRaw = window.localStorage.getItem(InvoiceApp.HISTORY_KEY);
    if (guestHistoryRaw && !window.localStorage.getItem(namespacedHistoryKey)) {
      window.localStorage.setItem(namespacedHistoryKey, guestHistoryRaw);
      window.localStorage.removeItem(InvoiceApp.HISTORY_KEY);
    }

    var guestDraftRaw = window.localStorage.getItem(InvoiceApp.STORAGE_KEY);
    if (guestDraftRaw && !window.localStorage.getItem(namespacedDraftKey)) {
      window.localStorage.setItem(namespacedDraftKey, guestDraftRaw);
      window.localStorage.removeItem(InvoiceApp.STORAGE_KEY);
    }
    return true;
  } catch (error) {
    return false;
  }
};

InvoiceApp.createEmptyInvoice = function () {
  return {
    id: "",
    invoiceNumber: InvoiceApp.generateInvoiceNumber(),
    invoiceDate: InvoiceApp.todayIsoDate(),
    dueDate: "",
    business: { name: "", email: "", logoDataUrl: "" },
    customer: { name: "", email: "" },
    items: [],
    taxRates: [
      { id: "rate-1", label: "Sales tax", rate: 9.5 }
    ],
    adjustments: { discount: 0, fee: 0, amountPaid: 0 },
    designStyle: "simple",
    format: {
      showLogo: true,
      showBusinessEmail: true,
      showCustomerEmail: true,
      showItemDescriptions: true,
      showDividerAfterHeader: true,
      showDividerBeforeTotals: true,
      showNote: true,
      noteText: "Thank you for your business.",
      logoPosition: "top-right",
      logoShape: "ellipse",
      logoNameDisplay: "inside",
      logoSize: 100,
      spacing: "normal",
      watermarkEnabled: false,
      watermarkType: "text",
      watermarkText: "SAMPLE",
      watermarkImageDataUrl: "",
      watermarkOpacity: 8,
      watermarkSize: 135,
      watermarkPositionX: 50,
      watermarkPositionY: 50
    }
  };
};

InvoiceApp.applyInvoiceStyleClass = function (element, styleName, spacing) {
  var safeStyle = InvoiceApp.VALID_DESIGN_STYLES.indexOf(styleName) !== -1 ? styleName : "simple";
  var safeSpacing = InvoiceApp.VALID_SPACING.indexOf(spacing) !== -1 ? spacing : "normal";
  element.className = "invoice invoice--" + safeStyle + " invoice--spacing-" + safeSpacing;
};

// totals are built by bucketing each item's line total under its assigned tax rate
InvoiceApp.calculateTotals = function (invoice) {
  var subtotal = 0;
  var bucketsById = {};
  var bucketOrder = [];

  invoice.items.forEach(function (item) {
    var lineTotal = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
    subtotal += lineTotal;

    if (!item.taxRateId) {
      return;
    }

    var taxRate = invoice.taxRates.filter(function (rate) {
      return rate.id === item.taxRateId;
    })[0];

    if (!taxRate) {
      return;
    }

    if (!bucketsById[taxRate.id]) {
      bucketsById[taxRate.id] = {
        id: taxRate.id,
        label: taxRate.label || "Tax",
        rate: Number(taxRate.rate) || 0,
        taxableAmount: 0
      };
      bucketOrder.push(taxRate.id);
    }
    bucketsById[taxRate.id].taxableAmount += lineTotal;
  });

  var taxLines = bucketOrder.map(function (id) {
    var bucket = bucketsById[id];
    var amount = bucket.taxableAmount * (bucket.rate / 100);
    return {
      label: bucket.label,
      rate: bucket.rate,
      taxableAmount: bucket.taxableAmount,
      amount: amount
    };
  });

  var totalTax = taxLines.reduce(function (sum, line) {
    return sum + line.amount;
  }, 0);

  var discount = Number(invoice.adjustments.discount) || 0;
  var fee = Number(invoice.adjustments.fee) || 0;
  var amountPaid = Number(invoice.adjustments.amountPaid) || 0;
  var amountDue = subtotal - discount + totalTax + fee - amountPaid;

  return {
    subtotal: subtotal,
    taxLines: taxLines,
    totalTax: totalTax,
    discount: discount,
    fee: fee,
    amountPaid: amountPaid,
    amountDue: amountDue
  };
};

InvoiceApp.saveDraft = function (invoice) {
  try {
    var key = InvoiceApp.getStorageKeyForCurrentUser(InvoiceApp.STORAGE_KEY);
    window.localStorage.setItem(key, JSON.stringify(invoice));
    return true;
  } catch (error) {
    return false;
  }
};

InvoiceApp.loadDraft = function () {
  try {
    var key = InvoiceApp.getStorageKeyForCurrentUser(InvoiceApp.STORAGE_KEY);
    var raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    var parsed = JSON.parse(raw);
    var withDefaults = InvoiceApp.createEmptyInvoice();
    withDefaults.id = parsed.id || withDefaults.id;
    withDefaults.invoiceNumber = parsed.invoiceNumber || withDefaults.invoiceNumber;
    withDefaults.invoiceDate = parsed.invoiceDate || withDefaults.invoiceDate;
    withDefaults.dueDate = parsed.dueDate || withDefaults.dueDate;
    withDefaults.business = Object.assign(withDefaults.business, parsed.business);
    withDefaults.customer = Object.assign(withDefaults.customer, parsed.customer);
    withDefaults.items = parsed.items || [];
    withDefaults.taxRates = (parsed.taxRates && parsed.taxRates.length) ? parsed.taxRates : withDefaults.taxRates;
    withDefaults.adjustments = Object.assign(withDefaults.adjustments, parsed.adjustments);
    withDefaults.designStyle = parsed.designStyle || withDefaults.designStyle;
    withDefaults.format = Object.assign(withDefaults.format, parsed.format);
    return withDefaults;
  } catch (error) {
    return null;
  }
};

InvoiceApp.listHistory = function () {
  try {
    var key = InvoiceApp.getStorageKeyForCurrentUser(InvoiceApp.HISTORY_KEY);
    var raw = window.localStorage.getItem(key);
    if (!raw) {
      return [];
    }
    var parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

InvoiceApp.getHistoryById = function (id) {
  if (!id) {
    return null;
  }
  var match = InvoiceApp.listHistory().filter(function (entry) {
    return entry.id === id;
  })[0];
  return match || null;
};

InvoiceApp.saveToHistory = function (invoice) {
  try {
    var key = InvoiceApp.getStorageKeyForCurrentUser(InvoiceApp.HISTORY_KEY);
    var entries = InvoiceApp.listHistory();
    var id = invoice.id || InvoiceApp.generateId();
    var record = JSON.parse(JSON.stringify(invoice));
    record.id = id;
    record.savedAt = new Date().toISOString();

    var existingIndex = -1;
    entries.forEach(function (entry, index) {
      if (entry.id === id) {
        existingIndex = index;
      }
    });

    if (existingIndex === -1) {
      entries.unshift(record);
    } else {
      entries[existingIndex] = record;
    }

    window.localStorage.setItem(key, JSON.stringify(entries));
    return record;
  } catch (error) {
    return null;
  }
};

InvoiceApp.deleteFromHistory = function (id) {
  try {
    var key = InvoiceApp.getStorageKeyForCurrentUser(InvoiceApp.HISTORY_KEY);
    var entries = InvoiceApp.listHistory().filter(function (entry) {
      return entry.id !== id;
    });
    window.localStorage.setItem(key, JSON.stringify(entries));
    return true;
  } catch (error) {
    return false;
  }
};

InvoiceApp.duplicateHistoryEntry = function (id) {
  var original = InvoiceApp.getHistoryById(id);
  if (!original) {
    return null;
  }
  var copy = JSON.parse(JSON.stringify(original));
  copy.id = InvoiceApp.generateId();
  copy.invoiceNumber = InvoiceApp.generateInvoiceNumber();
  copy.invoiceDate = InvoiceApp.todayIsoDate();
  return InvoiceApp.saveToHistory(copy);
};

function escapeHtml(value) {
  var div = document.createElement("div");
  div.textContent = value == null ? "" : String(value);
  return div.innerHTML;
}

function clampLogoSize(format) {
  var sizePercent = Number(format.logoSize);
  if (!Number.isFinite(sizePercent)) {
    sizePercent = 100;
  }
  return Math.max(50, Math.min(200, sizePercent));
}

function buildLogoBadgeMarkup(invoice, extraClass) {
  var format = invoice.format;
  var businessName = invoice.business.name || "Your business name";
  var shape = InvoiceApp.VALID_LOGO_SHAPES.indexOf(format.logoShape) !== -1 ? format.logoShape : "ellipse";
  var nameDisplay = InvoiceApp.VALID_LOGO_NAME_DISPLAY.indexOf(format.logoNameDisplay) !== -1 ? format.logoNameDisplay : "inside";
  var sizeScale = clampLogoSize(format) / 100;
  var mark = invoice.business.logoDataUrl
    ? '<img src="' + invoice.business.logoDataUrl + '" alt="' + escapeHtml(businessName) + ' logo">'
    : '<span class="invoice__logo-mark" aria-hidden="true"></span>';
  var classes = "invoice__logo invoice__logo--shape-" + shape + " invoice__logo--name-" + nameDisplay +
    (extraClass ? " " + extraClass : "");
  return (
    '<span class="' + classes + '" style="--logo-scale: ' + sizeScale + ';">' +
    mark +
    '<span class="invoice__logo-text">' + escapeHtml(businessName) + "</span>" +
    "</span>"
  );
}

function clampWatermarkOpacity(format) {
  var opacityPercent = Number(format.watermarkOpacity);
  if (!Number.isFinite(opacityPercent)) {
    opacityPercent = 8;
  }
  return Math.max(2, Math.min(35, opacityPercent));
}

function clampWatermarkSize(format) {
  var sizePercent = Number(format.watermarkSize);
  if (!Number.isFinite(sizePercent)) {
    sizePercent = 100;
  }
  return Math.max(40, Math.min(200, sizePercent));
}

function clampWatermarkPosition(value) {
  var position = Number(value);
  if (!Number.isFinite(position)) {
    position = 50;
  }
  return Math.max(15, Math.min(85, position));
}

function buildWatermarkMarkup(invoice) {
  var format = invoice.format;
  if (!format.watermarkEnabled) {
    return "";
  }
  var opacityPercent = clampWatermarkOpacity(format);
  var sizeScale = clampWatermarkSize(format) / 100;
  var positionX = clampWatermarkPosition(format.watermarkPositionX);
  var positionY = clampWatermarkPosition(format.watermarkPositionY);
  var sizeStyle = "--watermark-scale: " + sizeScale + ";";
  var positionStyle = "--watermark-left: " + positionX + "%; --watermark-top: " + positionY + "%;";
  var opacityStyle = "opacity: " + (opacityPercent / 100) + ";";

  if (format.watermarkType === "image") {
    var watermarkImageSrc = format.watermarkImageDataUrl || invoice.business.logoDataUrl || "assets/logo.png";
    if (!watermarkImageSrc) {
      return "";
    }
    return '<img class="invoice__watermark invoice__watermark--image" src="' + watermarkImageSrc +
      '" alt="" aria-hidden="true" style="' + opacityStyle + sizeStyle + positionStyle + '">';
  }

  if (!format.watermarkText) {
    return "";
  }
  return (
    '<span class="invoice__watermark invoice__watermark--text" aria-hidden="true" style="' + opacityStyle + sizeStyle + positionStyle + '">' +
    escapeHtml(format.watermarkText) +
    "</span>"
  );
}

function formatDisplayDate(isoDate) {
  var parts = String(isoDate).split("-");
  if (parts.length !== 3) {
    return isoDate;
  }
  var date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (isNaN(date.getTime())) {
    return isoDate;
  }
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function findTaxRateLabel(invoice, taxRateId) {
  if (!taxRateId) {
    return "No tax";
  }
  var taxRate = invoice.taxRates.filter(function (rate) {
    return rate.id === taxRateId;
  })[0];
  return taxRate ? taxRate.label : "No tax";
}

var UNIT_SUFFIXES = {
  hour: "/hr",
  day: "/day",
  week: "/wk",
  sqft: "/sq ft",
  flat: " flat"
};

function formatRateWithUnit(rate, unit) {
  var suffix = UNIT_SUFFIXES[unit] || "";
  return InvoiceApp.formatCurrency(rate) + suffix;
}

// shared renderer used by both the live preview and the Print Preview page
InvoiceApp.renderInvoiceMarkup = function (invoice) {
  var format = invoice.format;
  var totals = InvoiceApp.calculateTotals(invoice);
  var businessName = invoice.business.name || "Your business name";
  var customerName = invoice.customer.name || "Customer name";

  var rowsMarkup = invoice.items.length
    ? invoice.items.map(function (item) {
        var lineTotal = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
        var descriptionMarkup = (format.showItemDescriptions && item.description)
          ? "<small>" + escapeHtml(item.description) + "</small>"
          : "";
        return (
          "<tr>" +
          "<td><strong>" + escapeHtml(item.type || "Item") + "</strong>" + descriptionMarkup + "</td>" +
          '<td class="is-numeric">' + (Number(item.quantity) || 0) + "</td>" +
          '<td class="is-numeric">' + formatRateWithUnit(Number(item.rate) || 0, item.unit) + "</td>" +
          '<td class="is-numeric">' + escapeHtml(findTaxRateLabel(invoice, item.taxRateId)) + "</td>" +
          '<td class="is-numeric"><strong>' + InvoiceApp.formatCurrency(lineTotal) + "</strong></td>" +
          "</tr>"
        );
      }).join("")
    : '<tr class="data-table__empty-row"><td colspan="5">No items added yet</td></tr>';

  var metaLines = "<strong>" + escapeHtml(businessName) + "</strong>";
  if (format.showBusinessEmail && invoice.business.email) {
    metaLines += "<span>" + escapeHtml(invoice.business.email) + "</span>";
  }
  metaLines += '<span>Bill to: ' + escapeHtml(customerName) + "</span>";
  if (format.showCustomerEmail && invoice.customer.email) {
    metaLines += "<span>" + escapeHtml(invoice.customer.email) + "</span>";
  }
  if (invoice.invoiceDate) {
    metaLines += "<span>Invoice date: " + escapeHtml(formatDisplayDate(invoice.invoiceDate)) + "</span>";
  }
  if (invoice.dueDate) {
    metaLines += "<span>Due: " + escapeHtml(formatDisplayDate(invoice.dueDate)) + "</span>";
  }

  var totalsRows = '<div class="totals__row"><span>Subtotal</span><span>' + InvoiceApp.formatCurrency(totals.subtotal) + "</span></div>";

  totals.taxLines.forEach(function (line) {
    totalsRows += '<div class="totals__row"><span>' + escapeHtml(line.label) + " (" + line.rate + "%)</span><span>" +
      InvoiceApp.formatCurrency(line.amount) + "</span></div>";
  });

  totalsRows +=
    '<div class="totals__row"><span>Discount</span><span>-' + InvoiceApp.formatCurrency(totals.discount) + "</span></div>" +
    '<div class="totals__row"><span>Fee</span><span>' + InvoiceApp.formatCurrency(totals.fee) + "</span></div>" +
    '<div class="totals__row"><span>Amount paid</span><span>-' + InvoiceApp.formatCurrency(totals.amountPaid) + "</span></div>" +
    '<div class="totals__row totals__row--final"><span>Amount due</span><span>' + InvoiceApp.formatCurrency(totals.amountDue) + "</span></div>";

  var logoPosition = InvoiceApp.VALID_LOGO_POSITIONS.indexOf(format.logoPosition) !== -1
    ? format.logoPosition
    : "top-right";
  var showLogoTopLeft = format.showLogo && logoPosition === "top-left";
  var showLogoTopRight = format.showLogo && logoPosition === "top-right";
  var showLogoBottom = format.showLogo && logoPosition.indexOf("bottom-") === 0;

  var headerStart = (showLogoTopLeft ? buildLogoBadgeMarkup(invoice) : "") + '<h3 class="invoice__title">Invoice</h3>';
  var headerEnd = '<span class="invoice__number">' + escapeHtml(invoice.invoiceNumber) + "</span>" +
    (showLogoTopRight ? buildLogoBadgeMarkup(invoice) : "");

  return (
    buildWatermarkMarkup(invoice) +
    '<div class="invoice__content' + (showLogoBottom ? " invoice__content--reserve-bottom" : "") + '">' +
    '<div class="invoice__header">' +
    '<div class="invoice__header-group">' + headerStart + "</div>" +
    '<div class="invoice__header-group">' + headerEnd + "</div>" +
    "</div>" +
    (format.showDividerAfterHeader ? '<hr class="invoice__rule">' : "") +
    '<div class="invoice__meta">' + metaLines + "</div>" +
    '<div class="invoice__table-scroll"><table class="data-table"><thead><tr>' +
    "<th>Item</th><th class=\"is-numeric\">Qty</th><th class=\"is-numeric\">Rate</th>" +
    "<th class=\"is-numeric\">Tax</th><th class=\"is-numeric\">Total</th>" +
    "</tr></thead><tbody>" + rowsMarkup + "</tbody></table></div>" +
    (format.showDividerBeforeTotals ? '<hr class="invoice__rule">' : "") +
    '<div class="totals">' + totalsRows + "</div>" +
    (format.showNote && format.noteText ? '<p class="invoice__note">' + escapeHtml(format.noteText) + "</p>" : "") +
    (showLogoBottom ? buildLogoBadgeMarkup(invoice, "invoice__logo--" + logoPosition) : "") +
    "</div>"
  );
};

window.InvoiceApp = InvoiceApp;