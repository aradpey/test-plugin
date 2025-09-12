/**
 * Content Script - Right-click context menu only (Firefox Version)
 * This script runs on every web page and handles communication with the background script
 * It does NOT automatically detect text selection - that's handled by the context menu
 */

class JobExtractor {
  constructor() {
    // Initialize the job extractor
    this.init();
  }

  /**
   * Initialize the content script
   * Sets up message listeners for communication with background script
   */
  init() {
    // Listen for messages from background script
    // This is the only communication needed for the right-click approach
    browser.runtime.onMessage.addListener(this.handleMessage.bind(this));

    console.log("AI Cover Letter Generator content script loaded");
  }

  /**
   * Handle messages from the background script
   * @param {Object} message - The message object from background script
   * @param {Object} sender - Information about the sender
   * @param {Function} sendResponse - Function to send response back
   */
  handleMessage(message, sender, sendResponse) {
    // Handle different message types from background script
    if (message.action === "hideUI") {
      // In the right-click approach, there's no UI to hide
      // This is kept for compatibility with the background script
      console.log(
        "Hide UI message received (no UI to hide in right-click mode)"
      );
    }

    // Always send a response to acknowledge message receipt
    sendResponse({ received: true });
  }
}

// Initialize the job extractor when the content script loads
// This creates a new instance of JobExtractor for each page
new JobExtractor();
