/**
 * DYNAMIC CHARACTER NETWORK MAP - COMPLETE APPLICATION LOGIC
 * Features: Multi-Map Manager, Vis-Network Physics Centering, Inspector, Forms, LocalStorage Persistence & JSON Backup.
 */

// --- GLOBAL STATE & CONFIGURATION ---
const REGISTRY_KEY = 'char_map_registry_v1';
const ACTIVE_MAP_KEY = 'char_map_active_id_v1';

const REL_COLORS = {
  'Ally/Friend': '#84cc16',      // Green
  'Authority/Power': '#f97316',  // Orange
  'Family': '#0284c7',           // Blue
  'Rival/Enemy': '#ef4444',      // Red
  'Romantic': '#a855f7',       // Purple
  'Other': '#64748b'            // Gray
};

let network = null;
let nodesDataSet = new vis.DataSet([]);
let edgesDataSet = new vis.DataSet([]);
let selectedNodeId = null;
let activeMapId = null;
let mapRegistry = [];

// Default Sample Character Data (for brand new maps)
const DEFAULT_CHARACTERS = [
  { id: '1', label: 'Jean Valjean', title: 'Protagonist', bio: 'Former convict striving for redemption and moral integrity.', shape: 'circularImage', image: '', color: { border: '#0284c7' } },
  { id: '2', label: 'Javert', title: 'Inspector / Authority', bio: 'Unforgiving police inspector dedicated to rigid law and justice.', shape: 'circularImage', image: '', color: { border: '#f97316' } },
  { id: '3', label: 'Marius', title: 'Lead Male', bio: 'Idealistic student revolutionary deeply in love with Cosette.', shape: 'circularImage', image: '', color: { border: '#a855f7' } },
  { id: '4', label: 'Cosette', title: 'Love Interest / Daughter', bio: 'Fantine\'s daughter, raised by Jean Valjean as his own.', shape: 'circularImage', image: '', color: { border: '#84cc16' } },
  { id: '5', label: 'Éponine', title: 'Tragic Heroine', bio: 'Secretly loves Marius and sacrifices herself at the barricades.', shape: 'circularImage', image: '', color: { border: '#ef4444' } }
];

const DEFAULT_RELATIONSHIPS = [
  { id: 'e1', from: '1', to: '2', label: 'Rival/Enemy', type: 'Rival/Enemy', color: { color: REL_COLORS['Rival/Enemy'] } },
  { id: 'e2', from: '1', to: '4', label: 'Family (Father)', type: 'Family', color: { color: REL_COLORS['Family'] } },
  { id: 'e3', from: '3', to: '4', label: 'Romantic', type: 'Romantic', color: { color: REL_COLORS['Romantic'] } },
  { id: 'e4', from: '3', to: '5', label: 'Ally/Friend', type: 'Ally/Friend', color: { color: REL_COLORS['Ally/Friend'] } },
  { id: 'e5', from: '2', to: '1', label: 'Authority/Power', type: 'Authority/Power', color: { color: REL_COLORS['Authority/Power'] } }
];

// Fallback Initials Avatar SVG Generator
function createInitialsAvatarSVG(name, color = '#6366f1') {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'C';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="48" fill="${color}" />
    <text x="50" y="58" font-size="38" font-family="sans-serif" font-weight="bold" fill="#ffffff" text-anchor="middle">${initials}</text>
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
      size: 38,
      font: {
        size: 14,
        face: 'Inter, system-ui, sans-serif',
        color: '#1e293b',
        strokeWidth: 3,
        strokeColor: '#ffffff'
      },
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
      forceAtlas2Based: { gravitationalConstant: -50, centralGravity: 0.01, springLength: 140, springConstant: 0.08, damping: 0.4 },
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

    // 1. Dynamic Centering Animation
    network.focus(nodeId, {
      scale: 1.1,
      animation: { duration: 600, easingFunction: 'easeInOutQuad' }
    });

    // 2. Dim Unconnected Subgraph
    highlightConnectedSubGraph(nodeId);

    document.getElementById('btn-clear-selection').classList.remove('hidden');
    updateInspector(nodeId);
  } else {
    handleDeselect();
  }
}

function handleDeselect() {
  selectedNodeId = null;
  resetNodeStyles();
  document.getElementById('btn-clear-selection').classList.add('hidden');
  clearInspector();
}

function highlightConnectedSubGraph(centralNodeId) {
  const connectedNodes = network.getConnectedNodes(centralNodeId);
  connectedNodes.push(centralNodeId);

  const updatedNodes = nodesDataSet.get().map(node => {
    const isConnected = connectedNodes.includes(node.id);
    return { id: node.id, opacity: isConnected ? 1.0 : 0.25, font: { color: isConnected ? '#1e293b' : '#94a3b8' } };
  });

  const updatedEdges = edgesDataSet.get().map(edge => {
    const isConnected = edge.from === centralNodeId || edge.to === centralNodeId;
    return { id: edge.id, color: { opacity: isConnected ? 1.0 : 0.15 } };
  });

  nodesDataSet.update(updatedNodes);
  edgesDataSet.update(updatedEdges);
}

function resetNodeStyles() {
  const updatedNodes = nodesDataSet.get().map(node => ({ id: node.id, opacity: 1.0, font: { color: '#1e293b' } }));
  const updatedEdges = edgesDataSet.get().map(edge => ({ id: edge.id, color: { opacity: 1.0 } }));
  nodesDataSet.update(updatedNodes);
  edgesDataSet.update(updatedEdges);
}

// --- MULTI-MAP MANAGER & PERSISTENCE ---
function initMapRegistry() {
  const rawRegistry = localStorage.getItem(REGISTRY_KEY);
  const oldLegacyNodes = localStorage.getItem('char_map_nodes_v1');

  if (rawRegistry) {
    mapRegistry = JSON.parse(rawRegistry);
  } else if (oldLegacyNodes) {
    // Migration: Move existing v1 single-map data into Map Registry
    const legacyEdges = localStorage.getItem('char_map_edges_v1');
    const migratedId = 'map_' + Date.now();
    mapRegistry = [{ id: migratedId, name: 'Les Misérables' }];
    localStorage.setItem(`char_map_data_${migratedId}`, JSON.stringify({
      nodes: JSON.parse(oldLegacyNodes),
      edges: legacyEdges ? JSON.parse(legacyEdges) : []
    }));
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(mapRegistry));
  } else {
    // Initial First Launch Setup
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

  // Fallback initial SVG avatars
  nodes = nodes.map(n => {
    if (!n.image || n.image === '') {
      n.image = createInitialsAvatarSVG(n.label);
    }
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
  const currentData = {
    nodes: nodesDataSet.get(),
    edges: edgesDataSet.get()
  };
  localStorage.setItem(`char_map_data_${activeMapId}`, JSON.stringify(currentData));
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(mapRegistry));
  updateCounters();
}

function createNewMap() {
  const mapName = prompt('Enter the title of the book or character map:', 'New Book Map');
  if (!mapName || mapName.trim() === '') return;

  const newId = 'map_' + Date.now();
  mapRegistry.push({ id: newId, name: mapName.trim() });
  
  // Save blank initial template
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
  if (confirm(`Are you sure you want to delete "${currentMap.name}" and all its character data?`)) {
    localStorage.removeItem(`char_map_data_${activeMapId}`);
    mapRegistry = mapRegistry.filter(m => m.id !== activeMapId);
    activeMapId = mapRegistry[0].id;
    saveDataToLocalStorage();
    renderMapDropdown();
    loadMapData(activeMapId);
  }
}

function updateCounters() {
  document.getElementById('stat-characters').textContent = nodesDataSet.length;
  document.getElementById('stat-relationships').textContent = edgesDataSet.length;
}

// --- INSPECTOR SIDEBAR LOGIC ---
function updateInspector(nodeId) {
  const char = nodesDataSet.get(nodeId);
  if (!char) return;

  document.getElementById('inspector-empty-state').classList.add('hidden');
  document.getElementById('inspector-content').classList.remove('hidden');

  document.getElementById('inspector-avatar').src = char.image || createInitialsAvatarSVG(char.label);
  document.getElementById('inspector-name').textContent = char.label;
  document.getElementById('inspector-archetype').textContent = char.title || 'Character';
  document.getElementById('inspector-description').textContent = char.bio || 'No overview notes available for this character.';

  const connectedEdges = edgesDataSet.get({ filter: e => e.from === nodeId || e.to === nodeId });
  const relListContainer = document.getElementById('inspector-relationships-list');
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
        const edgeId = e.currentTarget.getAttribute('data-edge-id');
        edgesDataSet.remove(edgeId);
        saveDataToLocalStorage();
        updateInspector(nodeId);
        if (selectedNodeId) highlightConnectedSubGraph(selectedNodeId);
      });
    });
  }

  populateEditForm(char);
  if (window.lucide) lucide.createIcons();
}

function clearInspector() {
  document.getElementById('inspector-empty-state').classList.remove('hidden');
  document.getElementById('inspector-content').classList.add('hidden');
  resetCharacterForm();
}

function populateEditForm(char) {
  document.getElementById('form-title').textContent = 'Edit Character';
  document.getElementById('edit-character-id').value = char.id;
  document.getElementById('input-char-name').value = char.label;
  document.getElementById('input-char-role').value = char.title || '';
  document.getElementById('input-char-avatar').value = char.image.startsWith('data:image') ? '' : char.image;
  document.getElementById('input-char-bio').value = char.bio || '';
  document.getElementById('btn-save-character').textContent = 'Update Character';
  document.getElementById('btn-delete-character').classList.remove('hidden');
}

function resetCharacterForm() {
  document.getElementById('form-title').textContent = 'Add New Character';
  document.getElementById('edit-character-id').value = '';
  document.getElementById('form-character').reset();
  document.getElementById('btn-save-character').textContent = 'Save Character';
  document.getElementById('btn-delete-character').classList.add('hidden');
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
    item.className = 'flex items-center gap-2.5';
    item.innerHTML = `
      <span class="w-3 h-3 rounded-full shrink-0 shadow-2xs" style="background-color: ${color}"></span>
      <span>${type}</span>
    `;
    legendContainer.appendChild(item);
  });
}

// --- EVENT LISTENERS & BINDINGS ---
document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Canvas & Multi-Map Data Registry
  initNetworkEngine();
  initMapRegistry();

  // 2. Map Switcher Event Controls
  document.getElementById('select-active-map')?.addEventListener('change', (e) => {
    loadMapData(e.target.value);
  });
  document.getElementById('btn-new-map')?.addEventListener('click', createNewMap);
  document.getElementById('btn-rename-map')?.addEventListener('click', renameActiveMap);
  document.getElementById('btn-delete-map')?.addEventListener('click', deleteActiveMap);

  // 3. Zoom / Reset View Controls
  document.getElementById('btn-zoom-in')?.addEventListener('click', () => {
    network?.moveTo({ scale: network.getScale() * 1.25, animation: { duration: 300 } });
  });
  document.getElementById('btn-zoom-out')?.addEventListener('click', () => {
    network?.moveTo({ scale: network.getScale() / 1.25, animation: { duration: 300 } });
  });
  document.getElementById('btn-reset-view')?.addEventListener('click', () => {
    network?.fit({ animation: { duration: 500 } });
  });
  document.getElementById('btn-clear-selection')?.addEventListener('click', () => {
    network?.unselectAll();
    handleDeselect();
  });

  // 4. Character Form Submission
  document.getElementById('form-character')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const editId = document.getElementById('edit-character-id').value;
    const name = document.getElementById('input-char-name').value.trim();
    const role = document.getElementById('input-char-role').value.trim();
    const avatarUrl = document.getElementById('input-char-avatar').value.trim();
    const bio = document.getElementById('input-char-bio').value.trim();

    const imageSrc = avatarUrl !== '' ? avatarUrl : createInitialsAvatarSVG(name);

    if (editId) {
      nodesDataSet.update({ id: editId, label: name, title: role, bio: bio, image: imageSrc });
      if (selectedNodeId === editId) updateInspector(editId);
    } else {
      const newId = String(Date.now());
      nodesDataSet.add({ id: newId, label: name, title: role, bio: bio, shape: 'circularImage', image: imageSrc, color: { border: '#6366f1' } });
    }

    saveDataToLocalStorage();
    updateTargetDropdown();
    if (!editId) resetCharacterForm();
  });

  // 5. Delete Character Button
  document.getElementById('btn-delete-character')?.addEventListener('click', () => {
    const editId = document.getElementById('edit-character-id').value;
    if (!editId) return;

    if (confirm('Are you sure you want to delete this character and all connected relationships?')) {
      const connectedEdges = edgesDataSet.get({ filter: e => e.from === editId || e.to === editId });
      connectedEdges.forEach(e => edgesDataSet.remove(e.id));
      nodesDataSet.remove(editId);
      saveDataToLocalStorage();
      handleDeselect();
      updateTargetDropdown();
    }
  });

  // 6. Form Mode Toggle
  document.getElementById('btn-mode-toggle')?.addEventListener('click', resetCharacterForm);

  // 7. Relationship Link Form
  document.getElementById('form-relationship')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!selectedNodeId) {
      alert('Please select a primary character from the map view first.');
      return;
    }

    const targetId = document.getElementById('select-target-character').value;
    const relType = document.getElementById('select-rel-type').value;
    const customLabel = document.getElementById('input-rel-label').value.trim();

    if (!targetId) {
      alert('Please choose a target character to connect.');
      return;
    }

    const colorHex = REL_COLORS[relType] || '#64748b';
    const displayLabel = customLabel !== '' ? customLabel : relType;

    const existingEdges = edgesDataSet.get({
      filter: e => (e.from === selectedNodeId && e.to === targetId) || (e.from === targetId && e.to === selectedNodeId)
    });

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

  // 8. JSON Export (Active Map)
  document.getElementById('btn-export-json')?.addEventListener('click', () => {
    const currentMap = mapRegistry.find(m => m.id === activeMapId);
    const data = {
      mapName: currentMap ? currentMap.name : 'Character Map',
      characters: nodesDataSet.get(),
      relationships: edgesDataSet.get()
    };

    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (currentMap ? currentMap.name : 'map').toLowerCase().replace(/[^a-z0-9]/g, '_');
    a.download = `${safeName}_backup.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // 9. JSON Import
  document.getElementById('input-import-json')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const imported = JSON.parse(evt.target.result);
        if (imported.characters && imported.relationships) {
          nodesDataSet.clear();
          edgesDataSet.clear();
          nodesDataSet.add(imported.characters);
          edgesDataSet.add(imported.relationships);
          saveDataToLocalStorage();
          updateTargetDropdown();
          handleDeselect();
          alert('Character map imported successfully!');
        } else {
          alert('Invalid backup file format.');
        }
      } catch (err) {
        alert('Error parsing JSON file.');
      }
    };
    reader.readAsText(file);
  });

  if (window.lucide) lucide.createIcons();
});
