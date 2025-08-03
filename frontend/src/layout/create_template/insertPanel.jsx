import { useState } from 'react';


export default function InsertPanel({ editor }) {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);

  const handleInsertTable = () => {
    
    if (editor) {
      // debugging
      console.log('Editor state:', editor.state);
      console.log('Editor commands available:', Object.keys(editor.commands || {}));
      console.log('Has insertTable command:', 'insertTable' in editor.commands);
      console.log('Editor is focused:', editor.isFocused);
      console.log('Editor is editable:', editor.isEditable);
      console.log('Can insert table:', editor.can().insertTable({ rows: 2, cols: 2 }));
      
      const beforeHTML = editor.getHTML();
      console.log('Content before insertion:', beforeHTML);
      
      try {
        // Method 1: Force focus first, then try chain approach
        console.log('Trying method 1: focus + chain approach');
        editor.commands.focus(); // Ensure editor is focused first
        
        const result1 = editor
          .chain()
          .focus()
          .insertTable({ 
            rows: parseInt(rows), 
            cols: parseInt(cols), 
            withHeaderRow: true 
          })
          .run();
        
        console.log('Method 1 result:', result1);
        
        // Check if content actually changed after a short delay
        setTimeout(() => {
          const afterHTML = editor.getHTML();
          console.log('Content after method 1:', afterHTML);
          console.log('Content changed:', beforeHTML !== afterHTML);
          
          if (beforeHTML === afterHTML) {
            console.log('Method 1 failed - trying method 2');
            
            // Method 2: Try direct command without chain
            console.log('Trying method 2: direct command');
            const result2 = editor.commands.insertTable({ 
              rows: parseInt(rows), 
              cols: parseInt(cols), 
              withHeaderRow: true 
            });
            console.log('Method 2 result:', result2);
            
            setTimeout(() => {
              const afterMethod2HTML = editor.getHTML();
              console.log('Content after method 2:', afterMethod2HTML);
              
              if (afterHTML === afterMethod2HTML) {
                console.log(' Method 2 failed - trying method 3');
                
                // Method 3: Try without withHeaderRow
                console.log('Trying method 3: basic table without header');
                const result3 = editor.commands.insertTable({ 
                  rows: parseInt(rows), 
                  cols: parseInt(cols)
                });
                console.log('Method 3 result:', result3);
                
                setTimeout(() => {
                  const afterMethod3HTML = editor.getHTML();
                  console.log('Content after method 3:', afterMethod3HTML);
                  
                  if (afterMethod2HTML === afterMethod3HTML) {
                    console.log(' Method 3 failed - trying method 4');
                    
                    // Method 4: Manual HTML insertion with proper table structure
                    console.log('Trying method 4: manual HTML insertion');
                    const tableHTML = generateTableHTML(parseInt(rows), parseInt(cols));
                    console.log('Generated HTML:', tableHTML);
                    
                    const result4 = editor.commands.insertContent(tableHTML);
                    console.log('Method 4 result:', result4);
                    
                    setTimeout(() => {
                      const finalHTML = editor.getHTML();
                      console.log('Final content:', finalHTML);
                      console.log('Method 4 worked:', afterMethod3HTML !== finalHTML);
                    }, 100);
                  } else {
                    console.log('Method 3 succeeded!');
                  }
                }, 100);
              } else {
                console.log('Method 2 succeeded!');
              }
            }, 100);
          } else {
            console.log('Method 1 succeeded!');
          }
        }, 100);
        
      } catch (error) {
        console.error('Error inserting table:', error);
        console.log('Trying fallback method...');
        

        try {
          const simpleTable = `<table><tbody><tr><td>Cell 1</td><td>Cell 2</td></tr></tbody></table>`;
          editor.commands.insertContent(simpleTable);
          console.log('Fallback method executed');
        } catch (fallbackError) {
          console.error('Fallback method also failed:', fallbackError);
        }
      }
    } else {
      console.error('Editor is not available! Make sure the editor is properly passed to InsertPanel.');
      console.log('Editor value received:', editor);
    }
  };

  // Helper function to generate proper table HTML
  const generateTableHTML = (rows, cols) => {
    let html = '<table style="border-collapse: collapse; width: 100%;"><tbody>';
    for (let i = 0; i < rows; i++) {
      html += '<tr>';
      for (let j = 0; j < cols; j++) {
        html += '<td style="border: 1px solid #ccc; padding: 8px; min-width: 50px;">&nbsp;</td>';
      }
      html += '</tr>';
    }
    html += '</tbody></table>';
    return html;
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file && editor) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          editor
            .chain()
            .focus()
            .setImage({ src: reader.result })
            .run();
        } catch (error) {
          console.error('Error inserting image:', error);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const isInTable = editor?.isActive('table');
  const canInsertTable = editor?.can().insertTable({ rows: 2, cols: 2, withHeaderRow: false });
  const hasTableCommands = editor && 'insertTable' in editor.commands;

  return (
    <div className="w-full p-4 space-y-6">
      {/* DEBUG INFO */}
      <div className="text-xs text-gray-500 p-2 rounded ">
        <div>Has table commands: {hasTableCommands ? '/ Yes' : 'x No'}</div>
        <div>Can insert table: {canInsertTable ? '/ Yes' : 'x No'}</div>
        <div>Currently in table: {isInTable ? '/ Yes' : 'x No'}</div>
        <div>Editor editable: {editor?.isEditable ? '/ Yes' : 'x No'}</div>
      </div>

      {/* Test Button for Direct Table Insert */}
      <div className="p-2 rounded">
        <h3 className="text-sm font-semibold mb-2">Quick Test</h3>
        <button
          onClick={() => {
            if (editor) {
              console.log('Quick test: Inserting simple table...');
              const result = editor.commands.insertContent('<table><tbody><tr><td style="border: 1px solid #ccc; padding: 4px;">Test</td><td style="border: 1px solid #ccc; padding: 4px;">Table</td></tr></tbody></table>');
              console.log('Quick test result:', result);
            }
          }}
          disabled={!editor}
          className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          Test Simple Table
        </button>
      </div>

      {/* Image Upload  */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Insert Image</h2>
        <label className="w-full bg-gray-100 border-2 border-dashed rounded-lg flex flex-col items-center justify-center h-40 cursor-pointer hover:bg-gray-200">
          <span className="text-gray-600">Upload Image</span>
          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        </label>
      </div>

      {/* Table Insertion  */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Insert Table</h2>
        <div className="flex gap-4 mb-3">
          <div className="flex flex-col">
            <label className="text-sm font-medium">Rows</label>
            <input
              type="number"
              min={1}
              max={20}
              value={rows}
              onChange={(e) => setRows(parseInt(e.target.value) || 1)}
              className="border px-2 py-1 rounded-md w-20"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium">Columns</label>
            <input
              type="number"
              min={1}
              max={10}
              value={cols}
              onChange={(e) => setCols(parseInt(e.target.value) || 1)}
              className="border px-2 py-1 rounded-md w-20"
            />
          </div>
          <button
            onClick={handleInsertTable}
            disabled={!editor}
            className="self-end bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Insert Table
          </button>
        </div>

        {/* Table Functionality Buttons - Only show when in a table */}
        {isInTable && (
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button onClick={() => editor?.chain().focus().addColumnBefore().run()} className="text-sm bg-gray-100 px-3 py-1 rounded hover:bg-gray-200">
              Add Column Before
            </button>
            <button onClick={() => editor?.chain().focus().addColumnAfter().run()} className="text-sm bg-gray-100 px-3 py-1 rounded hover:bg-gray-200">
              Add Column After
            </button>
            <button onClick={() => editor?.chain().focus().deleteColumn().run()} className="text-sm bg-gray-100 px-3 py-1 rounded hover:bg-gray-200">
              Delete Column
            </button>
            <button onClick={() => editor?.chain().focus().addRowBefore().run()} className="text-sm bg-gray-100 px-3 py-1 rounded hover:bg-gray-200">
              Add Row Before
            </button>
            <button onClick={() => editor?.chain().focus().addRowAfter().run()} className="text-sm bg-gray-100 px-3 py-1 rounded hover:bg-gray-200">
              Add Row After
            </button>
            <button onClick={() => editor?.chain().focus().deleteRow().run()} className="text-sm bg-gray-100 px-3 py-1 rounded hover:bg-gray-200">
              Delete Row
            </button>
            <button onClick={() => editor?.chain().focus().mergeCells().run()} className="text-sm bg-gray-100 px-3 py-1 rounded hover:bg-gray-200">
              Merge Cells
            </button>
            <button onClick={() => editor?.chain().focus().splitCell().run()} className="text-sm bg-gray-100 px-3 py-1 rounded hover:bg-gray-200">
              Split Cell
            </button>
            <button onClick={() => editor?.chain().focus().deleteTable().run()} className="col-span-2 bg-red-200 text-black px-3 py-1 rounded hover:bg-red-400">
              Delete Table
            </button>
          </div>
        )}
      </div>
    </div>
  );
}