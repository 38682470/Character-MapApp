// Character Network Map Logic (app.js)

document.addEventListener('DOMContentLoaded', () => {
    // 1. DOM Element References
    const container = document.getElementById('network-container');
    const mapSelect = document.getElementById('map-select');
    const addMapBtn = document.getElementById('add-map-btn');
    const spacingSlider = document.getElementById('node-spacing-slider');
    const openImportBtn = document.getElementById('open-import-modal-btn');
    const exportBtn = document.getElementById('export-json-btn');
    
    // Modal Elements
    const importModal = document.getElementById('import-modal');
    const closeImportBtn = document.getElementById('close-import-modal-btn');
    const cancelImportBtn = document.getElementById('cancel-import-btn');
    const confirmImportBtn = document.getElementById('confirm-import-btn');
    const jsonInput = document.getElementById('json-input');
    const dropZone = document.getElementById('drop-zone');

    // 2. Default Initial Data
    const defaultData = {
        nodes: new vis.DataSet([
            { id: 1, label: 'Protagonist', shape: 'ellipse', color: '#6366f1', font: { color: '#ffffff' } },
            { id: 2, label: 'Mentor', shape: 'ellipse', color: '#10b981', font: { color: '#ffffff' } },
            { id: 3, label: 'Antagonist', shape: 'ellipse', color: '#ef4444', font: { color: '#ffffff' } }
        ]),
        edges: new vis.DataSet([
            { from: 1, to: 2, label: 'Guided by', color: { color: '#94a3b8' } },
            { from: 1, to: 3, label: 'Opposes', color: { color: '#f87171' } }
        ])
    };

    // 3. Network Physics Options
    const options = {
        nodes: {
            borderWidth: 2,
            shadow: true
        },
        edges: {
            width: 2,
            shadow: true,
            smooth: { type: 'continuous' }
        },
        physics: {
            solver: 'forceAtlas2Based',
            forceAtlas2Based: {
                gravitationalConstant: -50,
                centralGravity: 0.01,
                springLength: 150,
                springConstant: 0.08
            }
        },
        interaction: {
            hover: true,
            navigationButtons: true,
            keyboard: true
        }
    };

    // 4. Safe Vis.js Network Initialization
    let network = null;
    if (container && typeof vis !== 'undefined') {
        network = new vis.Network(container, defaultData, options);
    } else {
        console.error('Vis library or network container element missing.');
    }

    // 5. Spacing Slider Event
    if (spacingSlider && network) {
        spacingSlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            network.setOptions({
                physics: {
                    forceAtlas2Based: {
                        springLength: val
                    }
                }
            });
        });
    }

    // 6. Modal Handlers
    const showModal = () => {
        if (importModal) {
            importModal.classList.remove('hidden');
            importModal.classList.add('flex');
        }
    };

    const hideModal = () => {
        if (importModal) {
            importModal.classList.add('hidden');
            importModal.classList.remove('flex');
        }
    };

    if (openImportBtn) openImportBtn.addEventListener('click', showModal);
    if (closeImportBtn) closeImportBtn.addEventListener('click', hideModal);
    if (cancelImportBtn) cancelImportBtn.addEventListener('click', hideModal);

    // 7. Export JSON Logic
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const exportData = {
                nodes: defaultData.nodes.get(),
                edges: defaultData.edges.get()
            };
            const jsonStr = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'character-network-data.json';
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    // 8. Import JSON Logic
    if (confirmImportBtn) {
        confirmImportBtn.addEventListener('click', () => {
            const rawVal = jsonInput ? jsonInput.value.trim() : '';
            if (!rawVal) return;
            try {
                const parsed = JSON.parse(rawVal);
                if (parsed.nodes && parsed.edges) {
                    defaultData.nodes.clear();
                    defaultData.edges.clear();
                    defaultData.nodes.add(parsed.nodes);
                    defaultData.edges.add(parsed.edges);
                    hideModal();
                    if (jsonInput) jsonInput.value = '';
                } else {
                    alert('Invalid JSON format. Must contain "nodes" and "edges" arrays.');
                }
            } catch (err) {
                alert('Error parsing JSON: ' + err.message);
            }
        });
    }

    // 9. Drag & Drop Import Zone
    if (dropZone) {
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('border-indigo-500');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('border-indigo-500');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('border-indigo-500');
            const file = e.dataTransfer.files[0];
            if (file && file.type === 'application/json') {
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (jsonInput) jsonInput.value = event.target.result;
                };
                reader.readAsText(file);
            }
        });
    }

    // 10. Multi-Map Add Option Handler
    if (addMapBtn && mapSelect) {
        addMapBtn.addEventListener('click', () => {
            const newMapName = prompt('Enter new map name:');
            if (newMapName) {
                const opt = document.createElement('option');
                opt.value = newMapName.toLowerCase().replace(/\s+/g, '-');
                opt.textContent = newMapName;
                mapSelect.appendChild(opt);
                mapSelect.value = opt.value;
            }
        });
    }
});
