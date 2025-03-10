/**
 * Central configuration file for design styles
 * This makes it easy to add, remove, or modify styles throughout the application
 * 
 * To add a new style:
 * 1. Add a new entry to the DESIGN_STYLES array below
 * 2. Include all required properties: value, label, description, prompt, etc.
 * 3. The iconKey should match an icon name from react-icons
 * 
 * All other components will automatically use the new style without further changes
 */

export interface StyleOption {
  // Core properties
  value: string;
  label: string;
  description: string;
  prompt: string;
  
  // Visual representation properties
  iconKey: string;  // Key to identify which icon to use from react-icons
  iconColor: string; // Hex color code for the icon
}

// This is the central definition of all available design styles
export const DESIGN_STYLES: StyleOption[] = [
  {
    value: "glassmorphism",
    label: "Glassmorphism",
    description: "Frosted glass effect with transparency, blur, and subtle borders",
    prompt: "Implement glassmorphism design with frosted glass effects, transparency, blur backgrounds, and subtle borders. Include a gradient background with floating elements.",
    iconKey: "FaGlasses",
    iconColor: "#8B5CF6"
  },
  {
    value: "animated-illustrations",
    label: "Animated Illustrations",
    description: "Custom, moving graphics that enhance storytelling",
    prompt: "Create a design with custom animated illustrations that enhance storytelling. Include smooth transitions, meaningful animations, and graphics that support the narrative flow.",
    iconKey: "FaDrawPolygon",
    iconColor: "#EC4899"
  },
  {
    value: "abstract-geometry",
    label: "Abstract Geometry",
    description: "Bold, geometric shapes and patterns",
    prompt: "Design with bold geometric shapes and abstract patterns. Use strong lines, angles, and mathematical precision to create visual interest and modern aesthetics.",
    iconKey: "FaShapes",
    iconColor: "#F59E0B"
  },
  {
    value: "3d-elements",
    label: "3D Elements",
    description: "Depth and realism through three-dimensional design objects",
    prompt: "Incorporate 3D design elements that create depth and realism. Use lighting, shadows, and perspective to make objects appear to exist in three-dimensional space.",
    iconKey: "FaCube",
    iconColor: "#3B82F6"
  },
  {
    value: "neumorphism",
    label: "Neumorphism",
    description: "Soft, extruded elements that appear to push out from the background",
    prompt: "Use neumorphism (soft UI) design with subtle shadows, extruded elements, monochromatic color schemes, and minimalist icons. Elements should look like they're pressed into or extruded from the surface.",
    iconKey: "MdOutlineDesignServices",
    iconColor: "#9CA3AF"
  },
  {
    value: "modern-saas",
    label: "Modern SaaS",
    description: "Clean, functional interfaces for software-as-a-service products",
    prompt: "Design a clean, functional interface typical of modern SaaS products. Focus on usability, clear information hierarchy, and intuitive navigation patterns optimized for productivity.",
    iconKey: "FaCloudDownloadAlt",
    iconColor: "#0EA5E9"
  },
  {
    value: "material-design",
    label: "Material Design",
    description: "Google's design language with paper-like elements and subtle animations",
    prompt: "Follow Google's Material Design principles with responsive animations, card-based layouts, intentional white space, and bold typography. Include shadows to create depth and hierarchy.",
    iconKey: "FaLayerGroup",
    iconColor: "#EF4444"
  },
  {
    value: "retro-wave",
    label: "Retro Wave/Synthwave",
    description: "80s-inspired design with neon grids and sunset gradients",
    prompt: "Create a retro wave/synthwave aesthetic with 80s-inspired elements, neon colors, grid landscapes, sunset gradients, and retro typography. Evoke nostalgia while maintaining modern usability.",
    iconKey: "FaSun",
    iconColor: "#D946EF"
  },
  {
    value: "isometric-design",
    label: "Isometric Design",
    description: "Three-dimensional illustrations viewed from a specific angle",
    prompt: "Use isometric design principles to create three-dimensional illustrations viewed from a specific angle (30 degrees). Maintain consistent perspective and scale across all elements.",
    iconKey: "FaCubes",
    iconColor: "#10B981"
  },
  {
    value: "dark-mode",
    label: "Dark Mode",
    description: "Low-light interfaces with dark backgrounds and light text",
    prompt: "Create a dark mode interface with deep gray/black backgrounds, careful use of accent colors, reduced brightness, and proper contrast for readability. Optimize for reduced eye strain.",
    iconKey: "FaMoon",
    iconColor: "#1F2937"
  },
  {
    value: "pastel-palette",
    label: "Pastel Palette",
    description: "Soft, light color schemes with desaturated hues",
    prompt: "Design using a pastel color palette with soft, light, desaturated hues. Create a gentle, calming aesthetic with balanced color distribution and subtle contrasts.",
    iconKey: "FaPalette",
    iconColor: "#FBCFE8"
  },
  {
    value: "brutalism",
    label: "Brutalism",
    description: "Raw, unpolished design with stark typography and harsh contrasts",
    prompt: "Implement brutalist web design featuring raw, unpolished aesthetics with bold typography, high contrast, unconventional layouts, and purposefully unrefined elements. Use stark color combinations and embrace visual honesty.",
    iconKey: "FaBold",
    iconColor: "#000000"
  },
  {
    value: "minimalism",
    label: "Minimalism",
    description: "Clean, sparse interfaces with significant whitespace",
    prompt: "Create a minimalist design with extreme simplicity, generous whitespace, limited color palette, refined typography, and only essential elements. Focus on content breathing room and eliminating all decorative elements.",
    iconKey: "FaMinusSquare",
    iconColor: "#94A3B8"
  },
  {
    value: "kinetic-typography",
    label: "Kinetic Typography",
    description: "Text that moves or changes to convey meaning",
    prompt: "Design with kinetic typography where text moves or changes to convey meaning and emotion. Use animated text elements that enhance readability while adding visual interest and emphasis.",
    iconKey: "FaFont",
    iconColor: "#F43F5E"
  },
  {
    value: "gradients-2",
    label: "Gradients 2.0",
    description: "Modern color transitions beyond simple linear gradients",
    prompt: "Implement modern gradient techniques that go beyond simple linear transitions. Use duotone effects, mesh gradients, color overlays, and dynamic gradient animations to create depth and visual interest.",
    iconKey: "FaGradient",
    iconColor: "#8B5CF6"
  },
  {
    value: "moire-patterns",
    label: "Moiré Patterns",
    description: "Visual effects created by overlapping lines or grids",
    prompt: "Create designs featuring moiré patterns - visual effects created by overlapping lines or grids. Use these patterns strategically to create movement, depth, and optical illusions.",
    iconKey: "FaWaveSquare",
    iconColor: "#6366F1"
  },
  {
    value: "accessibility-first",
    label: "Accessibility-First Design",
    description: "Inclusive approaches prioritizing all users' needs",
    prompt: "Design with accessibility as the primary consideration, ensuring the interface works for all users regardless of abilities. Follow WCAG guidelines, use sufficient color contrast, provide text alternatives, and ensure keyboard navigability.",
    iconKey: "FaUniversalAccess",
    iconColor: "#0369A1"
  },
  {
    value: "liquid-animation",
    label: "Liquid Animation",
    description: "Fluid, water-like motion effects",
    prompt: "Incorporate liquid animation effects with fluid, water-like motion. Use organic shapes, smooth transitions, and physics-based movements that mimic liquid properties.",
    iconKey: "FaWater",
    iconColor: "#06B6D4"
  },
  {
    value: "bio-design",
    label: "Bio Design",
    description: "Nature-inspired interfaces with organic elements",
    prompt: "Create a bio-design interface inspired by nature with organic shapes, natural color palettes, biomimicry principles, and elements that reference biological structures and patterns.",
    iconKey: "FaLeaf",
    iconColor: "#84CC16"
  },
  {
    value: "monochrome-photography",
    label: "Monochrome Photography",
    description: "Black and white imagery for dramatic contrast",
    prompt: "Design using monochrome photography with black and white imagery for dramatic contrast. Focus on composition, texture, lighting, and tonal range to create visual impact without color.",
    iconKey: "FaCamera",
    iconColor: "#525252"
  },
  {
    value: "split-screen",
    label: "Split-Screen Layouts",
    description: "Interfaces divided into two distinct sections",
    prompt: "Create a split-screen layout that divides the interface into two distinct sections. Use this division to create visual contrast, separate content types, or highlight different functions.",
    iconKey: "FaColumns",
    iconColor: "#4B5563"
  },
  {
    value: "custom",
    label: "Custom",
    description: "Create your own unique design style",
    prompt: "", // Empty as this will be provided by the user
    iconKey: "FaPaintBrush",
    iconColor: "#EC4899"
  }
];

// Default styles for initial app state
export const DEFAULT_STYLES = [
  "neumorphism",
  "modern-saas",
  "dark-mode",
  "pastel-palette",
  "gradient-2",
  "material-design",
  "minimalism",
  "glassmorphism", 
  "accessibility-first",
  "kinetic-typography",
  "retro-wave",
];

// Get all predefined style values (excluding custom)
export function getPredefinedStyleValues(): string[] {
  return DESIGN_STYLES
    .filter(style => style.value !== "custom")
    .map(style => style.value);
}

// Check if a style is predefined (not custom)
export function isPredefinedStyle(value: string): boolean {
  return getPredefinedStyleValues().includes(value);
}

// Create a map of style values to display names
export function getStyleDisplayNames(): Record<string, string> {
  return Object.fromEntries(
    DESIGN_STYLES.map(style => [style.value, style.label])
  );
}

// Create a map of display names to style values (reverse of getStyleDisplayNames)
export function getDisplayToValueMap(): Record<string, string> {
  return Object.fromEntries(
    DESIGN_STYLES.map(style => [style.label, style.value])
  );
}

// Function to get a style by its value
export function getStyleByValue(value: string): StyleOption | undefined {
  return DESIGN_STYLES.find(style => style.value === value);
}

// Function to get the style description
export function getStyleDescription(value: string): string {
  return getStyleByValue(value)?.description || "Custom design style";
}

// Function to get the style prompt for generation
export function getStylePrompt(value: string): string {
  return getStyleByValue(value)?.prompt || value;
}

// Function to get the style iconKey
export function getStyleIconKey(value: string): string {
  return getStyleByValue(value)?.iconKey || "FaCode";
}

// Function to get the style iconColor
export function getStyleIconColor(value: string): string {
  return getStyleByValue(value)?.iconColor || "#64748B";
}

// Function to get a style by its label rather than value
export function getStyleByLabel(label: string): StyleOption | undefined {
  return DESIGN_STYLES.find(style => style.label === label);
} 