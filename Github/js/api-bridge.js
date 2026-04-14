/**
 * Excellearn API Bridge Proxy v3
 * Emulasi google.script.run → HTTP fetch() ke GAS doPost()
 *
 * Desain:
 * 1. Getter pattern — setiap akses google.script.run = instance BARU
 *    (mencegah concurrent calls saling timpa callback)
 * 2. Closure-based state — bukan this-reference yang ambigu
 * 3. Setiap chain return new Proxy — chaining .withSuccess().withFailure().fn() bekerja
 */
(function() {
  const API_URL = window.APP_CONFIG?.GAS_API_URL || '';

  async function fetchWithRetry(url, options, maxRetries = 2) {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
              const resp = await fetch(url, { ...options, signal: controller.signal });
              clearTimeout(timeoutId);
              return resp;
          } catch (err) {
              if (attempt === maxRetries) throw err;
              await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          }
      }
  }

  function createRunnerInstance() {
    let _onSuccess = null;
    let _onFailure = null;

    const handler = {
      get(_, prop) {
        // Chain handler: .withSuccessHandler(cb) → simpan cb, return proxy baru
        if (prop === 'withSuccessHandler') {
          return (cb) => {
            _onSuccess = cb;
            return new Proxy({}, handler);
          };
        }
        if (prop === 'withFailureHandler') {
          return (cb) => {
            _onFailure = cb;
            return new Proxy({}, handler);
          };
        }

        // Semua properti lain = nama fungsi GAS → eksekusi sebagai API call
        return async (...args) => {
          // Capture callbacks di closure (aman dari concurrent overwrites)
          const onSuccess = _onSuccess;
          const onFailure = _onFailure;
          _onSuccess = null;
          _onFailure = null;

          try {
            const session = JSON.parse(
              localStorage.getItem('excellearn_session') ||
              sessionStorage.getItem('excellearn_session') || '{}'
            );

            const resp = await fetchWithRetry(API_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain' },  // Avoid CORS preflight
              body: JSON.stringify({
                action: prop,
                params: args,
                idToken: session.idToken || '',
                refreshToken: session.refreshToken || ''
              }),
              redirect: 'follow'  // Handle GAS 302 redirect
            }, 2);

            const result = await resp.json();
            
            // Auto-update session if backend refreshed the token
            if (result && result.newIdToken) {
                console.log('[API Bridge] Token refreshed by server. Updating local session.');
                session.idToken = result.newIdToken;
                if (result.newRefreshToken) session.refreshToken = result.newRefreshToken;
                
                // Update storage based on where it was originall stored
                if (localStorage.getItem('excellearn_session')) {
                    localStorage.setItem('excellearn_session', JSON.stringify(session));
                } else if (sessionStorage.getItem('excellearn_session')) {
                    sessionStorage.setItem('excellearn_session', JSON.stringify(session));
                }
                
                // Update global memory if it exists
                if (window.appSession) {
                    window.appSession.idToken = session.idToken;
                    if (session.refreshToken) window.appSession.refreshToken = session.refreshToken;
                }
            }
            
            if (onSuccess) onSuccess(result);
          } catch (err) {
            console.error(`[API Bridge] ${prop} failed:`, err);
            if (onFailure) onFailure(err);
          }
        };
      }
    };

    return new Proxy({}, handler);
  }

  // GETTER: setiap akses google.script.run = instance baru (concurrent-safe)
  window.google = {
    script: {
      get run() { return createRunnerInstance(); }
    }
  };

  console.log('[API Bridge] ✅ google.script.run proxy active → ' + API_URL);
})();
