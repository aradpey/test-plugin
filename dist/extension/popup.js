/**
 * Popup Script - Handles popup interface interactions (Firefox Version)
 * Manages settings, quick actions, and user preferences for the extension
 */

class PopupManager {
  constructor() {
    // Initialize the popup manager
    this.init();
  }

  /**
   * Initialize the popup manager
   * Loads settings and sets up event listeners
   */
  async init() {
    // Load saved settings from Firefox storage
    await this.loadSettings();

    // Add event listeners for all interactive elements
    this.addEventListeners();

    console.log("Popup manager initialized");
  }

  /**
   * Load settings from Firefox storage
   * Retrieves user preferences and updates the UI accordingly
   */
  async loadSettings() {
    try {
      // Get settings from Firefox storage
      const settings = await browser.storage.sync.get([
        "autoExtract",
        "showNotifications",
        "apiBaseUrl",
      ]);

      // Update UI elements with loaded settings
      // Default to true if settings don't exist
      document.getElementById("autoExtract").checked =
        settings.autoExtract !== false;
      document.getElementById("showNotifications").checked =
        settings.showNotifications !== false;

      // Load API domain setting with default fallback
      const apiDomainInput = document.getElementById("apiDomain");
      apiDomainInput.value = settings.apiBaseUrl || "https://localhost:3000";

      console.log("Settings loaded:", settings);
    } catch (error) {
      console.error("Failed to load settings:", error);
      // Set default values if loading fails
      document.getElementById("autoExtract").checked = true;
      document.getElementById("showNotifications").checked = true;
      document.getElementById("apiDomain").value = "https://localhost:3000";
    }
  }

  /**
   * Add event listeners to all interactive elements
   * Handles user interactions with checkboxes, inputs, and buttons
   */
  addEventListeners() {
    // Settings checkboxes - save changes immediately
    document.getElementById("autoExtract").addEventListener("change", (e) => {
      this.saveSetting("autoExtract", e.target.checked);
    });

    document
      .getElementById("showNotifications")
      .addEventListener("change", (e) => {
        this.saveSetting("showNotifications", e.target.checked);
      });

    // API domain input - save changes when user finishes typing
    const apiDomainInput = document.getElementById("apiDomain");
    let domainTimeout;
    apiDomainInput.addEventListener("input", (e) => {
      // Clear previous timeout to debounce the input
      clearTimeout(domainTimeout);

      // Set a new timeout to save the setting after user stops typing
      domainTimeout = setTimeout(() => {
        this.saveApiDomain(e.target.value);
      }, 1000); // Wait 1 second after user stops typing
    });

    // Test connection button
    document.getElementById("testConnection").addEventListener("click", () => {
      this.testApiConnection();
    });

    // Action buttons
    document.getElementById("openWebApp").addEventListener("click", () => {
      this.openWebApp();
    });

    document.getElementById("viewHistory").addEventListener("click", () => {
      this.viewHistory();
    });
  }

  /**
   * Save a setting to Firefox storage
   * @param {string} key - Setting key to save
   * @param {any} value - Setting value to save
   */
  async saveSetting(key, value) {
    try {
      await browser.storage.sync.set({ [key]: value });
      console.log(`Setting saved: ${key} = ${value}`);
    } catch (error) {
      console.error(`Failed to save setting ${key}:`, error);
    }
  }

  /**
   * Save API domain setting to Firefox storage
   * Validates the URL format before saving
   * @param {string} domain - The API domain URL to save
   */
  async saveApiDomain(domain) {
    try {
      // Validate URL format
      if (domain && domain.trim()) {
        // Ensure the URL has a protocol
        let formattedDomain = domain.trim();
        if (
          !formattedDomain.startsWith("http://") &&
          !formattedDomain.startsWith("https://")
        ) {
          formattedDomain = "https://" + formattedDomain;
        }

        // Basic URL validation
        try {
          new URL(formattedDomain);
          await this.saveSetting("apiBaseUrl", formattedDomain);
          console.log(`API domain saved: ${formattedDomain}`);
        } catch (urlError) {
          console.error("Invalid URL format:", formattedDomain);
          this.showConnectionStatus("Invalid URL format", "error");
        }
      } else {
        // If empty, set default
        await this.saveSetting("apiBaseUrl", "https://localhost:3000");
        console.log("API domain reset to default");
      }
    } catch (error) {
      console.error("Failed to save API domain:", error);
    }
  }

  /**
   * Test connection to the configured API domain
   * Performs a health check to verify the API is accessible
   */
  async testApiConnection() {
    const testButton = document.getElementById("testConnection");
    const statusDiv = document.getElementById("connectionStatus");
    const domainInput = document.getElementById("apiDomain");

    try {
      // Get the current domain value
      let domain = domainInput.value.trim();
      if (!domain) {
        domain = "https://localhost:3000";
      }

      // Ensure protocol is present
      if (!domain.startsWith("http://") && !domain.startsWith("https://")) {
        domain = "https://" + domain;
      }

      // Show loading state
      testButton.disabled = true;
      testButton.textContent = "Testing...";
      this.showConnectionStatus("Testing connection...", "loading");

      // Perform health check
      const response = await fetch(`${domain}/api/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        this.showConnectionStatus("✓ Connection successful!", "success");
        console.log("API connection test successful");
      } else {
        this.showConnectionStatus(
          `✗ Connection failed: ${response.status}`,
          "error"
        );
        console.error("API connection test failed:", response.status);
      }
    } catch (error) {
      if (error.name === "TimeoutError") {
        this.showConnectionStatus("✗ Connection timeout", "error");
      } else {
        this.showConnectionStatus("✗ Connection failed", "error");
      }
      console.error("API connection test error:", error);
    } finally {
      // Reset button state
      testButton.disabled = false;
      testButton.textContent = "Test";
    }
  }

  /**
   * Show connection status message in the UI
   * @param {string} message - Status message to display
   * @param {string} type - Status type: 'success', 'error', or 'loading'
   */
  showConnectionStatus(message, type) {
    const statusDiv = document.getElementById("connectionStatus");
    statusDiv.textContent = message;
    statusDiv.className = `popup-status ${type}`;

    // Auto-hide success messages after 3 seconds
    if (type === "success") {
      setTimeout(() => {
        statusDiv.textContent = "";
        statusDiv.className = "popup-status";
      }, 3000);
    }
  }

  /**
   * Open the web application in a new tab
   * Retrieves the API base URL from settings and opens the web app
   */
  async openWebApp() {
    try {
      // Get the API base URL from settings
      const settings = await browser.storage.sync.get(["apiBaseUrl"]);
      const webAppUrl = settings.apiBaseUrl || "https://localhost:3000";

      // Open web app in new tab
      await browser.tabs.create({
        url: webAppUrl,
        active: true,
      });

      console.log("Web app opened:", webAppUrl);

      // Close popup after opening web app
      window.close();
    } catch (error) {
      console.error("Failed to open web app:", error);
      // Show error message to user (could be enhanced with a toast notification)
      alert("Failed to open web app. Please check your settings.");
    }
  }

  /**
   * View extraction history
   * This is a placeholder for future functionality
   * Could be implemented to show a history of extracted jobs
   */
  async viewHistory() {
    try {
      console.log("View history clicked");

      // For now, just show an alert
      // In the future, this could open a history page or show a list
      alert(
        "History feature coming soon! This will show your previously extracted jobs."
      );

      // Future implementation could:
      // 1. Get history from Firefox storage
      // 2. Display a list of extracted jobs
      // 3. Allow re-opening jobs in the web app
    } catch (error) {
      console.error("Failed to view history:", error);
    }
  }
}

// Initialize popup manager when the popup loads
// This creates a new instance of PopupManager for each popup opening
new PopupManager();
