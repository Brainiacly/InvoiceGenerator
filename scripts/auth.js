(function () {
  "use strict";

  /*
    Neither form actually creates or checks a real account; there is no
    server here. Validation is real (nothing malformed gets through
    silently), but a successful submit just says so instead of signing
    anyone in, which is the honest thing to do until this is a real
    feature.
  */

  var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).{8,}$/;

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

  function validatePassword(input) {
    var isValid = PASSWORD_PATTERN.test(input.value);
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

  function initSignInForm() {
    var form = document.getElementById("sign-in-form");
    if (!form) {
      return;
    }

    var email = document.getElementById("signin-email");
    var password = document.getElementById("signin-password");

    revalidateOnceTouched(email, validateEmail);
    revalidateOnceTouched(password, validatePassword);

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var isEmailValid = validateEmail(email);
      var isPasswordValid = validatePassword(password);

      if (!isEmailValid) {
        email.focus();
        return;
      }
      if (!isPasswordValid) {
        password.focus();
        return;
      }

      window.alert("Future update");
    });
  }

  function initSignUpForm() {
    var form = document.getElementById("sign-up-form");
    if (!form) {
      return;
    }

    var email = document.getElementById("signup-email");
    var password = document.getElementById("signup-password");
    var confirmPassword = document.getElementById("signup-confirm-password");

    revalidateOnceTouched(email, validateEmail);
    revalidateOnceTouched(password, validatePassword);
    revalidateOnceTouched(confirmPassword, function (input) {
      return validateMatchesPassword(password, input);
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var isEmailValid = validateEmail(email);
      var isPasswordValid = validatePassword(password);
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

      window.alert("Future update");
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initSignInForm();
    initSignUpForm();
  });
})();
