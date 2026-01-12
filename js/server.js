
// ARhub Server API Interface
// Fetches credentials securely from js/secrets.js

let PARQRA_API = null;
let PARQRA_KEY = null;

// Initialize Security Handshake
if (window.secureVault) {
    const config = window.secureVault.retrieveConfig();
    PARQRA_API = config.endpoint;
    PARQRA_KEY = config.secret;
} else {
    console.error("ARhub Critical: SecureVault is missing. Authentication services disabled.");
}

class ParqraAuth {
  constructor() {
    this.token = localStorage.getItem('parqra_token');
    this.user = JSON.parse(localStorage.getItem('parqra_user') || 'null');
  }
  
  // Helper to check config
  _checkConfig() {
    if (!PARQRA_API || !PARQRA_KEY) {
        console.error("ARhub Error: API Configuration invalid. Check secrets.js loading order.");
        return false;
    }
    return true;
  }

  async signup(email, password, displayName) {
    if (!this._checkConfig()) return { error: "System configuration error" };

    try {
        const res = await fetch(`${PARQRA_API}/auth/signup`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'x-api-key': PARQRA_KEY 
            },
            body: JSON.stringify({ email, password, display_name: displayName })
        });
        
        const data = await res.json().catch(() => ({ error: `Server error: ${res.status}` }));
        
        if (data.token) {
            this._saveSession(data);
        }
        return data;
    } catch (error) {
        console.error("Signup Error:", error);
        return { error: "Network error during signup." };
    }
  }
  
  async login(email, password) {
    if (!this._checkConfig()) return { error: "System configuration error" };

    try {
        const res = await fetch(`${PARQRA_API}/auth/login`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'x-api-key': PARQRA_KEY 
            },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json().catch(() => ({ error: `Server error: ${res.status}` }));
        
        if (data.token) {
            this._saveSession(data);
        }
        return data;
    } catch (error) {
        console.error("Login Error:", error);
        return { error: "Network error during login." };
    }
  }
  
  async logout() {
    if (!this._checkConfig()) {
        this._clearSession();
        return;
    }

    try {
        if (this.token) {
            await fetch(`${PARQRA_API}/auth/logout`, {
                method: 'POST',
                headers: { 
                    'x-api-key': PARQRA_KEY, 
                    'x-auth-token': this.token 
                }
            });
        }
    } catch (e) {
        console.warn("Logout network request failed", e);
    }
    
    this._clearSession();
  }
  
  isLoggedIn() { return !!this.token; }
  getUser() { return this.user; }

  // Helpers
  _saveSession(data) {
      this.token = data.token;
      this.user = data.user;
      localStorage.setItem('parqra_token', data.token);
      localStorage.setItem('parqra_user', JSON.stringify(data.user));
  }

  _clearSession() {
      this.token = null;
      this.user = null;
      localStorage.removeItem('parqra_token');
      localStorage.removeItem('parqra_user');
  }
}

// Export singleton
window.parqraAuth = new ParqraAuth();
