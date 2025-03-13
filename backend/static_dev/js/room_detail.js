document.addEventListener("DOMContentLoaded", async () => {
  // Check if token exists in localStorage
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/login/";
    return;
  }

  const roomId = window.location.pathname.split("/").filter(Boolean)[1];

  // Variables to track state
  let objects = [];
  let userRanking = {};
  let comments = "";
  let isConfirmed = false;
  let saveTimeout = null;
  let draggedItem = null;
  let placeholder = null;
  let dragStartIndex = 0;
  let touchY = 0;
  let isMobile = "ontouchstart" in window || navigator.maxTouchPoints > 0;

  // DOM elements
  const rankingContainer = document.getElementById("rankingContainer");
  const loadingElement = document.getElementById("loadingObjects");
  const noObjectsElement = document.getElementById("noObjects");
  const commentsInputMobile = document.getElementById("commentsInputMobile");
  const commentsInputDesktop = document.getElementById("commentsInputDesktop");
  const confirmButton = document.getElementById("confirmButton");
  const confirmButtonDesktop = document.getElementById("confirmButtonDesktop");
  const confirmButtonMobile = document.getElementById("confirmButtonMobile");
  const commentsButton = document.getElementById("commentsButton");
  const commentsPanel = document.getElementById("commentsPanel");
  const closeCommentsButton = document.getElementById("closeCommentsButton");
  const infoButton = document.getElementById("infoButton");
  const instructionsModal = document.getElementById("instructionsModal");
  const closeInstructionsButton = document.getElementById(
    "closeInstructionsButton",
  );

  // Create placeholder for drag and drop
  placeholder = document.createElement("div");
  placeholder.className = "drop-placeholder";

  // Setup event listeners
  commentsButton.addEventListener("click", toggleCommentsPanel);
  closeCommentsButton.addEventListener("click", toggleCommentsPanel);
  confirmButton.addEventListener("click", confirmRanking);
  confirmButtonDesktop.addEventListener("click", confirmRanking);
  confirmButtonMobile.addEventListener("click", confirmRanking);
  infoButton.addEventListener("click", showInstructions);
  closeInstructionsButton.addEventListener("click", hideInstructions);
  commentsInputMobile.addEventListener("input", handleCommentsChange);
  commentsInputDesktop.addEventListener("input", handleCommentsChange);

  // Initially hide instruction modal
  instructionsModal.style.display = "none";

  // Show instructions modal
  function showInstructions() {
    instructionsModal.style.display = "flex";
    setTimeout(() => {
      instructionsModal.classList.add("visible");
    }, 10);
  }

  // Hide instructions modal
  function hideInstructions() {
    instructionsModal.classList.remove("visible");

    setTimeout(() => {
      instructionsModal.style.display = "none";
    }, 300);
  }

  // Toggle comments panel
  function toggleCommentsPanel() {
    commentsPanel.classList.toggle("visible");
  }

  // Handle comments change
  function handleCommentsChange(e) {
    comments = e.target.value;

    // Sync between mobile and desktop inputs
    if (e.target === commentsInputMobile) {
      commentsInputDesktop.value = comments;
    } else {
      commentsInputMobile.value = comments;
    }

    scheduleSave();
  }

  // Show autosave indicator
  const showAutosaveIndicator = () => {
    const indicator = document.getElementById("autosaveIndicator");
    indicator.classList.add("visible");

    // Hide after 3 seconds
    setTimeout(() => {
      indicator.classList.remove("visible");
    }, 3000);
  };

  // Save ranking to server
  const saveRanking = async (shouldShowIndicator = true) => {
    // Clear any pending save
    if (saveTimeout) clearTimeout(saveTimeout);

    try {
      const response = await fetch(
        `/api/voting/rooms/${roomId}/update-ranking/`,
        {
          method: "POST",
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            vote_data: userRanking,
            comments: comments,
            vote_confirmed: isConfirmed,
          }),
        },
      );

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          const errorText = await response.text();
          errorData = { error: errorText };
        }
        throw new Error(errorData.error || response.statusText);
      }

      const data = await response.json();

      if (shouldShowIndicator) {
        showAutosaveIndicator();
      }

      // Update UI if ranking was confirmed
      if (isConfirmed) {
        updateConfirmationState();
      }

      return true;
    } catch (error) {
      console.error("Error saving ranking:", error);

      // Create a toast notification
      showToast("Failed to save your changes", "error");

      return false;
    }
  };

  // Show toast notification
  function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.textContent = message;
    toast.style.position = "fixed";
    toast.style.bottom = "20px";
    toast.style.left = "50%";
    toast.style.transform = "translateX(-50%)";
    toast.style.color = "white";
    toast.style.padding = "10px 20px";
    toast.style.borderRadius = "8px";
    toast.style.zIndex = "50";

    if (type === "error") {
      toast.style.backgroundColor = "rgba(239, 68, 68, 0.9)";
    } else if (type === "success") {
      toast.style.backgroundColor = "rgba(5, 150, 105, 0.9)";
    } else {
      toast.style.backgroundColor = "rgba(59, 130, 246, 0.9)";
    }

    document.body.appendChild(toast);

    setTimeout(() => {
      document.body.removeChild(toast);
    }, 5000);
  }

  // Schedule a save after user actions
  const scheduleSave = () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => saveRanking(), 2000);
  };

  // Update ranking based on current DOM order
  const updateRanking = () => {
    const rankingItems = document.querySelectorAll(".rank-item");
    userRanking = {};

    rankingItems.forEach((item, index) => {
      const objectId = item.dataset.objectId;
      userRanking[objectId] = index + 1; // 1-based position

      // Update position indicator
      const positionIndicator = item.querySelector(".rank-indicator");
      positionIndicator.textContent = index + 1;
    });

    scheduleSave();
  };

  // Update UI for confirmed state
  const updateConfirmationState = () => {
    const confirmStatus = document.getElementById("confirmStatus");
    confirmStatus.textContent = "Confirmed";
    confirmStatus.classList.remove("status-pending");
    confirmStatus.classList.add("status-confirmed");

    confirmButton.disabled = true;
    confirmButton.textContent = "Ranking Confirmed";
    confirmButton.style.opacity = "0.7";

    confirmButtonDesktop.disabled = true;
    confirmButtonDesktop.textContent = "Ranking Confirmed";
    confirmButtonDesktop.style.opacity = "0.7";

    confirmButtonMobile.disabled = true;
    confirmButtonMobile.style.opacity = "0.7";

    // Disable dragging
    document.querySelectorAll(".rank-item").forEach((item) => {
      item.style.opacity = "0.8";
      const handle = item.querySelector(".drag-handle");
      if (handle) {
        handle.style.display = "none";
      }
    });

    // Disable comments
    commentsInputMobile.disabled = true;
    commentsInputDesktop.disabled = true;
  };

  // Show confirm dialog
  function showConfirmDialog(message, onConfirm) {
    const dialog = document.createElement("div");
    dialog.className = "modal-backdrop";
    dialog.style.display = "flex";

    dialog.innerHTML = `
            <div class="modal-content">
                <div class="mb-4 text-lg font-semibold">Confirmation</div>
                <p class="mb-6">${message}</p>
                <div class="flex justify-end space-x-3">
                    <button id="cancel-confirm" class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                        Cancel
                    </button>
                    <button id="ok-confirm" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Confirm
                    </button>
                </div>
            </div>
        `;

    document.body.appendChild(dialog);

    // Animation
    setTimeout(() => {
      dialog.classList.add("visible");
    }, 10);

    // Event handlers
    dialog.querySelector("#ok-confirm").addEventListener("click", () => {
      document.body.removeChild(dialog);
      if (onConfirm) onConfirm();
    });

    dialog.querySelector("#cancel-confirm").addEventListener("click", () => {
      document.body.removeChild(dialog);
    });
  }

  // Confirm ranking
  async function confirmRanking() {
    if (isConfirmed) return;

    if (Object.keys(userRanking).length !== objects.length) {
      showToast("Please rank all items before confirming", "error");
      return;
    }

    showConfirmDialog(
      "Are you sure you want to confirm your ranking? This action cannot be undone.",
      async () => {
        isConfirmed = true;
        const success = await saveRanking(false);

        if (success) {
          updateConfirmationState();
          showToast("Your ranking has been confirmed successfully!", "success");

          // Close comments panel if open
          if (commentsPanel.classList.contains("visible")) {
            toggleCommentsPanel();
          }
        } else {
          isConfirmed = false;
          showToast("Failed to confirm ranking. Please try again.", "error");
        }
      },
    );
  }

  // Setup drag and drop handling
  function setupDragAndDrop(element) {
    if (isConfirmed) return;

    const handle = element.querySelector(".drag-handle");

    if (isMobile) {
      // Touch-based dragging for mobile
      handle.addEventListener("touchstart", handleTouchStart, {
        passive: false,
      });
      handle.addEventListener("touchmove", handleTouchMove, { passive: false });
      handle.addEventListener("touchend", handleTouchEnd, { passive: false });
    } else {
      // Mouse-based dragging for desktop
      handle.addEventListener("mousedown", handleMouseDown);
    }

    // Mouse drag handlers
    function handleMouseDown(e) {
      e.preventDefault();

      if (isConfirmed) return;

      // Get the starting position
      const items = Array.from(rankingContainer.querySelectorAll(".rank-item"));
      dragStartIndex = items.indexOf(element);

      // Create visual feedback
      element.classList.add("active");

      // Show placeholder
      placeholder.style.height = `${element.offsetHeight}px`;
      placeholder.classList.add("visible");
      rankingContainer.insertBefore(placeholder, element);

      draggedItem = element;

      // Apply absolute positioning
      const rect = element.getBoundingClientRect();
      element.style.position = "absolute";
      element.style.left = "16px"; // Align with container padding
      element.style.width = `${rect.width}px`;
      element.style.top = `${rect.top}px`;
      element.style.zIndex = "1000";

      // Add event listeners for mousemove and mouseup to document
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    function handleMouseMove(e) {
      if (!draggedItem) return;

      const currentY = e.clientY;

      // Move the dragged element to follow the mouse
      draggedItem.style.top = `${currentY - 30}px`;

      // Find position for placeholder
      const items = Array.from(
        rankingContainer.querySelectorAll(".rank-item:not(.active)"),
      );

      let placed = false;
      for (const item of items) {
        const box = item.getBoundingClientRect();
        const boxCenter = box.top + box.height / 2;

        if (currentY < boxCenter) {
          rankingContainer.insertBefore(placeholder, item);
          placed = true;
          break;
        }
      }

      // If we didn't place it before any item, it goes at the end
      if (!placed) {
        rankingContainer.appendChild(placeholder);
      }
    }

    function handleMouseUp(e) {
      if (!draggedItem) return;

      // Remove event listeners
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

      // Reset styles
      draggedItem.style.position = "";
      draggedItem.style.left = "";
      draggedItem.style.top = "";
      draggedItem.style.width = "";
      draggedItem.style.zIndex = "";
      draggedItem.classList.remove("active");

      // Insert at placeholder position
      rankingContainer.insertBefore(draggedItem, placeholder);
      rankingContainer.removeChild(placeholder);
      placeholder.classList.remove("visible");

      // Update ranking
      updateRanking();

      // Reset variables
      draggedItem = null;
    }

    // Touch handlers for mobile
    function handleTouchStart(e) {
      e.preventDefault();
      e.stopPropagation();

      if (isConfirmed) return;

      // Get the starting touch position
      const touch = e.touches[0];
      touchY = touch.clientY;

      // Store the starting position
      const items = Array.from(rankingContainer.querySelectorAll(".rank-item"));
      dragStartIndex = items.indexOf(element);

      // Create visual feedback
      element.classList.add("active");

      // Show placeholder
      placeholder.style.height = `${element.offsetHeight}px`;
      placeholder.classList.add("visible");
      rankingContainer.insertBefore(placeholder, element);

      draggedItem = element;

      // Apply absolute positioning
      const rect = element.getBoundingClientRect();
      element.style.position = "absolute";
      element.style.left = "50%";
      element.style.transform = "translateX(-50%)";
      element.style.top = `${rect.top}px`;
      element.style.width = `${rect.width}px`;
      element.style.zIndex = "1000";
    }

    function handleTouchMove(e) {
      e.preventDefault();
      e.stopPropagation();

      if (!draggedItem) return;

      const touch = e.touches[0];
      const currentY = touch.clientY;

      // Move the dragged element under the finger
      draggedItem.style.top = `${currentY - 30}px`;

      // Find position for placeholder
      const items = Array.from(
        rankingContainer.querySelectorAll(".rank-item:not(.active)"),
      );

      let placed = false;
      for (const item of items) {
        const box = item.getBoundingClientRect();
        const boxCenter = box.top + box.height / 2;

        if (currentY < boxCenter) {
          rankingContainer.insertBefore(placeholder, item);
          placed = true;
          break;
        }
      }

      // If we didn't place it before any item, it goes at the end
      if (!placed) {
        rankingContainer.appendChild(placeholder);
      }
    }

    function handleTouchEnd(e) {
      e.preventDefault();
      e.stopPropagation();

      if (!draggedItem) return;

      // Reset styles
      draggedItem.style.position = "";
      draggedItem.style.left = "";
      draggedItem.style.top = "";
      draggedItem.style.transform = "";
      draggedItem.style.width = "";
      draggedItem.style.zIndex = "";
      draggedItem.classList.remove("active");

      // Insert at placeholder position
      rankingContainer.insertBefore(draggedItem, placeholder);
      rankingContainer.removeChild(placeholder);
      placeholder.classList.remove("visible");

      // Update ranking
      updateRanking();

      // Reset variables
      draggedItem = null;
    }
  }

  // Create an image preview modal
  function showImageModal(imageUrl, altText) {
    const modal = document.createElement("div");
    modal.className = "modal-backdrop";
    modal.style.display = "flex";

    modal.innerHTML = `
            <div class="modal-content p-2 bg-black bg-opacity-80" style="max-width: 90vw;">
                <img src="${imageUrl}" alt="${altText}" class="max-w-full max-h-[80vh] object-contain">
                <button class="absolute top-2 right-2 text-white bg-black bg-opacity-50 rounded-full p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        `;

    document.body.appendChild(modal);

    // Animation
    setTimeout(() => {
      modal.classList.add("visible");
    }, 10);

    // Close button
    modal.querySelector("button").addEventListener("click", () => {
      modal.classList.remove("visible");
      setTimeout(() => {
        document.body.removeChild(modal);
      }, 300);
    });

    // Also close when clicking outside
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.remove("visible");
        setTimeout(() => {
          document.body.removeChild(modal);
        }, 300);
      }
    });
  }

  // Create a ranking item
  function createRankItem(object, position) {
    const item = document.createElement("div");
    item.className = "rank-item";
    item.dataset.objectId = object.id;

    // Determine if we should show an image
    let imageHtml = "";
    if (object.image_url) {
      imageHtml = `
                <div class="image-preview" data-image="${object.image_url}" data-alt="${object.name}">
                    <img src="${object.image_url}" alt="${object.name}">
                </div>
            `;
    }

    item.innerHTML = `
            <div class="rank-indicator">${position}</div>
            ${imageHtml}
            <div class="flex-1">
                <h3 class="font-semibold text-sm md:text-base">${object.name}</h3>
                <p class="text-gray-600 text-xs md:text-sm">${object.description || "No description"}</p>
            </div>
            <div class="drag-handle">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
            </div>
        `;

    // Setup image preview if there's an image
    if (object.image_url) {
      const imagePreview = item.querySelector(".image-preview");
      imagePreview.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        showImageModal(imagePreview.dataset.image, imagePreview.dataset.alt);
      });
    }

    // Setup drag and drop
    setupDragAndDrop(item);

    return item;
  }

  // Load room data and setup UI
  try {
    // Fetch room details
    const roomResponse = await fetch(`/api/voting/rooms/${roomId}/`, {
      headers: {
        Authorization: `Token ${token}`,
      },
    });

    if (!roomResponse.ok) {
      throw new Error("Failed to fetch room details");
    }

    const room = await roomResponse.json();
    document.getElementById("roomName").textContent = room.name;
    document.title = `Room: ${room.name}`;

    // Fetch current participant status
    const participantResponse = await fetch(
      `/api/voting/rooms/${roomId}/participant-status/`,
      {
        headers: {
          Authorization: `Token ${token}`,
        },
      },
    );

    if (participantResponse.ok) {
      const participantData = await participantResponse.json();

      // Set initial values
      userRanking = participantData.vote_data || {};
      comments = participantData.comments || "";
      isConfirmed = participantData.vote_confirmed || false;

      // Update UI with saved comments
      commentsInputMobile.value = comments;
      commentsInputDesktop.value = comments;

      // Update confirmation status
      if (isConfirmed) {
        updateConfirmationState();
      }
    }

    // Fetch objects in this room
    const objectsResponse = await fetch(
      `/api/voting/rooms/${roomId}/objects/`,
      {
        headers: {
          Authorization: `Token ${token}`,
        },
      },
    );

    if (!objectsResponse.ok) {
      throw new Error("Failed to fetch voting objects");
    }

    objects = await objectsResponse.json();

    // Hide loading indicator
    loadingElement.classList.add("hidden");

    if (objects.length === 0) {
      noObjectsElement.classList.remove("hidden");
    } else {
      rankingContainer.classList.remove("hidden");

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
        const itemElement = createRankItem(object, position);
        rankingContainer.appendChild(itemElement);
      });

      // Show instructions automatically if it's the first time
      if (!localStorage.getItem("instructionsShown")) {
        setTimeout(showInstructions, 500);
        localStorage.setItem("instructionsShown", "true");
      }
    }
  } catch (error) {
    console.error("Error:", error);
    loadingElement.classList.add("hidden");
    showToast(`❌ ${error.message}`, "error");
  }
});
