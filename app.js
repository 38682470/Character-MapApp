document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------
    // 1. Data Store & State
    // -------------------------------------------------------------
    const defaultData = {
        activeMapId: "map-1",
        maps: [
            {
                id: "map-1",
                title: "Les Misérables",
                nodes: [
                    { id: "1", label: "Jean Valjean", shortName: "Valjean", fontSize: 16, role: "Protagonist", bio: "Ex-convict seeking redemption.", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150" },
                    { id: "2", label: "Javert", shortName: "Javert", fontSize: 14, role: "Antagonist", bio: "Rigid police inspector.", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150" },
                    { id: "3", label: "Cosette", shortName: "Cosette", fontSize: 14, role: "Ingénue", bio: "Fantine's daughter, raised by Valjean.", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150" }
                ],
                edges: [
                    { id: "e1", from: "1", to: "2", type: "Rival/Enemy", label: "Pursuer / Fugitive" },
                    { id: "e2", from: "1", to: "3", type: "Family", label: "Adoptive Father" }
                ]
            }
        ]
    };

    let appData = JSON.parse(localStorage.getItem('character_map_app_data')) || defaultData;

    const relationshipColors = {
        "Ally/Friend": "#10b981",       
        "Authority/Power": "#f59e0b",   
        "Family": "#3b82f6",            
        "Rival/Enemy": "#ef4444",        
        "Romantic": "#ec4899",           
        "Other": "#64748b"              
    };

    let network = null;
    let nodesDataSet = new vis.DataSet([]);
    let edgesDataSet = new vis.DataSet([]);
    let selectedNodeId = null;

    // -------------------------------------------------------------
    // 2. DOM Elements Mapping
    // -------------------------------------------------------------
    const el = {
        selectActiveMap: document.getElementById('select-active-map'),
        btnNewMap: document.getElementById('btn-new-map'),
        btnRenameMap: document.getElementById('btn-rename-map'),
        btnDeleteMap: document.getElementById('btn-delete-map'),
        sliderLineSpacing: document.getElementById('slider-line-spacing'),
        statCharacters: document.getElementById('stat-characters'),
        statRelationships: document.getElementById('stat-relationships'),
        btnClearSelection: document.getElementById('btn-clear-selection'),

        btnZoomIn: document.getElementById('btn-zoom-in'),
        btnZoomOut: document.getElementById('btn-zoom-out'),
        btnResetView: document.getElementById('btn-reset-view'),

        networkContainer: document.getElementById('character-network'),
        legendList: document.getElementById('legend-list'),

        btnExportJson: document.getElementById('btn-export-json'),
        btnOpenImportModal: document.getElementById('btn-open-import-modal'),

        inspectorEmpty: document.getElementById('inspector-empty-state'),
        inspectorContent: document.getElementById('inspector-content'),
        inspectorAvatar: document.getElementById('inspector-avatar'),
        inspectorName: document.getElementById('inspector-name'),
        inspectorArchetype: document.getElementById('inspector-archetype'),
        inspectorBio: document.getElementById('inspector-description'),
        inspectorRelList: document.getElementById('inspector-relationships-list'),

        formTitle: document.getElementById('form-title'),
        btnModeToggle: document.getElementById('btn-mode-toggle'),
        formCharacter: document.getElementById('form-character'),
        editCharId: document.getElementById('edit-character-id'),
        inputCharName: document.getElementById('input-char-name'),
        inputCharShortName: document.getElementById('input-char-shortname'),
        inputCharFontSize: document.getElementById('input-char-fontsize'),
        inputCharRole: document.getElementById('input-char-role'),
        avatarDropzone: document.getElementById('avatar-dropzone'),
        inputCharAvatarFile: document.getElementById('input-char-avatar-file'),
        inputCharAvatar: document.getElementById('input-char-avatar'),
        inputCharBio: document.getElementById('input-char-bio'),
        btnSaveChar: document.getElementById('btn-save-character'),
        btnDeleteChar: document.getElementById('btn-delete-character'),

        formRelationship: document.getElementById('form-relationship'),
        selectTargetChar: document.getElementById('select-target-character'),
        selectRelType: document.getElementById('select-rel-type'),
        inputRelLabel: document.getElementById('input-rel-label'),
        btnSaveRel: document.getElementById('btn-save-relationship'),

        modalImportJson: document.getElementById('modal-import-json'),
        btnCloseImportModal: document.getElementById('btn-close-import-modal'),
        btnCancelImport: document.getElementById('btn-cancel-import'),
        btnSubmitImportJson: document.getElementById('btn-submit-import-json'),
        textareaImportJson: document.getElementById('textarea-import-json'),
        inputImportJsonFile: document.getElementById('input-import-json-file')
    };

    // -------------------------------------------------------------
    // 3. Helper Functions & Persistence
    // -------------------------------------------------------------
    function saveToLocalStorage() {
        localStorage.setItem('character_map_app_data', JSON.stringify(appData));
    }

    function getActiveMap() {
        let map = appData.maps.find(m => m.id === appData.activeMapId);
        if (!map) {
            appData.activeMapId = appData.maps[0].id;
            map = appData.maps[0];
        }
        return map;
    }

    function refreshIcons() {
        if (window.lucide) {
            lucide.createIcons();
        }
    }

    function renderLegend() {
        if (!el.legendList) return;
        el.legendList.innerHTML = '';
        for (const [type, color] of Object.entries(relationshipColors)) {
            const item = document.createElement('div');
            item.className = 'flex items-center gap-2';
            item.innerHTML = `
                <span class="w-3 h-3 rounded-full flex-shrink-0" style="background-color: ${color}"></span>
                <span class="text-xs font-medium text-slate-600">${type}</span>
            `;
            el.legendList.appendChild(item);
        }
    }

    function populateMapDropdown() {
        if (!el.selectActiveMap) return;
        el.selectActiveMap.innerHTML = '';
        appData.maps.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = m.title;
            if (m.id === appData.activeMapId) opt.selected = true;
            el.selectActiveMap.appendChild(opt);
        });
    }

    function updateStats() {
        const activeMap = getActiveMap();
        if (el.statCharacters) el.statCharacters.textContent = activeMap.nodes.length;
        if (el.statRelationships) el.statRelationships.textContent = activeMap.edges.length;
    }

    // -------------------------------------------------------------
    // 4. Vis-Network Canvas Initialization
    // -------------------------------------------------------------
    function initNetwork() {
        const activeMap = getActiveMap();

        const formattedNodes = activeMap.nodes.map(n => ({
            id: n.id,
            label: n.shortName || n.label,
            title: n.label,
            shape: n.avatar ? 'circularImage' : 'dot',
            image: n.avatar || undefined,
            size: 28,
            font: { size: parseInt(n.fontSize) || 14, color: '#1e293b', face: 'Inter, sans-serif', bold: true },
            color: { background: '#818cf8', border: '#4f46e5', highlight: { background: '#6366f1', border: '#4338ca' } }
        }));

        const formattedEdges = activeMap.edges.map(e => ({
            id: e.id,
            from: e.from,
            to: e.to,
            label: e.label || e.type,
            color: { color: relationshipColors[e.type] || '#64748b', highlight: relationshipColors[e.type] || '#64748b' },
            font: { size: 11, fill: '#475569', align: 'middle' },
            width: 2,
            arrows: { to: { enabled: false } }
        }));

        nodesDataSet = new vis.DataSet(formattedNodes);
        edgesDataSet = new vis.DataSet(formattedEdges);

        const data = { nodes: nodesDataSet, edges: edgesDataSet };
        const spacingValue = parseInt(el.sliderLineSpacing ? el.sliderLineSpacing.value : 300);

        const options = {
            nodes: { borderWidth: 2, shadow: true },
            edges: { smooth: { type: 'continuous', roundness: 0.2 } },
            physics: {
                solver: 'forceAtlas2Based',
                forceAtlas2Based: {
                    gravitationalConstant: -50,
                    centralGravity: 0.01,
                    springLength: spacingValue,
                    springConstant: 0.08
                }
            },
            interaction: { hover: true, tooltipDelay: 200 }
        };

        if (network) {
            network.destroy();
        }

        network = new vis.Network(el.networkContainer, data, options);

        network.on('click', (params) => {
            if (params.nodes.length > 0) {
                selectCharacter(params.nodes[0]);
            } else {
                clearSelection();
            }
        });

        updateStats();
        populateTargetCharacterDropdown();
    }

    // -------------------------------------------------------------
    // 5. Selection & Inspector Updates
    // -------------------------------------------------------------
    function selectCharacter(nodeId) {
        selectedNodeId = nodeId;
        const activeMap = getActiveMap();
        const char = activeMap.nodes.find(n => n.id === nodeId);
        if (!char) return;

        if (el.inspectorEmpty) el.inspectorEmpty.classList.add('hidden');
        if (el.inspectorContent) el.inspectorContent.classList.remove('hidden');

        if (el.inspectorName) el.inspectorName.textContent = char.label;
        if (el.inspectorArchetype) el.inspectorArchetype.textContent = char.role || 'Unspecified Role';
        if (el.inspectorBio) el.inspectorBio.textContent = char.bio || 'No notes provided.';
        if (el.inspectorAvatar) {
            el.inspectorAvatar.src = char.avatar || 'https://via.placeholder.com/150?text=No+Image';
        }

        if (el.inspectorRelList) {
            el.inspectorRelList.innerHTML = '';
            const connectedEdges = activeMap.edges.filter(e => e.from === nodeId || e.to === nodeId);

            if (connectedEdges.length === 0) {
                el.inspectorRelList.innerHTML = '<p class="text-xs text-slate-400 italic">No connected relationships yet.</p>';
            } else {
                connectedEdges.forEach(e => {
                    const otherId = (e.from === nodeId) ? e.to : e.from;
                    const otherChar = activeMap.nodes.find(n => n.id === otherId);
                    const color = relationshipColors[e.type] || '#64748b';

                    const item = document.createElement('div');
                    item.className = 'flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs';
                    item.innerHTML = `
                        <div class="flex items-center gap-2">
                            <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${color}"></span>
                            <span class="font-semibold text-slate-700">${otherChar ? otherChar.label : 'Unknown'}</span>
                            <span class="text-slate-400">(${e.label || e.type})</span>
                        </div>
                        <button class="btn-delete-edge text-slate-400 hover:text-rose-500 transition-colors p-1" data-edge-id="${e.id}">
                            <i data-lucide="x" class="w-3.5 h-3.5"></i>
                        </button>
                    `;
                    el.inspectorRelList.appendChild(item);
                });

                el.inspectorRelList.querySelectorAll('.btn-delete-edge').forEach(btn => {
                    btn.addEventListener('click', (ev) => {
                        ev.stopPropagation();
                        deleteRelationship(btn.getAttribute('data-edge-id'));
                    });
                });
            }
        }

        if (el.formTitle) el.formTitle.textContent = `Edit: ${char.label}`;
        if (el.editCharId) el.editCharId.value = char.id;
        if (el.inputCharName) el.inputCharName.value = char.label;
        if (el.inputCharShortName) el.inputCharShortName.value = char.shortName || '';
        if (el.inputCharFontSize) el.inputCharFontSize.value = char.fontSize || 14;
        if (el.inputCharRole) el.inputCharRole.value = char.role || '';
        if (el.inputCharAvatar) el.inputCharAvatar.value = char.avatar || '';
        if (el.inputCharBio) el.inputCharBio.value = char.bio || '';
        if (el.btnDeleteChar) el.btnDeleteChar.classList.remove('hidden');
        if (el.btnClearSelection) el.btnClearSelection.classList.remove('hidden');

        populateTargetCharacterDropdown();
        refreshIcons();
    }

    function clearSelection() {
        selectedNodeId = null;
        if (el.inspectorEmpty) el.inspectorEmpty.classList.remove('hidden');
        if (el.inspectorContent) el.inspectorContent.classList.add('hidden');

        if (el.formTitle) el.formTitle.textContent = "Add New Character";
        if (el.formCharacter) el.formCharacter.reset();
        if (el.editCharId) el.editCharId.value = '';
        if (el.btnDeleteChar) el.btnDeleteChar.classList.add('hidden');
        if (el.btnClearSelection) el.btnClearSelection.classList.add('hidden');

        populateTargetCharacterDropdown();
    }

    function populateTargetCharacterDropdown() {
        if (!el.selectTargetChar) return;
        el.selectTargetChar.innerHTML = '<option value="">-- Select Target --</option>';
        const activeMap = getActiveMap();
        activeMap.nodes.forEach(n => {
            if (n.id !== selectedNodeId) {
                const opt = document.createElement('option');
                opt.value = n.id;
                opt.textContent = n.label;
                el.selectTargetChar.appendChild(opt);
            }
        });
    }

    // -------------------------------------------------------------
    // 6. Character & Relationship Form Actions
    // -------------------------------------------------------------
    if (el.formCharacter) {
        el.formCharacter.addEventListener('submit', (e) => {
            e.preventDefault();
            const activeMap = getActiveMap();
            const id = el.editCharId.value || 'char_' + Date.now();
            const name = el.inputCharName.value.trim();
            if (!name) return;

            const shortName = el.inputCharShortName.value.trim();
            const fontSize = parseInt(el.inputCharFontSize.value) || 14;
            const role = el.inputCharRole.value.trim();
            const avatar = el.inputCharAvatar.value.trim();
            const bio = el.inputCharBio.value.trim();

            const existingIndex = activeMap.nodes.findIndex(n => n.id === id);
            const nodeData = { id, label: name, shortName, fontSize, role, avatar, bio };

            if (existingIndex >= 0) {
                activeMap.nodes[existingIndex] = nodeData;
            } else {
                activeMap.nodes.push(nodeData);
            }

            saveToLocalStorage();
            initNetwork();
            selectCharacter(id);
        });
    }

    if (el.btnDeleteChar) {
        el.btnDeleteChar.addEventListener('click', () => {
            if (!selectedNodeId) return;
            if (confirm("Are you sure you want to delete this character and all connected relationships?")) {
                const activeMap = getActiveMap();
                activeMap.nodes = activeMap.nodes.filter(n => n.id !== selectedNodeId);
                activeMap.edges = activeMap.edges.filter(e => e.from !== selectedNodeId && e.to !== selectedNodeId);
                saveToLocalStorage();
                clearSelection();
                initNetwork();
            }
        });
    }

    if (el.btnModeToggle) el.btnModeToggle.addEventListener('click', clearSelection);
    if (el.btnClearSelection) el.btnClearSelection.addEventListener('click', clearSelection);

    if (el.inputCharAvatarFile) {
        el.inputCharAvatarFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (el.inputCharAvatar) el.inputCharAvatar.value = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (el.formRelationship) {
        el.formRelationship.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!selectedNodeId) {
                alert("Please select a source character from the map first!");
                return;
            }
            const targetId = el.selectTargetChar.value;
            if (!targetId) {
                alert("Please choose a target character to connect.");
                return;
            }

            const type = el.selectRelType.value;
            const label = el.inputRelLabel.value.trim();
            const activeMap = getActiveMap();

            const newEdge = {
                id: 'rel_' + Date.now(),
                from: selectedNodeId,
                to: targetId,
                type: type,
                label: label || type
            };

            activeMap.edges.push(newEdge);
            saveToLocalStorage();
            initNetwork();
            selectCharacter(selectedNodeId);
            el.inputRelLabel.value = '';
        });
    }

    function deleteRelationship(edgeId) {
        const activeMap = getActiveMap();
        activeMap.edges = activeMap.edges.filter(e => e.id !== edgeId);
        saveToLocalStorage();
        initNetwork();
        if (selectedNodeId) selectCharacter(selectedNodeId);
    }

    // -------------------------------------------------------------
    // 7. Line Spacing & View Control Listeners
    // -------------------------------------------------------------
    if (el.sliderLineSpacing) {
        el.sliderLineSpacing.addEventListener('input', (e) => {
            if (network) {
                network.setOptions({
                    physics: { forceAtlas2Based: { springLength: parseInt(e.target.value) } }
                });
            }
        });
    }

    if (el.btnZoomIn) {
        el.btnZoomIn.addEventListener('click', () => {
            if (network) network.moveTo({ scale: network.getScale() * 1.2 });
        });
    }

    if (el.btnZoomOut) {
        el.btnZoomOut.addEventListener('click', () => {
            if (network) network.moveTo({ scale: network.getScale() * 0.8 });
        });
    }

    if (el.btnResetView) {
        el.btnResetView.addEventListener('click', () => {
            if (network) network.fit();
        });
    }

    // -------------------------------------------------------------
    // 8. Book / Multi-Map Controls
    // -------------------------------------------------------------
    if (el.selectActiveMap) {
        el.selectActiveMap.addEventListener('change', (e) => {
            appData.activeMapId = e.target.value;
            saveToLocalStorage();
            clearSelection();
            initNetwork();
        });
    }

    if (el.btnNewMap) {
        el.btnNewMap.addEventListener('click', () => {
            const title = prompt("Enter title for the new character map / book:", "New Book Map");
            if (title) {
                const newMap = {
                    id: 'map_' + Date.now(),
                    title: title.trim(),
                    nodes: [],
                    edges: []
                };
                appData.maps.push(newMap);
                appData.activeMapId = newMap.id;
                saveToLocalStorage();
                populateMapDropdown();
                clearSelection();
                initNetwork();
            }
        });
    }

    if (el.btnRenameMap) {
        el.btnRenameMap.addEventListener('click', () => {
            const activeMap = getActiveMap();
            const title = prompt("Rename active character map:", activeMap.title);
            if (title && title.trim()) {
                activeMap.title = title.trim();
                saveToLocalStorage();
                populateMapDropdown();
            }
        });
    }

    if (el.btnDeleteMap) {
        el.btnDeleteMap.addEventListener('click', () => {
            if (appData.maps.length <= 1) {
                alert("You must keep at least one character map.");
                return;
            }
            const activeMap = getActiveMap();
            if (confirm(`Are you sure you want to delete "${activeMap.title}"?`)) {
                appData.maps = appData.maps.filter(m => m.id !== activeMap.id);
                appData.activeMapId = appData.maps[0].id;
                saveToLocalStorage();
                populateMapDropdown();
                clearSelection();
                initNetwork();
            }
        });
    }

    // -------------------------------------------------------------
    // 9. JSON Export & Import Modal Logic
    // -------------------------------------------------------------
    if (el.btnExportJson) {
        el.btnExportJson.addEventListener('click', () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appData, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `character_map_backup_${Date.now()}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
        });
    }

    if (el.btnOpenImportModal && el.modalImportJson) {
        el.btnOpenImportModal.addEventListener('click', () => {
            el.modalImportJson.classList.remove('hidden');
        });
    }

    function closeModal() {
        if (el.modalImportJson) el.modalImportJson.classList.add('hidden');
        if (el.textareaImportJson) el.textareaImportJson.value = '';
        if (el.inputImportJsonFile) el.inputImportJsonFile.value = '';
    }

    if (el.btnCloseImportModal) el.btnCloseImportModal.addEventListener('click', closeModal);
    if (el.btnCancelImport) el.btnCancelImport.addEventListener('click', closeModal);

    if (el.inputImportJsonFile) {
        el.inputImportJsonFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (el.textareaImportJson) el.textareaImportJson.value = event.target.result;
                };
                reader.readAsText(file);
            }
        });
    }

    if (el.btnSubmitImportJson) {
        el.btnSubmitImportJson.addEventListener('click', () => {
            const jsonText = el.textareaImportJson ? el.textareaImportJson.value.trim() : '';
            if (!jsonText) {
                alert('Please paste JSON data or select a valid JSON file first.');
                return;
            }

            try {
                const parsed = JSON.parse(jsonText);
                
                if (parsed.maps && Array.isArray(parsed.maps)) {
                    appData = parsed;
                } else if (parsed.nodes && Array.isArray(parsed.nodes)) {
                    const importedMap = {
                        id: 'imported_' + Date.now(),
                        title: parsed.title || 'Imported Map',
                        nodes: parsed.nodes,
                        edges: parsed.edges || []
                    };
                    appData.maps.push(importedMap);
                    appData.activeMapId = importedMap.id;
                } else {
                    alert('Unrecognized JSON structure. Ensure it contains nodes and edges array.');
                    return;
                }

                saveToLocalStorage();
                populateMapDropdown();
                clearSelection();
                initNetwork();
                closeModal();
                alert('JSON character map data successfully imported!');
            } catch (err) {
                alert('Invalid JSON syntax: ' + err.message);
            }
        });
    }

    // -------------------------------------------------------------
    // 10. Boot Sequence
    // -------------------------------------------------------------
    renderLegend();
    populateMapDropdown();
    initNetwork();
    refreshIcons();
});
