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

// --- STATE MANAGEMENT ---
let currentImageBase64: string | null = null;
let currentMimeType: string | null = null;
let lastStyledImageBase64: string | null = null;
let lastStyledMimeType: string | null = null;
let messageInterval: ReturnType<typeof setInterval> | null = null;
let clickPosition: {x: number; y: number} | null = null;

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
  updateRoomImage(base64, mimeType);
  resetPlacementMarker();

  // Reset styled image and hide/disable video controls
  lastStyledImageBase64 = null;
  lastStyledMimeType = null;
  videoControls.classList.add('hidden');
  videoButton.disabled = true;
  videoContainer.classList.add('hidden');
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

  // Augment prompt with placement info if available
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
        currentImageBase64 = data;
        currentMimeType = mimeType;
        updateRoomImage(data, mimeType);

        lastStyledImageBase64 = data;
        lastStyledMimeType = mimeType;
        videoControls.classList.remove('hidden');
        videoButton.disabled = false;
        foundImage = true;
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

  const updateMessage = () => {
    messageIndex = (messageIndex + 1) % VIDEO_MESSAGES.length;
    setLoading(true, VIDEO_MESSAGES[messageIndex]);
  };

  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-2.0-generate-001',
      prompt:
        'Create a short, cinematic video tour of this room, panning slowly to showcase the new style.',
      image: {
        imageBytes: lastStyledImageBase64,
        mimeType: lastStyledMimeType,
      },
      config: {
        numberOfVideos: 1,
      },
    });

    while (!operation.done) {
      updateMessage();
      await new Promise((resolve) => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({operation});
    }

    setLoading(true, 'Finalizing video...');
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;

    if (!downloadLink) {
      throw new Error('Video generation did not return a valid link.');
    }

    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.statusText}`);
    }

    const videoBlob = await response.blob();
    const videoUrl = URL.createObjectURL(videoBlob);

    roomVideo.src = videoUrl;
    videoContainer.classList.remove('hidden');
    responseText.textContent = 'Your video tour is ready!';
  } catch (error) {
    console.error('Video generation failed:', error);
    responseText.textContent = `An error occurred during video generation: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
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

styleButton.addEventListener('click', handleStyleRoom);
videoButton.addEventListener('click', handleGenerateVideo);

// --- INITIALIZATION ---

function populateSampleGallery() {
  SAMPLES.forEach((sample, index) => {
    const item = document.createElement('div');
    item.classList.add('sample-item');
    item.setAttribute('role', 'button');
    item.setAttribute('aria-label', `Select ${sample.name}`);
    item.dataset.index = index.toString();

    const img = document.createElement('img');
    img.src = `data:${sample.mimeType};base64,${sample.base64}`;
    img.alt = sample.name;

    item.appendChild(img);
    sampleGallery.appendChild(item);

    item.addEventListener('click', () => {
      setNewBaseImage(sample.base64, sample.mimeType);
      updateGallerySelection(item);
    });
  });
}

function initialize() {
  try {
    populateSampleGallery();
    const firstSample = SAMPLES[0];
    if (firstSample) {
      setNewBaseImage(firstSample.base64, firstSample.mimeType);
      updateGallerySelection(
        document.querySelector('.sample-item') as HTMLElement,
      );
    }
  } catch (error) {
    console.error('Initialization failed:', error);
    responseText.textContent = 'Could not initialize the application.';
  }
}

initialize();