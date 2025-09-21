# EchoDepict

## The AI Multi-Agent Aural Intelligence System

EchoDepict is a full-stack web application that transforms raw data (from CSV files) or abstract text-based concepts into rich, interactive audio soundscapes. It utilizes a sophisticated multi-agent AI system to analyze input, compose original music, and generate a synchronized, real-time narration, offering users an entirely new way to experience and understand information through sound.

## Agentic AI Architecture

EchoDepict's core intelligence is powered by a Genkit-orchestrated workflow involving three distinct AI agents, each with a specialized role:

1.  **The `Analyzer` Agent**: This is the first point of contact for user input. It performs a deep analysis of the provided data. For CSVs, it identifies trends, seasonality, outliers, and key statistical properties. For text, it conducts thematic analysis, entity recognition, and sentiment tracking. Its output is a structured JSON object detailing these insights.

2.  **The `Composer` Agent**: This agent acts as a creative music theorist. It takes the structured analysis from the `Analyzer` and makes autonomous decisions to translate complex data points into musical elements. It determines the composition's key, tempo, instrumentation, and the precise mapping of data to musical notes—including pitch, duration, and velocity. The result is a digital "sheet music" in JSON format.

3.  **The `Narrator` Agent**: The final agent in the chain is the storyteller. It receives the reports from both the `Analyzer` and the `Composer`. Its task is to synthesize this information into a compelling, human-readable narrative. It generates a timed script that explains what the user is hearing in the audio and why it's significant, creating a karaoke-like experience that syncs perfectly with the soundscape.

## Technology Stack

-   **Frontend**: Next.js, React, TypeScript, Tailwind CSS
-   **Audio Synthesis**: Web Audio API, Tone.js
-   **UI Components**: shadcn/ui
-   **AI Orchestration**: Firebase Genkit
-   **AI Model**: Google Gemini
-   **Deployment**: Firebase App Hosting

## Setup and Installation

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
