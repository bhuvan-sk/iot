---
name: ui-development-standards
description: Enforces the use of DESIGN.md files and screenshot-to-code principles for all frontend tasks.
trigger: always_on
---

# UI Development Standards

When tasked with building, modifying, or designing frontend UI, you MUST follow these standards:

## 1. DESIGN.md Enforcement
- Always check if a `DESIGN.md` file exists in the project root.
- If it exists, it is the absolute source of truth for the project's design system.
- You must strictly adhere to its color palettes, typography scale, component stylings, spacing, and layout principles. Do NOT invent your own generic UI styles if a `DESIGN.md` is present.

## 2. Screenshot-to-Code Fidelity
- When provided with a screenshot, mockup, Figma design, or screen recording to implement, treat it with the utmost precision.
- Extract typography, colors, layout structures, and spacing carefully.
- Use modern, clean stacks (such as HTML/Tailwind, React/Tailwind, Vue, or the project's existing stack).
- Do not produce "lazy" or simplified approximations of the design. Aim for a pixel-perfect, fully functional translation.

## 3. Synergy with Existing Skills
- Leverage this alongside any existing frontend taste skills (e.g., `image-to-code`, `design-taste-frontend`, `web-design-guidelines`) to ensure the highest possible output quality.
