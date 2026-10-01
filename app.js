/**
 * DYNAMIC CHARACTER NETWORK MAP - CORE ENGINE (Part 1)
 * Handles Vis-Network setup, node centering animation, legend layout, and zoom controls.
 */

// --- GLOBAL STATE & COLOR MAPPINGS ---
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

// Default Avatar SVG Generator for missing image URLs
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

// --- VIS-NETWORK INITIALIZATION ---
function initNetworkEngine() {
  const container = document.getElementById('character-network');

  const data = {
    nodes: nodesDataSet,
    edges: edgesDataSet
  };

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
      shadow: {
        enabled: true,
        color: 'rgba(0,0,0,0.1)',
        size: 8,
        x: 0,
        y: 4
      }
    },
    edges: {
      width: 3,
      selectionWidth: 5,
      smooth: {
        type: 'continuous',
        roundness: 0.2
      },
      font: {
        size: 11,
        align: 'middle',
        background: '#ffffff',
        strokeWidth: 0
      }
    },
    physics: {
      enabled: true,
      solver: 'forceAtlas2Based',
      forceAtlas2Based: {
        gravitationalConstant: -50,
        centralGravity: 0.01,
        springLength: 140,
        springConstant: 0.08,
        damping: 0.4
      },
      stabilization: {
        enabled: true,
        iterations: 150
      }
    },
    interaction: {
      hover: true,
      tooltipDelay: 200,
      zoomView: true,
      dragView: true
    }
  };

  network = new vis.Network(container, data, options);

  // Bind Canvas Events
  network.on('click', handleNodeClick);
  network.on('deselectNode', handleDeselect);

  // Render Floating Legend
  renderLegend();
}

// --- NODE CENTERING & HIGHLIGHTING ENGINE ---
function handleNodeClick(params) {
  if (params.nodes.length > 0) {
    const nodeId = params.nodes[0];
    selectedNodeId = nodeId;

    // 1. Dynamic Centering Animation (Moves selected node smoothly to center screen)
    network.focus(nodeId, {
      scale: 1.1,
      animation: {
        duration: 600,
        easingFunction: 'easeInOutQuad'
      }
    });

    // 2. Dim Unconnected Nodes & Highlight Direct Connections
    highlightConnectedSubGraph(nodeId);

    // 3. Show Clear Selection Button
    document.getElementById('btn-clear-selection').classList.remove('hidden');

    // 4. Update Inspector Sidebar (Defined in Chunk 3)
    if (typeof updateInspector === 'function') {
      updateInspector(nodeId);
    }
  } else {
    handleDeselect();
  }
}

function handleDeselect() {
  selectedNodeId = null;
  resetNodeStyles();
  document.getElementById('btn-clear-selection').classList.add('hidden');
  if (typeof clearInspector === 'function') {
    clearInspector();
  }
}

function highlightConnectedSubGraph(centralNodeId) {
  const connectedNodes = network.getConnectedNodes(centralNodeId);
  connectedNodes.push(centralNodeId);

  const allNodes = nodesDataSet.get();
  const updatedNodes = allNodes.map(node => {
    const isConnected = connectedNodes.includes(node.id);
    return {
      id: node.id,
      opacity: isConnected ? 1.0 : 0.25,
      font: {
        color: isConnected ? '#1e293b' : '#94a3b8'
      }
    };
  });

  const allEdges = edgesDataSet.get();
  const updatedEdges = allEdges.map(edge => {
    const isConnected = edge.from === centralNodeId || edge.to === centralNodeId;
    return {
      id: edge.id,
      color: {
        opacity: isConnected ? 1.0 : 0.15
      }
    };
  });

  nodesDataSet.update(updatedNodes);
  edgesDataSet.update(updatedEdges);
}

function resetNodeStyles() {
  const allNodes = nodesDataSet.get();
  const updatedNodes = allNodes.map(node => ({
    id: node.id,
    opacity: 1.0,
    font: { color: '#1e293b' }
  }));

  const allEdges = edgesDataSet.get();
  const updatedEdges = allEdges.map(edge => ({
    id: edge.id,
    color: { opacity: 1.0 }
  }));

  nodesDataSet.update(updatedNodes);
  edgesDataSet.update(updatedEdges);
}

// --- LEGEND & CONTROLS ---
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

// Controls Setup (Zoom In / Out / Reset)
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-zoom-in')?.addEventListener('click', () => {
    if (!network) return;
    const scale = network.getScale();
    network.moveTo({ scale: scale * 1.25, animation: { duration: 300 } });
  });

  document.getElementById('btn-zoom-out')?.addEventListener('click', () => {
    if (!network) return;
    const scale = network.getScale();
    network.moveTo({ scale: scale / 1.25, animation: { duration: 300 } });
  });

  document.getElementById('btn-reset-view')?.addEventListener('click', () => {
    if (!network) return;
    network.fit({ animation: { duration: 500 } });
  });

  document.getElementById('btn-clear-selection')?.addEventListener('click', () => {
    if (!network) return;
    network.unselectAll();
    handleDeselect();
  });
});
