/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {GoogleGenAI, Modality} from '@google/genai';
import {SAMPLES} from './samples.js';

// --- CONSTANTS ---
const STYLING_MESSAGES = [
  'Consulting our AI interior designer...',
  'Sketching your new room design...',
  'Adding the perfect finishing touches...',
  'Unleashing digital creativity...',
  'Bringing your vision to life...',
];

const VIDEO_MESSAGES = [
  'Starting video generation...',
  'Setting up the virtual camera...',
  "Directing your room's big debut...",
  'Animating your new style...',
  'Rendering the final cinematic cut...',
  'Polishing the final frames...',
  'Almost there, just a moment more...',
];

// --- DOM ELEMENT REFERENCES ---
const imageContainer = document.getElementById(
  'image-container',
) as HTMLDivElement;
const roomImage = document.getElementById('room-image') as HTMLImageElement;
const placementMarker = document.getElementById(
  'placement-marker',
) as HTMLDivElement;
const loadingOverlay = document.getElementById(
  'loading-overlay',
) as HTMLDivElement;
const loadingText = document.getElementById('loading-text') as HTMLParagraphElement;
const uploadInput = document.getElementById('upload-input') as HTMLInputElement;
const promptInput = document.getElementById('prompt-input') as HTMLTextAreaElement;
const styleButton = document.getElementById('style-btn') as HTMLButtonElement;
const presetButtons = document.querySelectorAll(
  '.preset-btn',
) as NodeListOf<HTMLButtonElement>;
const responseText = document.getElementById('response-text') as HTMLDivElement;
const sampleGallery = document.getElementById(
  'sample-gallery',
) as HTMLDivElement;
const videoControls = document.getElementById(
  'video-controls',
) as HTMLDivElement;
const videoButton = document.getElementById('video-btn') as HTMLButtonElement;
const videoContainer = document.getElementById(
  'video-container',
) as HTMLDivElement;
const roomVideo = document.getElementById('room-video') as HTMLVideoElement;

// New DOM references for features
const undoButton = document.getElementById('undo-btn') as HTMLButtonElement;
const redoButton = document.getElementById('redo-btn') as HTMLButtonElement;
const downloadButton = document.getElementById('download-btn') as HTMLButtonElement;
const shareButton = document.getElementById('share-btn') as HTMLButtonElement;
const copyButton = document.getElementById('copy-btn') as HTMLButtonElement;
const toast = document.getElementById('toast') as HTMLDivElement;
const toastMessage = document.getElementById('toast-message') as HTMLSpanElement;

// New feature DOM references
const zoomInButton = document.getElementById('zoom-in-btn') as HTMLButtonElement;
const zoomOutButton = document.getElementById('zoom-out-btn') as HTMLButtonElement;
const zoomResetButton = document.getElementById('zoom-reset-btn') as HTMLButtonElement;
const getSuggestionsButton = document.getElementById('get-suggestions-btn') as HTMLButtonElement;
const estimateCostButton = document.getElementById('estimate-cost-btn') as HTMLButtonElement;
const aiSuggestionsPanel = document.getElementById('ai-suggestions') as HTMLDivElement;
const suggestionsGrid = document.getElementById('suggestions-grid') as HTMLDivElement;
const costPanel = document.getElementById('cost-panel') as HTMLDivElement;
const costContent = document.getElementById('cost-content') as HTMLDivElement;
const closeCostButton = document.getElementById('close-cost-btn') as HTMLButtonElement;

// Before/After comparison DOM references
const toggleComparisonBtn = document.getElementById('toggle-comparison-btn') as HTMLButtonElement;
const beforeAfterContainer = document.getElementById('before-after-container') as HTMLDivElement;
const beforeImage = document.getElementById('before-image') as HTMLImageElement;
const afterImage = document.getElementById('after-image') as HTMLImageElement;
const comparisonSlider = document.getElementById('comparison-slider') as HTMLDivElement;

// --- STATE MANAGEMENT ---
let currentImageBase64: string | null = null;
let currentMimeType: string | null = null;
let originalImageBase64: string | null = null; // Keep original for before/after comparison
let originalMimeType: string | null = null;
let lastStyledImageBase64: string | null = null;
let lastStyledMimeType: string | null = null;
let messageInterval: ReturnType<typeof setInterval> | null = null;
let clickPosition: {x: number; y: number} | null = null;

// History for undo/redo
interface HistoryState {
  imageBase64: string;
  mimeType: string;
}
const history: HistoryState[] = [];
let historyIndex = -1;
const MAX_HISTORY = 20;

// Zoom state
let zoomLevel: number = 1;
let isDragging: boolean = false;
let dragStartX: number = 0;
let dragStartY: number = 0;
let translateX: number = 0;
let translateY: number = 0;

// Before/After comparison state
let isComparisonMode: boolean = false;
let sliderPosition: number = 50; // percentage

// --- GEMINI API INITIALIZATION ---
const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

// --- HELPER FUNCTIONS ---

/**
 * Toggles the visibility of the loading overlay.
 * @param isLoading - Whether to show the loading state.
 * @param message - The message to display in the loading overlay.
 */
function setLoading(isLoading: boolean, message = 'Processing...') {
  imageContainer.classList.toggle('loading', isLoading);
  loadingOverlay.classList.toggle('hidden', !isLoading);
  styleButton.disabled = isLoading;
  videoButton.disabled = isLoading || !lastStyledImageBase64;
  promptInput.disabled = isLoading;
  loadingText.textContent = message;

  // Clear any running message interval when loading is finished
  if (!isLoading && messageInterval) {
    clearInterval(messageInterval);
    messageInterval = null;
  }
}

/**
 * Converts a File object to a base64 encoded string.
 * @param file - The file to convert.
 * @returns A promise that resolves with the base64 string and MIME type.
 */
function fileToBase64(
  file: File,
): Promise<{base64: string; mimeType: string}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve({base64, mimeType: file.type});
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Updates the main image display on the screen.
 * @param base64 - The base64 string of the image.
 * @param mimeType - The MIME type of the image.
 */
function updateRoomImage(base64: string, mimeType: string) {
  roomImage.src = `data:${mimeType};base64,${base64}`;
}

/**
 * Show toast notification
 */
function showToast(message: string, duration = 3000) {
  toastMessage.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

/**
 * Add current state to history
 */
function addToHistory(imageBase64: string, mimeType: string) {
  // Remove any states after current index (for redo functionality)
  if (historyIndex < history.length - 1) {
    history.splice(historyIndex + 1);
  }
  
  // Add new state
  history.push({imageBase64, mimeType});
  
  // Limit history size
  if (history.length > MAX_HISTORY) {
    history.shift();
  } else {
    historyIndex++;
  }
  
  updateHistoryButtons();
}

/**
 * Update undo/redo button states
 */
function updateHistoryButtons() {
  undoButton.disabled = historyIndex <= 0;
  redoButton.disabled = historyIndex >= history.length - 1;
}

/**
 * Undo to previous state
 */
function handleUndo() {
  if (historyIndex > 0) {
    historyIndex--;
    const state = history[historyIndex];
    currentImageBase64 = state.imageBase64;
    currentMimeType = state.mimeType;
    lastStyledImageBase64 = state.imageBase64;
    lastStyledMimeType = state.mimeType;
    updateRoomImage(state.imageBase64, state.mimeType);
    updateHistoryButtons();
    updateActionButtons();
    showToast('Undone');
  }
}

/**
 * Redo to next state
 */
function handleRedo() {
  if (historyIndex < history.length - 1) {
    historyIndex++;
    const state = history[historyIndex];
    currentImageBase64 = state.imageBase64;
    currentMimeType = state.mimeType;
    lastStyledImageBase64 = state.imageBase64;
    lastStyledMimeType = state.mimeType;
    updateRoomImage(state.imageBase64, state.mimeType);
    updateHistoryButtons();
    updateActionButtons();
    showToast('Redone');
  }
}

/**
 * Update download/share button states
 */
function updateActionButtons() {
  const hasImage = !!lastStyledImageBase64;
  const hasCurrentImage = !!currentImageBase64;
  
  downloadButton.disabled = !hasImage;
  shareButton.disabled = !hasImage;
  copyButton.disabled = !hasImage;
  estimateCostButton.disabled = !hasImage;
  toggleComparisonBtn.disabled = !hasImage;
  
  zoomInButton.disabled = !hasCurrentImage;
  zoomOutButton.disabled = !hasCurrentImage;
  zoomResetButton.disabled = !hasCurrentImage;
}

/**
 * Download styled image
 */
function handleDownload() {
  if (!lastStyledImageBase64 || !lastStyledMimeType) return;
  
  const link = document.createElement('a');
  link.href = `data:${lastStyledMimeType};base64,${lastStyledImageBase64}`;
  link.download = `styled-room-${Date.now()}.${lastStyledMimeType.split('/')[1]}`;
  link.click();
  showToast('Image downloaded!');
}

/**
 * Share image
 */
async function handleShare() {
  if (!lastStyledImageBase64 || !lastStyledMimeType) return;
  
  try {
    // Convert base64 to blob
    const response = await fetch(`data:${lastStyledMimeType};base64,${lastStyledImageBase64}`);
    const blob = await response.blob();
    const file = new File([blob], `styled-room.${lastStyledMimeType.split('/')[1]}`, {
      type: lastStyledMimeType,
    });
    
    if (navigator.share) {
      await navigator.share({
        files: [file],
        title: 'My Styled Room',
        text: 'Check out my AI-styled room design!',
      });
      showToast('Shared successfully!');
    } else {
      // Fallback: copy link
      await handleCopyToClipboard();
    }
  } catch (error) {
    console.error('Share failed:', error);
    showToast('Share not supported. Image copied to clipboard!');
    await handleCopyToClipboard();
  }
}

/**
 * Copy image to clipboard
 */
async function handleCopyToClipboard() {
  if (!lastStyledImageBase64 || !lastStyledMimeType) return;
  
  try {
    const response = await fetch(`data:${lastStyledMimeType};base64,${lastStyledImageBase64}`);
    const blob = await response.blob();
    
    await navigator.clipboard.write([
      new ClipboardItem({
        [lastStyledMimeType]: blob,
      }),
    ]);
    
    showToast('Copied to clipboard!');
  } catch (error) {
    console.error('Copy failed:', error);
    showToast('Copy failed. Please try download instead.');
  }
}

/**
 * Resets the placement marker state.
 */
function resetPlacementMarker() {
  clickPosition = null;
  placementMarker.classList.add('hidden');
}

/**
 * Converts click coordinates to a descriptive location string.
 * @param x - The x-coordinate as a percentage.
 * @param y - The y-coordinate as a percentage.
 * @returns A descriptive string like "in the top left corner".
 */
function getPlacementDescription(x: number, y: number): string {
  let vertical = y < 0.33 ? 'top' : y > 0.66 ? 'bottom' : '';
  let horizontal = x < 0.33 ? 'left' : x > 0.66 ? 'right' : '';

  if (!vertical && !horizontal) return 'in the center';
  if (!vertical) return `on the ${horizontal} side`;
  if (!horizontal) return `at the ${vertical}`;

  return `in the ${vertical} ${horizontal} corner`;
}

/**
 * Sets a new base image for styling, resetting any previous results.
 * @param base64
 * @param mimeType
 */
function setNewBaseImage(base64: string, mimeType: string) {
  currentImageBase64 = base64;
  currentMimeType = mimeType;
  // Store the original image for before/after comparison
  originalImageBase64 = base64;
  originalMimeType = mimeType;
  updateRoomImage(base64, mimeType);
  resetPlacementMarker();

  // Reset styled image and hide/disable video controls
  lastStyledImageBase64 = null;
  lastStyledMimeType = null;
  videoControls.classList.add('hidden');
  videoButton.disabled = true;
  videoContainer.classList.add('hidden');
  
  // Reset comparison mode
  if (isComparisonMode) {
    isComparisonMode = false;
    roomImage.style.display = 'block';
    beforeAfterContainer.classList.add('hidden');
    toggleComparisonBtn.innerHTML = '<i class="fa-solid fa-sliders-h"></i> Show Comparison';
  }
  
  // Update action buttons (enable zoom, disable cost)
  updateActionButtons();
  
  // Hide panels
  aiSuggestionsPanel.classList.add('hidden');
  costPanel.classList.add('hidden');
}

/**
 * Updates the visual selection in the sample gallery.
 * @param selectedElement - The gallery item to mark as selected.
 */
function updateGallerySelection(selectedElement: HTMLElement | null) {
  document
    .querySelectorAll('.sample-item')
    .forEach((el) => el.classList.remove('selected'));
  if (selectedElement) {
    selectedElement.classList.add('selected');
  }
}

// --- ZOOM & PAN FUNCTIONS ---

function updateImageTransform() {
  roomImage.style.transform = `scale(${zoomLevel}) translate(${translateX}px, ${translateY}px)`;
}

function handleZoomIn() {
  if (zoomLevel < 3) {
    zoomLevel += 0.25;
    updateImageTransform();
    imageContainer.classList.add('zoomed');
  }
}

function handleZoomOut() {
  if (zoomLevel > 1) {
    zoomLevel -= 0.25;
    updateImageTransform();
    if (zoomLevel === 1) {
      imageContainer.classList.remove('zoomed');
      translateX = 0;
      translateY = 0;
      updateImageTransform();
    }
  }
}

function handleZoomReset() {
  zoomLevel = 1;
  translateX = 0;
  translateY = 0;
  updateImageTransform();
  imageContainer.classList.remove('zoomed');
}

function handleDragStart(e: MouseEvent) {
  if (zoomLevel > 1) {
    isDragging = true;
    dragStartX = e.clientX - translateX;
    dragStartY = e.clientY - translateY;
    imageContainer.style.cursor = 'grabbing';
  }
}

function handleDragMove(e: MouseEvent) {
  if (isDragging && zoomLevel > 1) {
    translateX = e.clientX - dragStartX;
    translateY = e.clientY - dragStartY;
    updateImageTransform();
  }
}

function handleDragEnd() {
  if (isDragging) {
    isDragging = false;
    imageContainer.style.cursor = zoomLevel > 1 ? 'move' : 'grab';
  }
}

// --- AI SUGGESTIONS FUNCTIONS ---

async function handleGetSuggestions() {
  if (!currentImageBase64 || !currentMimeType) {
    showToast('Please upload a room image first!');
    return;
  }

  getSuggestionsButton.disabled = true;
  getSuggestionsButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analyzing...';

  try {
    const prompt = `Analyze this room image and suggest 3 specific interior design styles that would work well. 
    For each style, provide:
    1. A style name (2-3 words)
    2. A brief description (1 sentence, max 15 words)
    3. A reason why it suits this space (1 sentence, max 15 words)
    
    Format as JSON array: [{"name": "...", "description": "...", "reason": "..."}]`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: currentImageBase64,
                mimeType: currentMimeType,
              },
            },
            {text: prompt},
          ],
        },
      ],
    });

    const text = response.text;
    
    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const suggestions = JSON.parse(jsonMatch[0]);
      displaySuggestions(suggestions);
      aiSuggestionsPanel.classList.remove('hidden');
    } else {
      showToast('Failed to parse AI suggestions');
    }
  } catch (error) {
    console.error('Suggestion error:', error);
    showToast('Failed to generate suggestions');
  } finally {
    getSuggestionsButton.disabled = false;
    getSuggestionsButton.innerHTML = '<i class="fa-solid fa-lightbulb"></i> Get AI Suggestions';
  }
}

function displaySuggestions(suggestions: any[]) {
  suggestionsGrid.innerHTML = '';
  
  suggestions.slice(0, 3).forEach((suggestion, index) => {
    const card = document.createElement('div');
    card.className = 'suggestion-card';
    card.innerHTML = `
      <span class="suggestion-badge"><i class="fa-solid fa-star"></i> Top ${index + 1}</span>
      <h4>${suggestion.name || 'Style ' + (index + 1)}</h4>
      <p>${suggestion.description || ''}</p>
      <p style="font-size: 0.75rem; color: var(--text-muted-color); margin-top: 4px;">
        <i class="fa-solid fa-check"></i> ${suggestion.reason || ''}
      </p>
    `;
    
    card.addEventListener('click', () => {
      promptInput.value = `Transform this room in ${suggestion.name} style. ${suggestion.description}`;
      aiSuggestionsPanel.classList.add('hidden');
      showToast(`Applied ${suggestion.name} style!`);
    });
    
    suggestionsGrid.appendChild(card);
  });
}

// --- COST ESTIMATION FUNCTIONS ---

async function handleEstimateCost() {
  if (!lastStyledImageBase64 || !lastStyledMimeType) {
    showToast('Please generate a styled room first!');
    return;
  }

  estimateCostButton.disabled = true;
  estimateCostButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Calculating...';

  try {
    const userPrompt = promptInput.value || 'General room styling';
    const prompt = `Based on this styled room and the request "${userPrompt}", estimate realistic costs.
    
    Provide 4-6 furniture/decor items with estimated prices in USD. Consider mid-range quality.
    Include a total estimated cost.
    
    Format as JSON:
    {
      "total": 0,
      "items": [
        {"name": "Item Name", "description": "Brief desc", "price": 0}
      ]
    }`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: lastStyledImageBase64,
                mimeType: lastStyledMimeType,
              },
            },
            {text: prompt},
          ],
        },
      ],
    });

    const text = response.text;
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const costData = JSON.parse(jsonMatch[0]);
      displayCostEstimation(costData);
      costPanel.classList.remove('hidden');
    } else {
      showToast('Failed to parse cost estimation');
    }
  } catch (error) {
    console.error('Cost estimation error:', error);
    showToast('Failed to estimate costs');
  } finally {
    estimateCostButton.disabled = false;
    estimateCostButton.innerHTML = '<i class="fa-solid fa-calculator"></i> Estimate Cost';
  }
}

function displayCostEstimation(data: any) {
  const total = data.total || 0;
  const items = data.items || [];
  
  costContent.innerHTML = `
    <div class="cost-summary">
      <h4>Estimated Total Cost</h4>
      <p class="total-cost">$${total.toLocaleString()}</p>
    </div>
    <div class="cost-items">
      ${items.map((item: any) => `
        <div class="cost-item">
          <div class="cost-item-info">
            <div class="cost-item-name">${item.name || 'Item'}</div>
            <div class="cost-item-desc">${item.description || ''}</div>
          </div>
          <div class="cost-item-price">$${(item.price || 0).toLocaleString()}</div>
        </div>
      `).join('')}
    </div>
  `;
}

// --- BEFORE/AFTER COMPARISON FUNCTIONS ---

function toggleComparison() {
  isComparisonMode = !isComparisonMode;
  
  if (isComparisonMode) {
    // Show before/after comparison
    roomImage.style.display = 'none';
    beforeAfterContainer.classList.remove('hidden');
    toggleComparisonBtn.innerHTML = '<i class="fa-solid fa-eye"></i> Show Result Only';
    
    // Set images - use ORIGINAL image for before, not current
    if (originalImageBase64 && originalMimeType) {
      beforeImage.src = `data:${originalMimeType};base64,${originalImageBase64}`;
    }
    if (lastStyledImageBase64 && lastStyledMimeType) {
      afterImage.src = `data:${lastStyledMimeType};base64,${lastStyledImageBase64}`;
    }
    
    updateComparisonSlider();
  } else {
    // Show result only
    roomImage.style.display = 'block';
    beforeAfterContainer.classList.add('hidden');
    toggleComparisonBtn.innerHTML = '<i class="fa-solid fa-sliders-h"></i> Show Comparison';
  }
}

function updateComparisonSlider() {
  const afterImageWrapper = beforeAfterContainer.querySelector('.after-image-wrapper') as HTMLElement;
  comparisonSlider.style.left = `${sliderPosition}%`;
  afterImageWrapper.style.clipPath = `inset(0 0 0 ${sliderPosition}%)`;
}

// --- CORE APPLICATION LOGIC ---

/**
 * Handles the main "Style My Room" action. It sends the current image
 * and prompt to the Gemini API and displays the result.
 */
async function handleStyleRoom() {
  if (!currentImageBase64 || !currentMimeType) {
    responseText.textContent = 'Please choose or upload a room image first.';
    return;
  }
  let prompt = promptInput.value.trim();
  if (!prompt) {
    responseText.textContent =
      'Please describe what you want to add to the room.';
    return;
  }

  // Add placement info if available
  if (clickPosition) {
    const placementText = getPlacementDescription(
      clickPosition.x,
      clickPosition.y,
    );
    prompt = `${prompt} ${placementText}`;
  }

  // Start cycling through styling messages
  let messageIndex = 0;
  setLoading(true, STYLING_MESSAGES[messageIndex]);
  messageInterval = setInterval(() => {
    messageIndex = (messageIndex + 1) % STYLING_MESSAGES.length;
    loadingText.textContent = STYLING_MESSAGES[messageIndex];
  }, 3000);

  responseText.textContent = '';
  updateGallerySelection(null);
  resetPlacementMarker();

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: currentImageBase64,
              mimeType: currentMimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    let foundImage = false;
    for (const part of response.candidates[0].content.parts) {
      if (part.text) {
        responseText.textContent = part.text;
      } else if (part.inlineData) {
        const {data, mimeType} = part.inlineData;
        // Update current image to show the styled result
        currentImageBase64 = data;
        currentMimeType = mimeType;
        updateRoomImage(data, mimeType);

        // Store the styled image separately for comparison and undo/redo
        lastStyledImageBase64 = data;
        lastStyledMimeType = mimeType;
        
        // Add to history for undo/redo
        addToHistory(data, mimeType);
        
        // Update action buttons
        updateActionButtons();
        
        videoControls.classList.remove('hidden');
        videoButton.disabled = false;
        foundImage = true;
        
        showToast('Room styled successfully!');
      }
    }
    if (!foundImage) {
      responseText.textContent =
        'The model did not return an image. Please try a different prompt.';
    }
  } catch (error) {
    console.error('API call failed:', error);
    responseText.textContent = `An error occurred: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    setLoading(false);
  }
}

/**
 * Generates a video tour of the last styled room.
 */
async function handleGenerateVideo() {
  if (!lastStyledImageBase64 || !lastStyledMimeType) {
    responseText.textContent = 'Please style a room before generating a video.';
    return;
  }

  videoContainer.classList.add('hidden');
  let messageIndex = 0;
  setLoading(true, VIDEO_MESSAGES[messageIndex]);

  // Update message every 10 seconds
  messageInterval = setInterval(() => {
    messageIndex = (messageIndex + 1) % VIDEO_MESSAGES.length;
    setLoading(true, VIDEO_MESSAGES[messageIndex]);
  }, 10000);

  try {
    // Generate video using Gemini Veo API
    let operation = await ai.models.generateVideos({
      model: 'veo-2.0-generate-001',
      prompt:
        'Create a short, cinematic 3D video tour of this beautifully styled room. Pan smoothly across the space, showcasing the interior design, furniture placement, and ambiance. Make it feel immersive and professional.',
      image: {
        imageBytes: lastStyledImageBase64,
        mimeType: lastStyledMimeType,
      },
      config: {
        numberOfVideos: 1,
      },
    });

    // Poll for completion
    while (!operation.done) {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      operation = await ai.operations.getVideosOperation({operation});
    }

    setLoading(true, 'Finalizing your video tour...');
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;

    if (!downloadLink) {
      throw new Error('No video generated. Please try again or check your API quota.');
    }

    // Download the generated video
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.statusText}`);
    }

    const videoBlob = await response.blob();
    const videoUrl = URL.createObjectURL(videoBlob);

    roomVideo.src = videoUrl;
    videoContainer.classList.remove('hidden');
    responseText.textContent = '🎬 Your 3D video tour is ready! Click play to watch.';
    setLoading(false);
  } catch (error) {
    console.error('Video generation failed:', error);
    responseText.textContent = `Video generation failed: ${error instanceof Error ? error.message : String(error)}. Please check your API key and try again.`;
    setLoading(false);
  }
}



// --- EVENT LISTENERS ---

imageContainer.addEventListener('click', (event) => {
  const rect = imageContainer.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  clickPosition = {
    x: x / rect.width,
    y: y / rect.height,
  };

  placementMarker.style.left = `${x}px`;
  placementMarker.style.top = `${y}px`;
  placementMarker.classList.remove('hidden');
});

uploadInput.addEventListener('change', async (event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    setLoading(true, 'Uploading image...');
    responseText.textContent = '';
    updateGallerySelection(null);
    try {
      const {base64, mimeType} = await fileToBase64(file);
      setNewBaseImage(base64, mimeType);
    } catch (error) {
      console.error('File to base64 conversion failed:', error);
      responseText.textContent = 'Failed to read the uploaded image.';
    } finally {
      setLoading(false);
    }
  }
});

presetButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const prompt = button.dataset.prompt;
    if (prompt) {
      promptInput.value = prompt;
      promptInput.focus();
    }
  });
});

// New feature event listeners
undoButton.addEventListener('click', handleUndo);
redoButton.addEventListener('click', handleRedo);
downloadButton.addEventListener('click', handleDownload);
shareButton.addEventListener('click', handleShare);
copyButton.addEventListener('click', handleCopyToClipboard);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
    e.preventDefault();
    handleUndo();
  }
  if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
    e.preventDefault();
    handleRedo();
  }
});

// Zoom controls
zoomInButton.addEventListener('click', handleZoomIn);
zoomOutButton.addEventListener('click', handleZoomOut);
zoomResetButton.addEventListener('click', handleZoomReset);

// Image container for panning
imageContainer.addEventListener('mousedown', handleDragStart);
imageContainer.addEventListener('mousemove', handleDragMove);
imageContainer.addEventListener('mouseup', handleDragEnd);
imageContainer.addEventListener('mouseleave', handleDragEnd);

// AI Suggestions and Cost Estimation
getSuggestionsButton.addEventListener('click', handleGetSuggestions);
estimateCostButton.addEventListener('click', handleEstimateCost);
closeCostButton.addEventListener('click', () => {
  costPanel.classList.add('hidden');
});

// Before/After comparison
toggleComparisonBtn.addEventListener('click', toggleComparison);

// Comparison slider dragging
let isSliderDragging = false;
comparisonSlider.addEventListener('mousedown', () => {
  isSliderDragging = true;
});

document.addEventListener('mousemove', (e) => {
  if (isSliderDragging && isComparisonMode) {
    const containerRect = beforeAfterContainer.getBoundingClientRect();
    const x = e.clientX - containerRect.left;
    sliderPosition = (x / containerRect.width) * 100;
    sliderPosition = Math.max(0, Math.min(100, sliderPosition));
    updateComparisonSlider();
  }
});

document.addEventListener('mouseup', () => {
  isSliderDragging = false;
});

styleButton.addEventListener('click', handleStyleRoom);
videoButton.addEventListener('click', handleGenerateVideo);

// --- INITIALIZATION ---

/**
 * Fetches an image from URL and converts it to base64.
 * @param url - The URL of the image to fetch.
 * @returns A promise that resolves with the base64 string and MIME type.
 */
async function urlToBase64(url: string): Promise<{base64: string; mimeType: string}> {
  try {
    console.log('Fetching image from:', url);
    const response = await fetch(url);
    console.log('Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    console.log('Blob received:', blob.size, 'bytes, type:', blob.type);
    const mimeType = blob.type || 'image/jpeg';
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1];
        console.log('Image converted to base64, length:', base64.length);
        resolve({base64, mimeType});
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error fetching image from', url, ':', error);
    throw error;
  }
}

async function populateSampleGallery() {
  // Load all sample images
  for (const [index, sample] of SAMPLES.entries()) {
    const item = document.createElement('div');
    item.classList.add('sample-item');
    item.setAttribute('role', 'button');
    item.setAttribute('aria-label', `Select ${sample.name}`);
    item.dataset.index = index.toString();

    const img = document.createElement('img');
    img.src = sample.url;
    img.alt = sample.name;

    item.appendChild(img);
    sampleGallery.appendChild(item);

    item.addEventListener('click', async () => {
      setLoading(true, 'Loading sample image...');
      try {
        const {base64, mimeType} = await urlToBase64(sample.url);
        setNewBaseImage(base64, mimeType);
        updateGallerySelection(item);
      } catch (error) {
        console.error('Error loading sample:', error);
        responseText.textContent = 'Error loading sample image. Please try again.';
      } finally {
        setLoading(false);
      }
    });
  }
}

async function initialize() {
  try {
    console.log('Starting initialization...');
    console.log('Sample images:', SAMPLES);
    
    // Populate sample gallery first
    await populateSampleGallery();
    console.log('Sample gallery populated');
    
    // Load the first sample image
    const firstSample = SAMPLES[0];
    if (firstSample) {
      console.log('Loading first sample:', firstSample);
      setLoading(true, 'Loading initial sample...');
      const {base64, mimeType} = await urlToBase64(firstSample.url);
      setNewBaseImage(base64, mimeType);
      updateGallerySelection(
        document.querySelector('.sample-item') as HTMLElement,
      );
      setLoading(false);
      console.log('Initialization complete');
    }
  } catch (error) {
    console.error('Initialization failed:', error);
    responseText.textContent = `Could not load sample images. Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    setLoading(false);
  }
}

initialize();