/**
 * Background Script - Firefox Version
 * Handles API communication, context menu creation, and tab management
 * This is the main orchestrator for the extension's functionality
 */

class JobExtractionService {
  constructor() {
    // Set the API base URL - your actual Vercel app URL
    this.apiBaseUrl = "https://localhost:3000";

    // Initialize the service
    this.init();
  }

  /**
   * Initialize the background service
   * Sets up all event listeners, context menu, and keyboard shortcuts
   */
  init() {
    // Listen for messages from content scripts
    browser.runtime.onMessage.addListener(this.handleMessage.bind(this));

    // Listen for extension installation to create context menu
    browser.runtime.onInstalled.addListener(this.handleInstallation.bind(this));

    // Listen for context menu clicks
    browser.contextMenus.onClicked.addListener(
      this.handleContextMenuClick.bind(this)
    );

    // Listen for keyboard shortcut commands
    browser.commands.onCommand.addListener(
      this.handleKeyboardShortcut.bind(this)
    );

    console.log("AI Cover Letter Generator background service initialized");
  }

  /**
   * Handle extension installation
   * Creates the context menu item for job extraction
   * @param {Object} details - Installation details
   */
  handleInstallation(details) {
    if (details.reason === "install") {
      // Create context menu item for job extraction
      browser.contextMenus.create({
        id: "extractJob",
        title: "🤖 Extract Job Info",
        contexts: ["selection"], // Only show when text is selected
      });

      console.log("AI Cover Letter Generator extension installed");

      // Set default configuration in storage
      browser.storage.sync.set({
        apiBaseUrl: this.apiBaseUrl,
        autoExtract: true,
        showNotifications: true,
      });
    }
  }

  /**
   * Handle context menu clicks
   * Processes the job extraction when user clicks the context menu item
   * @param {Object} info - Context menu click information
   * @param {Object} tab - Tab information
   */
  async handleContextMenuClick(info, tab) {
    // Check if the clicked menu item is our job extraction item
    if (info.menuItemId === "extractJob" && info.selectionText) {
      await this.processJobExtraction(info.selectionText, tab.url, tab.title);
    }
  }

  /**
   * Handle keyboard shortcut commands
   * Processes the job extraction when user presses the keyboard shortcut
   * @param {string} command - The command that was triggered
   */
  async handleKeyboardShortcut(command) {
    // Check if the command is our job extraction shortcut
    if (command === "extract-job") {
      try {
        console.log("Keyboard shortcut triggered for job extraction");

        // Get the currently active tab
        const tabs = await browser.tabs.query({
          active: true,
          currentWindow: true,
        });
        const activeTab = tabs[0];

        if (!activeTab) {
          throw new Error("No active tab found");
        }

        // Send message to content script to get selected text
        const response = await browser.tabs.sendMessage(activeTab.id, {
          action: "getSelectedText",
        });

        if (response && response.selectedText) {
          await this.processJobExtraction(
            response.selectedText,
            activeTab.url,
            activeTab.title
          );
        } else {
          // Show notification if no text is selected
          browser.notifications.create({
            type: "basic",
            iconUrl: "icons/icon48.png",
            title: "No Text Selected",
            message:
              "Please select some job-related text first, then use the keyboard shortcut",
          });
        }
      } catch (error) {
        console.error("Keyboard shortcut extraction failed:", error);

        // Show error notification for unexpected errors
        browser.notifications.create({
          type: "basic",
          iconUrl: "icons/icon48.png",
          title: "Extraction Error",
          message: "An unexpected error occurred during extraction",
        });
      }
    }
  }

  /**
   * Process job extraction from selected text
   * Common method used by both context menu and keyboard shortcut
   * @param {string} selectedText - The text selected by the user
   * @param {string} url - URL of the webpage
   * @param {string} title - Title of the webpage
   */
  async processJobExtraction(selectedText, url, title) {
    try {
      console.log(
        "Job extraction requested for text:",
        selectedText.substring(0, 100) + "..."
      );

      // Extract job information from selected text
      const result = await this.extractJobInfo(selectedText, url, title);

      if (result.success) {
        // Show success notification with job title and company
        const jobTitle = result.data.jobTitle || "Job";
        const companyName = result.data.companyName || "Company";

        browser.notifications.create({
          type: "basic",
          iconUrl: "icons/icon48.png",
          title: "Job Added Successfully!",
          message: `${jobTitle} - ${companyName} added to your cover letter generator`,
        });
      } else {
        // Show error notification
        browser.notifications.create({
          type: "basic",
          iconUrl: "icons/icon48.png",
          title: "Extraction Failed",
          message: result.error || "Failed to extract job information",
        });
      }
    } catch (error) {
      console.error("Job extraction failed:", error);

      // Show error notification for unexpected errors
      browser.notifications.create({
        type: "basic",
        iconUrl: "icons/icon48.png",
        title: "Extraction Error",
        message: "An unexpected error occurred during extraction",
      });
    }
  }

  /**
   * Handle messages from content scripts
   * Processes different types of messages from content scripts
   * @param {Object} message - Message from content script
   * @param {Object} sender - Information about the sender
   * @param {Function} sendResponse - Function to send response back
   */
  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.action) {
        case "extractJob":
          // Handle job extraction requests (if needed for future features)
          const result = await this.extractJobInfo(
            message.text,
            message.url,
            message.title
          );
          sendResponse(result);
          break;

        case "openWebApp":
          // Handle requests to open web app with job data
          await this.openWebAppWithJobData(message.jobData);
          sendResponse({ success: true });
          break;

        default:
          // Unknown action
          sendResponse({ success: false, error: "Unknown action" });
      }
    } catch (error) {
      console.error("Background script error:", error);
      sendResponse({ success: false, error: error.message });
    }

    // Return true to keep message channel open for async operations
    return true;
  }

  /**
   * Extract job information from selected text
   * This is the main function that processes job text and sends it to the web app
   * @param {string} text - Selected text from the webpage
   * @param {string} url - URL of the webpage
   * @param {string} title - Title of the webpage
   * @returns {Object} Result object with success status and data/error
   */
  async extractJobInfo(text, url, title) {
    try {
      console.log(
        "Extracting job info from text:",
        text.substring(0, 100) + "..."
      );

      // Send the full selected text to the web app for auto-population
      // This will include ALL the job information, not just parsed parts
      const response = await this.sendJobToWebApp(text, url, title);

      if (!response.success) {
        throw new Error(
          response.error || "Failed to send job information to web app"
        );
      }

      return { success: true, data: response.data };
    } catch (error) {
      console.error("Job extraction failed:", error);
      return { success: false, error: error.message };
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
    const response = await fetch(`${this.apiBaseUrl}/api/auto-populate-job`, {
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
        `API request failed: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  }

  /**
   * Open web application with job data (DEPRECATED - No longer used)
   * This function is kept for compatibility but is no longer called
   * @param {Object} jobData - Job data to pass to the web app
   */
  async openWebAppWithJobData(jobData) {
    // This function is no longer used since we auto-populate instead of opening new tabs
    console.log("openWebAppWithJobData called but not used in new workflow");
  }
}

// Initialize the service when the background script loads
new JobExtractionService();
