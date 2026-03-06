# AI Model Comparator

## What this is
Single-page web app that takes a natural language task and recommends the best AI model across 10 dimensions including energy, cost, carbon, and benchmarks.

## Tech stack
- Plain HTML/CSS/JS — no frameworks
- Tailwind CSS via CDN
- Chart.js via CDN
- Single file: index.html
- Deployed on Vercel

## Rules
- Never split into multiple files
- Never introduce React or any JS framework
- Always preserve the dark space theme (#0a0f1e background)
- Never rewrite existing JS logic — only extend it
- Keep all model data in the MODELS array
- Test that existing classification still works after any change

## Current features
- 10 models with full data
- Keyword-based task classification
- Dynamic radar chart
- Benchmark scores grid
- Filter toggles (budget, carbon, sensitive data)
- Usage projector
- Confidence badges on energy/carbon data