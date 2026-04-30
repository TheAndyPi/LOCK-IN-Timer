# 🔒 LOCK-IN Timer

**AI-based and motivation-driven Pomodoro Timer.**

LOCK-IN Timer is a productivity application designed to help users maintain deep focus by combining a traditional Pomodoro timer with live AI focus tracking and psychologically-backed motivational responses.

## 💡 The Story Behind LOCK-IN

This project was born out of necessity during a demanding finals season. Like many students, I found myself struggling to stay on track and avoid distractions. I built LOCK-IN to serve as a digital accountability partner—not just a clock that counts down, but a system that actively monitors focus and ensures I take the breaks necessary to stay productive without burning out.

## ✨ Key Features

* **Live AI Focus Tracking:** Utilizes computer vision to monitor engagement and alert you when your attention drifts.
* **Intelligent Pomodoro Cycles:** Automated work and break intervals optimized for cognitive endurance.
* **Psychological Reinforcement:** Provides real-time motivational feedback based on your focus levels.
* **Digital Accountability:** Acts as a proactive partner to keep you focused on your tasks until the job is done.

## 🛠️ Tech Stack

* **Frontend:** React, TypeScript, Vite
* **AI/ML:** Gemini API (via Google AI Studio) for focus analysis and motivational logic
* **Styling:** Modern, responsive UI components

## 🚀 Getting Started

### Prerequisites

* [Node.js](https://nodejs.org/) (Latest LTS recommended)
* A Gemini API Key (available at [Google AI Studio](https://aistudio.google.com/))

### Installation & Local Development

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/TheAndyPi/LOCK-IN-Timer.git
    cd LOCK-IN-Timer
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    Create a `.env.local` file in the root directory and add your API key:
    ```env
    VITE_GEMINI_API_KEY=your_api_key_here
    ```

4.  **Start the development server:**
    ```bash
    npm run dev
    ```
