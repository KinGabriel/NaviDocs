import { useState } from 'react';

export default function FontPanel({ fontSettings, onFontSettingsChange, selectedText, onApplyFormatting, editor }) {
  const [searchFont, setSearchFont] = useState('');

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
    '#B71C1C', '#FF5722', '#FF9800', '#FFEB3B', '#4CAF50', '#00BCD4', '#2196F3', '#3F51B5',
    '#9C27B0', '#E91E63'
  ];

  const fontFamilies = [
    { name: 'Serif', family: 'Times New Roman, serif' },
    { name: 'Sans', family: 'Arial, sans-serif' },
    { name: 'Mono', family: 'Courier New, monospace' }
  ];

  const recentFonts = ['Adamina', 'Gotu', 'Castoro'];
  const allFonts = [
    'Hina Mincho', 'Darker Grotesque', 'Phetsarath', 'Camorant', 'Ledger',
    'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald', 'Source Sans Pro'
  ];

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
            console.log('Color applied:', value);
            break;
          case 'fontFamily':
            editor.chain()
              .focus()
              .setFontFamily(value)
              .run();
            console.log('Font family applied:', value);
            break;
          case 'fontSize':
            console.log('Font size not yet supported by Tiptap');
            break;
          default:
            break;
        }
      } catch (error) {
        console.error('Error updating font setting:', error);
      }
    }
    
    //  update default settings for the UI display
    onFontSettingsChange({
      ...fontSettings,
      [key]: value
    });
  };

  const toggleFormatting = (key) => {
    if (editor) {
      try {
        switch (key) {
          case 'isBold':
            const boldResult = editor.chain().focus().toggleBold().run();
            console.log('Bold toggled:', boldResult);
            break;
          case 'isItalic':
            const italicResult = editor.chain().focus().toggleItalic().run();
            console.log('Italic toggled:', italicResult);
            break;
          case 'isUnderline':
            const underlineResult = editor.chain().focus().toggleUnderline().run();
            console.log('Underline toggled:', underlineResult);
            break;
          case 'isStrikethrough':
            const strikeResult = editor.chain().focus().toggleStrike().run();
            console.log('Strike toggled:', strikeResult);
            break;
          default:
            break;
        }
        
        // Update UI state 
        const newValue = !fontSettings[key];
        onFontSettingsChange({
          ...fontSettings,
          [key]: newValue
        });
      } catch (error) {
        console.error('Error applying formatting:', error);
        console.error('Error stack:', error.stack);
      }
    } else {
      console.log('No editor available, updating default settings');
      // No editor available, update default settings
      const newValue = !fontSettings[key];
      onFontSettingsChange({
        ...fontSettings,
        [key]: newValue
      });
    }
  };

  const changeFontSize = (delta) => {
    const newSize = Math.max(8, Math.min(72, fontSettings.fontSize + delta));
    updateFontSetting('fontSize', newSize);
  };

  return (
    <div className="space-y-6">
     
      {/* Font Size and Formatting Controls */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => changeFontSize(-1)}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <span className="text-lg">−</span>
          </button>
          <span className="text-lg font-medium">{fontSettings.fontSize}</span>
          <button 
            onClick={() => changeFontSize(1)}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <span className="text-lg">+</span>
          </button>
        </div>

        {/* Text Formatting Buttons */}
        <div className="flex items-center justify-center space-x-2">
          <button 
            onClick={() => {
              console.log('Bold button clicked!');
              toggleFormatting('isBold');
            }}
            className={`p-2 rounded font-bold text-lg transition-colors ${
              displayFormats.isBold ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
            }`}
            title="Bold (Ctrl+B)"
          >
            B
          </button>
          <button 
            onClick={() => {
              console.log('Italic button clicked!');
              toggleFormatting('isItalic');
            }}
            className={`p-2 rounded italic text-lg transition-colors ${
              displayFormats.isItalic ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
            }`}
            title="Italic (Ctrl+I)"
          >
            I
          </button>
          <button 
            onClick={() => {
              console.log('Underline button clicked!');
              toggleFormatting('isUnderline');
            }}
            className={`p-2 rounded underline text-lg transition-colors ${
              displayFormats.isUnderline ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
            }`}
            title="Underline (Ctrl+U)"
          >
            U
          </button>
          <button 
            onClick={() => {
              console.log('Strikethrough button clicked!');
              toggleFormatting('isStrikethrough');
            }}
            className={`p-2 rounded line-through text-lg transition-colors ${
              displayFormats.isStrikethrough ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
            }`}
            title="Strikethrough"
          >
            S
          </button>
          <button 
            onClick={() => toggleFormatting('isSubscript')}
            className={`p-2 rounded text-lg transition-colors opacity-50 cursor-not-allowed ${
              displayFormats.isSubscript ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
            }`}
            title="Subscript (requires extension)"
            disabled={true}
          >
            X₂
          </button>
          <button 
            onClick={() => toggleFormatting('isSuperscript')}
            className={`p-2 rounded text-lg transition-colors opacity-50 cursor-not-allowed ${
              displayFormats.isSuperscript ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
            }`}
            title="Superscript (requires extension)"
            disabled={true}
          >
            X²
          </button>
        </div>
      </div>

      {/* Font Colors */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700">Font Colors</h3>
        <div className="grid grid-cols-10 gap-1">
          {fontColors.map((color, index) => (
            <button
              key={index}
              className={`w-6 h-6 rounded-full border-2 hover:scale-110 transition-transform ${
                fontSettings.fontColor === color ? 'border-blue-500' : 'border-gray-300'
              }`}
              style={{ backgroundColor: color }}
              onClick={() => {
                console.log('Color button clicked:', color);
                updateFontSetting('fontColor', color);
              }}
            />
          ))}
        </div>
      </div>

      {/* Font Family Selection */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700">Fonts</h3>
        
        {/* Font Type Cards */}
        <div className="grid grid-cols-3 gap-2">
          {fontFamilies.map((font) => (
            <button
              key={font.name}
              className={`p-3 rounded-lg border-2 text-center transition-all ${
                fontSettings.fontFamily === font.family
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => {
                console.log('Font family button clicked:', font.family);
                updateFontSetting('fontFamily', font.family);
              }}
            >
              <div className="text-2xl font-bold mb-1" style={{ fontFamily: font.family }}>
                Aa
              </div>
              <div className="text-xs text-gray-600">{font.name}</div>
            </button>
          ))}
        </div>

        {/* Font Search */}
        <div className="relative">
          <input
            type="text"
            placeholder='Try "Times New Roman"'
            value={searchFont}
            onChange={(e) => setSearchFont(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="absolute right-3 top-2.5">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Document Fonts Section */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wider">Document fonts</h4>
          <div className="space-y-1">
            <div className="text-sm text-gray-500">Recently used</div>
            {recentFonts.map((font) => (
              <button
                key={font}
                className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded text-sm"
                onClick={() => {
                  console.log('Recent font clicked:', font);
                  updateFontSetting('fontFamily', font);
                }}
              >
                {font}
              </button>
            ))}
          </div>
        </div>

        {/* All Fonts Section */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wider">All fonts</h4>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {filteredFonts.map((font) => (
              <button
                key={font}
                className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded text-sm"
                onClick={() => {
                  console.log('All fonts clicked:', font);
                  updateFontSetting('fontFamily', font);
                }}
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