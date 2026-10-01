/**
 * Character Map Studio - Application Logic
 * Includes 3-Layer Data Protection Framework & Robust UI Event Binding
 */

let currentMapId = localStorage.getItem('char_map_active_id_v1') || 'map_roots_primary';
let network = null;
let nodesDataset = new vis.DataSet([]);
let edgesDataset = new vis.DataSet([]);

function initRegistry() {
    let registry = JSON.parse(localStorage.getItem('char_map_registry_v1') || '[]');
    if (registry.length === 0) {
        registry = [{ id: 'map_roots_primary', name: 'Roots - Full Generational Lineage' }];
        localStorage.setItem('char_map_registry_v1', JSON.stringify(registry));
    }
    if (!localStorage.getItem('char_map_active_id_v1')) {
        localStorage.setItem('char_map_active_id_v1', registry[0].id);
        currentMapId = registry[0].id;
    }
    return registry;
}

function deleteActiveMap() {
    const mapRegistry = JSON.parse(localStorage.getItem('char_map_registry_v1') || '[]');
    if (mapRegistry.length <= 1) {
        alert('You must keep at least one character map.');
        return;
    }

    const targetMap = mapRegistry.find(m => m.id === currentMapId);
    if (!targetMap) return;

    if (confirm(`Are you sure you want to delete "${targetMap.name}"? This action cannot be undone.`)) {
        localStorage.removeItem(`char_map_data_${currentMapId}`);
        const updatedRegistry = mapRegistry.filter(m => m.id !== currentMapId);
        localStorage.setItem('char_map_registry_v1', JSON.stringify(updatedRegistry));
        localStorage.setItem('char_map_active_id_v1', updatedRegistry[0].id);
        location.reload();
    }
}

function saveMapDataWithBackup() {
    const payload = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        mapId: currentMapId,
        nodes: nodesDataset.get(),
        edges: edgesDataset.get()
    };
    localStorage.setItem(`char_map_data_${currentMapId}`, JSON.stringify(payload));
    localStorage.setItem('char_map_backup_snapshot', JSON.stringify(payload));
    updateStats();
}

function loadMapData() {
    const storageKey = `char_map_data_${currentMapId}`;
    let rawData = localStorage.getItem(storageKey);

    if (!rawData || rawData === '{"nodes":[],"edges":[]}' || rawData.includes('Array(0)')) {
        const backupData = localStorage.getItem('char_map_backup_snapshot');
        if (backupData) {
            console.warn("Primary map data missing. Restoring from Layer 2 backup snapshot...");
            rawData = backupData;
            localStorage.setItem(storageKey, backupData);
        }
    }

    if (rawData) {
        try {
            const parsed = JSON.parse(rawData);
            return {
                nodes: parsed.nodes || [],
                edges: parsed.edges || []
            };
        } catch (e) {
            console.error("Error parsing map data", e);
        }
    }

    return {
        nodes: [
            { id: 1, label: 'Kunta Kinte', color: '#4f46e5', shape: 'circle' },
            { id: 2, label: 'Bell', color: '#0284c7', shape: 'circle' },
            { id: 3, label: 'Kizzy', color: '#16a34a', shape: 'circle' }
        ],
        edges: [
            { from: 1, to: 2, label: 'Spouse' },
            { from: 1, to: 3, label: 'Parent/Child' }
        ]
    };
}

function renderDropdown() {
    const registry = initRegistry();
    const select = document.getElementById('mapSelect');
    if (!select) return;
    select.innerHTML = '';
    registry.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.name;
        if (m.id === currentMapId) opt.selected = true;
        select.appendChild(opt);
    });

    select.onchange = (e) => {
        currentMapId = e.target.value;
        localStorage.setItem('char_map_active_id_v1', currentMapId);
        initNetwork();
    };
}

function updateStats() {
    const n = nodesDataset.length;
    const e = edgesDataset.length;
    const label = document.getElementById('statsLabel');
    if (label) {
        label.textContent = `${n} characters, ${e} relationships`;
    }
}

function createNewMap() {
    const title = prompt("Enter new character map title:", "New Roots Lineage Map");
    if (!title) return;
    const newId = 'map_' + Date.now();
    const registry = JSON.parse(localStorage.getItem('char_map_registry_v1') || '[]');
    registry.push({ id: newId, name: title });
    localStorage.setItem('char_map_registry_v1', JSON.stringify(registry));
    localStorage.setItem('char_map_active_id_v1', newId);
    currentMapId = newId;
    
    nodesDataset.clear();
    edgesDataset.clear();
    nodesDataset.add({ id: 1, label: 'Root Character', color: '#4f46e5', shape: 'circle' });
    saveMapDataWithBackup();
    location.reload();
}

function promptRenameMap() {
    const registry = JSON.parse(localStorage.getItem('char_map_registry_v1') || '[]');
    const current = registry.find(m => m.id === currentMapId);
    if (!current) return;
    const newName = prompt("Rename map title:", current.name);
    if (!newName) return;
    current.name = newName;
    localStorage.setItem('char_map_registry_v1', JSON.stringify(registry));
    renderDropdown();
}

function openExportModal() {
    const data = {
        mapId: currentMapId,
        nodes: nodesDataset.get(),
        edges: edgesDataset.get()
    };
    const textarea = document.getElementById('jsonTextArea');
    const modal = document.getElementById('jsonModal');
    if (textarea && modal) {
        textarea.value = JSON.stringify(data, null, 2);
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    } else {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `character_map_${currentMapId}.json`;
        a.click();
    }
}

function closeExportModal() {
    const modal = document.getElementById('jsonModal');
    if (modal) {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }
}

function importJsonData() {
    const textarea = document.getElementById('jsonTextArea');
    if (textarea && textarea.value.trim() !== '') {
        try {
            const parsed = JSON.parse(textarea.value);
            if (parsed.nodes && parsed.edges) {
                nodesDataset.clear();
                edgesDataset.clear();
                nodesDataset.add(parsed.nodes);
                nodesDataset.add(parsed.edges);
                saveMapDataWithBackup();
                closeExportModal();
                location.reload();
                return;
            } else {
                alert('Invalid JSON format: missing nodes or edges.');
                return;
            }
        } catch (err) {
            alert('Parsing error: ' + err.message);
            return;
        }
    }

    // Direct file picker fallback
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = event => {
            try {
                const parsed = JSON.parse(event.target.result);
                if (parsed.nodes && parsed.edges) {
                    nodesDataset.clear();
                    edgesDataset.clear();
                    nodesDataset.add(parsed.nodes);
                    nodesDataset.add(parsed.edges);
                    saveMapDataWithBackup();
                    location.reload();
                } else {
                    alert('Invalid JSON file structure: missing nodes or edges.');
                }
            } catch (err) {
                alert('Error parsing JSON file: ' + err.message);
            }
        };
        reader.readAsText(file);
    };
    fileInput.click();
}

function initNetwork() {
    renderDropdown();
    const loaded = loadMapData();
    nodesDataset = new vis.DataSet(loaded.nodes);
    edgesDataset = new vis.DataSet(loaded.edges);

    const container = document.getElementById('networkCanvas');
    if (!container) return;
    
    const data = { nodes: nodesDataset, edges: edgesDataset };
    const options = {
        nodes: {
            font: {
                color: '#ffffff',
                strokeWidth: 4,
                strokeColor: '#000000',
                face: 'system-ui',
                size: 14,
                vadjust: 10
            },
            borderWidth: 2,
            shadow: true
        },
        edges: {
            font: { size: 12, align: 'middle', background: '#ffffff' },
            smooth: { type: 'cubicBezier', roundness: 0.2 }
        },
        physics: {
            barnesHut: { gravitationalConstant: -3000, centralGravity: 0.3, springLength: 200 }
        },
        interaction: { hover: true, dragNodes: true }
    };

    network = new vis.Network(container, data, options);
    updateStats();

    network.on("dragEnd", function() {
        saveMapDataWithBackup();
    });
}

// Ensure all handlers are exposed globally on window
window.openExportModal = openExportModal;
window.closeExportModal = closeExportModal;
window.importJsonData = importJsonData;
window.deleteActiveMap = deleteActiveMap;
window.createNewMap = createNewMap;
window.promptRenameMap = promptRenameMap;

const spacingRange = document.getElementById('edgeSpacingRange');
if (spacingRange) {
    spacingRange.oninput = function(e) {
        const val = parseInt(e.target.value);
        if (network) {
            network.setOptions({ physics: { barnesHut: { springLength: val } } });
        }
    };
}

window.onload = initNetwork;
