/**
 * API Client Utility - Handles communication with the web application API
 * Provides methods for job extraction, data storage, and health checks
 */

class APIClient {
  constructor(baseUrl = null) {
    // Set the base URL for API calls - will be loaded from settings if not provided
    this.baseUrl = baseUrl;
  }

  /**
   * Load API base URL from Firefox storage
   * Retrieves the configured API base URL for making requests
   */
  async loadAPISettings() {
    try {
      // Get the API base URL from settings, fallback to default if not set
      const settings = await browser.storage.sync.get(["apiBaseUrl"]);
      this.baseUrl =
        this.baseUrl || settings.apiBaseUrl || "https://localhost:3000";

      console.log("API Client settings loaded:", this.baseUrl);
    } catch (error) {
      console.error("Failed to load API settings:", error);
      // Use default URL if loading fails
      this.baseUrl = this.baseUrl || "https://localhost:3000";
    }
  }

  /**
   * Send job information to web app for auto-population
   * Sends the full selected text to the web app API for processing and auto-filling
   * @param {string} text - Full selected text from the webpage
   * @param {string} url - URL of the webpage
   * @param {string} title - Title of the webpage
   * @returns {Object} API response with job data
   */
  async sendJobToWebApp(text, url, title) {
    try {
      // Ensure we have the latest API settings before making the request
      await this.loadAPISettings();

      console.log(
        "Sending job to web app for auto-population:",
        text.substring(0, 100) + "..."
      );

      const response = await fetch(`${this.baseUrl}/api/auto-populate-job`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selectedText: text,
          sourceUrl: url,
          pageTitle: title,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Auto-populate API failed: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();
      console.log("Auto-populate API response:", result);

      return result;
    } catch (error) {
      console.error("Auto-populate API error:", error);
      throw error;
    }
  }

  /**
   * Check if the API is healthy and accessible
   * Performs a simple health check to verify API connectivity
   * @returns {boolean} True if API is accessible, false otherwise
   */
  async healthCheck() {
    try {
      // Ensure we have the latest API settings before making the request
      await this.loadAPISettings();

      console.log("Performing API health check...");

      const response = await fetch(`${this.baseUrl}/api/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const isHealthy = response.ok;
      console.log("API health check result:", isHealthy);

      return isHealthy;
    } catch (error) {
      console.error("API health check failed:", error);
      return false;
    }
  }

  /**
   * Update the base URL for API calls
   * Allows dynamic configuration of the API endpoint
   * @param {string} newBaseUrl - New base URL for API calls
   */
  updateBaseUrl(newBaseUrl) {
    this.baseUrl = newBaseUrl;
    console.log("API base URL updated to:", newBaseUrl);
  }
}

// Export for use in other modules
// This allows the APIClient to be used in both browser extension context and Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = APIClient;
} else {
  // Make APIClient available globally in browser context
  window.APIClient = APIClient;
}
