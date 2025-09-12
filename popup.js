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
   * Load settings from Chrome storage
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

      console.log("Settings loaded:", settings);
    } catch (error) {
      console.error("Failed to load settings:", error);
      // Set default values if loading fails
      document.getElementById("autoExtract").checked = true;
      document.getElementById("showNotifications").checked = true;
    }
  }

  /**
   * Add event listeners to all interactive elements
   * Handles user interactions with checkboxes and buttons
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
   * Open the web application in a new tab
   * Retrieves the API base URL from settings and opens the web app
   */
  async openWebApp() {
    try {
      // Get the API base URL from settings
      const settings = await browser.storage.sync.get(["apiBaseUrl"]);
      const webAppUrl = settings.apiBaseUrl || "https://freecov.vercel.app";

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
