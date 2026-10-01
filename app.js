document.addEventListener("DOMContentLoaded", () => {
    // 1. Initial State & Elements
    let network = null;
    let nodes = new vis.DataSet([]);
    let edges = new vis.DataSet([]);
    const container = document.getElementById("network-container");
    
    // UI Elements
    const mapSelect = document.getElementById("mapSelect");
    const headerMapTitle = document.getElementById("headerMapTitle");
    const btnNewMap = document.getElementById("btnNewMap");
    const btnClearMap = document.getElementById("btnClearMap");
    
    // Relationship UI
    const edgeStyle = document.getElementById("edgeStyle");
    const edgeArrow = document.getElementById("edgeArrow");
    const edgeColor = document.getElementById("edgeColor");
    const edgeLabel = document.getElementById("edgeLabel");
    const btnAddEdge = document.getElementById("btnAddEdge");
    
    // Node UI
    const nodeForm = document.getElementById("nodeForm");
    const nodeIdInput = document.getElementById("nodeId");
    const nodeLabelInput = document.getElementById("nodeLabel");
    const nodeGroupInput = document.getElementById("nodeGroup");
    const nodeShapeSelect = document.getElementById("nodeShape");
    const nodeColorInput = document.getElementById("nodeColor");
    const nodeTitleInput = document.getElementById("nodeTitle");
    const btnDeleteNode = document.getElementById("btnDeleteNode");
    const btnNewNode = document.getElementById("btnNewNode");
    
    // Modal UI
    const jsonModal = document.getElementById("jsonModal");
    const btnOpenJsonModal = document.getElementById("btnOpenJsonModal");
    const btnCloseModal = document.getElementById("btnCloseModal");
    const jsonTextarea = document.getElementById("jsonTextarea");
    const btnCopyJson = document.getElementById("btnCopyJson");
    const btnImportJson = document.getElementById("btnImportJson");
    const btnExportJson = document.getElementById("btnExportJson");

    // 2. Storage Manager (3-Layer local storage)
    const STORAGE_KEY = "characterMap_data_";
    const MAP_INDEX_KEY = "characterMap_index";
    let currentMapId = "default";

    function loadMapIndex() {
        const indexStr = localStorage.getItem(MAP_INDEX_KEY);
        return indexStr ? JSON.parse(indexStr) : { "default": "Default Map" };
    }

    function saveMapIndex(index) {
        localStorage.setItem(MAP_INDEX_KEY, JSON.stringify(index));
        populateMapSelect();
    }

    function loadMapData(mapId) {
        const dataStr = localStorage.getItem(STORAGE_KEY + mapId);
        if (dataStr) {
            const data = JSON.parse(dataStr);
            nodes.clear();
            edges.clear();
            if(data.nodes) nodes.add(data.nodes);
            if(data.edges) edges.add(data.edges);
        } else {
            nodes.clear();
            edges.clear();
        }
    }

    function saveCurrentState() {
        // Capture x/y coordinates of nodes before saving
        if (network) {
            const positions = network.getPositions();
            nodes.forEach(node => {
                if (positions[node.id]) {
                    nodes.updateOnly({id: node.id, x: positions[node.id].x, y: positions[node.id].y});
                }
            });
        }
        const data = {
            nodes: nodes.get(),
            edges: edges.get()
        };
        localStorage.setItem(STORAGE_KEY + currentMapId, JSON.stringify(data));
    }

    function populateMapSelect() {
        const index = loadMapIndex();
        mapSelect.innerHTML = "";
        for (const [id, name] of Object.entries(index)) {
            const option = document.createElement("option");
            option.value = id;
            option.textContent = name;
            if (id === currentMapId) option.selected = true;
            mapSelect.appendChild(option);
        }
        headerMapTitle.textContent = index[currentMapId] || "Character Map";
    }

    // 3. Network Initialization & Config
    function initNetwork() {
        const data = { nodes: nodes, edges: edges };
        const options = {
            interaction: {
                hover: true,
                multiselect: true,
                navigationButtons: true,
                keyboard: true
            },
            manipulation: {
                enabled: true,
                initiallyActive: true,
                addEdge: function(edgeData, callback) {
                    edgeData.label = edgeLabel.value;
                    edgeData.color = { color: edgeColor.value };
                    edgeData.dashes = edgeStyle.value !== "solid";
                    
                    if(edgeStyle.value === "dashed") edgeData.dashes = [5, 5];
                    if(edgeStyle.value === "dashes") edgeData.dashes = [2, 2];
                    
                    if (edgeArrow.value === "to") edgeData.arrows = "to";
                    else if (edgeArrow.value === "from") edgeData.arrows = "from";
                    else if (edgeArrow.value === "both") edgeData.arrows = "to, from";
                    
                    callback(edgeData);
                    saveCurrentState();
                },
                editEdge: function(edgeData, callback) {
                    callback(edgeData);
                    saveCurrentState();
                },
                deleteNode: function(data, callback) {
                    callback(data);
                    saveCurrentState();
                },
                deleteEdge: function(data, callback) {
                    callback(data);
                    saveCurrentState();
                }
            },
            physics: {
                enabled: true,
                solver: "forceAtlas2Based",
                stabilization: { iterations: 150 }
            }
        };
        network = new vis.Network(container, data, options);
        
        network.on("selectNode", function (params) {
            if (params.nodes.length === 1) {
                const nodeId = params.nodes[0];
                const nodeData = nodes.get(nodeId);
                populateNodeForm(nodeData);
            }
        });

        network.on("deselectNode", function (params) {
            clearNodeForm();
        });
        
        network.on("dragEnd", function() {
            // Save node positions immediately after user drags them
            saveCurrentState();
        });
    }

    // 4. Node Management
    nodeForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const nodeData = {
            id: nodeIdInput.value || vis.util.randomUUID(),
            label: nodeLabelInput.value,
            group: nodeGroupInput.value,
            shape: nodeShapeSelect.value,
            color: { background: nodeColorInput.value, border: "#333" },
            title: nodeTitleInput.value
        };
        
        if (nodeIdInput.value) {
            nodes.update(nodeData);
        } else {
            nodes.add(nodeData);
        }
        
        saveCurrentState();
        clearNodeForm();
    });

    btnNewNode.addEventListener("click", (e) => {
        e.preventDefault();
        clearNodeForm();
        network.unselectAll();
    });

    btnDeleteNode.addEventListener("click", () => {
        if (nodeIdInput.value) {
            nodes.remove(nodeIdInput.value);
            // Vis.js automatically cleans up edges connected to removed nodes
            saveCurrentState();
            clearNodeForm();
        }
    });

    function populateNodeForm(data) {
        nodeIdInput.value = data.id || "";
        nodeLabelInput.value = data.label || "";
        nodeGroupInput.value = data.group || "";
        nodeShapeSelect.value = data.shape || "ellipse";
        nodeTitleInput.value = data.title || "";
        
        if (data.color && data.color.background) {
            nodeColorInput.value = data.color.background;
        } else if (typeof data.color === 'string') {
            nodeColorInput.value = data.color;
        } else {
            nodeColorInput.value = "#97C2FC";
        }
        
        btnDeleteNode.classList.remove("hidden");
        document.getElementById("btnSaveNode").textContent = "Update Character";
    }

    function clearNodeForm() {
        nodeIdInput.value = "";
        nodeLabelInput.value = "";
        nodeGroupInput.value = "";
        nodeShapeSelect.value = "ellipse";
        nodeColorInput.value = "#97C2FC";
        nodeTitleInput.value = "";
        btnDeleteNode.classList.add("hidden");
        document.getElementById("btnSaveNode").textContent = "Save Character";
    }

    // 5. Manual Edge Management (via custom Bottom-Left Panel)
    btnAddEdge.addEventListener("click", () => {
        const selectedNodes = network.getSelectedNodes();
        if (selectedNodes.length === 2) {
            const edgeData = {
                from: selectedNodes[0],
                to: selectedNodes[1],
                label: edgeLabel.value,
                color: { color: edgeColor.value }
            };
            
            if (edgeArrow.value === "to") edgeData.arrows = "to";
            else if (edgeArrow.value === "from") edgeData.arrows = "from";
            else if (edgeArrow.value === "both") edgeData.arrows = "to, from";

            if(edgeStyle.value === "dashed") edgeData.dashes = [5, 5];
            else if(edgeStyle.value === "dashes") edgeData.dashes = [2, 2];

            edges.add(edgeData);
            saveCurrentState();
        } else {
            alert("Please select exactly two nodes to connect.");
        }
    });

    // 6. Modal & JSON Logic
    btnOpenJsonModal.addEventListener("click", () => {
        jsonModal.classList.remove("hidden");
        generateExportJson();
    });
    
    btnCloseModal.addEventListener("click", () => {
        jsonModal.classList.add("hidden");
    });

    btnExportJson.addEventListener("click", () => {
        generateExportJson();
    });
    
    btnCopyJson.addEventListener("click", () => {
        jsonTextarea.select();
        document.execCommand("copy");
        alert("JSON copied to clipboard!");
    });

    function generateExportJson() {
        // Ensure positional data is captured just before generating JSON
        if (network) {
            const positions = network.getPositions();
            nodes.forEach(node => {
                if (positions[node.id]) {
                    nodes.updateOnly({id: node.id, x: positions[node.id].x, y: positions[node.id].y});
                }
            });
        }
        const exportData = {
            nodes: nodes.get(),
            edges: edges.get()
        };
        jsonTextarea.value = JSON.stringify(exportData, null, 2);
    }

    btnImportJson.addEventListener("click", () => {
        try {
            const importData = JSON.parse(jsonTextarea.value);
            if (importData.nodes && importData.edges) {
                nodes.clear();
                edges.clear();
                nodes.add(importData.nodes);
                edges.add(importData.edges);
                saveCurrentState();
                jsonModal.classList.add("hidden");
            } else {
                alert("Invalid JSON format. Must contain 'nodes' and 'edges' arrays.");
            }
        } catch (e) {
            alert("Error parsing JSON: " + e.message);
        }
    });

    // 7. Map Selection & Boot Sequence
    mapSelect.addEventListener("change", (e) => {
        currentMapId = e.target.value;
        const index = loadMapIndex();
        headerMapTitle.textContent = index[currentMapId] || "Character Map";
        loadMapData(currentMapId);
    });
    
    btnNewMap.addEventListener("click", () => {
        const mapName = prompt("Enter a name for the new map:");
        if (mapName) {
            const newMapId = "map_" + Date.now();
            const index = loadMapIndex();
            index[newMapId] = mapName;
            saveMapIndex(index);
            currentMapId = newMapId;
            populateMapSelect();
            nodes.clear();
            edges.clear();
            saveCurrentState();
        }
    });

    btnClearMap.addEventListener("click", () => {
        if(confirm("Are you sure you want to clear the current map? This cannot be undone.")) {
            nodes.clear();
            edges.clear();
            saveCurrentState();
        }
    });

    // Initialize Application
    populateMapSelect();
    loadMapData(currentMapId);
    initNetwork();
});
