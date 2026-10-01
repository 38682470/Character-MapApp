/**
 * DYNAMIC CHARACTER NETWORK MAP - COMPLETE APPLICATION LOGIC
 * Features: Multi-Map Manager, Physics Spacing, Drag-and-Drop Image Conversion, 
 * Auto-Wrapping SVGs with Bottom-Banner Photo Text Overlay, JSON Import/Export, Forms, LocalStorage.
 */

// --- GLOBAL STATE & CONFIGURATION ---
const REGISTRY_KEY = 'char_map_registry_v1';
const ACTIVE_MAP_KEY = 'char_map_active_id_v1';

const REL_COLORS = {
  'Ally/Friend': '#84cc16',      // Green
  'Authority/Power': '#f97316',  // Orange
  'Family': '#0284c7',           // Blue
  'Rival/Enemy': '#ef4444',      // Red
  'Romantic': '#a855f7',         // Purple
  'Other': '#64748b'             // Gray
};

let network = null;
let nodesDataSet = new vis.DataSet([]);
let edgesDataSet = new vis.DataSet([]);
let selectedNodeId = null;
let activeMapId = null;
let mapRegistry = [];

// Default Sample Character Data
const DEFAULT_CHARACTERS = [
  { id: '1', label: 'Jean Valjean', shortName: 'Valjean', fontSize: 24, title: 'Protagonist', bio: 'Former convict striving for redemption and moral integrity.', shape: 'circularImage', image: '', color: { border: '#0284c7' } },
  { id: '2', label: 'Javert', shortName: 'Javert', fontSize: 26, title: 'Inspector / Authority', bio: 'Unforgiving police inspector dedicated to rigid law and justice.', shape: 'circularImage', image: '', color: { border: '#f97316' } }
];

const DEFAULT_RELATIONSHIPS = [
  { id: 'e1', from: '1', to: '2', label: 'Rival/Enemy', type: 'Rival/Enemy', color: { color: REL_COLORS['Rival/Enemy'] } }
];

// --- DYNAMIC SVG GENERATOR (Photo with Bottom-Third Text Banner) ---
function createDynamicAvatarSVG(name, shortName = '', fontSize = 24, color = '#6366f1', avatarUrl = '') {
  const displayText = (shortName || name).trim();
  const hasPhoto = avatarUrl && avatarUrl.trim() !== '' && !avatarUrl.startsWith('data:image/svg');

  let visualContent = '';
  let textElement = '';

  if (hasPhoto) {
    // Photo present: Position text safely inside the dark bottom banner (approx y: 72 to 92)
    if (displayText.length > 9 && displayText.includes(' ')) {
      const words = displayText.split(' ');
      const mid = Math.ceil(words.length / 2);
      const line1 = words.slice(0, mid).join(' ');
      const line2 = words.slice(mid).join(' ');

      textElement = `
        <text x="50" y="73" dominant-baseline="middle" text-anchor="middle" font-size="${fontSize * 0.75}" font-family="sans-serif" font-weight="bold" fill="#ffffff" stroke="#000000" stroke-width="3" paint-order="stroke fill">${line1}</text>
        <text x="50" y="89" dominant-baseline="middle" text-anchor="middle" font-size="${fontSize * 0.75}" font-family="sans-serif" font-weight="bold" fill="#ffffff" stroke="#000000" stroke-width="3" paint-order="stroke fill">${line2}</text>
      `;
    } else {
      textElement = `<text x="50" y="81" dominant-baseline="middle" text-anchor="middle" font-size="${fontSize * 0.9}" font-family="sans-serif" font-weight="bold" fill="#ffffff" stroke="#000000" stroke-width="3" paint-order="stroke fill">${displayText}</text>`;
    }

    visualContent = `
      <defs>
        <clipPath id="circleClip">
          <circle cx="50" cy="50" r="48" />
        </clipPath>
      </defs>
      <circle cx="50" cy="50" r="48" fill="${color}" />
      <image href="${avatarUrl}" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid slice" clip-path="url(#circleClip)" />
      <!-- Dark bottom banner gradient for crystal-clear name readability -->
      <path d="M 2 62 Q 50 58 98 62 L 98 96 A 48 48 0 0 1 2 96 Z" fill="rgba(0, 0, 0, 0.78)" clip-path="url(#circleClip)" />
    `;
  } else {
    // Standard centered text for nodes without photos
    if (displayText.length > 7 && displayText.includes(' ')) {
      const words = displayText.split(' ');
      const mid = Math.ceil(words.length / 2);
      const line1 = words.slice(0, mid).join(' ');
      const line2 = words.slice(mid).join(' ');

      textElement = `
        <text x="50" y="${50 - (fontSize * 0.4)}" dominant-baseline="middle" text-anchor="middle" font-size="${fontSize}" font-family="sans-serif" font-weight="bold" fill="#ffffff">${line1}</text>
        <text x="50" y="${50 + (fontSize * 0.6)}" dominant-baseline="middle" text-anchor="middle" font-size="${fontSize}" font-family="sans-serif" font-weight="bold" fill="#ffffff">${line2}</text>
      `;
    } else {
      textElement = `<text x="50" y="52" dominant-baseline="middle" text-anchor="middle" font-size="${fontSize}" font-family="sans-serif" font-weight="bold" fill="#ffffff">${displayText}</text>`;
    }

    visualContent = `<circle cx="50" cy="50" r="48" fill="${color}" />`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" height="100" viewBox="0 0 100 100">
    ${visualContent}
    ${textElement}
  </svg>`;

  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

// --- VIS-NETWORK GRAPH ENGINE ---
function initNetworkEngine() {
  const container = document.getElementById('character-network');
  const data = { nodes: nodesDataSet, edges: edgesDataSet };

  const options = {
    nodes: {
      shape: 'circularImage',
      borderWidth: 4,
      borderWidthSelected: 6,
      size: 40,
      font: { size: 0, color: 'transparent' },
      shadow: { enabled: true, color: 'rgba(0,0,0,0.1)', size: 8, x: 0, y: 4 }
    },
    edges: {
      width: 3,
      selectionWidth: 5,
      smooth: { type: 'continuous', roundness: 0.2 },
      font: { size: 11, align: 'middle', background: '#ffffff', strokeWidth: 0 }
    },
    physics: {
      enabled: true,
      solver: 'forceAtlas2Based',
      forceAtlas2Based: { gravitationalConstant: -50, centralGravity: 0.01, springLength: 300, springConstant: 0.08, damping: 0.4 },
      stabilization: { enabled: true, iterations: 150 }
    },
    interaction: { hover: true, tooltipDelay: 200, zoomView: true, dragView: true }
  };

  network = new vis.Network(container, data, options);
  network.on('click', handleNodeClick);
  network.on('deselectNode', handleDeselect);
  renderLegend();
}

// --- NODE CENTERING & HIGHLIGHTING ENGINE ---
function handleNodeClick(params) {
  if (params.nodes.length > 0) {
    const nodeId = params.nodes[0];
    selectedNodeId = nodeId;

    network.focus(nodeId, {
      scale: 1.1,
      animation: { duration: 600, easingFunction: 'easeInOutQuad' }
    });

    highlightConnectedSubGraph(nodeId);
    document.getElementById('btn-clear-selection')?.classList.remove('hidden');
    updateInspector(nodeId);
  } else {
    handleDeselect();
  }
}

function handleDeselect() {
  selectedNodeId = null;
  resetNodeStyles();
  document.getElementById('btn-clear-selection')?.classList.add('hidden');
  clearInspector();
}

function highlightConnectedSubGraph(centralNodeId) {
  const connectedNodes = network.getConnectedNodes(centralNodeId);
  connectedNodes.push(centralNodeId);

  const updatedNodes = nodesDataSet.get().map(node => {
    const isConnected = connectedNodes.includes(node.id);
    return { id: node.id, opacity: isConnected ? 1.0 : 0.25 };
  });

  const updatedEdges = edgesDataSet.get().map(edge => {
    const isConnected = edge.from === centralNodeId || edge.to === centralNodeId;
    return { id: edge.id, color: { opacity: isConnected ? 1.0 : 0.15 } };
  });

  nodesDataSet.update(updatedNodes);
  edgesDataSet.update(updatedEdges);
}

function resetNodeStyles() {
  const updatedNodes = nodesDataSet.get().map(node => ({ id: node.id, opacity: 1.0 }));
  const updatedEdges = edgesDataSet.get().map(edge => ({ id: edge.id, color: { opacity: 1.0 } }));
  nodesDataSet.update(updatedNodes);
  edgesDataSet.update(updatedEdges);
}

// --- MULTI-MAP MANAGER & PERSISTENCE ---
function initMapRegistry() {
  const rawRegistry = localStorage.getItem(REGISTRY_KEY);
  
  if (rawRegistry) {
    mapRegistry = JSON.parse(rawRegistry);
  } else {
    const defaultId = 'map_default';
    mapRegistry = [{ id: defaultId, name: 'Les Misérables' }];
    localStorage.setItem(`char_map_data_${defaultId}`, JSON.stringify({
      nodes: DEFAULT_CHARACTERS,
      edges: DEFAULT_RELATIONSHIPS
    }));
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(mapRegistry));
  }

  const savedActiveId = localStorage.getItem(ACTIVE_MAP_KEY);
  activeMapId = (savedActiveId && mapRegistry.some(m => m.id === savedActiveId)) ? savedActiveId : mapRegistry[0].id;

  renderMapDropdown();
  loadMapData(activeMapId);
}

function renderMapDropdown() {
  const select = document.getElementById('select-active-map');
  if (!select) return;
  select.innerHTML = '';

  mapRegistry.forEach(map => {
    const opt = document.createElement('option');
    opt.value = map.id;
    opt.textContent = map.name;
    if (map.id === activeMapId) opt.selected = true;
    select.appendChild(opt);
  });
}

function loadMapData(mapId) {
  activeMapId = mapId;
  localStorage.setItem(ACTIVE_MAP_KEY, mapId);

  const rawData = localStorage.getItem(`char_map_data_${mapId}`);
  let nodes = [];
  let edges = [];

  if (rawData) {
    const parsed = JSON.parse(rawData);
    nodes = parsed.nodes || [];
    edges = parsed.edges || [];
  }

  // Ensure fresh dynamic SVGs are rendered with bottom banner on load
  nodes = nodes.map(n => {
    n.fontSize = n.fontSize || 26;
    n.image = createDynamicAvatarSVG(n.label, n.shortName, n.fontSize, n.color?.border || '#6366f1', n.rawAvatar || n.image);
    return n;
  });

  nodesDataSet.clear();
  edgesDataSet.clear();
  nodesDataSet.add(nodes);
  edgesDataSet.add(edges);

  handleDeselect();
  updateCounters();
  updateTargetDropdown();
  if (network) network.fit({ animation: { duration: 400 } });
}

function saveDataToLocalStorage() {
  if (!activeMapId) return;
  localStorage.setItem(`char_map_data_${activeMapId}`, JSON.stringify({
    nodes: nodesDataSet.get(),
    edges: edgesDataSet.get()
  }));
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(mapRegistry));
  updateCounters();
}

function createNewMap() {
  const mapName = prompt('Enter the title of the book or character map:', 'New Book Map');
  if (!mapName || mapName.trim() === '') return;

  const newId = 'map_' + Date.now();
  mapRegistry.push({ id: newId, name: mapName.trim() });
  
  localStorage.setItem(`char_map_data_${newId}`, JSON.stringify({ nodes: [], edges: [] }));
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(mapRegistry));

  renderMapDropdown();
  loadMapData(newId);
}

function renameActiveMap() {
  const currentMap = mapRegistry.find(m => m.id === activeMapId);
  if (!currentMap) return;

  const newName = prompt('Enter new title for this map:', currentMap.name);
  if (!newName || newName.trim() === '') return;

  currentMap.name = newName.trim();
  saveDataToLocalStorage();
  renderMapDropdown();
}

function deleteActiveMap() {
  if (mapRegistry.length <= 1) {
    alert('You must keep at least one character map.');
    return;
  }

  const currentMap = mapRegistry.find(m => m.id === activeMapId);
  if (confirm(`Are you sure you want to delete "${currentMap.name}"?`)) {
    localStorage.removeItem(`char_map_data_${activeMapId}`);
    mapRegistry = mapRegistry.filter(m => m.id !== activeMapId);
    activeMapId = mapRegistry[0].id;
    saveDataToLocalStorage();
    renderMapDropdown();
    loadMapData(activeMapId);
  }
}

function updateCounters() {
  const statChars = document.getElementById('stat-characters');
  const statRels = document.getElementById('stat-relationships');
  if (statChars) statChars.textContent = nodesDataSet.length;
  if (statRels) statRels.textContent = edgesDataSet.length;
}

// --- INSPECTOR SIDEBAR LOGIC ---
function updateInspector(nodeId) {
  const char = nodesDataSet.get(nodeId);
  if (!char) return;

  document.getElementById('inspector-empty-state')?.classList.add('hidden');
  document.getElementById('inspector-content')?.classList.remove('hidden');

  const avatarEl = document.getElementById('inspector-avatar');
  if (avatarEl) avatarEl.src = char.rawAvatar || (char.image.startsWith('data:image/svg') ? '' : char.image);
  
  const nameEl = document.getElementById('inspector-name');
  if (nameEl) nameEl.textContent = char.label;

  const roleEl = document.getElementById('inspector-archetype');
  if (roleEl) roleEl.textContent = char.title || 'Character';

  const descEl = document.getElementById('inspector-description');
  if (descEl) descEl.textContent = char.bio || 'No overview notes available.';

  const connectedEdges = edgesDataSet.get({ filter: e => e.from === nodeId || e.to === nodeId });
  const relListContainer = document.getElementById('inspector-relationships-list');
  
  if (relListContainer) {
    relListContainer.innerHTML = '';
    if (connectedEdges.length === 0) {
      relListContainer.innerHTML = '<p class="text-xs text-slate-400 italic">No connected relationships yet.</p>';
    } else {
      connectedEdges.forEach(edge => {
        const targetId = edge.from === nodeId ? edge.to : edge.from;
        const targetChar = nodesDataSet.get(targetId);
        if (!targetChar) return;

        const relColor = REL_COLORS[edge.type] || '#64748b';
        const item = document.createElement('div');
        item.className = 'flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 shadow-2xs text-xs';
        item.innerHTML = `
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${relColor}"></span>
            <span class="font-semibold text-slate-700">${targetChar.label}</span>
            <span class="text-slate-400">(${edge.label || edge.type})</span>
          </div>
          <button class="btn-delete-edge text-slate-300 hover:text-rose-500 transition-colors" data-edge-id="${edge.id}" title="Remove relationship">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        `;
        relListContainer.appendChild(item);
      });

      relListContainer.querySelectorAll('.btn-delete-edge').forEach(btn => {
        btn.addEventListener('click', (e) => {
          edgesDataSet.remove(e.currentTarget.getAttribute('data-edge-id'));
          saveDataToLocalStorage();
          updateInspector(nodeId);
          if (selectedNodeId) highlightConnectedSubGraph(selectedNodeId);
        });
      });
    }
  }

  populateEditForm(char);
  if (window.lucide) lucide.createIcons();
}

function clearInspector() {
  document.getElementById('inspector-empty-state')?.classList.remove('hidden');
  document.getElementById('inspector-content')?.classList.add('hidden');
  resetCharacterForm();
}

function populateEditForm(char) {
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  
  document.getElementById('form-title').textContent = 'Edit Character';
  setVal('edit-character-id', char.id);
  setVal('input-char-name', char.label);
  setVal('input-char-shortname', char.shortName || '');
  setVal('input-char-fontsize', char.fontSize || 26);
  setVal('input-char-role', char.title || '');
  setVal('input-char-bio', char.bio || '');
  setVal('input-char-avatar', char.rawAvatar || '');

  document.getElementById('btn-save-character').textContent = 'Update Character';
  document.getElementById('btn-delete-character')?.classList.remove('hidden');
}

function resetCharacterForm() {
  document.getElementById('form-title').textContent = 'Add New Character';
  document.getElementById('edit-character-id').value = '';
  document.getElementById('form-character')?.reset();
  
  const fontSizeInput = document.getElementById('input-char-fontsize');
  if (fontSizeInput) fontSizeInput.value = 26;

  document.getElementById('btn-save-character').textContent = 'Save Character';
  document.getElementById('btn-delete-character')?.classList.add('hidden');
}

function updateTargetDropdown() {
  const select = document.getElementById('select-target-character');
  if (!select) return;
  select.innerHTML = '<option value="">-- Select Target --</option>';

  nodesDataSet.get().forEach(c => {
    if (c.id !== selectedNodeId) {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.label;
      select.appendChild(opt);
    }
  });
}

function renderLegend() {
  const legendContainer = document.getElementById('legend-list');
  if (!legendContainer) return;
  legendContainer.innerHTML = '';

  Object.entries(REL_COLORS).forEach(([type, color]) => {
    const item = document.createElement('div');
    item.className = 'flex items-center gap-2.5 text-sm';
    item.innerHTML = `<span class="w-3 h-3 rounded-full shrink-0 shadow-2xs" style="background-color: ${color}"></span><span>${type}</span>`;
    legendContainer.appendChild(item);
  });
}

// --- DRAG, DROP & FILE READER ENGINE ---
function processFileToBase64(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    const urlInput = document.getElementById('input-char-avatar');
    if (urlInput) urlInput.value = evt.target.result;
  };
  reader.readAsDataURL(file);
}

// --- EVENT LISTENERS & BINDINGS ---
document.addEventListener('DOMContentLoaded', () => {
  initNetworkEngine();
  initMapRegistry();

  document.getElementById('select-active-map')?.addEventListener('change', (e) => loadMapData(e.target.value));
  document.getElementById('btn-new-map')?.addEventListener('click', createNewMap);
  document.getElementById('btn-rename-map')?.addEventListener('click', renameActiveMap);
  document.getElementById('btn-delete-map')?.addEventListener('click', deleteActiveMap);

  document.getElementById('btn-zoom-in')?.addEventListener('click', () => network?.moveTo({ scale: network.getScale() * 1.25 }));
  document.getElementById('btn-zoom-out')?.addEventListener('click', () => network?.moveTo({ scale: network.getScale() / 1.25 }));
  document.getElementById('btn-reset-view')?.addEventListener('click', () => network?.fit({ animation: { duration: 500 } }));
  document.getElementById('btn-clear-selection')?.addEventListener('click', () => { network?.unselectAll(); handleDeselect(); });

  const fileInput = document.getElementById('input-char-avatar-file');
  const dropZone = document.getElementById('avatar-dropzone');

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) processFileToBase64(e.target.files[0]);
    });
  }

  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-indigo-400', 'bg-indigo-50'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('border-indigo-400', 'bg-indigo-50'));
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('border-indigo-400', 'bg-indigo-50');
      if (e.dataTransfer.files.length > 0) processFileToBase64(e.dataTransfer.files[0]);
    });
  }

  // Character Form Submission
  document.getElementById('form-character')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const editId = document.getElementById('edit-character-id').value;
    const name = document.getElementById('input-char-name').value.trim();
    const shortName = document.getElementById('input-char-shortname')?.value.trim() || '';
    const fontSize = parseInt(document.getElementById('input-char-fontsize')?.value) || 24;
    const role = document.getElementById('input-char-role').value.trim();
    const avatarUrl = document.getElementById('input-char-avatar').value.trim();
    const bio = document.getElementById('input-char-bio').value.trim();

    const nodeColor = '#6366f1';
    const finalImageSvg = createDynamicAvatarSVG(name, shortName, fontSize, nodeColor, avatarUrl);

    if (editId) {
      nodesDataSet.update({ 
        id: editId, 
        label: name, 
        shortName, 
        fontSize, 
        title: role, 
        bio: bio, 
        image: finalImageSvg,
        rawAvatar: avatarUrl
      });
      if (selectedNodeId === editId) updateInspector(editId);
    } else {
      nodesDataSet.add({ 
        id: String(Date.now()), 
        label: name, 
        shortName, 
        fontSize, 
        title: role, 
        bio: bio, 
        shape: 'circularImage', 
        image: finalImageSvg, 
        rawAvatar: avatarUrl,
        color: { border: nodeColor } 
      });
    }

    saveDataToLocalStorage();
    updateTargetDropdown();
    if (!editId) resetCharacterForm();
  });

  document.getElementById('btn-delete-character')?.addEventListener('click', () => {
    const editId = document.getElementById('edit-character-id').value;
    if (!editId) return;

    if (confirm('Delete this character and all connected relationships?')) {
      edgesDataSet.get({ filter: e => e.from === editId || e.to === editId }).forEach(e => edgesDataSet.remove(e.id));
      nodesDataSet.remove(editId);
      saveDataToLocalStorage();
      handleDeselect();
      updateTargetDropdown();
    }
  });

  document.getElementById('btn-mode-toggle')?.addEventListener('click', resetCharacterForm);

  document.getElementById('form-relationship')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!selectedNodeId) return alert('Select a primary character first.');

    const targetId = document.getElementById('select-target-character').value;
    const relType = document.getElementById('select-rel-type').value;
    const customLabel = document.getElementById('input-rel-label').value.trim();

    if (!targetId) return alert('Choose a target character.');

    const colorHex = REL_COLORS[relType] || '#64748b';
    const displayLabel = customLabel !== '' ? customLabel : relType;

    const existingEdges = edgesDataSet.get({ filter: e => (e.from === selectedNodeId && e.to === targetId) || (e.from === targetId && e.to === selectedNodeId) });

    if (existingEdges.length > 0) {
      edgesDataSet.update({ id: existingEdges[0].id, label: displayLabel, type: relType, color: { color: colorHex } });
    } else {
      edgesDataSet.add({ id: 'e_' + Date.now(), from: selectedNodeId, to: targetId, label: displayLabel, type: relType, color: { color: colorHex } });
    }

    saveDataToLocalStorage();
    updateInspector(selectedNodeId);
    highlightConnectedSubGraph(selectedNodeId);
    e.target.reset();
  });

  // --- EXPORT & IMPORT JSON HANDLERS ---
  document.getElementById('btn-export-json')?.addEventListener('click', () => {
    const currentMap = mapRegistry.find(m => m.id === activeMapId);
    const blob = new Blob([JSON.stringify({ mapName: currentMap?.name || 'Map', characters: nodesDataSet.get(), relationships: edgesDataSet.get() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(currentMap?.name || 'map').toLowerCase().replace(/[^a-z0-9]/g, '_')}_backup.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('btn-import-json')?.addEventListener('click', () => {
    const jsonString = prompt('Paste your exported JSON map backup data below:');
    if (!jsonString || jsonString.trim() === '') return;

    try {
      const parsed = JSON.parse(jsonString);
      const importedNodes = parsed.characters || parsed.nodes || [];
      const importedEdges = parsed.relationships || parsed.edges || [];
      const mapName = parsed.mapName || 'Imported Map';

      const newId = 'map_' + Date.now();
      mapRegistry.push({ id: newId, name: mapName });
      
      localStorage.setItem(`char_map_data_${newId}`, JSON.stringify({
        nodes: importedNodes,
        edges: importedEdges
      }));
      localStorage.setItem(REGISTRY_KEY, JSON.stringify(mapRegistry));

      renderMapDropdown();
      loadMapData(newId);
      alert(`Successfully imported "${mapName}" with ${importedNodes.length} characters!`);
    } catch (err) {
      alert('Invalid JSON format. Please check your data and try again.');
      console.error(err);
    }
  });

  if (window.lucide) lucide.createIcons();
});
