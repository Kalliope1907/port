class TutorAPI {
  constructor(endpoint = "/api/tutor") {
    this.endpoint = endpoint;
    this.available = false;
    this.model = null;
    this.provider = null;
    this.statusMessage = "Checking AI…";
  }

  async checkStatus() {
    try {
      const response = await fetch("/api/status", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const status = await response.json();
      this.available = Boolean(status.available);
      this.model = status.model || null;
      this.provider = status.provider || null;
      this.statusMessage = status.message || (this.available ? "AI ready" : "AI unavailable");
      return status;
    } catch (error) {
      this.available = false;
      this.model = null;
      this.provider = null;
      this.statusMessage = "Rule-based mode — start with server.py for AI mode";
      return { available: false, message: this.statusMessage, detail: String(error) };
    }
  }

  async intervene(payload) {
    if (!this.available) throw new Error("AI is not available");
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || error.error || `HTTP ${response.status}`);
    }
    return response.json();
  }
}

window.TutorAPI = TutorAPI;
