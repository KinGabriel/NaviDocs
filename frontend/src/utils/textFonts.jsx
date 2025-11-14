
import React, { useMemo, useState, useCallback } from "react";

/*  TextFonts — Full Font Library */
export const DEFAULT_FONT_CATEGORIES = {
  Serif: [
    "Adamina",
    "Castoro",
    "Georgia",
    "Times New Roman",
    "Merriweather",
    "Garamond",
    "Playfair Display",
    "Lora",
    "Bitter",
    "Cormorant Garamond",
    "EB Garamond",
    "Crimson Text",
    "Libre Baskerville",
    "Noto Serif",
    "Baskerville",
    "Cambria",
    "Constantia",
    "Palatino Linotype",
    "Tinos",
    "Zilla Slab",
  ],

  Sans: [
    "Inter",
    "Arial",
    "Helvetica",
    "Roboto",
    "Open Sans",
    "Verdana",
    "Poppins",
    "Lato",
    "Montserrat",
    "Noto Sans",
    "Nunito",
    "Raleway",
    "Source Sans Pro",
    "Work Sans",
    "Ubuntu",
    "Segoe UI",
    "Gill Sans",
    "Cabin",
    "Titillium Web",
    "Exo 2",
  ],

  Mono: [
    "Courier New",
    "Consolas",
    "Fira Code",
    "Source Code Pro",
    "Monaco",
    "Inconsolata",
    "Ubuntu Mono",
    "JetBrains Mono",
    "Roboto Mono",
    "Space Mono",
    "Cascadia Code",
    "PT Mono",
    "DM Mono",
  ],

  Display: [
    "Oswald",
    "Bebas Neue",
    "Anton",
    "Abril Fatface",
    "Playfair Display SC",
    "Righteous",
    "Lobster",
    "Pacifico",
    "Orbitron",
    "Bungee",
    "Teko",
    "Cinzel",
    "Poiret One",
    "Alfa Slab One",
    "Saira Condensed",
  ],

  Handwriting: [
    "Dancing Script",
    "Great Vibes",
    "Patrick Hand",
    "Shadows Into Light",
    "Satisfy",
    "Caveat",
    "Handlee",
    "Amatic SC",
    "Gloria Hallelujah",
    "Permanent Marker",
    "Architects Daughter",
    "Indie Flower",
    "Sacramento",
  ],
};

/*  SYSTEM_FALLBACKS: ensures preview shows even if font not loaded */
export const SYSTEM_FALLBACKS = {
  // Serif
  Adamina: '"Adamina", Georgia, "Times New Roman", serif',
  Castoro: '"Castoro", Georgia, "Times New Roman", serif',
  Georgia: 'Georgia, "Times New Roman", serif',
  "Times New Roman": '"Times New Roman", Times, serif',
  Merriweather: '"Merriweather", Georgia, serif',
  Garamond: 'Garamond, "Times New Roman", serif',
  "Playfair Display": '"Playfair Display", Georgia, serif',
  Lora: '"Lora", Georgia, serif',
  Bitter: '"Bitter", Georgia, serif',
  "Cormorant Garamond": '"Cormorant Garamond", Garamond, serif',
  "EB Garamond": '"EB Garamond", Garamond, serif',
  "Crimson Text": '"Crimson Text", Georgia, serif',
  "Libre Baskerville": '"Libre Baskerville", Baskerville, serif',
  "Noto Serif": '"Noto Serif", Georgia, serif',
  Baskerville: '"Baskerville", "Times New Roman", serif',
  Cambria: '"Cambria", Georgia, serif',
  Constantia: '"Constantia", Georgia, serif',
  "Palatino Linotype": '"Palatino Linotype", Palatino, serif',
  Tinos: '"Tinos", Georgia, serif',
  "Zilla Slab": '"Zilla Slab", Georgia, serif',

  // Sans-serif
  Inter: 'Inter, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
  Arial: 'Arial, Helvetica, sans-serif',
  Helvetica: 'Helvetica, Arial, sans-serif',
  Roboto: 'Roboto, "Helvetica Neue", Arial, sans-serif',
  "Open Sans": '"Open Sans", Arial, sans-serif',
  Verdana: 'Verdana, Geneva, sans-serif',
  Poppins: 'Poppins, "Helvetica Neue", Arial, sans-serif',
  Lato: '"Lato", Arial, sans-serif',
  Montserrat: '"Montserrat", Arial, sans-serif',
  "Noto Sans": '"Noto Sans", Arial, sans-serif',
  Nunito: '"Nunito", Arial, sans-serif',
  Raleway: '"Raleway", Arial, sans-serif',
  "Source Sans Pro": '"Source Sans Pro", Arial, sans-serif',
  "Work Sans": '"Work Sans", Arial, sans-serif',
  Ubuntu: '"Ubuntu", Arial, sans-serif',
  "Segoe UI": '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
  "Gill Sans": '"Gill Sans", Calibri, sans-serif',
  Cabin: '"Cabin", Arial, sans-serif',
  "Titillium Web": '"Titillium Web", Arial, sans-serif',
  "Exo 2": '"Exo 2", Arial, sans-serif',

  // Monospace
  "Courier New": '"Courier New", Courier, monospace',
  Consolas: 'Consolas, monospace',
  "Fira Code": '"Fira Code", Consolas, monospace',
  "Source Code Pro": '"Source Code Pro", Consolas, monospace',
  Monaco: 'Monaco, Consolas, monospace',
  Inconsolata: '"Inconsolata", Consolas, monospace',
  "Ubuntu Mono": '"Ubuntu Mono", Consolas, monospace',
  "JetBrains Mono": '"JetBrains Mono", Consolas, monospace',
  "Roboto Mono": '"Roboto Mono", Consolas, monospace',
  "Space Mono": '"Space Mono", Consolas, monospace',
  "Cascadia Code": '"Cascadia Code", Consolas, monospace',
  "PT Mono": '"PT Mono", Consolas, monospace',
  "DM Mono": '"DM Mono", Consolas, monospace',

  // Display
  Oswald: '"Oswald", Arial, sans-serif',
  "Bebas Neue": '"Bebas Neue", Arial, sans-serif',
  Anton: '"Anton", Arial, sans-serif',
  "Abril Fatface": '"Abril Fatface", Georgia, serif',
  "Playfair Display SC": '"Playfair Display SC", Georgia, serif',
  Righteous: '"Righteous", Arial, sans-serif',
  Lobster: '"Lobster", cursive',
  Pacifico: '"Pacifico", cursive',
  Orbitron: '"Orbitron", Arial, sans-serif',
  Bungee: '"Bungee", Arial, sans-serif',
  Teko: '"Teko", Arial, sans-serif',
  Cinzel: '"Cinzel", Georgia, serif',
  "Poiret One": '"Poiret One", cursive',
  "Alfa Slab One": '"Alfa Slab One", Georgia, serif',
  "Saira Condensed": '"Saira Condensed", Arial, sans-serif',

  // Handwriting
  "Dancing Script": '"Dancing Script", cursive',
  "Great Vibes": '"Great Vibes", cursive',
  "Patrick Hand": '"Patrick Hand", cursive',
  "Shadows Into Light": '"Shadows Into Light", cursive',
  Satisfy: '"Satisfy", cursive',
  Caveat: '"Caveat", cursive',
  Handlee: '"Handlee", cursive',
  "Amatic SC": '"Amatic SC", cursive',
  "Gloria Hallelujah": '"Gloria Hallelujah", cursive',
  "Permanent Marker": '"Permanent Marker", cursive',
  "Architects Daughter": '"Architects Daughter", cursive',
  "Indie Flower": '"Indie Flower", cursive',
  Sacramento: '"Sacramento", cursive',
};

/*  Component */
export default function TextFonts({
  editor,
  categories = DEFAULT_FONT_CATEGORIES,
  initialCategory,
  activeFamily,
  onSelect,
  recentFonts = [],
  onRecentsChange,
  maxRecents = 8,
  className = "",
}) {
  const firstCategory = useMemo(
    () => initialCategory || Object.keys(categories)[0] || "Sans",
    [categories, initialCategory]
  );

  const [activeCategory, setActiveCategory] = useState(firstCategory);
  const [search, setSearch] = useState("");

  const categoryFonts = categories[activeCategory] || [];

  const filteredFonts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categoryFonts;
    return categoryFonts.filter((f) => f.toLowerCase().includes(q));
  }, [categoryFonts, search]);

  const applyFamily = useCallback(
    (family) => {
      if (typeof onSelect === "function") onSelect(family);
      if (!onSelect && editor?.chain) {
        try {
          editor.chain().focus().setFontFamily(family).run();
        } catch { }
      }
      if (typeof onRecentsChange === "function") {
        const next = [family, ...recentFonts.filter((f) => f !== family)].slice(
          0,
          maxRecents
        );
        onRecentsChange(next);
      }
    },
    [editor, onSelect, onRecentsChange, recentFonts, maxRecents]
  );

  const chip = (name) => (
    <button
      key={name}
      onClick={() => setActiveCategory(name)}
      className={`w-20 h-20 border rounded-lg flex flex-col items-center justify-center ${activeCategory === name ? "ring-2 ring-blue-500" : ""
        }`}
    >
      <div className="text-2xl">Aa</div>
      <div className="text-xs">{name}</div>
    </button>
  );

  const FontRow = ({ name, highlight }) => {
    const style = {
      fontFamily: SYSTEM_FALLBACKS[name] || name,
    };
    return (
      <div
        onClick={() => applyFamily(name)}
        className={`flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 cursor-pointer ${highlight ? "bg-blue-50" : ""
          }`}
        style={style}
      >
        <span
          className={`inline-block w-3 h-3 rounded-full border ${highlight ? "bg-blue-600 border-blue-600" : "border-gray-400"
            }`}
        />
        <span className="flex-1">{name}</span>
      </div>
    );
  };

  return (
    <div className={className}>
      <div className="flex gap-3 mt-3">
        {Object.keys(categories).map((cat) => chip(cat))}
      </div>

      <div className="mt-3 relative">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder='Search fonts (e.g., "Roboto", "Lora")'
          className="w-full border rounded-lg pl-8 pr-3 py-1.5"
        />
        <svg
          className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>

      {recentFonts.length > 0 && (
        <div className="mt-3 border rounded-lg">
          {recentFonts.map((f) => (
            <FontRow key={`recent-${f}`} name={f} highlight={activeFamily === f} />
          ))}
        </div>
      )}

      <div className="mt-3 border rounded-lg">
        {filteredFonts
          .filter((f) => !recentFonts.includes(f))
          .map((f) => (
            <FontRow key={`list-${f}`} name={f} highlight={activeFamily === f} />
          ))}
      </div>
    </div>
  );
}