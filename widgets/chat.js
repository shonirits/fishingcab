
  let fc_base_url = 'https://widgets.fishingcab.com/Widgets/';
  let fc_cdn_url = 'https://cdn-widgets.fishingcab.com/';

  if (!Object.prototype.hasOwnProperty.call(window, "fc_scriptBase")) {
    let src = "";

    const current = document.currentScript;

    if (current && typeof current.src === "string") {
      src = current.src;
    }

    // Fallback: last script (async / injected safe)
    if (!src) {
      const scripts = document.getElementsByTagName("script");
      const last = scripts[scripts.length - 1];
      if (last && typeof last.src === "string") {
        src = last.src;
      }
    }

    if (src) {
      const base = src.replace(/\/[^\/?#]+(?:\?.*)?$/, "/");

      Object.defineProperty(window, "fc_scriptBase", {
        value: base,
        writable: false,
        configurable: false,
        enumerable: false
      });
    }
  }

  /* --------------------------------------------------
     ENTRY POINT
  -------------------------------------------------- */
  function fc_scheduleBootstrap_fnc() {
    const run = () => {
      if (typeof requestIdleCallback === "function") {
        requestIdleCallback(fc_bootstrap_fnc, { timeout: 100 });
      } else {
        setTimeout(fc_bootstrap_fnc, 0);
      }
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", run, { once: true });
    } else {
      run();
    }
  }

  fc_scheduleBootstrap_fnc();

  /* --------------------------------------------------
     BOOTSTRAP FUNCTION
  -------------------------------------------------- */
  function fc_bootstrap_fnc() {
    const fc_widgetID = window.fc_widget_id;
    if (!fc_widgetID) return;

    let fc_win = null;
    let fc_cfg = window.fc_cfg || {};

    


    /* --------------------------------------------------
       COOKIE HELPERS
    -------------------------------------------------- */
        window.fc_getCookie_fnc = function(name) {
        try {
          return document.cookie
            .split("; ")
            .find(c => c.startsWith(name + "="))
            ?.split("=")[1] || null;
        } catch {
          return null;
        }
      };

      window.fc_setCookie_fnc = function(name, value, days = 365) {
        try {
          document.cookie =
            `${name}=${encodeURIComponent(value)}; ` +
            `expires=${new Date(Date.now() + days * 864e5).toUTCString()}; ` +
            `path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
        } catch {}
      };

      window.fc_deleteCookie_fnc = function(name) {
  try {
    document.cookie =
      `${name}=; ` +
      `expires=Thu, 01 Jan 1970 00:00:00 GMT; ` + // past date
      `path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  } catch {}
};



    /* --------------------------------------------------
       STYLE INJECTION
    -------------------------------------------------- */
    function fc_ensureChatStyles_fnc() {
      if (!window.fc_cfg?.widget_id) return;
      fc_cfg = window.fc_cfg;

      const styleId = `fc-chat-styles-${fc_cfg.widget_id}`;
      let fc_style = document.getElementById(styleId);

      if (!fc_style) {
        fc_style = document.createElement("style");
        fc_style.id = styleId;
        document.head.appendChild(fc_style);
      }

      const fc_buttonColor = fc_cfg.button_color || "#0d6efd";
      const fc_buttonTextColor = fc_cfg.button_text_color || "#ffffff";

      fc_style.textContent = `
        #fc-chat-btn-${fc_cfg.widget_id} {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 56px;
          height: 56px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 9999;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          transition: transform 0.2s ease-in-out, background 0.2s ease-in-out;
          border: 1px solid rgba(0,0,0,0.1);
          background: ${fc_buttonColor};
          color: ${fc_buttonTextColor};
        }
        #fc-chat-btn-${fc_cfg.widget_id}:hover {
          background: ${fc_buttonTextColor};
          color: ${fc_buttonColor};
          border-color: rgba(0,0,0,0.2);
        }
        .fc-hidden-${fc_cfg.widget_id} { display: none !important; }
      `;
    }

    /* --------------------------------------------------
       FETCH CONFIG (RETRY SAFE)
    -------------------------------------------------- */
    async function fc_fetchConfig_fnc(url, retries = 3, delay = 800) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) throw new Error("Fetch failed");
        return await res.json();
      } catch {
        if (retries > 0) {
          await new Promise(r => setTimeout(r, delay));
          return fc_fetchConfig_fnc(url, retries - 1, delay * 2);
        }
        return null;
      }
    }

    /* --------------------------------------------------
       SCRIPT LOADER
    -------------------------------------------------- */
  window.fc_loadScript_fnc = function (fc_filename, onload) {
  if (!window.fc_scriptBase || !fc_filename) return;

  const src = window.fc_scriptBase + fc_filename;

  // Prevent duplicate loading (LOGIC SAME, FIXED)
  if (document.querySelector(`script[src="${src}"]`)) {
    if (typeof onload === "function") onload();
    return;
  }

  const script = document.createElement("script");
  script.src = src;
  script.async = true;
  script.defer = true;

  if (typeof onload === "function") {
    script.onload = onload;
  }

  script.onerror = function () {
    console.error("Failed to load script:", src);
  };

  document.body.appendChild(script);

};


// Chain load (UNCHANGED LOGIC)
fc_loadScript_fnc("login.js", function () {
  fc_loadScript_fnc("messenger.js");
});



    /* --------------------------------------------------
       INIT
    -------------------------------------------------- */
    async function fc_startFetch_fnc() {
      const fc_response_cfg = await fc_fetchConfig_fnc(
        `${fc_base_url}config/${fc_widgetID}`
      );
      if (!fc_response_cfg) return;

      // 🔥 GLOBAL ASSIGNMENT
      window.fc_cfg = fc_response_cfg;
      fc_cfg = window.fc_cfg;

      if (!fc_cfg?.widget_id) return;

      if (typeof requestIdleCallback === "function") {
        requestIdleCallback(fc_ensureChatStyles_fnc);
      } else {
        setTimeout(fc_ensureChatStyles_fnc, 50);
      }

      const fc_user_public_key = fc_getCookie_fnc("fc_user_public_key");
      const fc_user_secret_key = fc_getCookie_fnc("fc_user_secret_key");
      const fc_isLoggedIn = !!(fc_user_public_key && fc_user_secret_key);

            /* BUTTON */
      let fc_chatBtn = document.getElementById(`fc-chat-btn-${fc_widgetID}`);
      if (!fc_chatBtn) {
        fc_chatBtn = document.createElement("div");
        fc_chatBtn.id = `fc-chat-btn-${fc_widgetID}`;
        fc_chatBtn.role = "button";
        fc_chatBtn.title = fc_cfg.title || "Chat";
        fc_chatBtn.innerHTML = `
          <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-4 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
          </svg>`;
        document.body.appendChild(fc_chatBtn);
      }

      /* WINDOW */
      fc_win = document.getElementById(`fc-messenger-window-${fc_widgetID}`);
      if (!fc_win) {
        fc_win = document.createElement("div");
        fc_win.id = `fc-messenger-window-${fc_widgetID}`;
        fc_win.className = `fc-messenger-window-${fc_widgetID}`;
        document.body.appendChild(fc_win);
      }

      if (fc_getCookie_fnc("fc_messenger_state") === "hidden") {
        fc_win.classList.add(`fc-hidden-${fc_widgetID}`);
      }

      /* LOGIN OR MESSENGER */
      if (!fc_isLoggedIn) {
        fc_win.innerHTML = `
          <div id="fc-messenger-wizard-${fc_widgetID}">
            <div id="fc-signup-step1-${fc_widgetID}"></div>
            <div id="fc-signup-step2-${fc_widgetID}" style="display:none"></div>
            <div id="fc-signup-step3-${fc_widgetID}" style="display:none"></div>
          </div>`;
        fc_loadScript_fnc("login.js", () => {
          if (typeof fc_renderStep1_fnc === "function") {
            fc_renderStep1_fnc(fc_cfg);
          }
        });
      } else {
        fc_win.innerHTML = `
          <div style="background:${fc_cfg.accent_color};padding:8px;color:#fff">
            ${fc_cfg.title}
          </div>
          <div id="fc-content-${fc_widgetID}" style="padding:10px">
            Loading chats...
          </div>`;
        fc_loadScript_fnc("messenger.js", async () => {
          if (typeof fc_showMessenger_fnc === "function") {
            fc_showMessenger_fnc(fc_cfg, fc_user_public_key, fc_user_secret_key);
             try {
            await fc_realTime_fnc(
              "initialize",
              fc_user_public_key,
              fc_user_secret_key,
              "",
              "",
              function () {
                fc_getUpdates_fnc("initialize", fc_cfg, fc_user_public_key, fc_user_secret_key);
              }
            );
          } catch (err) {
            console.error("Messenger init failed:", err);
          }
          }
        });
      }

      /* TOGGLE */
      if (!fc_chatBtn.dataset.bound) {
        fc_chatBtn.dataset.bound = "1";
        fc_chatBtn.addEventListener("click", () => {
          fc_win.classList.toggle(`fc-hidden-${fc_widgetID}`);
          fc_setCookie_fnc(
            "fc_messenger_state",
            fc_win.classList.contains(`fc-hidden-${fc_widgetID}`) ? "hidden" : "visible"
          );
        });
      }
    }

    // Start fetch after idle
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(fc_startFetch_fnc);
    } else {
      setTimeout(fc_startFetch_fnc, 100);
    }
    
  }
