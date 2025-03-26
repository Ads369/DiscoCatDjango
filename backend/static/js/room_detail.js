/**
 * Room Detail Page - Voting Application
 *
 * This script handles the functionality for ranking objects in a voting room.
 * Features include drag and drop ranking, autosave, confirmation of votes,
 * and accessibility support.
 */

// Configuration constants
const CONFIG = {
  ENDPOINTS: {
    ROOMS: (id) => `/api/voting/rooms/${id}/`,
    PARTICIPANT_STATUS: (id) => `/api/voting/rooms/${id}/participant-status/`,
    OBJECTS: (id) => `/api/voting/rooms/${id}/objects/`,
    UPDATE_RANKING: (id) => `/api/voting/rooms/${id}/update-ranking/`,
    VERIFY_TOKEN: `/api/auth/verify-token/`,
  },
  AUTOSAVE: {
    DELAY: 2000,
    INDICATOR_DURATION: 3000,
  },
  TOAST: {
    DURATION: 3000,
    FADE_DURATION: 300,
  },
};

// Global state
let objects = [];
let userRanking = {};
let comments = "";
let isConfirmed = false;
let saveTimeout = null;
let roomId = null;

// Page initialization
document.addEventListener("DOMContentLoaded", () => {
  initializeRoomDetail().catch((error) => {
    console.error("Failed to initialize room:", error);
    displayError(`Failed to initialize room: ${error.message}`);
  });
});

/**
 * Initializes the room detail page
 */
async function initializeRoomDetail() {
  // Verify user is authenticated
  const token = verifyAuthentication();
  if (!token) return;

  // Extract room ID from URL
  roomId = extractRoomIdFromUrl();
  if (!roomId) {
    displayError("Invalid room URL");
    return;
  }

  try {
    // Show skeleton loaders
    showObjectsSkeletonLoader();

    // Load room details in parallel with participant status
    const [room, participantData] = await Promise.all([
      fetchRoomDetails(roomId),
      fetchParticipantStatus(roomId),
    ]);

    // Update page with room details
    updatePageTitle(room.name);

    // Initialize state from participant data
    initializeUserState(participantData);

    // Load objects and render them
    const objectsData = await fetchRoomObjects(roomId);
    renderObjects(objectsData);

    // Set up event listeners
    setupEventListeners();
  } catch (error) {
    hideLoadingIndicators();
    displayError(`Error: ${error.message}`);
    console.error("Initialization error:", error);
  }
}

// ===== Authentication Functions =====

/**
 * Verifies that the user is authenticated
 * @returns {string|null} Authentication token or null if not authenticated
 */
function verifyAuthentication() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/login/";
    return null;
  }
  return token;
}

/**
 * Extracts the room ID from the current URL
 * @returns {string|null} Room ID or null if not found
 */
function extractRoomIdFromUrl() {
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  return pathParts.length > 1 ? pathParts[1] : null;
}

// ===== API Functions =====

/**
 * Fetches room details from the API
 * @param {string} roomId - ID of the room
 * @returns {Promise<Object>} Room data
 */
async function fetchRoomDetails(roomId) {
  try {
    const token = verifyAuthentication();
    const response = await fetch(CONFIG.ENDPOINTS.ROOMS(roomId), {
      headers: { Authorization: `Token ${token}` },
    });

    return await handleApiResponse(response);
  } catch (error) {
    console.error("Error fetching room details:", error);
    throw new Error(`Failed to load room details: ${error.message}`);
  }
}

/**
 * Fetches participant status for the current user in this room
 * @param {string} roomId - ID of the room
 * @returns {Promise<Object>} Participant data
 */
async function fetchParticipantStatus(roomId) {
  try {
    const token = verifyAuthentication();
    const response = await fetch(CONFIG.ENDPOINTS.PARTICIPANT_STATUS(roomId), {
      headers: { Authorization: `Token ${token}` },
    });

    if (!response.ok) {
      // Not an error if participant status doesn't exist yet
      return {};
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching participant status:", error);
    return {}; // Continue anyway with empty data
  }
}

/**
 * Fetches objects in the room that can be ranked
 * @param {string} roomId - ID of the room
 * @returns {Promise<Array>} Array of objects
 */
async function fetchRoomObjects(roomId) {
  try {
    const token = verifyAuthentication();
    const response = await fetch(CONFIG.ENDPOINTS.OBJECTS(roomId), {
      headers: { Authorization: `Token ${token}` },
    });

    return await handleApiResponse(response);
  } catch (error) {
    console.error("Error fetching room objects:", error);
    throw new Error(`Failed to load voting objects: ${error.message}`);
  }
}

/**
 * Saves the current ranking to the server
 * @param {boolean} shouldShowIndicator - Whether to show save indicator
 * @returns {Promise<boolean>} Whether save was successful
 */
async function saveRanking(shouldShowIndicator = true) {
  // Clear any pending save
  if (saveTimeout) clearTimeout(saveTimeout);

  try {
    const token = verifyAuthentication();
    const csrfToken = document.querySelector(
      "[name=csrfmiddlewaretoken]",
    )?.value;

    const headers = {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
    };

    // Add CSRF token if available
    if (csrfToken) {
      headers["X-CSRFToken"] = csrfToken;
    }

    const response = await fetch(CONFIG.ENDPOINTS.UPDATE_RANKING(roomId), {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        vote_data: userRanking,
        comments: comments,
        vote_confirmed: isConfirmed,
      }),
    });

    await handleApiResponse(response);

    if (shouldShowIndicator) {
      showAutosaveIndicator();
    }

    // Update UI if ranking was confirmed
    if (isConfirmed) {
      updateConfirmationUI();
    }

    return true;
  } catch (error) {
    console.error("Error saving ranking:", error);
    if (shouldShowIndicator) {
      showToast(`Failed to save changes: ${error.message}`, "error");
    }
    return false;
  }
}

/**
 * Handles API responses consistently
 * @param {Response} response - Fetch API response
 * @returns {Promise<Object>} Parsed JSON if successful
 * @throws {Error} With descriptive message if request failed
 */
async function handleApiResponse(response) {
  if (!response.ok) {
    let errorMessage = `Error ${response.status}: ${response.statusText}`;

    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch (e) {
      // If we can't parse JSON, try text
      try {
        const errorText = await response.text();
        if (errorText) {
          errorMessage = errorText;
        }
      } catch (e2) {
        // Keep the default error message
      }
    }

    throw new Error(errorMessage);
  }

  return response.json();
}

// ===== UI Functions =====

/**
 * Updates the page title with the room name
 * @param {string} roomName - Name of the room
 */
function updatePageTitle(roomName) {
  document.getElementById("roomName").textContent = roomName;
  document.title = `Room: ${roomName}`;
}

/**
 * Initializes user state from participant data
 * @param {Object} participantData - Data from the participant status API
 */
function initializeUserState(participantData) {
  userRanking = participantData.vote_data || {};
  comments = participantData.comments || "";
  isConfirmed = participantData.vote_confirmed || false;

  // Update UI with saved comments
  document.getElementById("commentsInput").value = comments;

  // Update confirmation status
  if (isConfirmed) {
    updateConfirmationUI();
  }
}

/**
 * Renders objects for ranking
 * @param {Array} objectsData - Array of objects to rank
 */
function renderObjects(objectsData) {
  objects = objectsData;

  const rankingContainer = document.getElementById("rankingContainer");
  const loadingElement = document.getElementById("loadingObjects");
  const noObjectsElement = document.getElementById("noObjects");

  // Hide loading indicator
  loadingElement.classList.add("hidden");

  if (objects.length === 0) {
    noObjectsElement.classList.remove("hidden");
    return;
  }

  rankingContainer.classList.remove("hidden");
  rankingContainer.innerHTML = ""; // Clear any skeleton loaders

  // Sort objects based on saved ranking if available
  if (Object.keys(userRanking).length > 0) {
    objects.sort((a, b) => {
      const rankA = userRanking[a.id] || 9999;
      const rankB = userRanking[b.id] || 9999;
      return rankA - rankB;
    });
  }

  // Populate ranking container
  objects.forEach((object, index) => {
    const position = userRanking[object.id] || index + 1;
    renderObjectCard(object, position);
  });

  // Add drop zone events
  setupDropZone();

  // Add keyboard navigation
  setupKeyboardNavigation();
}

/**
 * Renders an individual object card for ranking
 * @param {Object} object - Object data to render
 * @param {number} position - Current position in ranking
 */
function renderObjectCard(object, position) {
  const rankingContainer = document.getElementById("rankingContainer");

  const objectCard = document.createElement("div");
  objectCard.className =
    "drag-item bg-white p-4 rounded-xl shadow mb-4 flex items-center";
  objectCard.dataset.objectId = object.id;
  objectCard.draggable = !isConfirmed;
  objectCard.setAttribute("role", "listitem");
  objectCard.setAttribute("aria-grabbed", !isConfirmed ? "false" : "undefined");
  objectCard.setAttribute("aria-dropeffect", "move");
  objectCard.setAttribute("tabindex", "0");

  let imageHtml = "";
  if (object.image_url) {
    imageHtml = `
            <div class="flex-shrink-0 mr-4">
                <img src="${object.image_url}" alt="" class="w-16 h-16 object-cover rounded-lg">
            </div>
        `;
  }

  objectCard.innerHTML = `
        <div class="position-indicator">${position}</div>
        ${imageHtml}
        <div class="flex-grow">
            <h3 class="font-semibold text-lg">${object.name}</h3>
            <p class="text-gray-600 text-sm">${object.description || ""}</p>
        </div>
    `;

  // Only add drag events if not confirmed
  if (!isConfirmed) {
    objectCard.addEventListener("dragstart", handleDragStart);
    objectCard.addEventListener("dragend", handleDragEnd);
  } else {
    objectCard.classList.add("opacity-75");
  }

  rankingContainer.appendChild(objectCard);
}

/**
 * Shows a skeleton loader for objects
 */
function showObjectsSkeletonLoader() {
  const rankingContainer = document.getElementById("rankingContainer");
  rankingContainer.innerHTML = "";
  rankingContainer.classList.remove("hidden");

  // Create 3 skeleton items
  for (let i = 0; i < 3; i++) {
    const skeleton = document.createElement("div");
    skeleton.className =
      "bg-white p-4 rounded-xl shadow mb-4 flex items-center skeleton-loader";
    skeleton.innerHTML = `
            <div class="position-indicator bg-gray-200 rounded-full"></div>
            <div class="flex-shrink-0 mr-4">
                <div class="w-16 h-16 bg-gray-200 rounded-lg"></div>
            </div>
            <div class="flex-grow">
                <div class="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div class="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
        `;
    rankingContainer.appendChild(skeleton);
  }

  document.getElementById("loadingObjects").classList.add("hidden");
}

/**
 * Hides all loading indicators
 */
function hideLoadingIndicators() {
  document.getElementById("loadingObjects").classList.add("hidden");
}

/**
 * Updates the UI to reflect confirmed status
 */
function updateConfirmationUI() {
  const confirmStatusText = document.getElementById("confirmStatusText");
  confirmStatusText.textContent = "Результаты Отправлены";
  confirmStatusText.classList.remove("text-orange-500");
  confirmStatusText.classList.add("text-green-600");

  const confirmButton = document.getElementById("confirmButton");
  confirmButton.disabled = true;
  confirmButton.textContent = "Результаты Отправлены";

  // Disable dragging
  document.querySelectorAll(".drag-item").forEach((item) => {
    item.draggable = false;
    item.classList.add("opacity-75");
    item.removeEventListener("dragstart", handleDragStart);
    item.removeEventListener("dragend", handleDragEnd);

    // Remove tabindex to indicate it's no longer interactive
    item.removeAttribute("tabindex");
  });

  // Disable comments
  document.getElementById("commentsInput").disabled = true;
}

/**
 * Shows the autosave indicator
 */
function showAutosaveIndicator() {
  const indicator = document.getElementById("autosaveIndicator");
  indicator.classList.remove("opacity-0");
  indicator.classList.add("opacity-100");

  // Hide after delay
  setTimeout(() => {
    indicator.classList.remove("opacity-100");
    indicator.classList.add("opacity-0");
  }, CONFIG.AUTOSAVE.INDICATOR_DURATION);
}

/**
 * Displays a toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type of toast (error, success)
 */
function showToast(message, type = "error") {
  // Remove any existing toasts
  document.querySelectorAll(".toast").forEach((t) => t.remove());

  const toast = document.createElement("div");
  toast.className = `toast toast-${type} fixed bottom-4 right-4 p-4 rounded-lg shadow-lg z-50`;
  toast.textContent = message;
  toast.setAttribute("role", "alert");

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("fade-out");
    setTimeout(() => toast.remove(), CONFIG.TOAST.FADE_DURATION);
  }, CONFIG.TOAST.DURATION);

  return toast;
}

/**
 * Displays an error message on the page
 * @param {string} message - Error message to display
 * @param {boolean} isTemporary - Whether to auto-hide the message
 */
function displayError(message, isTemporary = false) {
  const errorElement = document.getElementById("errorMessage");
  errorElement.textContent = `❌ ${message}`;
  errorElement.classList.remove("hidden");

  if (isTemporary) {
    setTimeout(() => {
      errorElement.classList.add("hidden");
    }, 5000);
  }
}

// ===== Event Setup =====

/**
 * Sets up all event listeners
 */
function setupEventListeners() {
  // Comments input
  const commentsInput = document.getElementById("commentsInput");
  commentsInput.addEventListener(
    "input",
    debounce(() => {
      comments = commentsInput.value;
      scheduleSave();
    }, 500),
  );

  // Disable comments if already confirmed
  if (isConfirmed) {
    commentsInput.disabled = true;
  }

  // Confirm button
  const confirmButton = document.getElementById("confirmButton");
  confirmButton.addEventListener("click", handleConfirmation);
}

/**
 * Sets up the drop zone for drag and drop
 */
function setupDropZone() {
  const rankingContainer = document.getElementById("rankingContainer");
  rankingContainer.addEventListener("dragover", handleDragOver);
  rankingContainer.addEventListener("dragleave", handleDragLeave);
  rankingContainer.addEventListener("drop", handleDrop);
}

/**
 * Sets up keyboard navigation for accessibility
 */
function setupKeyboardNavigation() {
  if (isConfirmed) return;

  document.querySelectorAll(".drag-item").forEach((item) => {
    item.addEventListener("keydown", (e) => {
      const container = document.getElementById("rankingContainer");
      const items = Array.from(container.querySelectorAll(".drag-item"));
      const currentIndex = items.indexOf(item);

      if (e.key === "ArrowUp" && currentIndex > 0) {
        e.preventDefault();
        container.insertBefore(item, items[currentIndex - 1]);
        updateRanking();
        item.focus();
      } else if (e.key === "ArrowDown" && currentIndex < items.length - 1) {
        e.preventDefault();
        if (items[currentIndex + 2]) {
          container.insertBefore(item, items[currentIndex + 2]);
        } else {
          container.appendChild(item);
        }
        updateRanking();
        item.focus();
      }
    });
  });
}

// ===== Drag and Drop Functions =====

let draggedItem = null;

/**
 * Handles the start of a drag operation
 * @param {DragEvent} e - Drag event
 */
function handleDragStart(e) {
  if (isConfirmed) return;

  draggedItem = this;
  this.classList.add("dragging");

  // Set this element's aria-grabbed attribute to true
  this.setAttribute("aria-grabbed", "true");

  // For Firefox
  e.dataTransfer.setData("text/plain", "");
  e.dataTransfer.effectAllowed = "move";

  // Hide ghost image in newer browsers
  try {
    const img = new Image();
    img.src =
      "data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=";
    e.dataTransfer.setDragImage(img, 0, 0);
  } catch (err) {
    console.log("Could not set empty drag image, using default");
  }
}

/**
 * Handles the end of a drag operation
 * @param {DragEvent} e - Drag event
 */
function handleDragEnd(e) {
  if (isConfirmed) return;

  this.classList.remove("dragging");
  this.setAttribute("aria-grabbed", "false");

  const rankingContainer = document.getElementById("rankingContainer");
  rankingContainer.classList.remove("highlight");
}

/**
 * Handles dragging over a drop zone
 * @param {DragEvent} e - Drag event
 */
function handleDragOver(e) {
  if (isConfirmed) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";

  const rankingContainer = document.getElementById("rankingContainer");
  rankingContainer.classList.add("highlight");

  // Get mouse position
  const y = e.clientY;

  // Initialize variables to find the closest element
  let nextElement = null;
  let closestOffset = Number.NEGATIVE_INFINITY;

  // Only iterate through direct children that aren't being dragged
  for (const child of rankingContainer.children) {
    if (child === draggedItem) continue;

    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;

    if (offset < 0 && offset > closestOffset) {
      closestOffset = offset;
      nextElement = child;
    }
  }

  if (nextElement) {
    rankingContainer.insertBefore(draggedItem, nextElement);
  } else {
    rankingContainer.appendChild(draggedItem);
  }

  // Only update visual indicators during drag, not the actual data
  updatePositionIndicators();
}

/**
 * Handles leaving a drop zone
 * @param {DragEvent} e - Drag event
 */
function handleDragLeave(e) {
  if (isConfirmed) return;

  const rankingContainer = document.getElementById("rankingContainer");
  rankingContainer.classList.remove("highlight");
}

/**
 * Handles dropping an item
 * @param {DragEvent} e - Drag event
 */
function handleDrop(e) {
  if (isConfirmed) return;
  e.preventDefault();

  const rankingContainer = document.getElementById("rankingContainer");
  rankingContainer.classList.remove("highlight");

  // Now update the actual data and schedule save
  updateRanking();
}

// ===== Ranking Functions =====

/**
 * Updates only the visual position indicators without saving
 */
function updatePositionIndicators() {
  document.querySelectorAll(".drag-item").forEach((item, index) => {
    const positionIndicator = item.querySelector(".position-indicator");
    positionIndicator.textContent = index + 1;
  });
}

/**
 * Updates the ranking data and schedules a save
 */
function updateRanking() {
  // Update the userRanking object based on current order
  const rankingItems = document.querySelectorAll(".drag-item");
  const newRanking = {};

  rankingItems.forEach((item, index) => {
    const objectId = item.dataset.objectId;
    newRanking[objectId] = index + 1; // 1-based position

    // Update position indicator
    const positionIndicator = item.querySelector(".position-indicator");
    positionIndicator.textContent = index + 1;
  });

  // Only schedule save if ranking actually changed
  if (!isRankingSame(userRanking, newRanking)) {
    userRanking = newRanking;
    scheduleSave();
  }
}

/**
 * Compares two ranking objects to see if they're identical
 * @param {Object} oldRanking - Previous ranking
 * @param {Object} newRanking - New ranking
 * @returns {boolean} Whether rankings are the same
 */
function isRankingSame(oldRanking, newRanking) {
  const oldKeys = Object.keys(oldRanking);
  const newKeys = Object.keys(newRanking);

  if (oldKeys.length !== newKeys.length) return false;

  return oldKeys.every((key) => oldRanking[key] === newRanking[key]);
}

/**
 * Schedules a save operation after a delay
 */
function scheduleSave() {
  // Clear any pending save
  if (saveTimeout) clearTimeout(saveTimeout);

  // Schedule a new save after delay
  saveTimeout = setTimeout(() => {
    saveRanking();
  }, CONFIG.AUTOSAVE.DELAY);
}

// ===== Confirmation Functions =====

/**
 * Handles the confirmation button click
 */
async function handleConfirmation() {
  if (isConfirmed) return;

  if (Object.keys(userRanking).length !== objects.length) {
    showToast("Please rank all items before confirming.", "error");
    return;
  }

  if (
    confirm(
      "Are you sure you want to confirm your ranking? This action cannot be undone.",
    )
  ) {
    // Show loading state
    setConfirmButtonLoading(true);

    isConfirmed = true;
    const success = await saveRanking(false);

    if (success) {
      // Update UI for confirmed state
      updateConfirmationUI();
      showToast("Your ranking has been confirmed successfully!", "success");
    } else {
      isConfirmed = false;
      setConfirmButtonLoading(false);
      showToast("Failed to confirm ranking. Please try again.", "error");
    }
  }
}

/**
 * Sets the confirm button to loading state
 * @param {boolean} isLoading - Whether button should show loading state
 */
function setConfirmButtonLoading(isLoading) {
  const confirmButton = document.getElementById("confirmButton");

  if (isLoading) {
    confirmButton.disabled = true;
    confirmButton.innerHTML = `
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Подтверждение...
        `;
  } else {
    confirmButton.disabled = isConfirmed;
    confirmButton.textContent = isConfirmed
      ? "Результаты Отправлены"
      : "Подтвердить";
  }
}

// ===== Utility Functions =====

/**
 * Debounces a function
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}
