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
    description: "Sleek glass-like UI with blur effects and transparency",
    prompt: "Implement glassmorphism design with frosted glass effects, transparency, blur backgrounds, and subtle borders. Include a gradient background with floating elements.",
    iconKey: "FaGlasses",
    iconColor: "#8B5CF6"
  },
  {
    value: "neumorphism",
    label: "Neumorphism",
    description: "Soft UI with subtle shadows and dimensional effects",
    prompt: "Use neumorphism (soft UI) design with subtle shadows, extruded elements, monochromatic color schemes, and minimalist icons. Elements should look like they're pressed into or extruded from the surface.",
    iconKey: "MdOutlineDesignServices",
    iconColor: "#9CA3AF"
  },
  {
    value: "material",
    label: "Material Design",
    description: "Google's material design principles with depth and motion",
    prompt: "Follow Google's Material Design principles with responsive animations, card-based layouts, intentional white space, and bold typography. Include shadows to create depth and hierarchy.",
    iconKey: "FaLayerGroup",
    iconColor: "#EF4444"
  },
  {
    value: "flat",
    label: "Flat Design",
    description: "Minimalist UI with simple elements and bright colors",
    prompt: "Use flat design with minimalist 2D elements, bright colors, simple typography, and lack of 3D effects or gradients. Focus on content clarity and usability.",
    iconKey: "FaSquare",
    iconColor: "#10B981"
  },
  {
    value: "skeuomorphism",
    label: "Skeuomorphism",
    description: "Realistic interface elements that mimic real-world objects",
    prompt: "Design with skeuomorphism principles, creating realistic UI elements that mimic their real-world counterparts with detailed textures, shadows, and 3D effects. Emphasize familiar visual cues and intuitive interactions.",
    iconKey: "FaCube",
    iconColor: "#F97316"
  },
  {
    value: "grid",
    label: "Grid Layout",
    description: "Strong grid-based layouts with geometric precision",
    prompt: "Create a design using a strong grid system with precise geometric layouts, clear alignment, and consistent spacing. Emphasize clean lines, structured content organization, and modular components.",
    iconKey: "FaThLarge",
    iconColor: "#3B82F6"
  },
  {
    value: "brutalism",
    label: "Brutalism",
    description: "Bold, raw and unpolished design with high contrast",
    prompt: "Implement brutalist web design featuring raw, unpolished aesthetics with bold typography, high contrast, unconventional layouts, and purposefully unrefined elements. Use stark color combinations and embrace visual honesty.",
    iconKey: "FaBold",
    iconColor: "#000000"
  },
  {
    value: "minimalism",
    label: "Minimalism",
    description: "Ultra-clean design with maximum whitespace and simplicity",
    prompt: "Create a minimalist design with extreme simplicity, generous whitespace, limited color palette, refined typography, and only essential elements. Focus on content breathing room and eliminating all decorative elements.",
    iconKey: "FaMinusSquare",
    iconColor: "#94A3B8"
  },
  {
    value: "dark-mode",
    label: "Dark Mode",
    description: "Sleek dark-themed UI optimized for night viewing",
    prompt: "Create a dark mode interface with deep gray/black backgrounds, careful use of accent colors, reduced brightness, and proper contrast for readability. Optimize for reduced eye strain.",
    iconKey: "FaMoon",
    iconColor: "#1F2937"
  },
  {
    value: "responsive",
    label: "Responsive/Mobile-First",
    description: "Adapts perfectly to any device with mobile optimization",
    prompt: "Design with mobile-first, responsive principles ensuring perfect adaptation across all device sizes. Use flexible grids, strategic breakpoints, touch-friendly elements, and progressively enhanced features.",
    iconKey: "FaTabletAlt",
    iconColor: "#0EA5E9"
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
  "glassmorphism", 
  "neumorphism", 
  "material"
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