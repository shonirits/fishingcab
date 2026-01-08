  if (typeof fc_cfg === "undefined") { fc_cfg = window.fc_cfg || {}; }

        fc_base_url = 'https://widgets.fishingcab.com/Widgets/';
        fc_cdn_url = 'https://cdn-widgets.fishingcab.com/';
        

// Dynamic CSS injection using widget config
function fc_ensureWidgetStyles_fnc() {
  if (!fc_cfg?.widget_id) return;

  const styleId = `fc-widget-styles-${fc_cfg.widget_id}`;
  if (document.getElementById(styleId)) return;

  const {
    widget_id,
    screen_bg_color = "#fff",
    screen_text_color = "#000",
    button_color = "#260079"
  } = fc_cfg;

  const style = document.createElement("style");
  style.id = styleId;

  style.textContent = `
  :root {
    --fc-bg-${widget_id}: ${screen_bg_color};
    --fc-text-${widget_id}: ${screen_text_color};
    --fc-btn-${widget_id}: ${button_color};
  }

  /* ===============================
     Messenger Window
  =============================== */
  .fc-messenger-window-${widget_id} {
    position: fixed;
    bottom: 80px;
    right: 20px;
    width: 360px;
    max-width: 95vw;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    background: var(--fc-bg-${widget_id});
    color: var(--fc-text-${widget_id});
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.25);
    overflow-y: auto;
    z-index: 9999;
    opacity: 1;
    transform: scale(1);
    transition:
      height 0.35s ease,
      opacity 0.25s ease,
      transform 0.25s ease;
  }

  .fc-messenger-window-${widget_id}.fc-hidden-${widget_id} {
    height: 0;
    opacity: 0;
    transform: scale(0.96);
    pointer-events: none;
  }

  /* ===============================
     Signup Form
  =============================== */
  .fc-signup-form-${widget_id} {
    flex: 1;
    padding: 20px;
    text-align: center;
    font-family: system-ui, sans-serif;
    margin: 0 auto;
    width: 100%;
    max-width: 420px;
  }

  .fc-signup-input-${widget_id},
  .fc-signup-select-${widget_id},
  .fc-signup-button-${widget_id} {
    width: 100%;
    padding: 12px;
    margin-bottom: 15px;
    border-radius: 8px;
    font-size: 16px;
    box-sizing: border-box;
  }

  .fc-signup-input-${widget_id},
  .fc-signup-select-${widget_id} {
    border: 1px solid #ccc;
  }

  .fc-signup-input.invalid-${widget_id},
  .fc-signup-select.invalid-${widget_id} {
    border-color: #e53935;
  }

  .fc-signup-input.valid-${widget_id},
  .fc-signup-select.valid-${widget_id} {
    border-color: #43a047;
  }

  .fc-signup-button-${widget_id} {
    border: none;
    background: var(--fc-btn-${widget_id});
    color: #fff;
    cursor: pointer;
    transition: transform 0.15s ease, opacity 0.15s ease;
  }

  .fc-signup-button-${widget_id}:active {
    transform: scale(0.96);
    opacity: 0.9;
  }

  .fc-signup-button-${widget_id}:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  /* ===============================
     Feedback
  =============================== */
  .fc-signup-error-${widget_id} {
    color: #e53935;
    font-size: 13px;
    text-align: left;
    margin-top: -8px;
    margin-bottom: 10px;
  }

  .fc-signup-valid-${widget_id} {
    color: #43a047;
    font-size: 13px;
    text-align: left;
    margin-top: -8px;
    margin-bottom: 10px;
  }

  /* ===============================
     Shake Animation
  =============================== */
  @keyframes fc-signup-shake-${widget_id} {
    0% { transform: translateX(0); }
    20% { transform: translateX(-5px); }
    40% { transform: translateX(5px); }
    60% { transform: translateX(-5px); }
    80% { transform: translateX(5px); }
    100% { transform: translateX(0); }
  }

  .fc-signup-shake-${widget_id} {
    animation: fc-signup-shake-${widget_id} 0.4s;
  }

  /* ===============================
     Footer
  =============================== */
  .fc-signup-footer-${widget_id} {
    font-size: 12px;
    padding: 8px;
    text-align: center;
    background: #9667C7;
    color: #260079;
  }

  .fc-signup-footer-${widget_id} a {
    color: inherit;
    text-decoration: none;
  }

  /* ===============================
     Mobile / Small Screens
  =============================== */
  @media (max-width: 320px), (max-height: 420px) {
    .fc-messenger-window-${widget_id} {
      bottom: 0;
      right: 0;
      width: 100vw;
      height: 100vh;
      max-width: 100vw;
      max-height: 100vh;
      border-radius: 0;
    }
  }
  `;

  document.head.appendChild(style);
}


// Shake animation helper
function fc_addShake_fnc(el) {
  if (!el) return;
  el.classList.add(`fc-signup-shake-${fc_cfg.widget_id}`);
  setTimeout(() => el.classList.remove(`fc-signup-shake-${fc_cfg.widget_id}`), 500);
}

// Field validation
function fc_validateField_fnc(field) {
  const inputEl = document.getElementById(`fc-signup-${field}-${fc_cfg.widget_id}`);
  const errorEl = document.getElementById(`fc-signup-error-${field}-${fc_cfg.widget_id}`);
  if (!inputEl || !errorEl) return;

  const value = inputEl.value.trim();
  errorEl.textContent = '';
  inputEl.classList.remove('invalid', 'valid'); // reset state
  errorEl.className = `fc-signup-error-${fc_cfg.widget_id}`; // reset class

  switch (field) {
    case 'nickname':
      if (!value || value.length < 3) {
        errorEl.textContent = "Nickname must be at least 3 characters.";
        inputEl.classList.add('invalid');
        fc_addShake_fnc(inputEl);
      } else {
        errorEl.textContent = "✓ Looks good!";
        errorEl.className = `fc-signup-valid-${fc_cfg.widget_id}`;
        inputEl.classList.add('valid');
      }
      break;

    case 'gender':
      if (!value) {
        errorEl.textContent = "Please select your gender.";
        inputEl.classList.add('invalid');
        fc_addShake_fnc(inputEl);
      } else {
        errorEl.textContent = "✓ Looks good!";
        errorEl.className = `fc-signup-valid-${fc_cfg.widget_id}`;
        inputEl.classList.add('valid');
      }
      break;

    case 'age':
      const age = parseInt(value, 10);
      if (isNaN(age) || age < 18 || age > 63) {
        errorEl.textContent = "Your Age must be between 18 and 63.";
        inputEl.classList.add('invalid');
        fc_addShake_fnc(inputEl);
      } else {
        errorEl.textContent = "✓ Looks good!";
        errorEl.className = `fc-signup-valid-${fc_cfg.widget_id}`;
        inputEl.classList.add('valid');
      }
      break;

    case 'findgender':
      if (!value) {
        errorEl.textContent = "Please select who you are looking for.";
        inputEl.classList.add('invalid');
        fc_addShake_fnc(inputEl);
      } else {
        errorEl.textContent = "✓ Looks good!";
        errorEl.className = `fc-signup-valid-${fc_cfg.widget_id}`;
        inputEl.classList.add('valid');
      }
      break;

    case 'agefrom':
      const ageFrom = parseInt(value, 10);
      if (isNaN(ageFrom) || ageFrom < 18 || ageFrom > 63) {
        errorEl.textContent = "Age From must be between 18 and 63.";
        inputEl.classList.add('invalid');
        fc_addShake_fnc(inputEl);
      } else {
        errorEl.textContent = "✓ Looks good!";
        errorEl.className = `fc-signup-valid-${fc_cfg.widget_id}`;
        inputEl.classList.add('valid');
      }
      break;

    case 'ageto':
      const ageTo = parseInt(value, 10);
      const ageFromVal = parseInt(
        document.getElementById(`fc-signup-agefrom-${fc_cfg.widget_id}`)?.value,
        10
      );
      if (isNaN(ageTo) || ageTo < 18 || ageTo > 63) {
        errorEl.textContent = "Age To must be between 18 and 63.";
        inputEl.classList.add('invalid');
        fc_addShake_fnc(inputEl);
      } else if (!isNaN(ageFromVal) && ageTo < ageFromVal) {
        errorEl.textContent = "Age To cannot be less than Age From.";
        inputEl.classList.add('invalid');
        fc_addShake_fnc(inputEl);
      } else {
        errorEl.textContent = "✓ Looks good!";
        errorEl.className = `fc-signup-valid-${fc_cfg.widget_id}`;
        inputEl.classList.add('valid');
      }
      break;
  }
}

// Form validity check
function fc_checkFormValidity_fnc() {
  let valid = true;

  ['nickname','gender','age','findgender','agefrom','ageto'].forEach(field => {
    fc_validateField_fnc(field);
    const errEl = document.getElementById(`fc-signup-error-${field}-${fc_cfg.widget_id}`);
    if (errEl && errEl.textContent && !errEl.textContent.includes("✓")) {
      valid = false;
    }
  });

  const btn = document.getElementById(`fc-step1-continue-${fc_cfg.widget_id}`);
  if (btn) {
    btn.disabled = !valid;
  }
}




function fc_renderStep1_fnc(fc_cfg_rev) {
  // Assign global config safely
  window.fc_cfg = fc_cfg_rev;
  const fc_cfg = window.fc_cfg;

  if (!fc_cfg || !fc_cfg.widget_id) return;

  // Ensure styles are injected once
  fc_ensureWidgetStyles_fnc();

  const step1 = document.getElementById(`fc-signup-step1-${fc_cfg.widget_id}`);
  if (!step1) return;

  // Render form markup
  step1.innerHTML = `
    <div id="fc-signup-form-${fc_cfg.widget_id}" class="fc-signup-form-${fc_cfg.widget_id}">
      <h3 style="margin-bottom:20px; color:${fc_cfg.accent_color}; font-size:20px; font-weight:600;">
        ${fc_cfg.title}
      </h3>

      <div class="fc-signup-field-${fc_cfg.widget_id}">
        <input type="text" id="fc-signup-nickname-${fc_cfg.widget_id}" class="fc-signup-input-${fc_cfg.widget_id}" placeholder="Your Nickname" aria-label="Nickname">
        <div id="fc-signup-error-nickname-${fc_cfg.widget_id}" class="fc-signup-error-${fc_cfg.widget_id}"></div>
      </div>

      <div class="fc-signup-field-${fc_cfg.widget_id}">
        <select id="fc-signup-gender-${fc_cfg.widget_id}" class="fc-signup-select-${fc_cfg.widget_id}" aria-label="Gender">
          <option value="">Your Gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="not_specified">Not Specified</option>
        </select>
        <div id="fc-signup-error-gender-${fc_cfg.widget_id}" class="fc-signup-error-${fc_cfg.widget_id}"></div>
      </div>

      <div class="fc-signup-field-${fc_cfg.widget_id}">
        <input type="number" id="fc-signup-age-${fc_cfg.widget_id}" class="fc-signup-input-${fc_cfg.widget_id}" placeholder="Your Age" aria-label="Age">
        <div id="fc-signup-error-age-${fc_cfg.widget_id}" class="fc-signup-error-${fc_cfg.widget_id}"></div>
      </div>

      <div class="fc-signup-field-${fc_cfg.widget_id}">
        <select id="fc-signup-findgender-${fc_cfg.widget_id}" class="fc-signup-select-${fc_cfg.widget_id}" aria-label="Looking For">
          <option value="">You Looking For</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="any">Any</option>
        </select>
        <div id="fc-signup-error-findgender-${fc_cfg.widget_id}" class="fc-signup-error-${fc_cfg.widget_id}"></div>
      </div>

      <div class="fc-signup-field-${fc_cfg.widget_id}">
        <input type="number" id="fc-signup-agefrom-${fc_cfg.widget_id}" class="fc-signup-input-${fc_cfg.widget_id}" placeholder="Age From" aria-label="Age From">
        <div id="fc-signup-error-agefrom-${fc_cfg.widget_id}" class="fc-signup-error-${fc_cfg.widget_id}"></div>
      </div>

      <div class="fc-signup-field-${fc_cfg.widget_id}">
        <input type="number" id="fc-signup-ageto-${fc_cfg.widget_id}" class="fc-signup-input-${fc_cfg.widget_id}" placeholder="Age To" aria-label="Age To">
        <div id="fc-signup-error-ageto-${fc_cfg.widget_id}" class="fc-signup-error-${fc_cfg.widget_id}"></div>
      </div>

      <button id="fc-step1-continue-${fc_cfg.widget_id}" class="fc-signup-button-${fc_cfg.widget_id}" disabled>Continue</button>
    </div>

    <div class="fc-signup-footer-${fc_cfg.widget_id}">
      Powered by <a href="https://fishingcab.com" target="_blank" rel="noopener noreferrer">FishingCab.com</a>
    </div>
  `;

  // Attach validation and navigation logic
  requestAnimationFrame(() => {
    const fields = ['nickname','gender','age','findgender','agefrom','ageto'];

    fields.forEach(field => {
      const el = document.getElementById(`fc-signup-${field}-${fc_cfg.widget_id}`);
      if (el) {
        let validateTimer;
        el.addEventListener('input', () => {
          clearTimeout(validateTimer);
          validateTimer = setTimeout(() => {
            fc_validateField_fnc(field);
            fc_checkFormValidity_fnc();
          }, 200); // debounce 200ms
        });
        el.addEventListener('change', () => {
          fc_validateField_fnc(field);
          fc_checkFormValidity_fnc();
        });
      }
    });

    const continueBtn = document.getElementById(`fc-step1-continue-${fc_cfg.widget_id}`);
    if (continueBtn) {
      continueBtn.addEventListener('click', e => {
        e.preventDefault();
        fc_checkFormValidity_fnc();
        if (continueBtn.disabled) return;
        const step1El = document.getElementById(`fc-signup-step1-${fc_cfg.widget_id}`);
        const step2El = document.getElementById(`fc-signup-step2-${fc_cfg.widget_id}`);
        if (step1El) step1El.style.display = 'none';
        if (step2El) step2El.style.display = 'block';
        fc_renderStep2_fnc();
      });
    }
  });
}



function fc_renderStep2_fnc() {
  // Guard config
  if (!window.fc_cfg || !fc_cfg.widget_id) return;

  const step2 = document.getElementById(`fc-signup-step2-${fc_cfg.widget_id}`);
  if (!step2) return;

  // Render markup
  step2.innerHTML = `
    <div class="fc-signup-form-${fc_cfg.widget_id}">
      <h3 style="margin-bottom:12px; color:${fc_cfg.accent_color}; font-size:20px; font-weight:600;">
        Getting location via GPS
      </h3>
      <p class="fc-lead-${fc_cfg.widget_id}" style="margin-bottom:10px;">
        Always allow FishingCab to access your location for the best experience.
      </p>
      <p id="fc-geolocation-area-${fc_cfg.widget_id}" class="font-monospace-${fc_cfg.widget_id}">
        <span class="fc-badge-info-${fc_cfg.widget_id}">Please Wait...</span>
      </p>

      <div style="display:flex; gap:8px; margin-top:16px;">
        <button id="fc-location-retry-${fc_cfg.widget_id}" class="fc-signup-button-${fc_cfg.widget_id}" style="background:${fc_cfg.accent_color}; display:none;">Retry</button>
        <button id="fc-location-continue-${fc_cfg.widget_id}" class="fc-signup-button-${fc_cfg.widget_id}" style="display:none;">Continue</button>
      </div>
      <button id="fc-back-step1-${fc_cfg.widget_id}" class="fc-signup-button-${fc_cfg.widget_id}" style="margin-top:8px; opacity:0.7;">
        ← Back to Step 1
      </button>
    </div>

    <div class="fc-signup-footer-${fc_cfg.widget_id}">
      Powered by <a href="https://fishingcab.com" target="_blank" rel="noopener noreferrer">FishingCab.com</a>
    </div>
  `;

  // Cache elements safely
  const geoArea = document.getElementById(`fc-geolocation-area-${fc_cfg.widget_id}`);
  const retryBtn = document.getElementById(`fc-location-retry-${fc_cfg.widget_id}`);
  const contBtn  = document.getElementById(`fc-location-continue-${fc_cfg.widget_id}`);
  const backBtn  = document.getElementById(`fc-back-step1-${fc_cfg.widget_id}`);

  if (!geoArea || !retryBtn || !contBtn || !backBtn) return;

  // Geolocation attempt (logic preserved)
  const fc_attemptGeo_fnc = () => {
    geoArea.innerHTML = `<span class="fc-badge-info-${fc_cfg.widget_id}">Please Wait...</span>`;
    retryBtn.style.display = 'none';
    contBtn.style.display = 'none';

    if (navigator.geolocation && typeof navigator.geolocation.getCurrentPosition === 'function') {
      navigator.geolocation.getCurrentPosition(
        pos => {
          // Store coordinates globally (as per original logic)
          window.fc_lat = pos.coords.latitude;
          window.fc_lon = pos.coords.longitude;

          geoArea.innerHTML = `<span class="fc-badge-success-${fc_cfg.widget_id}">Location detected</span>`;
          contBtn.style.display = 'inline-block'; // success → show continue
        },
        err => {
          // Map common errors to friendly messages
          let msg = "Location access denied or unavailable";
          if (err && typeof err.code === 'number') {
            switch (err.code) {
              case 1: msg = "Location access denied by user"; break;            // PERMISSION_DENIED
              case 2: msg = "Location unavailable"; break;                       // POSITION_UNAVAILABLE
              case 3: msg = "Location request timed out"; break;                 // TIMEOUT
            }
          }
          geoArea.innerHTML = `<span class="fc-badge-danger-${fc_cfg.widget_id}">${msg}</span>`;
          retryBtn.style.display = 'inline-block'; // error → show retry
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    } else {
      geoArea.innerHTML = `<span class="fc-badge-warning-${fc_cfg.widget_id}">Geolocation not supported</span>`;
      retryBtn.style.display = 'inline-block';
    }
  };

  // Initial attempt
  fc_attemptGeo_fnc();

  // Retry button
  retryBtn.addEventListener('click', e => {
    e.preventDefault();
    fc_attemptGeo_fnc();
  });

  // Back button (logic preserved)
  backBtn.addEventListener('click', e => {
    e.preventDefault();
    const step1El = document.getElementById(`fc-signup-step1-${fc_cfg.widget_id}`);
    const step2El = document.getElementById(`fc-signup-step2-${fc_cfg.widget_id}`);
    const step3El = document.getElementById(`fc-signup-step3-${fc_cfg.widget_id}`);

    if (step1El) step1El.style.display = 'block';
    if (step3El) step3El.style.display = 'none';
    if (step2El) step2El.style.display = 'none';

    // Preserve original call signature—pass current config
    fc_renderStep1_fnc(fc_cfg);
  });

  // Continue button (logic preserved)
  contBtn.addEventListener('click', e => {
    e.preventDefault();
    const step2El = document.getElementById(`fc-signup-step2-${fc_cfg.widget_id}`);
    const step3El = document.getElementById(`fc-signup-step3-${fc_cfg.widget_id}`);

    if (step3El) step3El.style.display = 'block';
    if (step2El) step2El.style.display = 'none';

    fc_renderStep3_fnc();
  });
}


function fc_renderStep3_fnc() {
  // Guard config
  if (!fc_cfg || !fc_cfg.widget_id) return;

  const step3 = document.getElementById(`fc-signup-step3-${fc_cfg.widget_id}`);
  if (!step3) return;

  // Render form once
  step3.innerHTML = `
    <div class="fc-signup-form-${fc_cfg.widget_id}">
      <h3 style="margin-bottom:20px; color:${fc_cfg.accent_color}; font-size:20px; font-weight:600;">
        Verify you are human
      </h3>
      <div id="fc-captcha-box-${fc_cfg.widget_id}" style="position:relative; padding:16px; border:1px dashed #ccc; border-radius:8px; margin-bottom:16px; text-align:center;">
        <img id="fc-captcha-img-${fc_cfg.widget_id}" alt="Captcha" style="display:block; margin:0 auto 12px auto; max-width:100%;">
        <div id="fc-captcha-loading-${fc_cfg.widget_id}" style="color:#999; margin-bottom:8px; display:none;">Loading captcha...</div>
        <svg id="fc-captcha-reload-${fc_cfg.widget_id}" xmlns="http://www.w3.org/2000/svg" 
             viewBox="0 0 24 24" width="24" height="24"
             style="position:absolute; top:8px; right:8px; cursor:pointer; fill:${fc_cfg.accent_color};" aria-label="Reload captcha" role="img">
          <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.66-.67 3.16-1.76 4.24l1.42 1.42C19.07 16.07 20 14.13 20 12c0-4.42-3.58-8-8-8zm-6.24 2.76L4.34 8.18C3.93 9.07 3.67 10.01 3.67 11c0 4.42 3.58 8 8 8v3l4-4-4-4v3c-3.31 0-6-2.69-6-6 0-.99.26-1.93.76-2.76z"/>
        </svg>
        <input type="text" id="fc-captcha-code-${fc_cfg.widget_id}" class="fc-signup-input-${fc_cfg.widget_id}" 
               placeholder="Enter code shown above" style="text-align:center;" aria-label="Captcha code">
        <div id="fc-captcha-error-${fc_cfg.widget_id}" class="fc-signup-error-${fc_cfg.widget_id}" aria-live="polite"></div>
      </div>
      <button id="fc-captcha-submit-${fc_cfg.widget_id}" class="fc-signup-button-${fc_cfg.widget_id}">Finish & Sign Up</button>
      <button id="fc-back-step2-${fc_cfg.widget_id}" class="fc-signup-button-${fc_cfg.widget_id}" style="margin-top:8px; opacity:0.7;">
        ← Back to Step 2
      </button>
    </div>
    <div class="fc-signup-footer-${fc_cfg.widget_id}">
      Powered by <a href="https://fishingcab.com" target="_blank" rel="noopener noreferrer">FishingCab.com</a>
    </div>
  `;

  // Cache elements safely
  const captchaImg      = document.getElementById(`fc-captcha-img-${fc_cfg.widget_id}`);
  const captchaLoading  = document.getElementById(`fc-captcha-loading-${fc_cfg.widget_id}`);
  const errorBox        = document.getElementById(`fc-captcha-error-${fc_cfg.widget_id}`);
  const captchaSubmit   = document.getElementById(`fc-captcha-submit-${fc_cfg.widget_id}`);
  const reloadBtn       = document.getElementById(`fc-captcha-reload-${fc_cfg.widget_id}`);
  const backBtn         = document.getElementById(`fc-back-step2-${fc_cfg.widget_id}`);

  if (!captchaImg || !captchaLoading || !errorBox || !captchaSubmit || !reloadBtn || !backBtn) return;

  let captchaToken = null;
  let reloadLock = false; // prevent rapid reload spam

  // Refresh captcha (logic preserved)
  function fc_refreshCaptcha_fnc() {
    captchaLoading.style.display = "block";
    captchaImg.style.display = "none";
    errorBox.textContent = "";

    fetch(`${fc_base_url}get_captcha_token/${fc_cfg.widget_id}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    })
      .then(res => res.json())
      .then(data => {
        if (!data || data.status !== true || !data.data) {
          errorBox.textContent = "Failed to load captcha";
          captchaLoading.style.display = "none";
          return;
        }
        captchaToken = data.data;
        captchaImg.src = `${fc_cdn_url}Api/get_captcha_image/${encodeURIComponent(captchaToken)}`;
      })
      .catch(() => {
        captchaLoading.style.display = "none";
        errorBox.textContent = "Captcha service unavailable";
      });
  }

  // Image load handlers
  captchaImg.onload = () => {
    captchaLoading.style.display = "none";
    captchaImg.style.display = "block";
  };
  captchaImg.onerror = () => {
    captchaLoading.style.display = "none";
    errorBox.textContent = "Failed to load captcha image";
  };

  // Reload click (debounced)
  reloadBtn.addEventListener('click', e => {
    e.preventDefault();
    if (reloadLock) return;
    reloadLock = true;
    fc_refreshCaptcha_fnc();
    setTimeout(() => { reloadLock = false; }, 600);
  });

  // Submit → Login step (logic preserved)
  captchaSubmit.addEventListener('click', e => {
    e.preventDefault();

    const codeEl = document.getElementById(`fc-captcha-code-${fc_cfg.widget_id}`);
    if (!codeEl) return;

    const code = codeEl.value.trim();
    if (!code || code.length < 3) {
      errorBox.textContent = "Please enter at least 3 characters.";
      const boxEl = document.getElementById(`fc-captcha-box-${fc_cfg.widget_id}`);
      fc_addShake_fnc(boxEl);
      return;
    }
    errorBox.textContent = "";

    captchaSubmit.disabled = true;
    captchaSubmit.textContent = "Signing up...";

    // Detect device timezone offset
    const offsetMinutes = new Date().getTimezoneOffset();
    const formatOffset = mins => {
      const sign = mins <= 0 ? '+' : '-';
      const abs = Math.abs(mins);
      const hours = String(Math.floor(abs / 60)).padStart(2, '0');
      const minutes = String(abs % 60).padStart(2, '0');
      return `${sign}${hours}:${minutes}`;
    };
    const userOffset = formatOffset(offsetMinutes);

    // Build payload (logic preserved)
    const payload = {
      token: captchaToken || '',
      captcha_code: code,
      nickname: (document.getElementById(`fc-signup-nickname-${fc_cfg.widget_id}`)?.value || '').trim(),
      gender: document.getElementById(`fc-signup-gender-${fc_cfg.widget_id}`)?.value || '',
      age: document.getElementById(`fc-signup-age-${fc_cfg.widget_id}`)?.value || '',
      findgender: document.getElementById(`fc-signup-findgender-${fc_cfg.widget_id}`)?.value || '',
      agefrom: document.getElementById(`fc-signup-agefrom-${fc_cfg.widget_id}`)?.value || '',
      ageto: document.getElementById(`fc-signup-ageto-${fc_cfg.widget_id}`)?.value || '',
      latitude: window.fc_lat || '',
      longitude: window.fc_lon || '',
      offset: userOffset
    };

    const form = new URLSearchParams(payload);

    fetch(`${fc_base_url}login/${fc_cfg.widget_id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
      body: form.toString()
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.status === true && data.data) {
          // Success → logged in (logic preserved)
          fc_setCookie_fnc('fc_user_public_key', data.data.public_key);
          fc_setCookie_fnc('fc_user_secret_key', data.data.secret_key);

          const fc_win = document.getElementById(`fc-messenger-wizard-${fc_cfg.widget_id}`);
          if (fc_win) {
            fc_win.innerHTML = `
              <div class="fc-signup-form-${fc_cfg.widget_id}">
                <h3 style="color:${fc_cfg.accent_color};">Signup complete</h3>
                <p>Loading chats...</p>
              </div>
            `;
          }

          // Load messenger script (logic preserved)
           fc_loadScript_fnc("messenger.js", async () => {
          if (typeof fc_showMessenger_fnc === "function") {
            fc_showMessenger_fnc(fc_cfg, data.data.public_key, data.data.secret_key);
             try {
            await fc_realTime_fnc(
              "initialize",
              data.data.public_key,
              data.data.secret_key,
              "",
              "",
              function () {
                fc_getUpdates_fnc("initialize", fc_cfg, data.data.public_key, data.data.secret_key);
              }
            );
          } catch (err) {
            console.error("Messenger init failed:", err);
          }
          }
        });
        } else {
          // Error path (logic preserved)
          let errorMessage = "Unknown error";
          if (data && data.messages && data.messages.error) {
            errorMessage = data.messages.error;
          } else if (data && data.data) {
            errorMessage = data.data;
          }
          errorBox.textContent = errorMessage;
          const boxEl = document.getElementById(`fc-captcha-box-${fc_cfg.widget_id}`);
          fc_addShake_fnc(boxEl);
          fc_refreshCaptcha_fnc(); // Refresh image but keep error visible
        }
      })
      .catch(() => {
        errorBox.textContent = "Network error during signup.";
      })
      .finally(() => {
        // Re-enable button after request finishes
        captchaSubmit.disabled = false;
        captchaSubmit.textContent = "Finish & Sign Up";
      });
  });

  // Back button (logic preserved)
  backBtn.addEventListener('click', e => {
    e.preventDefault();
    const step1El = document.getElementById(`fc-signup-step1-${fc_cfg.widget_id}`);
    const step2El = document.getElementById(`fc-signup-step2-${fc_cfg.widget_id}`);
    const step3El = document.getElementById(`fc-signup-step3-${fc_cfg.widget_id}`);

    if (step1El) step1El.style.display = 'none';
    if (step3El) step3El.style.display = 'none';
    if (step2El) step2El.style.display = 'block';

    // Preserve original flow
    fc_renderStep2_fnc();
  });

  // Initial captcha load
  fc_refreshCaptcha_fnc();
}
