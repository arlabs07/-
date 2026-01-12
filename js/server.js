
// ARhub Server API Interface
// Dependencies: js/secrets.js (Must be loaded first)

class ParqraAuth {
  constructor() {
    this.token = localStorage.getItem('parqra_token');
    this.user = JSON.parse(localStorage.getItem('parqra_user') || 'null');
    
    // Initialize secrets from the SecureVault
    if (window.secureVault) {
        this.apiBase = window.secureVault.getSolvedUrl();
        this.apiKey = window.secureVault.getSolvedKey();
    } else {
        console.error("CRITICAL: SecureVault not loaded. API calls will fail.");
        this.apiBase = "";
        this.apiKey = "";
    }
  }
  
  async signup(email, password, displayName) {
    if (!this.apiBase || !this.apiKey) return { error: "Security configuration missing." };

    try {
        const res = await fetch(`${this.apiBase}/auth/signup`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'x-api-key': this.apiKey 
            },
            body: JSON.stringify({ email, password, display_name: displayName })
        });
        
        // Handle non-200 responses
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || `Signup failed: ${res.statusText}`);
        }

        const data = await res.json();
        
        if (data.token) {
            this._saveSession(data);
        }
        return data;
    } catch (error) {
        console.error("Signup Error:", error);
        return { error: error.message };
    }
  }
  
  async login(email, password) {
    if (!this.apiBase || !this.apiKey) return { error: "Security configuration missing." };

    try {
        const res = await fetch(`${this.apiBase}/auth/login`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'x-api-key': this.apiKey 
            },
            body: JSON.stringify({ email, password })
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || `Login failed: ${res.statusText}`);
        }

        const data = await res.json();
        
        if (data.token) {
            this._saveSession(data);
        }
        return data;
    } catch (error) {
        console.error("Login Error:", error);
        return { error: error.message };
    }
  }
  
  async logout() {
    if (!this.token || !this.apiBase) {
        this._clearSession();
        return;
    }

    try {
        await fetch(`${this.apiBase}/auth/logout`, {
            method: 'POST',
            headers: { 
                'x-api-key': this.apiKey, 
                'x-auth-token': this.token 
            }
        });
    } catch (e) {
        console.warn("Logout endpoint error (session cleared anyway):", e);
    }
    
    this._clearSession();
    // Optional: Reload to reset app state
    // window.location.reload(); 
  }
  
  isLoggedIn() { return !!this.token; }
  getUser() { return this.user; }
  getToken() { return this.token; }

  // Private helpers
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
