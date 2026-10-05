// Career_Felix - Direct In-Browser Text Editor Helper
(function() {
  const docName = window.location.pathname.split('/').pop() || 'document.html';
  const storageKey = 'career_edit_' + docName;
  let isEditing = false;

  // Inject styles for editing mode
  const style = document.createElement('style');
  style.id = 'editor-helper-styles';
  style.textContent = `
    @media screen {
      body.editing-enabled *:hover {
        outline: 1.5px dashed rgba(44, 110, 130, 0.6) !important;
        outline-offset: 1px;
        cursor: text !important;
      }
      body.editing-enabled *:focus {
        outline: 2px solid #2c6e82 !important;
        outline-offset: 2px;
        background-color: rgba(44, 110, 130, 0.03) !important;
      }
      .editor-standalone-bar {
        position: fixed;
        top: 12px;
        right: 12px;
        z-index: 999999;
        display: flex;
        gap: 6px;
        background: rgba(15, 23, 42, 0.85);
        backdrop-filter: blur(8px);
        padding: 6px 10px;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.25);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 12px;
      }
      .editor-btn {
        background: #ffffff;
        color: #0f172a;
        border: none;
        padding: 5px 10px;
        border-radius: 5px;
        font-weight: 600;
        cursor: pointer;
        font-size: 11.5px;
        transition: all 0.15s ease;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .editor-btn:hover { background: #e2e8f0; }
      .editor-btn-primary { background: #2c6e82; color: white; }
      .editor-btn-primary:hover { background: #1b4b5a; }
      .editor-btn-active { background: #10b981; color: white; }
      .editor-badge {
        color: #94a3b8;
        font-size: 11px;
        align-self: center;
        margin-right: 4px;
      }
    }
    @media print {
      .editor-standalone-bar { display: none !important; }
      * { outline: none !important; }
    }
  `;
  document.head.appendChild(style);

  // Restore edits from localStorage on load if available
  const savedBody = localStorage.getItem(storageKey);
  if (savedBody) {
    try {
      document.body.innerHTML = savedBody;
      console.log('[Editor] Restored saved edits for', docName);
    } catch (e) {
      console.error('[Editor] Failed to restore saved edits:', e);
    }
  }

  // Set editing mode
  window.setEditable = function(enabled) {
    isEditing = !!enabled;
    document.body.contentEditable = isEditing ? 'true' : 'false';
    document.body.classList.toggle('editing-enabled', isEditing);

    // Notify parent if inside iframe
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'EDIT_STATUS',
        docName: docName,
        isEditing: isEditing,
        hasEdits: !!localStorage.getItem(storageKey)
      }, '*');
    }

    // Update standalone button if present
    const btn = document.getElementById('standalone-edit-btn');
    if (btn) {
      btn.innerHTML = isEditing ? '✅ Mode Édition Actif' : '✏️ Éditer';
      btn.className = isEditing ? 'editor-btn editor-btn-active' : 'editor-btn';
    }
  };

  // Save current body to localStorage
  window.saveDocEdits = function() {
    // Clean temporary attributes before saving
    const currentEditable = document.body.contentEditable;
    document.body.removeAttribute('contenteditable');
    document.body.classList.remove('editing-enabled');

    // Remove standalone bar from innerHTML before saving
    const standaloneBar = document.querySelector('.editor-standalone-bar');
    if (standaloneBar) standaloneBar.remove();

    const bodyHtml = document.body.innerHTML;
    localStorage.setItem(storageKey, bodyHtml);

    // Re-attach standalone bar and editing state if needed
    if (window.self === window.top) {
      setupStandaloneUI();
    }
    if (isEditing) {
      document.body.contentEditable = currentEditable;
      document.body.classList.add('editing-enabled');
    }

    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'SAVED_SUCCESS', docName: docName }, '*');
    }
    return true;
  };

  // Reset to original document
  window.resetDocEdits = function() {
    localStorage.removeItem(storageKey);
    window.location.reload();
  };

  // Export current HTML as downloadable file
  window.exportDocHtml = function() {
    const wasEditing = isEditing;
    if (wasEditing) {
      document.body.removeAttribute('contenteditable');
      document.body.classList.remove('editing-enabled');
    }
    const standaloneBar = document.querySelector('.editor-standalone-bar');
    if (standaloneBar) standaloneBar.remove();

    const fullHtml = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;

    if (window.self === window.top) {
      setupStandaloneUI();
    }
    if (wasEditing) {
      document.body.contentEditable = 'true';
      document.body.classList.add('editing-enabled');
    }

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = docName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Listen for parent messages (from index.html hub)
  window.addEventListener('message', function(event) {
    if (!event.data || !event.data.type) return;
    switch (event.data.type) {
      case 'TOGGLE_EDIT':
        window.setEditable(event.data.enabled);
        break;
      case 'SAVE_EDITS':
        window.saveDocEdits();
        break;
      case 'RESET_EDITS':
        window.resetDocEdits();
        break;
      case 'EXPORT_HTML':
        window.exportDocHtml();
        break;
      case 'CHECK_STATUS':
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({
            type: 'EDIT_STATUS',
            docName: docName,
            isEditing: isEditing,
            hasEdits: !!localStorage.getItem(storageKey)
          }, '*');
        }
        break;
    }
  });

  // Track changes to prompt save
  document.addEventListener('input', function() {
    if (isEditing && window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'CONTENT_DIRTY', docName: docName }, '*');
    }
  });

  // Setup UI if opened standalone (outside iframe)
  function setupStandaloneUI() {
    if (document.querySelector('.editor-standalone-bar')) return;
    const bar = document.createElement('div');
    bar.className = 'editor-standalone-bar';
    bar.innerHTML = `
      <span class="editor-badge">Mode Standalone</span>
      <button class="editor-btn" id="standalone-edit-btn" onclick="window.setEditable(!isEditing)">✏️ Éditer</button>
      <button class="editor-btn" onclick="window.saveDocEdits(); alert('Modifications sauvegardées !');">💾 Sauvegarder</button>
      <button class="editor-btn" onclick="window.exportDocHtml()">📥 Télécharger HTML</button>
      <button class="editor-btn" onclick="if(confirm('Rétablir la version originale ?')) window.resetDocEdits();">🔄 Rétablir</button>
      <button class="editor-btn editor-btn-primary" onclick="window.print()">🖨️ Imprimer</button>
    `;
    document.body.appendChild(bar);
  }

  if (window.self === window.top) {
    window.addEventListener('DOMContentLoaded', setupStandaloneUI);
  }

  // Notify parent on initial load
  window.addEventListener('DOMContentLoaded', function() {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'DOC_LOADED',
        docName: docName,
        hasEdits: !!localStorage.getItem(storageKey)
      }, '*');
    }
  });
})();
