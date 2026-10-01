/**
 * StoryGraph Studio - Application Logic
 * Manages vis-network character maps, local storage persistence,
 * UI state, character inspector, relationship linking, and map switching.
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- STATE MANAGEMENT ---
  let maps = JSON.parse(localStorage.getItem('storygraph_maps')) || {};
  let activeMapId = localStorage.getItem('storygraph_active_map') || null;

  // Default initial map if none exist
  if (Object.keys(maps).length === 0) {
    const defaultId = 'book-' + Date.now();
    maps[defaultId] = {
      title: 'Les Misérables (Sample)',
      nodes: [
        { id: 'jean-valjean', label: 'Jean Valjean', shortName: 'Valjean', role: 'Protagonist', fontSize: 16, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', bio: 'Former convict striving for redemption and protector of Cosette.' },
        { id: 'javert', label: 'Inspector Javert', shortName: 'Javert', role: 'Antagonist', fontSize: 14, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', bio: 'Obsessive police inspector bound strictly to the letter of the law.' },
        { id: 'cosette', label: 'Cosette', shortName: 'Cosette', role: 'Supporting', fontSize: 14, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', bio: 'Adopted daughter of Jean Valjean.' },
        { id: 'marius', label: 'Marius Pontmercy', shortName: 'Marius', role: 'Protagonist', fontSize: 14, avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150', bio: 'Student revolutionary and lover of Cosette.' }
      ],
      edges: [
        { id: 'e1', from: 'jean-valjean', to: 'javert', type: 'Rival/Enemy', label: 'Pursuer / Pursued' },
        { id: 'e2', from: 'jean-valjean', to: 'cosette', type: 'Family', label: 'Adoptive Father' },
        { id: 'e3', from: 'cosette', to: 'marius', type: 'Romantic', label: 'Lovers' },
        { id: 'e4', from: 'marius', to: 'jean-valjean', type: 'Ally/Friend', label: 'Father-in-law' }
      ]
    };
    activeMapId = defaultId;
    saveToLocalStorage();
  } else if (!activeMapId || !maps[activeMapId]) {
    activeMapId = Object.keys(maps)[0];
  }

  let network = null;
  let selectedNodeId = null;
  let lineSpacingValue = 250;

  // DOM Elements
  const selectActiveMap = document.getElementById('select-active-map');
  const btnNewMap = document.getElementById('btn-new-map');
  const btnRenameMap = document.getElementById('btn-rename-map');
  const btnDeleteMap = document.getElementById('btn-delete-map');
  const btnExportJson = document.getElementById('btn-export-json');

  const statCharacters = document.getElementById('stat-characters');
  const statRelationships = document.getElementById('stat-relationships');
  const sliderLineSpacing = document.getElementById('slider-line-spacing');
  
  const btnZoomIn = document.getElementById('btn-zoom-in');
  const btnZoomOut = document.getElementById('btn-zoom-out');
  const btnResetView = document.getElementById('btn-reset-view');
  const legendList = document.getElementById('legend-list');

  // Inspector Elements
  const inspectorEmptyState = document.getElementById('inspector-empty-state');
  const inspectorContent = document.getElementById('inspector-content');
  const btnClearSelection = document.getElementById('btn-clear-selection');
  const inspectorAvatar = document.getElementById('inspector-avatar');
  const inspectorArchetype = document.getElementById('inspector-archetype');
  const inspectorName = document.getElementById('inspector-name');
  const inspectorDescription = document.getElementById('inspector-description');
  const inspectorRelCount = document.getElementById('inspector-rel-count');
  const inspectorRelationshipsList = document.getElementById('inspector-relationships-list');
  
  // Relationship Form
  const formRelationship = document.getElementById('form-relationship');
  const selectTargetCharacter = document.getElementById('select-target-character');
  const selectRelType = document.getElementById('select-rel-type');
  const inputRelLabel = document.getElementById('input-rel-label');

  // Character Editor Form
  const formCharacter = document.getElementById('form-character');
  const formTitle = document.getElementById('form-title');
  const btnModeToggle = document.getElementById('btn-mode-toggle');
  const editCharacterId = document.getElementById('edit-character-id');
  const inputCharName = document.getElementById('input-char-name');
  const inputCharShortname = document.getElementById('input-char-shortname');
  const inputCharRole = document.getElementById('input-char-role');
  const inputCharFontsize = document.getElementById('input-char-fontsize');
  const inputCharAvatar = document.getElementById('input-char-avatar');
  const inputCharAvatarFile = document.getElementById('input-char-avatar-file');
  const inputCharBio = document.getElementById('input-char-bio');
  const btnSaveCharacter = document.getElementById('btn-save-character');
  const btnDeleteCharacter = document.getElementById('btn-delete-character');

  // Relationship Color Mapping
  const relColors = {
    'Ally/Friend': '#10b981',      // Emerald
    'Authority/Power': '#6366f1',  // Indigo
    'Family': '#3b82f6',           // Blue
    'Rival/Enemy': '#f43f5e',      // Rose
    'Romantic': '#ec4899',         // Pink
    'Other': '#64748b'             // Slate
  };

  // --- INITIALIZATION ---
  function init() {
    populateMapSelector();
    renderNetwork();
    updateStats();
    renderLegend();
    setupEventListeners();
  }

  function saveToLocalStorage() {
    localStorage.setItem('storygraph_maps', JSON.stringify(maps));
    localStorage.setItem('storygraph_active_map', activeMapId);
  }

  function getCurrentMap() {
    return maps[activeMapId];
  }

  // --- MAP SELECTOR & MANAGEMENT ---
  function populateMapSelector() {
    selectActiveMap.innerHTML = '';
    Object.keys(maps).forEach(id => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = maps[id].title;
      if (id === activeMapId) opt.selected = true;
      selectActiveMap.appendChild(opt);
    });
  }

  btnNewMap.addEventListener('click', () => {
    const title = prompt('Enter book / map title:', 'New Story Map');
    if (!title) return;
    const newId = 'book-' + Date.now();
    maps[newId] = {
      title: title.trim(),
      nodes: [
        { id: 'char-1', label: 'Protagonist', shortName: 'Hero', role: 'Protagonist', fontSize: 16, avatar: '', bio: 'Main character of the story.' }
      ],
      edges: []
    };
    activeMapId = newId;
    saveToLocalStorage();
    populateMapSelector();
    selectedNodeId = null;
    renderNetwork();
    updateStats();
    renderLegend();
    resetInspector();
  });

  btnRenameMap.addEventListener('click', () => {
    const currentMap = getCurrentMap();
    const newTitle = prompt('Rename book / map title:', currentMap.title);
    if (!newTitle) return;
    currentMap.title = newTitle.trim();
    saveToLocalStorage();
    populateMapSelector();
  });

  btnDeleteMap.addEventListener('click', () => {
    if (Object.keys(maps).length <= 1) {
      alert('You must keep at least one book map.');
      return;
    }
    const currentMap = getCurrentMap();
    if (!confirm(`Are you sure you want to delete "${currentMap.title}"?`)) return;
    delete maps[activeMapId];
    activeMapId = Object.keys(maps)[0];
    saveToLocalStorage();
    populateMapSelector();
    selectedNodeId = null;
    renderNetwork();
    updateStats();
    renderLegend();
    resetInspector();
  });

  selectActiveMap.addEventListener('change', (e) => {
    activeMapId = e.target.value;
    saveToLocalStorage();
    selectedNodeId = null;
    renderNetwork();
    updateStats();
    renderLegend();
    resetInspector();
  });

  btnExportJson.addEventListener('click', () => {
    const currentMap = getCurrentMap();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentMap, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${currentMap.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_storygraph.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  });

  // --- VIS-NETWORK RENDERING ---
  function renderNetwork() {
    const currentMap = getCurrentMap();
    const container = document.getElementById('character-network');

    // Transform nodes for vis-network
    const visNodes = currentMap.nodes.map(n => ({
      id: n.id,
      label: n.shortName || n.label,
      title: `${n.label} (${n.role || 'Character'})`,
      shape: 'circularImage',
      image: n.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      brokenImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      size: 35,
      font: {
        size: n.fontSize || 14,
        color: '#1e293b',
        face: 'ui-sans-serif, system-ui, sans-serif',
        background: 'rgba(255, 255, 255, 0.85)',
        strokeWidth: 0,
        padding: 4
      },
      borderWidth: 3,
      borderWidthSelected: 5,
      color: {
        border: selectedNodeId === n.id ? '#4f46e5' : '#cbd5e1',
        background: '#ffffff',
        highlight: { border: '#4f46e5', background: '#f8fafc' },
        hover: { border: '#6366f1', background: '#f8fafc' }
      }
    }));

    // Transform edges for vis-network
    const visEdges = currentMap.edges.map(e => ({
      id: e.id,
      from: e.from,
      to: e.to,
      label: e.label || '',
      color: {
        color: relColors[e.type] || '#64748b',
        highlight: '#4f46e5',
        hover: '#4f46e5'
      },
      width: 2,
      font: { size: 10, align: 'middle', color: '#64748b', background: '#ffffff' },
      arrows: { to: { enabled: false } },
      smooth: { type: 'cubicBezier', roundness: 0.2 }
    }));

    const data = {
      nodes: new vis.DataSet(visNodes),
      edges: new vis.DataSet(visEdges)
    };

    const options = {
      nodes: {
        shadow: { enabled: true, color: 'rgba(0,0,0,0.1)', size: 5, x: 0, y: 3 }
      },
      edges: {
        shadow: false
      },
      physics: {
        barnesHut: {
          gravitationalConstant: -3000,
          centralGravity: 0.3,
          springLength: lineSpacingValue,
          springConstant: 0.04,
          damping: 0.09,
          avoidOverlap: 0.2
        },
        stabilization: { iterations: 150 }
      },
      interaction: {
        hover: true,
        dragNodes: true,
        zoomView: true,
        dragView: true
      }
    };

    if (network) {
      network.destroy();
    }

    network = new vis.Network(container, data, options);

    // Event Listeners for Network
    network.on('click', params => {
      if (params.nodes.length > 0) {
        selectNode(params.nodes[0]);
      } else {
        selectedNodeId = null;
        resetInspector();
        renderNetwork();
      }
    });

    network.on('dragEnd', params => {
      // Physics stabilization after drag
    });
  }

  // --- UI STATS & LEGEND ---
  function updateStats() {
    const currentMap = getCurrentMap();
    statCharacters.textContent = currentMap.nodes.length;
    statRelationships.textContent = currentMap.edges.length;
  }

  function renderLegend() {
    legendList.innerHTML = '';
    Object.keys(relColors).forEach(type => {
      const color = relColors[type];
      const div = document.createElement('div');
      div.className = 'flex items-center gap-2';
      div.innerHTML = `
        <span class="w-3 h-3 rounded-full shrink-0" style="background-color: ${color};"></span>
        <span class="text-slate-600 truncate">${type}</span>
      `;
      legendList.appendChild(div);
    });
  }

  // --- CANVAS CONTROLS ---
  sliderLineSpacing.addEventListener('input', (e) => {
    lineSpacingValue = parseInt(e.target.value);
    if (network) {
      network.setOptions({
        physics: {
          barnesHut: { springLength: lineSpacingValue }
        }
      });
    }
  });

  btnZoomIn.addEventListener('click', () => {
    if (!network) return;
    const scale = network.getScale();
    network.moveTo({ scale: scale * 1.2, animation: { duration: 300 } });
  });

  btnZoomOut.addEventListener('click', () => {
    if (!network) return;
    const scale = network.getScale();
    network.moveTo({ scale: scale * 0.8, animation: { duration: 300 } });
  });

  btnResetView.addEventListener('click', () => {
    if (!network) return;
    network.fit({ animation: { duration: 500 } });
  });

  // --- CHARACTER INSPECTOR & FORM LOGIC ---
  function selectNode(nodeId) {
    selectedNodeId = nodeId;
    const currentMap = getCurrentMap();
    const character = currentMap.nodes.find(n => n.id === nodeId);
    if (!character) return;

    // Switch UI States
    inspectorEmptyState.classList.add('hidden');
    inspectorContent.classList.remove('hidden');
    btnClearSelection.classList.remove('hidden');

    // Populate Inspector Profile Header
    inspectorAvatar.src = character.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';
    inspectorArchetype.textContent = character.role || 'Character';
    inspectorName.textContent = character.label;
    inspectorDescription.textContent = character.bio || 'No description provided.';

    // Populate Relationships for Active Character
    populateInspectorRelationships(character.id);
    populateTargetDropdown(character.id);

    // Populate Character Edit Form
    formTitle.textContent = 'Edit Character';
    btnModeToggle.classList.remove('hidden');
    editCharacterId.value = character.id;
    inputCharName.value = character.label || '';
    inputCharShortname.value = character.shortName || '';
    inputCharRole.value = character.role || '';
    inputCharFontsize.value = character.fontSize || 14;
    inputCharAvatar.value = character.avatar || '';
    inputCharBio.value = character.bio || '';
    btnSaveCharacter.textContent = 'Update Character';
    btnDeleteCharacter.classList.remove('hidden');

    renderNetwork();
  }

  function resetInspector() {
    selectedNodeId = null;
    inspectorEmptyState.classList.remove('hidden');
    inspectorContent.classList.add('hidden');
    btnClearSelection.classList.add('hidden');

    // Reset Character Form to "Add New" mode
    formTitle.textContent = 'Add New Character';
    btnModeToggle.classList.add('hidden');
    editCharacterId.value = '';
    formCharacter.reset();
    inputCharFontsize.value = '14';
    btnSaveCharacter.textContent = 'Save Character';
    btnDeleteCharacter.classList.add('hidden');

    if (network) {
      network.unselectAll();
      renderNetwork();
    }
  }

  btnClearSelection.addEventListener('click', () => {
    resetInspector();
  });

  btnModeToggle.addEventListener('click', () => {
    resetInspector();
  });

  function populateInspectorRelationships(nodeId) {
    const currentMap = getCurrentMap();
    const rels = currentMap.edges.filter(e => e.from === nodeId || e.to === nodeId);
    inspectorRelCount.textContent = rels.length;
    inspectorRelationshipsList.innerHTML = '';

    if (rels.length === 0) {
      inspectorRelationshipsList.innerHTML = `<p class="text-xs text-slate-400 italic">No relationships linked yet.</p>`;
      return;
    }

    rels.forEach(rel => {
      const isFrom = rel.from === nodeId;
      const targetId = isFrom ? rel.to : rel.from;
      const targetChar = currentMap.nodes.find(n => n.id === targetId);
      const targetName = targetChar ? targetChar.label : 'Unknown';
      const color = relColors[rel.type] || '#64748b';

      const item = document.createElement('div');
      item.className = 'flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs';
      item.innerHTML = `
        <div class="flex items-center gap-2 min-w-0">
          <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${color};"></span>
          <div class="min-w-0">
            <p class="font-semibold text-slate-800 truncate">${targetName}</p>
            <p class="text-[10px] text-slate-500 truncate">${rel.type} ${rel.label ? `(${rel.label})` : ''}</p>
          </div>
        </div>
        <button type="button" data-edge-id="${rel.id}" class="btn-delete-edge p-1 text-slate-400 hover:text-rose-600 transition-colors">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
        </button>
      `;
      inspectorRelationshipsList.appendChild(item);
    });

    lucide.createIcons();

    // Bind delete edge buttons
    document.querySelectorAll('.btn-delete-edge').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const edgeId = e.currentTarget.getAttribute('data-edge-id');
        currentMap.edges = currentMap.edges.filter(ed => ed.id !== edgeId);
        saveToLocalStorage();
        renderNetwork();
        updateStats();
        selectNode(nodeId);
      });
    });
  }

  function populateTargetDropdown(excludeId) {
    const currentMap = getCurrentMap();
    selectTargetCharacter.innerHTML = '<option value="">-- Select Target --</option>';
    currentMap.nodes.forEach(n => {
      if (n.id !== excludeId) {
        const opt = document.createElement('option');
        opt.value = n.id;
        opt.textContent = n.label;
        selectTargetCharacter.appendChild(opt);
      }
    });
  }

  // --- HANDLE RELATIONSHIP FORM SUBMISSION ---
  formRelationship.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!selectedNodeId) return;

    const targetId = selectTargetCharacter.value;
    const relType = selectRelType.value;
    const relLabel = inputRelLabel.value.trim();

    if (!targetId) {
      alert('Please select a target character.');
      return;
    }

    const currentMap = getCurrentMap();
    const newEdge = {
      id: 'edge-' + Date.now(),
      from: selectedNodeId,
      to: targetId,
      type: relType,
      label: relLabel
    };

    currentMap.edges.push(newEdge);
    saveToLocalStorage();
    renderNetwork();
    updateStats();
    formRelationship.reset();
    selectNode(selectedNodeId);
  });

  // --- HANDLE CHARACTER FORM SUBMISSION (CREATE / UPDATE) ---
  inputCharAvatarFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      inputCharAvatar.value = event.target.result;
    };
    reader.readAsDataURL(file);
  });

  formCharacter.addEventListener('submit', (e) => {
    e.preventDefault();
    const currentMap = getCurrentMap();
    const charId = editCharacterId.value;
    const name = inputCharName.value.trim();
    if (!name) return;

    const shortName = inputCharShortname.value.trim() || name;
    const role = inputCharRole.value.trim();
    const fontSize = parseInt(inputCharFontsize.value) || 14;
    const avatar = inputCharAvatar.value.trim();
    const bio = inputCharBio.value.trim();

    if (charId) {
      // Update existing character
      const char = currentMap.nodes.find(n => n.id === charId);
      if (char) {
        char.label = name;
        char.shortName = shortName;
        char.role = role;
        char.fontSize = fontSize;
        char.avatar = avatar;
        char.bio = bio;
      }
    } else {
      // Create new character
      const newChar = {
        id: 'char-' + Date.now(),
        label: name,
        shortName: shortName,
        role: role,
        fontSize: fontSize,
        avatar: avatar,
        bio: bio
      };
      currentMap.nodes.push(newChar);
      selectedNodeId = newChar.id;
    }

    saveToLocalStorage();
    renderNetwork();
    updateStats();

    if (selectedNodeId) {
      selectNode(selectedNodeId);
    } else {
      resetInspector();
    }
  });

  btnDeleteCharacter.addEventListener('click', () => {
    const charId = editCharacterId.value;
    if (!charId) return;
    const currentMap = getCurrentMap();
    const char = currentMap.nodes.find(n => n.id === charId);
    if (!char) return;

    if (!confirm(`Are you sure you want to delete ${char.label}? This will also remove all connected relationships.`)) return;

    // Remove node and any connected edges
    currentMap.nodes = currentMap.nodes.filter(n => n.id !== charId);
    currentMap.edges = currentMap.edges.filter(e => e.from !== charId && e.to !== charId);

    saveToLocalStorage();
    resetInspector();
    renderNetwork();
    updateStats();
  });

  // Run initial setup
  init();
});
