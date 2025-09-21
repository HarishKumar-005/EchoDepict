# EchoDepict
### The AI Multi-Agent Aural Intelligence System

**[Live Demo Link (Coming Soon)]()** | **[Watch the Demo Video (Coming Soon)]()**

![EchoDepict Application Screenshot](URL_TO_YOUR_SCREENSHOT_HERE)

## 💡 Project Motivation & Impact
In a world dominated by visual data representation, a significant barrier exists for individuals with visual impairments and for auditory learners who process information more effectively through sound. Data is everywhere, but its insights are often locked away in charts and graphs. EchoDepict shatters this barrier by creating a new sense for data analysis. It translates complex datasets and abstract concepts into rich, narrated audio soundscapes, making information accessible and understandable in an entirely new way. Our project champions a more inclusive and multi-sensory approach to data, with profound impacts on accessibility in education, research, and beyond.

## ✨ Key Features
- **Multi-Agent AI System:** An Analyzer, Composer, and Narrator agent work autonomously to transform data into sound and story.
- **Dual Input Modes:** Supports both structured `.csv` file uploads and abstract text-based concepts.
- **Real-Time Audio Visualization:** A professional frequency-bar visualizer that reacts to the generated soundscape.
- **Synchronized AI Narration:** A timed script that explains the soundscape, highlighting key data points as they are heard.
- **Interactive Data Inspector:** Allows users to connect specific sounds back to their source data points.
- **Responsive UI with Dual Themes:** A polished and aesthetic interface with both light and dark modes, fully responsive for desktop and mobile.

## 🤖 Agentic AI Architecture
EchoDepict's core intelligence is powered by a Genkit-orchestrated workflow involving three distinct AI agents, each with a specialized role:

1.  **The `Analyzer` Agent**: This is the first point of contact for user input. It performs a deep analysis of the provided data. For CSVs, it identifies trends, seasonality, outliers, and key statistical properties. For text, it conducts thematic analysis, entity recognition, and sentiment tracking. Its output is a structured JSON object detailing these insights.

2.  **The `Composer` Agent**: This agent acts as a creative music theorist. It takes the structured analysis from the `Analyzer` and makes autonomous decisions to translate complex data points into musical elements. It determines the composition's key, tempo, instrumentation, and the precise mapping of data to musical notes—including pitch, duration, and velocity. The result is a digital "sheet music" in JSON format.

3.  **The `Narrator` Agent**: The final agent in the chain is the storyteller. It receives the reports from both the `Analyzer` and the `Composer`. Its task is to synthesize this information into a compelling, human-readable narrative. It generates a timed script that explains what the user is hearing in the audio and why it's significant, creating a karaoke-like experience that syncs perfectly with the soundscape.

## 🚀 How to Use the Demo
1.  Choose an input method: "Describe Concept" or "Upload Data".
2.  Provide your input (e.g., type "The water cycle" or upload a sample CSV).
3.  Click "Compose with AI Agents" and wait for the process to complete.
4.  Press the "Play" button to experience the narrated audio soundscape.
5.  Click and scrub through the visualizer to inspect individual data points.

## 🛠️ Technology Stack
-   **Frontend**: Next.js, React, TypeScript, Tailwind CSS
-   **Audio Synthesis**: Web Audio API, Tone.js
-   **UI Components**: shadcn/ui
-   **AI Orchestration**: Firebase Genkit
-   **AI Model**: Google Gemini
-   **Deployment**: Firebase App Hosting

## ⚙️ Setup and Installation
To run EchoDepict locally, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd echodepict
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env.local` file in the root of the project and add your Firebase and Genkit configuration details.
    ```
    # Example .env.local
    GOOGLE_API_KEY=your_google_ai_api_key
    ```

4.  **Run the development server:**
    The application runs on `http://localhost:9002`.
    ```bash
    npm run dev
    ```

5.  **Start the Genkit developer server (in a separate terminal):**
    This allows the frontend to communicate with the AI flows.
    ```bash
    npm run genkit:dev
    ```
