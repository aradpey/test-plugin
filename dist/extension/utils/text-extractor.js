/**
 * Text Extractor Utility - Handles text processing and validation
 * Provides methods for validating job-related text and extracting relevant content
 */

class TextExtractor {
  constructor() {
    // Keywords that indicate job-related content
    this.jobKeywords = [
      "job",
      "position",
      "role",
      "career",
      "employment",
      "responsibilities",
      "requirements",
      "qualifications",
      "experience",
      "skills",
      "salary",
      "benefits",
      "full-time",
      "part-time",
      "remote",
      "hybrid",
      "developer",
      "engineer",
      "manager",
      "analyst",
      "coordinator",
      "specialist",
      "consultant",
      "director",
      "assistant",
      "lead",
      "senior",
      "junior",
      "intern",
      "contract",
      "freelance",
      "temporary",
    ];
  }

  /**
   * Validate if the selected text appears to be job-related
   * Uses heuristics to determine if text contains job posting information
   * @param {string} text - Text to validate
   * @returns {boolean} True if text appears to be job-related
   */
  isValidJobText(text) {
    // Check if text exists and is a string
    if (!text || typeof text !== "string") {
      return false;
    }

    const trimmedText = text.trim();

    // Check minimum length requirement
    if (trimmedText.length < 50) {
      return false;
    }

    // Check for job-related keywords
    const lowerText = trimmedText.toLowerCase();
    const keywordCount = this.jobKeywords.filter((keyword) =>
      lowerText.includes(keyword)
    ).length;

    // Require at least 2 job-related keywords for validation
    const isValid = keywordCount >= 2;

    console.log(
      `Text validation: ${keywordCount} keywords found, valid: ${isValid}`
    );

    return isValid;
  }

  /**
   * Extract relevant text from selection with additional context
   * Attempts to get more context from surrounding elements
   * @param {Selection} selection - Browser selection object
   * @returns {string|null} Relevant text or null if not valid
   */
  extractRelevantText(selection) {
    // Get the selected text
    const selectedText = selection.toString().trim();

    // Validate the selected text
    if (!this.isValidJobText(selectedText)) {
      return null;
    }

    // Try to get more context from the parent element
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;

    let contextText = selectedText;

    // If the selection is within a text node, try to get more context
    if (container.nodeType === Node.TEXT_NODE) {
      const parentElement = container.parentElement;
      if (parentElement) {
        // Look for job-related elements in the parent hierarchy
        const jobElements = parentElement.querySelectorAll(
          "[class*=\"job\"], [class*=\"position\"], [class*=\"role\"], " +
            "[id*=\"job\"], [id*=\"position\"], [class*=\"description\"], " +
            "[class*=\"requirement\"], [class*=\"responsibility\"]"
        );

        if (jobElements.length > 0) {
          // Combine text from job-related elements
          contextText = Array.from(jobElements)
            .map((el) => el.textContent.trim())
            .join(" ")
            .substring(0, 2000); // Limit context length to avoid API limits
        }
      }
    }

    // Clean and return the text
    return this.cleanText(contextText);
  }

  /**
   * Clean and normalize text content
   * Removes excessive whitespace and normalizes formatting
   * @param {string} text - Text to clean
   * @returns {string} Cleaned text
   */
  cleanText(text) {
    if (!text || typeof text !== "string") {
      return "";
    }

    // Remove excessive whitespace and normalize
    return text
      .replace(/\s+/g, " ") // Replace multiple spaces with single space
      .replace(/\n+/g, "\n") // Replace multiple newlines with single newline
      .replace(/\t+/g, " ") // Replace tabs with spaces
      .trim(); // Remove leading/trailing whitespace
  }

  /**
   * Extract key information from job text
   * Attempts to identify common job posting elements
   * @param {string} text - Job text to analyze
   * @returns {Object} Extracted key information
   */
  extractKeyInfo(text) {
    const cleanedText = this.cleanText(text);
    const lowerText = cleanedText.toLowerCase();

    // Extract potential job title (first line or after common prefixes)
    const titleMatch =
      cleanedText.match(/^(?:job\s*title|position|role):\s*(.+)$/im) ||
      cleanedText.match(/^(.+?)(?:\n|$)/m);
    const title = titleMatch ? titleMatch[1].trim() : "";

    // Extract potential company name
    const companyMatch = cleanedText.match(
      /(?:company|employer|organization):\s*(.+?)(?:\n|$)/im
    );
    const company = companyMatch ? companyMatch[1].trim() : "";

    // Extract potential location
    const locationMatch = cleanedText.match(
      /(?:location|based in|office):\s*(.+?)(?:\n|$)/im
    );
    const location = locationMatch ? locationMatch[1].trim() : "";

    // Extract potential salary information
    const salaryMatch = cleanedText.match(
      /\$[\d,]+(?:-\$[\d,]+)?(?:\s*(?:per\s+year|annually|k|thousand))?/i
    );
    const salary = salaryMatch ? salaryMatch[0] : "";

    return {
      title: title,
      company: company,
      location: location,
      salary: salary,
      textLength: cleanedText.length,
      keywordCount: this.jobKeywords.filter((keyword) =>
        lowerText.includes(keyword)
      ).length,
    };
  }
}

// Export for use in other modules
// This allows the TextExtractor to be used in both browser extension context and Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = TextExtractor;
} else {
  // Make TextExtractor available globally in browser context
  window.TextExtractor = TextExtractor;
}
