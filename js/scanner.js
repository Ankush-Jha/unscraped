// ReLoop AI Scanner - Real Camera & Object Recognition

class ReLoopScanner {
    constructor() {
        this.video = null;
        this.canvas = null;
        this.stream = null;
        this.isScanning = false;
        this.facingMode = 'environment'; // 'environment' for back camera, 'user' for front
        this.apiKey = localStorage.getItem('reloop_gemini_api_key') || '';
        this.onDetection = null;
    }

    // Initialize the scanner with video element
    async init(videoElement, canvasElement) {
        this.video = videoElement;
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');

        // Check for camera support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Camera not supported on this device');
        }

        return this;
    }

    // Start camera stream
    async startCamera() {
        try {
            // Stop any existing stream
            this.stopCamera();

            const constraints = {
                video: {
                    facingMode: this.facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;

            return new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.video.play();
                    resolve(true);
                };
            });
        } catch (error) {
            console.error('Camera access error:', error);
            throw error;
        }
    }

    // Stop camera stream
    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    }

    // Toggle between front and back camera
    async toggleCamera() {
        this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
        await this.startCamera();
    }

    // Capture current frame as base64 image
    captureFrame() {
        if (!this.video || !this.canvas) return null;

        // Set canvas size to match video
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;

        // Draw video frame to canvas
        this.ctx.drawImage(this.video, 0, 0);

        // Get base64 image (JPEG for smaller size)
        return this.canvas.toDataURL('image/jpeg', 0.8);
    }

    // Set API key
    setApiKey(key) {
        this.apiKey = key;
        localStorage.setItem('reloop_gemini_api_key', key);
    }

    // Analyze image using Gemini Vision API
    async analyzeImage(imageBase64) {
        if (!this.apiKey) {
            throw new Error('API key not set. Please configure your Gemini API key in settings.');
        }

        // Remove data URL prefix
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

        const prompt = `Analyze this image and identify the main object. For the identified object, provide:
1. Object name (be specific, e.g., "Glass Wine Bottle" not just "bottle")
2. Material composition (e.g., glass, plastic, metal, fabric, mixed materials)
3. Condition assessment (new, like new, good, fair, poor)
4. Estimated trade value in coins (10-500 range, based on usefulness and condition)
5. Whether it's recyclable (yes/no)
6. 3 creative upcycling ideas with difficulty levels

Respond in this exact JSON format:
{
    "objectName": "...",
    "material": "...",
    "condition": "...",
    "estimatedCoins": 0,
    "recyclable": true/false,
    "confidence": 0.0-1.0,
    "upcycleIdeas": [
        {"title": "...", "description": "...", "difficulty": "easy/medium/hard"},
        {"title": "...", "description": "...", "difficulty": "easy/medium/hard"},
        {"title": "...", "description": "...", "difficulty": "easy/medium/hard"}
    ],
    "category": "furniture/tech/books/clothes/kitchen/other"
}`;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: prompt },
                            {
                                inline_data: {
                                    mime_type: 'image/jpeg',
                                    data: base64Data
                                }
                            }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0.4,
                        topK: 32,
                        topP: 1,
                        maxOutputTokens: 1024,
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'API request failed');
            }

            const data = await response.json();

            // Extract the text response
            const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!textResponse) {
                throw new Error('No response from AI');
            }

            // Parse JSON from response (handle markdown code blocks)
            let jsonStr = textResponse;
            const jsonMatch = textResponse.match(/```json\n?([\s\S]*?)\n?```/);
            if (jsonMatch) {
                jsonStr = jsonMatch[1];
            }

            const result = JSON.parse(jsonStr);

            // Add the captured image to the result
            result.capturedImage = imageBase64;
            result.timestamp = new Date().toISOString();

            return result;

        } catch (error) {
            console.error('AI analysis error:', error);
            throw error;
        }
    }

    // Main scan function - capture and analyze
    async scan() {
        this.isScanning = true;

        try {
            // Capture the current frame
            const imageBase64 = this.captureFrame();

            if (!imageBase64) {
                throw new Error('Failed to capture image');
            }

            // Analyze with AI
            const result = await this.analyzeImage(imageBase64);

            // Store result for the result page
            sessionStorage.setItem('reloop_scan_result', JSON.stringify(result));

            return result;

        } finally {
            this.isScanning = false;
        }
    }

    // Analyze an uploaded image file
    async analyzeFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    const result = await this.analyzeImage(e.target.result);
                    sessionStorage.setItem('reloop_scan_result', JSON.stringify(result));
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }
}

// Create global scanner instance
window.reloopScanner = new ReLoopScanner();

// Helper function to show scanning animation
function showScanningOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'scanning-overlay';
    overlay.innerHTML = `
        <div class="scanning-content">
            <div class="scanning-animation">
                <div class="scan-line"></div>
            </div>
            <div class="scanning-text">Analyzing...</div>
        </div>
    `;
    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.9);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    const style = document.createElement('style');
    style.textContent = `
        .scanning-content {
            text-align: center;
        }
        .scanning-animation {
            width: 200px;
            height: 200px;
            border: 3px solid #22c358;
            border-radius: 20px;
            position: relative;
            overflow: hidden;
            margin: 0 auto 20px;
        }
        .scan-line {
            position: absolute;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, transparent, #22c358, transparent);
            animation: scan 1.5s ease-in-out infinite;
        }
        @keyframes scan {
            0%, 100% { top: 0; }
            50% { top: calc(100% - 3px); }
        }
        .scanning-text {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 24px;
            font-weight: 700;
            color: #22c358;
            text-transform: uppercase;
            letter-spacing: 0.1em;
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(overlay);

    return overlay;
}

function hideScanningOverlay() {
    const overlay = document.getElementById('scanning-overlay');
    if (overlay) {
        overlay.remove();
    }
}

// API Key modal
function showApiKeyModal() {
    const modal = document.createElement('div');
    modal.id = 'api-key-modal';
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="hideApiKeyModal()"></div>
        <div class="modal-content">
            <h2>Configure AI Scanner</h2>
            <p>To use real AI scanning, you need a Google Gemini API key.</p>
            <ol>
                <li>Go to <a href="https://aistudio.google.com/apikey" target="_blank">Google AI Studio</a></li>
                <li>Create a free API key</li>
                <li>Paste it below</li>
            </ol>
            <input type="password" id="api-key-input" placeholder="Paste your Gemini API key here" 
                   value="${window.reloopScanner.apiKey || ''}"
                   style="width: 100%; padding: 12px; margin: 16px 0; border-radius: 8px; 
                          border: 1px solid #333; background: #1a1a1a; color: #fff; font-size: 14px;">
            <div style="display: flex; gap: 12px;">
                <button onclick="hideApiKeyModal()" style="flex: 1; padding: 12px; border-radius: 8px; 
                        border: 1px solid #333; background: transparent; color: #888; cursor: pointer;">
                    Cancel
                </button>
                <button onclick="saveApiKey()" style="flex: 1; padding: 12px; border-radius: 8px; 
                        border: none; background: #22c358; color: #000; font-weight: 700; cursor: pointer;">
                    Save Key
                </button>
            </div>
        </div>
    `;
    modal.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
    `;

    const style = document.createElement('style');
    style.id = 'api-modal-style';
    style.textContent = `
        #api-key-modal .modal-backdrop {
            position: absolute;
            inset: 0;
            background: rgba(0, 0, 0, 0.8);
        }
        #api-key-modal .modal-content {
            position: relative;
            background: #0a0a0a;
            border: 1px solid #333;
            border-radius: 20px;
            padding: 24px;
            max-width: 400px;
            width: 100%;
        }
        #api-key-modal h2 {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 20px;
            margin-bottom: 12px;
        }
        #api-key-modal p {
            color: #888;
            margin-bottom: 16px;
        }
        #api-key-modal ol {
            color: #888;
            margin-bottom: 16px;
            padding-left: 20px;
        }
        #api-key-modal a {
            color: #22c358;
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(modal);
}

function hideApiKeyModal() {
    const modal = document.getElementById('api-key-modal');
    const style = document.getElementById('api-modal-style');
    if (modal) modal.remove();
    if (style) style.remove();
}

function saveApiKey() {
    const input = document.getElementById('api-key-input');
    if (input.value.trim()) {
        window.reloopScanner.setApiKey(input.value.trim());
        hideApiKeyModal();
        showToast('API key saved! You can now scan items.', 'success');
    }
}
