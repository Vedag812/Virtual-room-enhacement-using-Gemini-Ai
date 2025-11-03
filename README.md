# 🎨 DesignLens - AI Interior Design Studio

<div align="center">

**Transform your space with AI-powered interior design.**

Upload a room, visualize stunning transformations, and generate cinematic 3D video tours instantly.

[![Gemini](https://img.shields.io/badge/Powered%20by-Gemini%20AI-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)

</div>

## ✨ Features

### 🎨 **Core Design Tools**
- **🖼️ Upload & Style** - Upload your room photo or choose from curated samples
- **🤖 AI-Powered Transformations** - Powered by Gemini 2.5 Flash for realistic room styling
- **🎬 3D Video Tours** - Generate cinematic walkthroughs using Gemini Veo 2.0
- **📍 Smart Placement** - Click to specify exact furniture placement locations
- **💬 Natural Language** - Simply describe your vision in plain English

### 🔍 **Comparison & Analysis**
- **↔️ Before/After Slider** - Interactive comparison tool with draggable slider
- **💡 AI Style Suggestions** - Get 3 personalized design recommendations based on your room
- **💰 Cost Estimation** - AI-powered budget breakdown with itemized furniture costs
- **⏮️ Undo/Redo** - History tracking with up to 20 saved states

### 🎯 **Enhanced UX**
- **🔍 Zoom & Pan** - Detailed viewing with zoom controls for close inspection
- **� Download/Share** - Save designs or share via social media
- **📋 Copy to Clipboard** - Quick image copying for easy sharing
- **🎭 Quick Presets** - One-click furniture additions (chairs, plants, lamps, art)
- **🌙 Modern UI** - Beautiful gradient-based dark theme with smooth animations

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher recommended)
- A Gemini API key ([Get one here](https://ai.google.dev/))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Vedag812/Showcase.git
   cd Showcase/designlens
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure your API key**
   
   Create a `.env.local` file in the root directory:
   ```bash
   # .env.local
   API_KEY=your_gemini_api_key_here
   ```
   
   **⚠️ Important:** Never commit your API key to the repository!

4. **Add sample images** (Already included)
   
   Ensure these files are in the `public/` folder:
   - `image1.jpg` - Modern Living Room
   - `image2.jpg` - Minimal Studio
   - `image3.jpg` - Contemporary Space

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to `http://localhost:3000` (or the port shown in your terminal)

---

## 🚀 Deployment

### Environment Variables
For production deployment, set the `API_KEY` environment variable in your hosting platform:

**Vercel/Netlify:**
```bash
API_KEY=your_gemini_api_key_here
```

### Build for Production
```bash
npm run build
```

The optimized production build will be in the `dist/` directory.

## 📖 How to Use

### Step 1: Choose a Room
- **Select a Sample**: Click on any of the pre-loaded room samples
- **Upload Your Own**: Click "Upload Your Own Image" to use a photo of your room

### Step 2: Design Your Space
- **Click Placement**: Click on the room image where you want to add furniture
- **Choose a Preset**: Select from Armchair, Potted Plant, Floor Lamp, or Wall Art
- **Custom Description**: Type your own design ideas in natural language

### Step 3: Generate Your Design
- Click "Transform My Room with AI" to let Gemini redesign your space
- Wait for the AI to process (usually 10-30 seconds)
- View your newly styled room!

### Step 4: Create a 3D Video Tour
- After styling, click "Generate 3D Video Tour"
- Gemini Veo 2.0 will create a cinematic walkthrough (this may take 1-3 minutes)
- Play and download your video tour

## 🎯 Technologies Used

| Technology | Purpose |
|------------|---------|
| **Google Gemini AI** | Image generation and video creation |
| **Gemini 2.5 Flash** | Room styling and furniture placement |
| **Gemini Veo 2.0** | 3D video tour generation |
| **TypeScript** | Type-safe development |
| **Vite** | Lightning-fast build tool |
| **Modern CSS** | Gradient-based dark theme with animations |

## 🏗️ Project Structure

```
virtual-room-styler-with-gemini/
├── index.html          # Main HTML structure
├── index.tsx           # TypeScript application logic
├── index.css           # Modern gradient-based styling
├── samples.ts          # Sample room configuration
├── image1.jpg          # Sample room 1
├── image2.jpg          # Sample room 2
├── image3.jpg          # Sample room 3
├── package.json        # Dependencies
├── tsconfig.json       # TypeScript configuration
├── vite.config.ts      # Vite configuration
└── .env.local          # API key (create this)
```

## 🎨 Customization

### Adding More Sample Images

1. Add your image files to the project root
2. Update `samples.ts`:
```typescript
export const SAMPLES: Sample[] = [
  { name: 'Your Room Name', url: '/your-image.jpg' },
  // ... more samples
];
```

### Changing the Theme

Edit the CSS variables in `index.css`:
```css
:root {
  --primary-color: #6366f1;
  --accent-color: #f59e0b;
  --background-color: #0a0e17;
  /* ... more variables */
}
```

## 🚢 Deployment

### Build for Production

```bash
npm run build
```

The optimized files will be in the `dist/` directory.

### Deploy to Vercel, Netlify, or Any Static Host

1. Build the project: `npm run build`
2. Upload the `dist/` folder to your hosting provider
3. Set the `API_KEY` environment variable in your hosting platform

**Important**: For production, use a secure backend to handle API keys instead of exposing them in the client.

## 🔒 Security Notes

- **Never commit `.env.local`** to version control
- For production deployments, use environment variables provided by your hosting platform
- Consider implementing a backend proxy to keep your API key secure

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests

## 📄 License

This project is licensed under the Apache-2.0 License.

## 🙏 Acknowledgments

- Powered by [Google Gemini AI](https://ai.google.dev/)
- Built with [Vite](https://vitejs.dev/)
- Icons from [Font Awesome](https://fontawesome.com/)

---

<div align="center">

**Made with ❤️ using Gemini AI**

[Report Bug](https://github.com/your-username/your-repo/issues) · [Request Feature](https://github.com/your-username/your-repo/issues)

</div>
