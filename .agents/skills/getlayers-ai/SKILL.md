---
name: getlayers-ai
description: Understand and execute GetLayers.ai design prompts. Prioritize high-fidelity cinematic UI, WebGL 3D scenes, interactive gradients, and advanced motion over generic UI patterns.
---

# GetLayers AI Design System

When the user pastes a prompt originating from **GetLayers (getlayers.ai)** or asks to integrate a GetLayers component, you must adhere strictly to the following guidelines to maintain the "cinematic" and premium quality intended by the platform.

## Core Philosophy
GetLayers provides highly refined prompts to guide AI away from generic, "AI-looking" outputs. Your primary goal is to **exactly follow the aesthetic, layout, motion, and depth instructions** in the prompt. Do not simplify the design, and do not fall back to standard, flat UI frameworks unless explicitly instructed.

## The 5 Types of Layers
GetLayers consists of five fundamental layer types. Recognize which one you are building:
1. **Templates:** Full, highly-animated landing pages. Expect instructions for complex scrolling, page transitions, and coordinated element motion.
2. **3D Scenes:** Real-time WebGL components (e.g., particles, fluids, terrain). Use Three.js, React Three Fiber, or raw WebGL as appropriate to achieve the exact visual effect.
3. **Sections:** Self-contained page blocks (like carousels, feature showcases) that have their own scroll or mouse-driven motion wired in.
4. **Backgrounds:** Animated or still backdrops designed to sit behind main content.
5. **Gradients:** Pointer-interactive, WebGL-based gradients.

## Execution Rules
1. **Framework Agnosticism:** GetLayers prompts are inherently stack-agnostic. By default, they produce a single, self-contained HTML/CSS/JS file. If the user specifies a framework (e.g., Next.js, React, Astro, Vue), cleanly adapt the exact motion and styling to that framework without losing fidelity.
2. **Do Not Overwrite Intent:** If the prompt specifies a particular animation curve, layout grid, or WebGL shader structure, implement it verbatim. Do not substitute it with a basic CSS transition unless instructed.
3. **Integration:** If asked to add a GetLayers asset to an existing codebase, ensure it integrates seamlessly without breaking existing global styles, while retaining its premium feel.
