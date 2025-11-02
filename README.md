# EvoForge

## High-Level Concept

**EvoForge** is a powerful web-based tool for rapid game prototyping and development, driven entirely by a Large Language Model (LLM). It transforms the traditional game development process into an automated, iterative loop where a user provides a high-level concept, and an AI takes over the entire development lifecycle.

The application's core philosophy is **"evolutionary development."** The AI doesn't just generate a single version of a game; it continuously analyzes, critiques, improves, and even bug-fixes its own code in a transparent, observable loop. This allows users to witness a game evolve from a simple concept into a more complex and refined product, guiding the process with natural language instructions.

---

## Core Features

### 1. Initial Game Generation
The process begins with two simple inputs from the user:
-   **Game Concept:** A text description of the game idea (e.g., "A side-scrolling game where a cat jumps over dogs to collect fish").
-   **Game Type:**
    -   **Visual Simulation:** The AI creates a simulation that runs on its own without any player interaction.
    -   **Interactive Game:** The AI implements keyboard controls for player input.

The AI uses this initial prompt to generate a complete, self-contained, and functional `index.html` file that represents the first playable version of the game.

### 2. The Autonomous Evolution Loop
Once the initial game is created, the application's core **evolution loop** begins. In each iteration, the AI performs a series of actions to improve the game:
-   **Visual Analysis:** The app automatically captures a series of screenshots from the running game. This gives the AI visual context, allowing it to "see" the gameplay, detect visual bugs, and understand the game's state over time.
-   **Code Analysis:** The AI reviews the entire current source code to identify bugs, performance bottlenecks, and areas for enhancement.
-   **Memory & Context:** The AI maintains both short-term and long-term memory to ensure coherent development:
    -   **Short-Term Memory:** It remembers its most recent plans to maintain a consistent train of thought.
    -   **Long-Term Memory:** Every 10 iterations, the AI summarizes the previous development phase into a concise memory, helping it stay aligned with the project's overall goals.
-   **Implementation:** Based on its complete analysis, the AI rewrites the game's code to implement the planned improvements, and the application automatically reloads the game with the new version.

### 3. User-Guided Evolution with Developer Notes
The user is not just a passive observer. They can actively steer the AI's development priorities using the **Developer Notes** feature.
-   **Persistent Checklist:** Any note a user adds (e.g., "Make the player jump higher," "Add a score counter") is added to a persistent checklist.
-   **High-Priority Tasks:** The AI is explicitly instructed to treat this checklist as its highest priority. In each iteration, it must review the list and address an outstanding note before it can pursue its own ideas for improvement.

### 4. Unprecedented Transparency
EvoForge is designed to make the AI's "thinking" process as transparent as possible.
-   **Evolution Log:** A detailed, real-time log shows every action the AI takes. More importantly, it displays the AI's structured thoughts for each iteration:
    -   **[Analysis]:** The AI's breakdown of the current game state, code, and visuals.
    -   **[Thought]:** Its reasoning process for deciding what to do next, including how it's addressing developer notes.
    -   **[Plan]:** The single, concrete improvement it has decided to implement for the current iteration.
-   This transparency is invaluable for understanding AI-driven development and debugging the process.

### 5. Flexible LLM Configuration
The application is architected to be backend-agnostic, giving users full control over which LLM they use.
-   **Provider Selection:** Users can switch between:
    -   **Google Gemini:** To use Google's family of models.
    -   **OpenAI / Compatible:** To use OpenAI's models (like GPT-4o) or, crucially, any LLM that exposes an OpenAI-compatible API endpoint.
-   **Local LLM Support:** By providing a **Base URL** (e.g., `http://localhost:1234/v1`), users can connect the application to a local model running on their own machine via tools like **LM Studio** or Ollama.
-   **Customization:** Users can specify their own API key and the exact model name, allowing for complete flexibility and cost control.

### 6. Comprehensive Review and Management Tools
The UI provides a robust set of tools for managing the evolution process.
-   **Review Iterations:** A visual history of every single version of the game is saved. Each entry includes:
    -   A thumbnail screenshot for easy identification.
    -   The ability to load any previous version into the main game window.
    -   A **download button** to save any iteration as a standalone, playable HTML file.
-   **Developer Notes Log:** A dedicated tab shows the complete history of all notes submitted by the user.
-   **Evolution Stats:** A panel displays real-time statistics, including the current iteration number, total running time, and the average time per iteration.
-   **Usage Stats:** To help manage costs and understand API traffic, a detailed table logs every call made to the LLM, breaking down the provider, task, and the size (in characters) of the input and output.

---

## How It Works: The Workflow

1.  **Setup:** The user enters a game concept, selects a game type, and configures their desired LLM provider and model.
2.  **Initiate:** The user clicks "Start Evolution."
3.  **Generation (Iteration 1):** The AI generates the initial `index.html` file based on the concept. The game loads in the central display.
4.  **Evolution Loop (Iteration 2+):**
    a. The application captures screenshots of the running game.
    b. The AI receives the full context: screenshots, current code, the original concept, developer notes, and its own memories.
    c. The AI outputs a JSON object containing its `analysis`, `thought`, `plan`, and the complete `newCode`.
    d. The application parses this response, logs the AI's thoughts, and updates the game display with the new code.
    e. The loop repeats.
5.  **Guidance:** At any point while the loop is running, the user can add a Developer Note to influence the AI's next steps.
6.  **Control:** The user can stop the evolution at any time.
7.  **Review:** After stopping, the user can browse the iteration history, compare versions, and download their favorite ones.

---

## Troubleshooting

### "Failed to fetch" Error with Local Models

If you see an error in the Evolution Log that says `Failed to fetch` when using the "OpenAI / Compatible" provider with a local model (e.g., via LM Studio, Ollama), it's almost always one of two issues.

#### 1. Mixed Content Error (HTTPS vs HTTP) - Very Common!

**What's happening?**
For security, browsers block a secure webpage (loaded from `https://`) from making requests to an insecure server (running on `http://`). Many modern development tools serve apps over HTTPS by default, while local LLM servers like LM Studio run on HTTP. This mismatch causes the browser to block the request.

**How to Fix It:**
You must ensure the web app and your local server are accessed using the same protocol.
-   **Check your local LLM server address** (e.g., `http://localhost:1234`).
-   **Check the address of this web app** in your browser's address bar.
-   If the web app address starts with `https://`, you must change it to `http://` to match your server.

#### 2. Cross-Origin Resource Sharing (CORS) Issue

**What's happening?**
If the Mixed Content issue is not the problem, your local server may not be configured to accept requests from this web application.

**How to Fix It:**
You must configure your local LLM server to allow requests from the origin where this application is running.

-   **For LM Studio:**
    1.  Go to the **Server** tab.
    2.  Find the **CORS** setting (usually a checkbox or toggle).
    3.  **Enable** the CORS setting.
    4.  Restart your server.

-   **For other local servers (like Ollama):**
    You will need to consult the documentation for your specific server software on how to enable CORS. This often involves setting a configuration variable or a command-line flag to allow all origins (`*`) or the specific origin of the app.

### JSON Mode Incompatibility

Some local "OpenAI-compatible" servers do not support the `response_format: { type: "json_object" }` feature that the official OpenAI API provides. This can lead to a `400 Bad Request` error.

**How the App Handles This:**
This application automatically detects when you are using a local server (by checking if a `Base URL` is provided). It will switch from `json_object` mode to a more compatible **text mode** and use a strict prompt to ensure the model still returns valid JSON. This should prevent this error from occurring in most cases.