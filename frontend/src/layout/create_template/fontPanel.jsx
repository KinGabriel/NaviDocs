import { useState } from 'react';

export default function FontPanel({ fontSettings, onFontSettingsChange, selectedText, onApplyFormatting, editor }) {
  const [searchFont, setSearchFont] = useState('');
  const [showCapOptions, setShowCapOptions] = useState(false); 
 
  // Get current formatting state from Tiptap editor
  const getActiveFormats = () => {
    if (!editor || !editor.isActive) return fontSettings; // Fallback to fontSettings
    try { 
      // Get current color and font family from editor attributes
      const attributes = editor.getAttributes('textStyle');
      return {
        isBold: editor.isActive('bold'),
        isItalic: editor.isActive('italic'),
        isUnderline: editor.isActive('underline'),
        isStrikethrough: editor.isActive('strike'),
        isSubscript: fontSettings.isSubscript,
        isSuperscript: fontSettings.isSuperscript,
        fontSize: fontSettings.fontSize,
        fontFamily: attributes.fontFamily || fontSettings.fontFamily,
        fontColor: attributes.color || fontSettings.fontColor,
      };
    } catch (error) {
      console.warn('Error getting active formats from editor:', error);
      return fontSettings;
    }
  };

  const activeFormats = getActiveFormats();
  const displayFormats = activeFormats;

  const fontColors = [
      '#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#E0E0E0', '#F0F0F0', '#FFFFFF',
      '#B71C1C', '#FF0000', '#FF9800', '#FFEB3B', '#4CAF50', '#00FFFF', '#4A86E8', '#0000FF', 
      '#9900FF', '#FF00FF'];

  const fontFamilies = [
    { name: 'Serif', family: 'Times New Roman, serif' },
    { name: 'Sans', family: 'Arial, sans-serif' },
    { name: 'Mono', family: 'Courier New, monospace' }
  ];

  const recentFonts = ['Adamina', 'Gotu', 'Castoro'];
  const allFonts = [
    'Hina Mincho', 'Darker Grotesque', 'Phetsarath', 'Camorant', 'Ledger',
    'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald', 'Source Sans Pro'];

  const filteredFonts = allFonts.filter(font =>
    font.toLowerCase().includes(searchFont.toLowerCase())
  );

  const updateFontSetting = (key, value) => {
    if (editor) {
      try {
        switch (key) {
          case 'fontColor':
            editor.chain()
            .focus()
            .setColor(value)
            .run();
            break;
          case 'fontFamily':
            editor.chain()
            .focus()
            .setFontFamily(value)
            .run();
            break;
          case 'fontSize':
            break;
        }
      } catch (error) {
        console.error('Error updating font setting:', error);
      }
    }  
    //  update default settings for the UI display
    onFontSettingsChange({ 
      ...fontSettings,
       [key]: 
       value });
  };

  const toggleFormatting = (key) => {
    if (!editor) return;
    try {
      switch (key) {
        case 'isBold':
           editor.chain().focus().toggleBold().run();
            break;
        case 'isItalic':
           editor.chain().focus().toggleItalic().run(); 
           break;
        case 'isUnderline':
           editor.chain().focus().toggleUnderline().run(); 
           break;
        case 'isStrikethrough': 
        editor.chain().focus().toggleStrike().run(); 
        break;
        case 'isSuperscript':
           editor.chain().focus().toggleSuperscript().run(); 
        break;
        case 'isSubscript': 
        editor.chain().focus().toggleSubscript().run();
        break;
        case 'titlecase':
            applyCapitalization('titlecase');
        break;
        case 'uppercase': 
            applyCapitalization('uppercase'); 
        break;
        case 'lowercase': 
            applyCapitalization('lowercase'); 
        break;
      }
    } catch (err) {
      console.error(`${key} toggle error:`, err);
    }
  };

  const applyCapitalization = (type) => {
    const selectedText = editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' ');
    let transformed = selectedText;

    switch (type) {
      case 'capitalize':
        transformed = selectedText.replace(/\b\w/g, c => c.toUpperCase());
        break;
      case 'uppercase':
        transformed = selectedText.toUpperCase();
        break;
      case 'lowercase':
        transformed = selectedText.toLowerCase();
        break;
    }

    editor.chain().focus().insertContent(transformed).run();
  };

  const changeFontSize = (delta) => {
    const newSize = Math.max(8, Math.min(72, fontSettings.fontSize + delta));
    updateFontSetting('fontSize', newSize);
  };

  return (
    <div className="space-y-3">
      {/* Font Size + Formatting */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => changeFontSize(-1)} className="p-2 hover:bg-gray-100 rounded">−</button>
          <span className="text-lg font-medium">{fontSettings.fontSize}</span>
          <button onClick={() => changeFontSize(1)} className="p-2 hover:bg-gray-100 rounded">+</button>
        </div>

       <div className="flex items-center justify-start space-x-2 pl-2.5">
          <button onClick={() => toggleFormatting('isBold')} 
            className={`p-2 rounded font-bold text-lg ${displayFormats.isBold ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}>
            B
          </button>
          <button onClick={() => toggleFormatting('isItalic')}
            className={`p-2 rounded italic text-lg ${displayFormats.isItalic ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}>
            I
          </button>
          <button onClick={() => toggleFormatting('isUnderline')} 
            className={`p-2 rounded underline text-lg ${displayFormats.isUnderline ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}>
            U
          </button>
          <button onClick={() => toggleFormatting('isStrikethrough')} 
            className={`p-2 rounded line-through text-lg ${displayFormats.isStrikethrough ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}>
            S
          </button>
          <button disabled title="Subscript" 
            className="p-2 rounded text-lg opacity-50 cursor-not-allowed">
            X₂
          </button>
          <button disabled title="Superscript" 
            className="p-2 rounded text-lg opacity-50 cursor-not-allowed">
            X²
          </button>

          {/* Capitalization Dropdown */}
          <div className="relative inline-block text-left">
            <button
              onClick={() => setShowCapOptions(prev => !prev)}
              className="bg-gray-100 px-3 py-1 rounded hover:bg-gray-200"
            >
              Aa
            </button>
            {showCapOptions && (
              <div className="absolute z-10 mt-1 w-27 bg-white shadow border rounded border-[#D9D9D9]">
                <button onClick={() => { toggleFormatting('titlecase'); setShowCapOptions(false); }} className="block w-full text-sm text-left px-1 py-1 hover:bg-gray-100">Title Case</button>
                <button onClick={() => { toggleFormatting('uppercase'); setShowCapOptions(false); }} className="block w-full text- sm text-left px-1 py-1 hover:bg-gray-100">UPPERCASE</button>
                <button onClick={() => { toggleFormatting('lowercase'); setShowCapOptions(false); }} className="block w-full text-sm text-left px-1 py-1 hover:bg-gray-100">lowercase</button>
              </div>
            )}
          </div>
        </div>

      {/* Font Colors */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700">Font Colors</h3>
        <div className="grid grid-cols-10 gap-1">
          {fontColors.map((color, index) => (
            <button
              key={index}
              className={`w-6 h-6 rounded-full border-2 hover:scale-110 transition-transform ${fontSettings.fontColor === color ? 'border-blue-500' : 'border-gray-300'}`}
              style={{ backgroundColor: color }}
              onClick={() => updateFontSetting('fontColor', color)}
            />
          ))}
        </div>
      </div>

      {/* Font Family Cards */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700">Fonts</h3>
        <div className="grid grid-cols-3 gap-2">
          {fontFamilies.map(font => (
            <button
              key={font.name}
              className={`p-3 rounded-lg border-2 text-center ${fontSettings.fontFamily === font.family ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
              onClick={() => updateFontSetting('fontFamily', font.family)}
            >
              <div className="text-2xl font-bold mb-1" style={{ fontFamily: font.family }}>Aa</div>
              <div className="text-xs text-gray-600">{font.name}</div>
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder='Try "Times New Roman"'
          value={searchFont}
          onChange={(e) => setSearchFont(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
        />

        {/* Document Fonts */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wider">Document fonts</h4>
          <div className="space-y-1">
            <div className="text-sm text-gray-500">Recently used</div>
            {recentFonts.map(font => (
              <button
                key={font}
                className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded text-sm"
                onClick={() => updateFontSetting('fontFamily', font)}
              >
                {font}
              </button>
            ))}
          </div>
        </div>
        </div>

        {/* All Fonts */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wider">All fonts</h4>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {filteredFonts.map(font => (
              <button
                key={font}
                className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded text-sm"
                onClick={() => updateFontSetting('fontFamily', font)}
              >
                {font}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
