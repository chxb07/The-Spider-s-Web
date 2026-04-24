# 🕷 The Spider's Web — Phantom Troupe Network

A high-performance, modular JavaScript implementation of a dynamic Minimum Spanning Tree (MST) system, themed around the Phantom Troupe's network from Greed Island.

## 🌟 Overview

This project implements a real-time interactive graph representing the "Spider's Web." It features a custom **Incremental MST algorithm** that updates the spanning tree efficiently without full re-computation for every modification, alongside an **Anomaly Detection** system to identify "cursed" or suspicious threads.

## 🏗 Modular Architecture

The project has been refactored into a clean, ES6 module-based architecture:

*   **`graph.js`**: Core data structure and graph CRUD (Add/Remove/Update).
*   **`mst.js`**: Kruskal's algorithm, DSU (Union-Find), and incremental path-finding logic.
*   **`anomaly.js`**: Statistical and rule-based anomaly detection (z-score outliers, cursed edges).
*   **`render.js`**: Reactive SVG-based rendering system for the web layout.
*   **`events.js`**: UI event management and form interaction.
*   **`app.js`**: Entry point and application lifecycle management.

## 🚀 Features

*   **Incremental MST Updates**: Uses path-maximum optimization to update the tree in $O(V)$ for adds and removals, rather than $O(E \log E)$.
*   **Anomaly Detection**:
    *   **Cursed Edges**: Identifies threads with non-finite or non-positive weights.
    *   **Statistical Outliers**: Detects edges with weights deviating significantly from the mean (z-score > 2).
    *   **Duplicates & Loops**: Flags parallel threads and self-loops.
*   **Interactive UI**: Full control over edge weaving (adding), retuning (updating), and severing (removing).
*   **Real-time Inspection**: Inspect individual nodes to see their connections and MST status.

## 🛠 Technology Stack

*   **Logic**: Pure JavaScript (ES6+)
*   **Structure**: Semantic HTML5
*   **Styling**: Vanilla CSS3 (Custom properties, Vignette effects)
*   **Visualization**: SVG (Scalable Vector Graphics)

## 📖 How to Run

1.  Clone the repository.
2.  Open `index.html` in any modern web browser.
    *   *Note: Since this project uses ES6 Modules, you must serve it via a local web server (e.g., Live Server, Python `http.server`, or Node `http-server`) to avoid CORS issues with `file://` URLs.*

## 📜 License

Created for the Phantom Troupe — Meteor City.
