import React, { useState, useEffect, useRef, useCallback } from 'react';
import ForceGraph3D from '3d-force-graph';
import * as THREE from 'three';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { Brain, X, Database, Activity, GitBranch, Zap } from 'lucide-react';

const createGlowTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  const center = 64;
  const gradient = context.createRadialGradient(center, center, 0, center, center, center);
  
  // Brilho intenso no núcleo que cai exponencialmente, criando uma névoa de luz (ethereal glow)
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.05, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(0.15, 'rgba(255, 255, 255, 0.4)');
  gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.15)');
  gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.02)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
};
const glowTexture = createGlowTexture();

const translations = {
  PT: {
    title: "MegaMente",
    subtitle: "Grafo Semântico de Memória",
    motion: "Movimento",
    legend: "Legenda de Memórias:",
    legendMain: "Nó Principal",
    details: "Detalhes da Memória",
    type: "Tipo:",
    text: "Texto:",
    relevance: "Relevância:",
    category: "Categoria:",
    hub: "Nó Principal",
    leaf: "Memória",
    memories_count: "MEMÓRIAS",
    synapses_count: "SINAPSES",
    decay_title: "DECAIMENTO DE MEMÓRIA",
    forgotten: "ESQUECIDO",
    active: "ATIVO",
    decay_desc: "Simulando decaimento Ebbinghaus.",
    access_btn: "Acessar Memória (Touch)",
    access: "ACESSO",
    search: "Buscar memórias...",
    newMemory: "Nova Memória"
  },
  EN: {
    title: "MegaMente",
    subtitle: "Semantic Memory Graph",
    motion: "Motion",
    legend: "Memory Legend:",
    legendMain: "Main Hub",
    details: "Memory Details",
    type: "Type:",
    text: "Text:",
    relevance: "Relevance:",
    category: "Category:",
    hub: "Main Hub",
    leaf: "Memory",
    memories_count: "MEMORIES",
    synapses_count: "SYNAPSES",
    decay_title: "MEMORY DECAY",
    forgotten: "FORGOTTEN",
    active: "ACTIVE",
    decay_desc: "Simulating Ebbinghaus decay.",
    access_btn: "Access Memory (Touch)",
    access: "ACCESS",
    search: "Search memories...",
    newMemory: "New Memory"
  },
  ZH: {
    title: "MegaMente",
    subtitle: "语义记忆图",
    motion: "运动",
    legend: "记忆图例:",
    legendMain: "主节点",
    details: "记忆详情",
    type: "类型:",
    text: "文本:",
    relevance: "相关性:",
    category: "类别:",
    hub: "主节点",
    leaf: "记忆",
    memories_count: "记忆数",
    synapses_count: "突触",
    decay_title: "记忆衰退",
    forgotten: "被遗忘的",
    active: "活跃的",
    decay_desc: "模拟艾宾浩斯遗忘曲线。",
    access_btn: "访问记忆 (触摸)",
    access: "访问",
    search: "搜索记忆...",
    newMemory: "新记忆"
  }
};

function App() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [rotationSpeed, setRotationSpeed] = useState(() => {
    const saved = localStorage.getItem('megamente_orbit_speed');
    return saved !== null ? Number(saved) : 0;
  });
  const [rotationDirection, setRotationDirection] = useState(() => {
    const saved = localStorage.getItem('megamente_orbit_dir');
    return saved !== null ? Number(saved) : 1;
  });
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('megamente_lang') || 'PT';
  });

  // Modal and Search states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newMemory, setNewMemory] = useState({ domain: '', content: '', tags: '' });
  const [domains, setDomains] = useState([]);

  // Highlight refs for performance
  const highlightNodes = useRef(new Set());
  const highlightLinks = useRef(new Set());

  const t = translations[language];

  const containerRef = useRef();
  const graphRef = useRef(null);
  const dataHashRef = useRef('');
  const hoveredNodeRef = useRef(null);
  const selectedNodeRef = useRef(null);
  const isInteractingRef = useRef(false);

  useEffect(() => {
    selectedNodeRef.current = selectedNode;
  }, [selectedNode]);

  useEffect(() => {
    localStorage.setItem('megamente_orbit_speed', rotationSpeed.toString());
  }, [rotationSpeed]);

  useEffect(() => {
    localStorage.setItem('megamente_orbit_dir', rotationDirection.toString());
  }, [rotationDirection]);

  useEffect(() => {
    localStorage.setItem('megamente_lang', language);
  }, [language]);

  const updateHighlight = () => {
    if (!graphRef.current) return;
    graphRef.current.graphData().nodes.forEach(node => {
      if (node.__threeObj) {
        const isHighlightActive = highlightNodes.current.size > 0;
        const isHighlighted = highlightNodes.current.has(node.id);
        const isHovered = hoveredNodeRef.current && hoveredNodeRef.current.id === node.id;
        
        node.__threeObj.children.forEach(mesh => {
          if (mesh.type === 'Mesh' && mesh.material) {
            let baseEmissive = node.type === 'hub' ? 1.2 : (0.1 + node.relevance * 1.5);
            if (isHighlightActive) {
               mesh.material.transparent = true;
               mesh.material.opacity = isHighlighted ? 1.0 : 0.05;
               mesh.material.emissiveIntensity = isHighlighted ? (node.type === 'hub' ? 1.5 : 0.5) : 0.02;
               if (isHovered && isHighlighted) mesh.material.emissiveIntensity *= 1.3;
            } else {
               mesh.material.transparent = false;
               mesh.material.opacity = 1.0;
               mesh.material.emissiveIntensity = isHovered ? baseEmissive * 1.3 : baseEmissive;
            }
            mesh.material.needsUpdate = true;
          } else if (mesh.type === 'Sprite') {
             mesh.visible = isHighlightActive ? isHighlighted : true;
          }
        });
      }
    });
    graphRef.current.linkColor(graphRef.current.linkColor());
  };

  const handleNodeClick = useCallback(node => {
    setSelectedNode(node);
    if (node) {
      const camPos = graphRef.current.cameraPosition();
      const target = graphRef.current.controls().target;
      let distance = Math.hypot(camPos.x - target.x, camPos.y - target.y, camPos.z - target.z);
      
      // Se estava na visão global (muito longe), assume uma distância ideal de foco inicial
      if (distance > 500) {
        distance = node.type === 'hub' ? 250 : 100;
      }

      const dist = Math.hypot(node.x, node.y, node.z) || 1;
      const distRatio = 1 + distance/dist;
      graphRef.current.cameraPosition(
        { 
          x: (node.x || 0.1) * distRatio, 
          y: (node.y || 0.1) * distRatio + (node.type === 'hub' ? 0 : distance * 0.6), // Angulação dinâmica baseada no zoom
          z: (node.z || 0.1) * distRatio 
        },
        node,
        2000
      );
    }
  }, []);

  // Efeito para disparar as partículas (sinapses) de forma totalmente assíncrona e caótica
  useEffect(() => {
    if (!graphRef.current || graphData.links.length === 0) return;
    
    // Roda a cada 200ms para decidir quem vai disparar
    const interval = setInterval(() => {
      // Pega os links direto do motor 3D
      const { links } = graphRef.current.graphData();
      
      links.forEach(link => {
        // Atira nos links fortes (em ambas as direções, do hub pra folha e vice-versa)
        if (link.value > 0.5) {
          // 4% de chance a cada 200ms por neurônio (bem caótico e não sincronizado)
          if (Math.random() < 0.04) {
            graphRef.current.emitParticle(link);
          }
        }
      });
    }, 200);

    return () => clearInterval(interval);
  }, [graphData]);

  const handleNodeHover = useCallback(node => {
    containerRef.current.style.cursor = node ? 'pointer' : 'crosshair';
    setHoveredNode(node);
    hoveredNodeRef.current = node;
    if (node) {
      graphRef.current.controls().autoRotate = false;
    }
    updateHighlight();
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const Graph = ForceGraph3D()(containerRef.current)
      .backgroundColor('#000000')
      .showNavInfo(false)
      .nodeLabel(node => `${node.type === 'hub' ? 'HUB:' : 'LEAF:'} ${node.domain.toUpperCase()}`)
      .linkDirectionalParticles(0) // Usaremos emissão manual assíncrona
      .linkDirectionalParticleWidth(0.5)
      .linkDirectionalParticleSpeed(link => link.particleSpeed || 0.005)
      .linkDirectionalParticleColor(() => '#ffffff')
      .linkColor(link => {
        if (link.isReverse) return 'rgba(0,0,0,0)'; // Hide reverse link visually
        const isHovered = hoveredNodeRef.current && (link.source.id === hoveredNodeRef.current.id || link.target.id === hoveredNodeRef.current.id);
        
        if (highlightNodes.current.size === 0) {
           return isHovered ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.2)';
        }
        return highlightLinks.current.has(link) ? 
          (isHovered ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.6)') : 
          'rgba(255, 255, 255, 0.02)';
      })
      .linkWidth(link => {
        const baseWidth = (link.value || 1) * 0.3; // Very thin for mobile
        const isHovered = hoveredNodeRef.current && (link.source.id === hoveredNodeRef.current.id || link.target.id === hoveredNodeRef.current.id);
        if (highlightNodes.current.size > 0 && highlightLinks.current.has(link)) return baseWidth * 2;
        return isHovered ? baseWidth * 1.5 : baseWidth;
      })
      .onNodeClick(node => {
        handleNodeClick(node);
        highlightNodes.current.clear();
        highlightLinks.current.clear();
        if (node) {
          highlightNodes.current.add(node.id);
          graphRef.current.graphData().links.forEach(link => {
            if (link.source.id === node.id || link.target.id === node.id) {
              highlightLinks.current.add(link);
              highlightNodes.current.add(link.source.id);
              highlightNodes.current.add(link.target.id);
            }
          });
        }
        updateHighlight();
      })
      .onBackgroundClick(() => {
        handleNodeClick(null);
        highlightNodes.current.clear();
        highlightLinks.current.clear();
        updateHighlight();
      })
      .onNodeHover(handleNodeHover);

    // Detect interaction to pause rotation
    const handleDown = (e) => { 
      if (e.target && e.target.tagName === 'CANVAS') {
        isInteractingRef.current = true; 
      }
    };
    const handleUp = () => { isInteractingRef.current = false; };
    window.addEventListener('mousedown', handleDown);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchstart', handleDown);
    window.addEventListener('touchend', handleUp);

    Graph.nodeThreeObject(node => {
      const group = new THREE.Group();
      const radius = node.type === 'hub' ? 8 : (0.8 + node.relevance * 2.2);
      const geometry = new THREE.SphereGeometry(radius, 16, 16);
      // Intensidade emissiva significativamente impulsionada pela porcentagem (relevância)
      const emissiveIntensity = node.type === 'hub' ? 1.2 : (0.1 + node.relevance * 1.5);
      const opacity = node.type === 'hub' ? 1.0 : (0.5 + node.relevance * 0.5);

      const material = new THREE.MeshStandardMaterial({
        color: node.color,
        emissive: node.color,
        emissiveIntensity: emissiveIntensity,
        // Remover transparency aqui torna o núcleo sólido, impedindo
        // que ele se misture visualmente com os que estão atrás.
        transparent: false,
      });
      group.add(new THREE.Mesh(geometry, material));

      // Adiciona uma aura (sprite) com gradiente radial perfeito
      if (node.type === 'leaf' && node.relevance > 0.1) {
        const glowSize = radius * (3.6 + node.relevance * 6); // Tamanho reduzido (30% do anterior)
        const glowOpacity = 0.2 + (node.relevance * 0.6); 
        const spriteMaterial = new THREE.SpriteMaterial({
          map: glowTexture,
          color: node.color,
          transparent: true,
          blending: THREE.AdditiveBlending,
          opacity: glowOpacity,
          depthWrite: false
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(glowSize, glowSize, 1);
        sprite.raycast = function() {}; // Previne que o glow intercepte o clique
        group.add(sprite);
      } else if (node.type === 'hub') {
        const glowSize = radius * 4.5;
        const spriteMaterial = new THREE.SpriteMaterial({
          map: glowTexture,
          color: node.color,
          transparent: true,
          blending: THREE.AdditiveBlending,
          opacity: 0.6,
          depthWrite: false
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(glowSize, glowSize, 1);
        sprite.raycast = function() {}; // Previne que o glow intercepte o clique
        group.add(sprite);
      }

      // Antigo halo estático removido em favor do novo glow dinâmico.
      if (node.type === 'hub') {
        const ringGeo = new THREE.TorusGeometry(radius * 2, 0.2, 16, 50);
        const ringMat = new THREE.MeshStandardMaterial({
          color: node.color,
          emissive: node.color,
          emissiveIntensity: 1,
          transparent: true,
          opacity: 0.6
        });
        const ring1 = new THREE.Mesh(ringGeo, ringMat);
        ring1.rotation.x = Math.PI / 2;
        ring1.rotation.y = Math.random() * Math.PI;
        group.add(ring1);
      }
      return group;
    });

    // Custom Forces for Clustering
    Graph.d3Force('charge').strength(node => node.type === 'hub' ? -1500 : -10).distanceMax(800);
    Graph.d3Force('link').distance(link => link.value === 1 ? 30 : 250).strength(link => link.value === 1 ? 1 : 0.1);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.3, 0.5, 0.2   
    );
    Graph.postProcessingComposer().addPass(bloomPass);
    graphRef.current = Graph;

    const handleResize = () => {
      Graph.width(window.innerWidth);
      Graph.height(window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousedown', handleDown);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchstart', handleDown);
      window.removeEventListener('touchend', handleUp);
      Graph._destructor();
    };
  }, [handleNodeClick, handleNodeHover]);

  useEffect(() => {
    if (graphRef.current && graphData.nodes.length > 0) {
      graphRef.current.graphData(graphData);
      if (dataHashRef.current !== '') {
        graphRef.current.cameraPosition({ z: 800 });
      }
    }
  }, [graphData]);

  useEffect(() => {
    let animationFrameId;
    const animate = () => {
      if (graphRef.current && rotationSpeed > 0 && !isInteractingRef.current && !hoveredNodeRef.current && !selectedNodeRef.current) {
        const camPos = graphRef.current.cameraPosition();
        const distance = Math.hypot(camPos.x, camPos.z);
        let currentAngle = Math.atan2(camPos.z, camPos.x);
        currentAngle += rotationSpeed * 0.0001 * rotationDirection;
        graphRef.current.cameraPosition({
          x: distance * Math.cos(currentAngle),
          z: distance * Math.sin(currentAngle)
        });
      }
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, [rotationSpeed, rotationDirection]);

  useEffect(() => {
    const fetchBrainData = async () => {
      try {
        const response = await fetch('/api/neurons');
        const data = await response.json();
        const newHash = JSON.stringify({ n: data.nodes.length, l: data.links.length });
        if (newHash !== dataHashRef.current) {
          const formattedNodes = data.nodes.map(n => {
            let color;
            if (n.type === 'hub') {
              color = '#60a5fa';
            } else {
              const hue = Math.floor(n.relevance * 120);
              color = `hsl(${hue}, 85%, 60%)`;
            }
            return { ...n, color };
          });
          const bidirectionalLinks = [];
          data.links.forEach(l => {
            // Adiciona aleatoriedade para não parecer um batimento cardíaco sincronizado
            l.particleSpeed = 0.002 + Math.random() * 0.006;
            l.particleCount = Math.random() > 0.6 ? 2 : 1;
            
            bidirectionalLinks.push(l);
            bidirectionalLinks.push({ source: l.target, target: l.source, value: l.value, isReverse: true });
          });
          setGraphData({ nodes: formattedNodes, links: bidirectionalLinks });
          dataHashRef.current = newHash;
          const uniqueDomains = [...new Set(data.nodes.map(n => n.domain))].filter(Boolean);
          setDomains(uniqueDomains);
        }
      } catch (err) {
        console.error("Erro ao conectar com o Tronco Cerebral:", err);
      }
    };
    fetchBrainData();
  }, []);

  useEffect(() => {
    if (!graphData.nodes) return;
    highlightNodes.current.clear();
    highlightLinks.current.clear();
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      graphData.nodes.forEach(node => {
        if (node.content.toLowerCase().includes(q) || node.domain.toLowerCase().includes(q)) {
          highlightNodes.current.add(node.id);
        }
      });
    }
    updateHighlight();
  }, [searchQuery, graphData]);

  const handleAddMemory = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3001/api/neurons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMemory)
      });
      const data = await res.json();
      if (data.success) {
        const { nodes: currentNodes, links: currentLinks } = graphRef.current.graphData();
        
        const formattedNewNodes = data.newNodes.map(n => {
          let color = n.type === 'hub' ? '#60a5fa' : `hsl(${Math.floor(n.relevance * 120)}, 85%, 60%)`;
          return { ...n, color };
        });

        const updatedNodes = [...currentNodes, ...formattedNewNodes];
        const domain = newMemory.domain;
        const hubNode = updatedNodes.find(n => n.domain === domain && n.type === 'hub');
        const leafNode = formattedNewNodes.find(n => n.type === 'leaf');
        
        const updatedLinks = [...currentLinks];
        if (hubNode && leafNode) {
          updatedLinks.push({ source: leafNode.id, target: hubNode.id, value: 1 });
          updatedLinks.push({ source: hubNode.id, target: leafNode.id, value: 1, isReverse: true });
        }
        
        setGraphData({ nodes: updatedNodes, links: updatedLinks });
        if (!domains.includes(domain)) setDomains([...domains, domain]);
        
        setIsModalOpen(false);
        setNewMemory({ domain: '', content: '', tags: '' });
      }
    } catch (err) { console.error("Error creating memory:", err); }
  };

  return (
    <div className="app-container">
      <div className="cosmic-background"></div>
      <div ref={containerRef} className="absolute inset-0 cursor-crosshair"></div>
      <div className="ui-layer">
        
        <div className="left-sidebar">
          <div className="header glass-panel">
            <div style={{ padding: '8px', background: 'linear-gradient(to bottom right, #00f0ff, #0055ff)', borderRadius: '12px' }}>
              <Brain size={32} color="white" />
            </div>
            <div>
              <h1>{t.title}</h1>
              <div className="header-badge">{t.subtitle}</div>
            </div>
          </div>

          <div className="top-left-panel glass-panel">
            <button onClick={() => setIsModalOpen(true)} className="new-memory-btn">
              <span>+</span> {t.newMemory}
            </button>

            <input 
              type="text" 
              placeholder={t.search} 
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="stats-bar glass-panel">
          <div className="stat-item">
            <Database size={16} />
            <span className="stat-value">{graphData.nodes.length}</span> {t.memories_count}
          </div>
          <div className="stat-item">
            <GitBranch size={16} />
            <span className="stat-value">{graphData.links.length}</span> {t.synapses_count}
          </div>
        </div>
        
        <div className="bottom-right-panel glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
            <Activity size={20} color="#4ade80" />
            <h2 style={{ fontSize: '14px', fontWeight: '600' }}>{t.decay_title}</h2>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '11px', color: '#aaa', fontWeight: 'bold', letterSpacing: '0.5px' }}>
            <span>{t.forgotten}</span>
            <span>{t.active}</span>
          </div>
          
          <div style={{ position: 'relative', width: '100%', marginBottom: '16px' }}>
            <div style={{
              position: 'absolute',
              top: '-14px',
              left: `calc(${((hoveredNode || selectedNode)?.relevance || 0) * 100}% - 6px)`,
              transition: 'left 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
              opacity: (hoveredNode || selectedNode) ? 1 : 0,
              color: 'white',
              fontSize: '14px',
              textShadow: '0 0 5px rgba(255,255,255,0.8)'
            }}>
              ▼
            </div>
            <div style={{ width: '100%', height: '10px', borderRadius: '5px', background: 'linear-gradient(to right, hsl(0, 85%, 60%), hsl(60, 85%, 60%), hsl(120, 85%, 60%))', boxShadow: '0 0 10px rgba(255,255,255,0.1)' }}></div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#888', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px', marginBottom: '12px' }}>
            <Zap size={14} />
            <span>{t.decay_desc}</span>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', color: '#aaa', fontWeight: 'bold' }}>{t.motion.toUpperCase()}</span>
              <span style={{ fontSize: '11px', color: '#aaa', fontWeight: 'bold' }}>{rotationSpeed}%</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button onClick={() => setRotationDirection(-1)} className={`dir-btn ${rotationDirection === -1 ? 'active' : ''}`}>←</button>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={rotationSpeed} 
                onChange={(e) => setRotationSpeed(Number(e.target.value))}
                style={{ flex: 1, cursor: 'pointer', accentColor: '#00f0ff' }}
              />
              <button onClick={() => setRotationDirection(1)} className={`dir-btn ${rotationDirection === 1 ? 'active' : ''}`}>→</button>
            </div>
            <div className="language-selector">
              <button onClick={() => setLanguage('PT')} className={language === 'PT' ? 'active' : ''}>PT</button>
              <button onClick={() => setLanguage('EN')} className={language === 'EN' ? 'active' : ''}>EN</button>
              <button onClick={() => setLanguage('ZH')} className={language === 'ZH' ? 'active' : ''}>ZH</button>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">{t.newMemory}</h2>
            <form onSubmit={handleAddMemory}>
              <div className="form-group">
                <label>Domínio</label>
                <input 
                  type="text" 
                  list="domains-list"
                  required
                  className="form-input"
                  placeholder="Ex: frontend, física, filosofia..."
                  value={newMemory.domain}
                  onChange={e => setNewMemory({...newMemory, domain: e.target.value})}
                />
                <datalist id="domains-list">
                  {domains.map(d => <option key={d} value={d} />)}
                </datalist>
              </div>
              
              <div className="form-group">
                <label>Conteúdo da Memória</label>
                <textarea 
                  required
                  className="form-input form-textarea"
                  placeholder="O que você acabou de aprender?"
                  value={newMemory.content}
                  onChange={e => setNewMemory({...newMemory, content: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Tags (separadas por vírgula)</label>
                <input 
                  type="text" 
                  className="form-input"
                  placeholder="Ex: css, react, importante"
                  value={newMemory.tags}
                  onChange={e => setNewMemory({...newMemory, tags: e.target.value})}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-submit">Gravar Memória</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className={`info-panel glass-panel ${selectedNode ? 'visible' : ''}`}>
        {selectedNode && (
          <>
            <button className="close-btn" onClick={() => { setSelectedNode(null); highlightNodes.current.clear(); highlightLinks.current.clear(); updateHighlight(); }}>
              <X size={20} />
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${selectedNode.color}20`, border: `1px solid ${selectedNode.color}` }}>
                <Brain size={24} color={selectedNode.color} />
              </div>
              <div>
                <h3 className="node-title" style={{ textTransform: 'uppercase', margin: 0 }}>{selectedNode.domain}</h3>
                <div style={{ fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', color: selectedNode.color, marginTop: '4px' }}>
                  {selectedNode.type === 'hub' ? t.hub : t.leaf} - TIER: {selectedNode.tier}
                </div>
              </div>
            </div>

            <div className="node-content" style={{ marginBottom: '24px' }}>
              {selectedNode.content}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '11px', color: '#aaa', fontFamily: 'monospace' }}>{t.access}</span>
                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{selectedNode.access_count}</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '11px', color: '#aaa', fontFamily: 'monospace' }}>{t.relevance.replace(':', '').toUpperCase()}</span>
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: selectedNode.color }}>{(selectedNode.relevance * 100).toFixed(0)}%</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '11px', color: '#aaa', fontFamily: 'monospace' }}>ID</span>
                <span style={{ fontSize: '11px', color: '#888', fontFamily: 'monospace', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedNode.id}</span>
              </div>
            </div>
            
            <button style={{ width: '100%', marginTop: '24px', padding: '12px', borderRadius: '12px', fontWeight: '600', fontSize: '14px', background: `${selectedNode.color}30`, color: selectedNode.color, border: `1px solid ${selectedNode.color}50`, cursor: 'pointer' }}>
              {t.access_btn}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
