(function () {
  "use strict";

  var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var PASSWORD_RULES = [
    { key: "length", test: function (value) { return value.length >= 8; }, label: "At least 8 characters" },
    { key: "lower", test: function (value) { return /[a-z]/.test(value); }, label: "One lowercase letter" },
    { key: "upper", test: function (value) { return /[A-Z]/.test(value); }, label: "One uppercase letter" },
    { key: "number", test: function (value) { return /\d/.test(value); }, label: "One number" },
    { key: "symbol", test: function (value) { return /[^A-Za-z0-9\s]/.test(value); }, label: "One symbol" }
  ];
  var HASH_ITERATIONS = 150000;
  var HASH_BIT_LENGTH = 256;

  function setFieldError(input) {
    var wrapper = input.closest(".field");
    wrapper.classList.add("has-error");
    input.setAttribute("aria-invalid", "true");
  }

  function clearFieldError(input) {
    var wrapper = input.closest(".field");
    wrapper.classList.remove("has-error");
    input.setAttribute("aria-invalid", "false");
  }

  function validateEmail(input) {
    var isValid = EMAIL_PATTERN.test(input.value.trim());
    if (isValid) {
      clearFieldError(input);
    } else {
      setFieldError(input);
    }
    return isValid;
  }

  function passwordMeetsAllRules(value) {
    return PASSWORD_RULES.every(function (rule) {
      return rule.test(value);
    });
  }

  function validateNewPassword(input) {
    var isValid = passwordMeetsAllRules(input.value);
    if (isValid) {
      clearFieldError(input);
    } else {
      setFieldError(input);
    }
    return isValid;
  }

  function validatePasswordPresence(input) {
    var isValid = input.value.length > 0;
    if (isValid) {
      clearFieldError(input);
    } else {
      setFieldError(input);
    }
    return isValid;
  }

  function validateMatchesPassword(passwordInput, confirmInput) {
    var isValid = confirmInput.value.length > 0 && confirmInput.value === passwordInput.value;
    if (isValid) {
      clearFieldError(confirmInput);
    } else {
      setFieldError(confirmInput);
    }
    return isValid;
  }

  function revalidateOnceTouched(input, validateFn) {
    input.addEventListener("input", function () {
      if (input.closest(".field").classList.contains("has-error")) {
        validateFn(input);
      }
    });
  }

  function showFormMessage(form, message, tone) {
    var messageElement = form.querySelector(".auth-form-message");
    if (!messageElement) {
      return;
    }
    messageElement.textContent = message;
    messageElement.classList.remove("auth-form-message--error", "auth-form-message--success");
    messageElement.classList.add("is-visible", "auth-form-message--" + (tone || "error"));
  }

  function clearFormMessage(form) {
    var messageElement = form.querySelector(".auth-form-message");
    if (!messageElement) {
      return;
    }
    messageElement.textContent = "";
    messageElement.classList.remove("is-visible", "auth-form-message--error", "auth-form-message--success");
  }

  function setSubmitBusy(form, isBusy) {
    var submitButton = form.querySelector('button[type="submit"]');
    if (!submitButton) {
      return;
    }
    submitButton.disabled = isBusy;
  }

  /* ---------- local password hashing ---------- */

  function bufferToHex(buffer) {
    var bytes = new Uint8Array(buffer);
    var hex = "";
    for (var i = 0; i < bytes.length; i++) {
      var value = bytes[i].toString(16);
      hex += value.length === 1 ? "0" + value : value;
    }
    return hex;
  }

  function hexToBytes(hex) {
    var bytes = new Uint8Array(hex.length / 2);
    for (var i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
  }

  function generateSaltHex() {
    var salt = new Uint8Array(16);
    window.crypto.getRandomValues(salt);
    return bufferToHex(salt);
  }

  function hasSubtleCrypto() {
    return Boolean(
      window.crypto &&
      window.crypto.subtle &&
      window.crypto.subtle.importKey &&
      window.crypto.subtle.deriveBits &&
      window.TextEncoder
    );
  }

  function hashWithSubtleCrypto(password, saltHex) {
    var encoder = new TextEncoder();
    var passwordBytes = encoder.encode(password);
    var saltBytes = hexToBytes(saltHex);

    return window.crypto.subtle.importKey("raw", passwordBytes, { name: "PBKDF2" }, false, ["deriveBits"])
      .then(function (keyMaterial) {
        return window.crypto.subtle.deriveBits({
          name: "PBKDF2",
          salt: saltBytes,
          iterations: HASH_ITERATIONS,
          hash: "SHA-256"
        }, keyMaterial, HASH_BIT_LENGTH);
      })
      .then(function (derivedBits) {
        return "pbkdf2$" + HASH_ITERATIONS + "$" + bufferToHex(derivedBits);
      });
  }

  function hashWithFallback(password, saltHex) {
    var combined = saltHex + ":" + password;
    var hash = 0;
    for (var pass = 0; pass < 5; pass++) {
      for (var i = 0; i < combined.length; i++) {
        hash = ((hash << 5) - hash + combined.charCodeAt(i)) | 0;
      }
      combined = hash.toString(16) + combined;
    }
    return Promise.resolve("fallback$1$" + (hash >>> 0).toString(16));
  }

  function hashPassword(password, saltHex) {
    if (hasSubtleCrypto()) {
      return hashWithSubtleCrypto(password, saltHex);
    }
    return hashWithFallback(password, saltHex);
  }

  /* ---------- redirect if already signed in ---------- */

  function redirectIfSignedIn() {
    var InvoiceApp = window.InvoiceApp;
    if (InvoiceApp && typeof InvoiceApp.getSession === "function" && InvoiceApp.getSession()) {
      window.location.href = "history.html";
      return true;
    }
    return false;
  }

  /* ---------- sign in ---------- */

  function initSignInForm() {
    var form = document.getElementById("sign-in-form");
    if (!form) {
      return;
    }

    var email = document.getElementById("signin-email");
    var password = document.getElementById("signin-password");

    revalidateOnceTouched(email, validateEmail);
    revalidateOnceTouched(password, validatePasswordPresence);

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      clearFormMessage(form);

      var isEmailValid = validateEmail(email);
      var isPasswordValid = validatePasswordPresence(password);

      if (!isEmailValid) {
        email.focus();
        return;
      }
      if (!isPasswordValid) {
        password.focus();
        return;
      }

      var InvoiceApp = window.InvoiceApp;
      if (!InvoiceApp || typeof InvoiceApp.findAccountByEmail !== "function") {
        showFormMessage(form, "Accounts aren't available in this browser right now.");
        return;
      }

      var account = InvoiceApp.findAccountByEmail(email.value);
      if (!account) {
        setFieldError(password);
        showFormMessage(form, "Email or password is incorrect.");
        return;
      }

      setSubmitBusy(form, true);
      hashPassword(password.value, account.passwordSalt).then(function (hash) {
        setSubmitBusy(form, false);
        if (hash !== account.passwordHash) {
          setFieldError(password);
          showFormMessage(form, "Email or password is incorrect.");
          return;
        }
        InvoiceApp.migrateGuestDataToAccount(account.id);
        InvoiceApp.setSession({ accountId: account.id, email: account.email });
        window.location.href = "history.html";
      }).catch(function () {
        setSubmitBusy(form, false);
        showFormMessage(form, "Something went wrong signing in on this device. Please try again.");
      });
    });
  }

  /* ---------- live password strength checklist ---------- */

  function setUpPasswordStrengthChecklist(passwordInput) {
    var checklist = document.getElementById("signup-password-hint");
    if (!checklist) {
      return;
    }

    var summary = document.getElementById("password-strength-summary");

    function render() {
      var value = passwordInput.value;
      var metCount = 0;

      PASSWORD_RULES.forEach(function (rule) {
        var item = checklist.querySelector('[data-rule="' + rule.key + '"]');
        if (!item) {
          return;
        }
        var isMet = rule.test(value);
        if (isMet) {
          metCount += 1;
        }
        item.classList.toggle("is-met", isMet);
        var statusPrefix = item.querySelector(".password-strength__status");
        if (statusPrefix) {
          statusPrefix.textContent = isMet ? "Met: " : "Not yet: ";
        }
      });

      if (summary) {
        summary.textContent = value.length === 0
          ? ""
          : metCount + " of " + PASSWORD_RULES.length + " requirements met.";
      }
    }

    passwordInput.addEventListener("input", render);
    render();
  }

  /* ---------- sign up ---------- */

  function initSignUpForm() {
    var form = document.getElementById("sign-up-form");
    if (!form) {
      return;
    }

    var email = document.getElementById("signup-email");
    var password = document.getElementById("signup-password");
    var confirmPassword = document.getElementById("signup-confirm-password");

    setUpPasswordStrengthChecklist(password);

    revalidateOnceTouched(email, validateEmail);
    revalidateOnceTouched(password, validateNewPassword);
    revalidateOnceTouched(confirmPassword, function (input) {
      return validateMatchesPassword(password, input);
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      clearFormMessage(form);

      var isEmailValid = validateEmail(email);
      var isPasswordValid = validateNewPassword(password);
      var isConfirmValid = validateMatchesPassword(password, confirmPassword);

      if (!isEmailValid) {
        email.focus();
        return;
      }
      if (!isPasswordValid) {
        password.focus();
        return;
      }
      if (!isConfirmValid) {
        confirmPassword.focus();
        return;
      }

      var InvoiceApp = window.InvoiceApp;
      if (!InvoiceApp || typeof InvoiceApp.createAccount !== "function") {
        showFormMessage(form, "Accounts aren't available in this browser right now.");
        return;
      }

      var normalizedEmail = email.value.trim();
      if (InvoiceApp.findAccountByEmail(normalizedEmail)) {
        setFieldError(email);
        showFormMessage(form, "An account with this email already exists on this device. Try signing in instead.");
        return;
      }

      setSubmitBusy(form, true);
      var salt = generateSaltHex();
      hashPassword(password.value, salt).then(function (hash) {
        var account = InvoiceApp.createAccount({
          email: normalizedEmail,
          passwordHash: hash,
          passwordSalt: salt
        });

        if (!account) {
          setSubmitBusy(form, false);
          showFormMessage(form, "This browser blocked local account storage. Private browsing or a full storage quota can cause this.");
          return;
        }

        InvoiceApp.migrateGuestDataToAccount(account.id);
        InvoiceApp.setSession({ accountId: account.id, email: account.email });
        window.location.href = "history.html";
      }).catch(function () {
        setSubmitBusy(form, false);
        showFormMessage(form, "Something went wrong creating the account on this device. Please try again.");
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (redirectIfSignedIn()) {
      return;
    }
    initSignInForm();
    initSignUpForm();
  });
})();
