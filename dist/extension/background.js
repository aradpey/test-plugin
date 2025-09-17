/**
 * Background Script - Firefox Version
 * Handles API communication, context menu creation, and tab management
 * This is the main orchestrator for the extension's functionality
 */

class JobExtractionService {
  constructor() {
    // Set the default API base URL - will be overridden by user settings
    this.apiBaseUrl = "https://localhost:3000";

    // Initialize the service
    this.init();
  }

  /**
   * Get the current API base URL from browser storage
   * Falls back to default if no custom URL is configured
   * @returns {Promise<string>} The configured API base URL
   */
  async getApiBaseUrl() {
    try {
      // Get the API base URL from browser storage
      const settings = await browser.storage.sync.get(["apiBaseUrl"]);
      return settings.apiBaseUrl || this.apiBaseUrl;
    } catch (error) {
      console.error("Failed to get API base URL from storage:", error);
      return this.apiBaseUrl;
    }
  }

  /**
   * Initialize the background service
   * Sets up all event listeners, context menu, and keyboard shortcuts
   */
  async init() {
    console.log("Initializing Job Extraction Service...");

    // Create context menu for job extraction
    await this.createContextMenu();

    // Set up event listeners
    this.setupEventListeners();

    console.log("Job Extraction Service initialized successfully");
  }

  /**
   * Create the context menu for job extraction
   * Adds a right-click menu option for extracting job information
   */
  async createContextMenu() {
    try {
      // Remove existing menu items to avoid duplicates
      await browser.contextMenus.removeAll();

      // Create the main context menu item
      await browser.contextMenus.create({
        id: "extractJobInfo",
        title: "🤖 Extract Job Info",
        contexts: ["selection"], // Only show when text is selected
        documentUrlPatterns: ["<all_urls>"], // Available on all websites
      });

      console.log("Context menu created successfully");
    } catch (error) {
      console.error("Failed to create context menu:", error);
    }
  }

  /**
   * Set up all event listeners for the extension
   * Handles context menu clicks, keyboard shortcuts, and tab updates
   */
  setupEventListeners() {
    // Context menu click handler
    browser.contextMenus.onClicked.addListener((info, tab) => {
      if (info.menuItemId === "extractJobInfo") {
        this.handleJobExtraction(info, tab);
      }
    });

    // Keyboard shortcut handler (Alt+Shift+U)
    browser.commands.onCommand.addListener((command, tab) => {
      if (command === "extract-job") {
        this.handleKeyboardShortcut(tab);
      }
    });

    // Tab update handler for auto-extraction
    browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === "complete" && tab.url) {
        this.handleTabUpdate(tab);
      }
    });

    console.log("Event listeners set up successfully");
  }

  /**
   * Handle job extraction from context menu
   * Processes the selected text and sends it to the web app
   * @param {Object} info - Context menu click information
   * @param {Object} tab - Current tab information
   */
  async handleJobExtraction(info, tab) {
    try {
      console.log("Job extraction triggered from context menu");

      // Get the selected text
      const selectedText = info.selectionText;
      if (!selectedText || selectedText.trim().length === 0) {
        console.warn("No text selected for extraction");
        return;
      }

      // Extract job information
      const result = await this.extractJobInfo(
        selectedText,
        tab.url,
        tab.title
      );

      if (result.success) {
        console.log("Job extraction completed successfully");
        // Show success notification if enabled
        await this.showNotification(
          "Job Info Extracted",
          "Job information has been sent to the web app!"
        );
      } else {
        console.error("Job extraction failed:", result.error);
        // Show error notification
        await this.showNotification(
          "Extraction Failed",
          "Failed to extract job information. Please try again."
        );
      }
    } catch (error) {
      console.error("Error in job extraction handler:", error);
      await this.showNotification(
        "Error",
        "An error occurred during job extraction."
      );
    }
  }

  /**
   * Handle keyboard shortcut for job extraction
   * Attempts to get selected text from the current tab
   * @param {Object} tab - Current tab information
   */
  async handleKeyboardShortcut(tab) {
    try {
      console.log("Job extraction triggered from keyboard shortcut");

      // Execute content script to get selected text
      const results = await browser.tabs.executeScript(tab.id, {
        code: "window.getSelection().toString();",
      });

      const selectedText = results[0];
      if (!selectedText || selectedText.trim().length === 0) {
        console.warn("No text selected for extraction");
        await this.showNotification(
          "No Text Selected",
          "Please select some text first, then use the keyboard shortcut."
        );
        return;
      }

      // Extract job information
      const result = await this.extractJobInfo(
        selectedText,
        tab.url,
        tab.title
      );

      if (result.success) {
        console.log("Job extraction completed successfully");
        await this.showNotification(
          "Job Info Extracted",
          "Job information has been sent to the web app!"
        );
      } else {
        console.error("Job extraction failed:", result.error);
        await this.showNotification(
          "Extraction Failed",
          "Failed to extract job information. Please try again."
        );
      }
    } catch (error) {
      console.error("Error in keyboard shortcut handler:", error);
      await this.showNotification(
        "Error",
        "An error occurred during job extraction."
      );
    }
  }

  /**
   * Handle tab updates for auto-extraction
   * Checks if auto-extraction is enabled and processes the page
   * @param {Object} tab - Updated tab information
   */
  async handleTabUpdate(tab) {
    try {
      // Check if auto-extraction is enabled
      const settings = await browser.storage.sync.get(["autoExtract"]);
      if (!settings.autoExtract) {
        return; // Auto-extraction is disabled
      }

      // Check if this is a job posting website
      const isJobSite = this.isJobPostingSite(tab.url);
      if (!isJobSite) {
        return; // Not a job posting site
      }

      console.log("Auto-extraction triggered for job site:", tab.url);

      // Wait a bit for the page to fully load
      setTimeout(async () => {
        try {
          // Execute content script to find job description
          const results = await browser.tabs.executeScript(tab.id, {
            code: `
              // Look for common job description selectors
              const selectors = [
                '[data-testid="job-description"]',
                '.job-description',
                '.job-details',
                '.description',
                '#job-description',
                '.job-content',
                '.job-body'
              ];
              
              for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent.trim().length > 100) {
                  element.textContent.trim();
                }
              }
              
              // Fallback: get all text content and look for job-related keywords
              const bodyText = document.body.textContent;
              const jobKeywords = ['responsibilities', 'requirements', 'qualifications', 'experience', 'skills'];
              const hasJobContent = jobKeywords.some(keyword => 
                bodyText.toLowerCase().includes(keyword)
              );
              
              if (hasJobContent) {
                bodyText.substring(0, 2000); // Limit to first 2000 characters
              } else {
                null;
              }
            `,
          });

          const jobText = results[0];
          if (jobText && jobText.trim().length > 100) {
            // Extract job information
            const result = await this.extractJobInfo(
              jobText,
              tab.url,
              tab.title
            );
            if (result.success) {
              console.log("Auto-extraction completed successfully");
            }
          }
        } catch (error) {
          console.error("Error in auto-extraction:", error);
        }
      }, 2000); // Wait 2 seconds for page to load
    } catch (error) {
      console.error("Error in tab update handler:", error);
    }
  }

  /**
   * Check if a URL is likely a job posting website
   * @param {string} url - URL to check
   * @returns {boolean} True if it's likely a job posting site
   */
  isJobPostingSite(url) {
    const jobSites = [
      "linkedin.com/jobs",
      "indeed.com",
      "glassdoor.com",
      "monster.com",
      "ziprecruiter.com",
      "careerbuilder.com",
      "dice.com",
      "angel.co",
      "stackoverflow.com/jobs",
      "github.com/jobs",
      "remote.co",
      "weworkremotely.com",
    ];

    return jobSites.some((site) => url.toLowerCase().includes(site));
  }

  /**
   * Extract job information from text and send to web app
   * @param {string} text - Text to extract job information from
   * @param {string} url - URL of the webpage
   * @param {string} title - Title of the webpage
   * @returns {Object} Result object with success status and data/error
   */
  async extractJobInfo(text, url, title) {
    try {
      console.log("Extracting job information from text...");

      // Send job information to web app
      const result = await this.sendJobToWebApp(text, url, title);

      return { success: true, data: result };
    } catch (error) {
      console.error("Job extraction error:", error);

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
    // Get the current API base URL from storage
    const apiBaseUrl = await this.getApiBaseUrl();
    console.log("Sending job to web app using API base URL:", apiBaseUrl);

    const response = await fetch(`${apiBaseUrl}/api/auto-populate-job`, {
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
   * Show a notification to the user
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   */
  async showNotification(title, message) {
    try {
      // Check if notifications are enabled
      const settings = await browser.storage.sync.get(["showNotifications"]);
      if (settings.showNotifications === false) {
        return; // Notifications are disabled
      }

      await browser.notifications.create({
        type: "basic",
        iconUrl: "icons/icon48.png",
        title: title,
        message: message,
      });
    } catch (error) {
      console.error("Failed to show notification:", error);
    }
  }

  /**
   * Open web application with job data (DEPRECATED - No longer used)
   * This function is kept for compatibility but is no longer called
   * @param {Object} jobData - Job data to pass to the web app
   */
  async openWebAppWithJobData(jobData) {
    console.log("openWebAppWithJobData called (deprecated):", jobData);
    // This function is no longer used but kept for compatibility
  }
}

// Initialize the service when the background script loads
// This creates a new instance of JobExtractionService
new JobExtractionService();
