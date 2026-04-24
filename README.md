# SQLite Viewer

![Python](https://badgen.net/badge/python/3.8+/blue)
![FastAPI](https://badgen.net/badge/framework/FastAPI/teal)
![Status](https://badgen.net/badge/status/active/green)

A lightweight, local web application to visually explore SQLite databases. Built with FastAPI for the backend and Vanilla HTML/JS/CSS for the frontend.

## Features

- **Local & Upload Support:** Connect to a local absolute path or upload a `.db`/`.sqlite` file directly through the UI.
- **Table Exploration:** Automatically fetches and displays all tables in the database.
- **Data Viewer:** View rows and schema information with built-in pagination.
- **Custom Queries:** Run custom `SELECT` or `PRAGMA` queries against your database safely.
- **Read-Only Mode:** Connections are strictly read-only to prevent accidental modifications to your data.

## Getting Started

### Prerequisites
- Python 3 installed on your system.
- Bash shell (Linux/macOS).

### Installation & Running

This project includes a handy startup script that will automatically bootstrap a virtual environment, install the required dependencies, and start the application.

1. Clone or download the repository.
2. Navigate to the project directory.
3. Run the startup script:

```bash
./start.sh
```

4. Open your browser and navigate to `http://localhost:8090`.

## Tech Stack

- **Backend:** Python, FastAPI, Uvicorn, SQLite3
- **Frontend:** Vanilla HTML, CSS, JavaScript
