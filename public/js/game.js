// Game state
const gameState = {
    canvas: null,
    ctx: null,
    player: {
        x: 0,
        y: 0,
        radius: 30,
        speed: 5,
        color: '#6366f1',
        avatar: null,
        avatarImage: null,
        name: 'Player',
        nameOffsetY: -45,
        isMoving: false
    },
    keys: {},
    camera: {
        x: 0,
        y: 0,
        zoom: 1.0,
        minZoom: 0.5,
        maxZoom: 3.0
    },
    grid: {
        cellSize: 50,
        color: '#e5e7eb'
    },
    spawnPoint: {
        x: 0,
        y: 0
    },
    minimap: {
        canvas: null,
        ctx: null,
        size: 250,
        scale: 0.1, // How much of the world to show (smaller = more zoomed out)
        visible: true
    },
    otherPlayers: [], // Will store other players when multiplayer is added
    playerAvatars: new Map(), // Cache for other player avatar images
    chatBubbles: new Map(), // Store active chat bubbles: playerId -> {message, timestamp}
    socket: null,
    playerId: null,
    chatEnabled: true,
    initialized: false
};

// Initialize game
function initGame() {
    // Get canvas
    gameState.canvas = document.getElementById('gameCanvas');
    gameState.ctx = gameState.canvas.getContext('2d');
    
    // Set canvas size
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Load player data
    loadPlayerData();
    
    // Set up keyboard controls
    setupControls();
    
    // Set up mobile/touch controls
    setupMobileControls();
    
    // Set up zoom controls
    setupZoom();
    
    // Set up UI
    setupUI();
    
    // Set up minimap
    setupMinimap();
    
    // Set up chat
    setupChat();
    
    // Set up multiplayer connection
    setupMultiplayer();
    
    // Set player to spawn point (same for everyone)
    gameState.player.x = gameState.spawnPoint.x;
    gameState.player.y = gameState.spawnPoint.y;
    
    // Update camera to center on player
    updateCamera();
    
    gameState.initialized = true;
    
    // Start game loop
    gameLoop();
    
    // Hide instructions after 3 seconds
    setTimeout(() => {
        const instructions = document.getElementById('instructions');
        if (instructions) {
            instructions.classList.add('hidden');
        }
    }, 3000);
}

// Resize canvas to fill window
function resizeCanvas() {
    gameState.canvas.width = window.innerWidth;
    gameState.canvas.height = window.innerHeight;
    
    // Reset to spawn point if player is at origin (first time load or reset)
    if (gameState.initialized && gameState.player.x === 0 && gameState.player.y === 0) {
        gameState.player.x = gameState.spawnPoint.x;
        gameState.player.y = gameState.spawnPoint.y;
        updateCamera();
    } else if (gameState.initialized) {
        // Just update camera when resizing
        updateCamera();
    }
}

// Load player data from localStorage
function loadPlayerData() {
    const username = localStorage.getItem('username');
    const avatarColor = localStorage.getItem('avatarColor');
    const avatarUrl = localStorage.getItem('avatarUrl');
    const avatarImage = localStorage.getItem('avatarImage'); // Base64
    
    // Set player name
    if (username) {
        gameState.player.name = username;
        const nameBadge = document.getElementById('playerNameBadge');
        if (nameBadge) {
            nameBadge.textContent = username;
        }
    }
    
    // Set player color
    if (avatarColor) {
        gameState.player.color = avatarColor;
    }
    
    // Load avatar image (priority: server URL > local base64)
    if (avatarUrl) {
        loadAvatarImage(avatarUrl);
    } else if (avatarImage) {
        gameState.player.avatarImage = avatarImage;
        loadAvatarFromBase64(avatarImage);
    }
}

// Load avatar image from URL
function loadAvatarImage(url) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        gameState.player.avatarImage = img;
        gameState.player.avatar = true;
    };
    img.onerror = () => {
        console.error('Failed to load avatar image');
    };
    img.src = url;
}

// Load avatar from base64
function loadAvatarFromBase64(base64) {
    const img = new Image();
    img.onload = () => {
        gameState.player.avatarImage = img;
        gameState.player.avatar = true;
    };
    img.onerror = () => {
        console.error('Failed to load avatar from base64');
    };
    img.src = base64;
}

// Set up keyboard controls
function setupControls() {
    document.addEventListener('keydown', (e) => {
        // Don't process movement keys if chat input is focused
        const chatInput = document.getElementById('chatInput');
        if (chatInput && document.activeElement === chatInput) {
            return; // Let chat input handle the keys
        }
        
        const key = e.key.toLowerCase();
        
        // Prevent default for arrow keys to avoid scrolling
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(e.key.toLowerCase())) {
            e.preventDefault();
        }
        
        // Map keys to directions
        if (key === 'w' || key === 'arrowup') {
            gameState.keys.up = true;
            e.preventDefault(); // Prevent default behavior
        }
        if (key === 's' || key === 'arrowdown') {
            gameState.keys.down = true;
            e.preventDefault();
        }
        if (key === 'a' || key === 'arrowleft') {
            gameState.keys.left = true;
            e.preventDefault();
        }
        if (key === 'd' || key === 'arrowright') {
            gameState.keys.right = true;
            e.preventDefault();
        }
    });
    
    document.addEventListener('keyup', (e) => {
        // Don't process movement keys if chat input is focused
        const chatInput = document.getElementById('chatInput');
        if (chatInput && document.activeElement === chatInput) {
            return; // Let chat input handle the keys
        }
        
        const key = e.key.toLowerCase();
        
        if (key === 'w' || key === 'arrowup') {
            gameState.keys.up = false;
        }
        if (key === 's' || key === 'arrowdown') {
            gameState.keys.down = false;
        }
        if (key === 'a' || key === 'arrowleft') {
            gameState.keys.left = false;
        }
        if (key === 'd' || key === 'arrowright') {
            gameState.keys.right = false;
        }
    });
}

// Set up mobile/touch controls
function setupMobileControls() {
    const dpadUp = document.getElementById('dpadUp');
    const dpadDown = document.getElementById('dpadDown');
    const dpadLeft = document.getElementById('dpadLeft');
    const dpadRight = document.getElementById('dpadRight');
    
    if (!dpadUp || !dpadDown || !dpadLeft || !dpadRight) {
        return; // Controls not available
    }
    
    // Prevent default touch behaviors
    const preventDefaults = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };
    
    // Handle button press
    const handlePress = (direction, value) => {
        return (e) => {
            preventDefaults(e);
            gameState.keys[direction] = value;
        };
    };
    
    // Touch events for buttons
    const setupButton = (button, direction) => {
        if (!button) return;
        
        // Mouse events (for testing on desktop)
        button.addEventListener('mousedown', handlePress(direction, true));
        button.addEventListener('mouseup', handlePress(direction, false));
        button.addEventListener('mouseleave', handlePress(direction, false));
        
        // Touch events
        button.addEventListener('touchstart', handlePress(direction, true), { passive: false });
        button.addEventListener('touchend', handlePress(direction, false), { passive: false });
        button.addEventListener('touchcancel', handlePress(direction, false), { passive: false });
        
        // Prevent context menu on long press
        button.addEventListener('contextmenu', preventDefaults);
    };
    
    // Set up each button
    setupButton(dpadUp, 'up');
    setupButton(dpadDown, 'down');
    setupButton(dpadLeft, 'left');
    setupButton(dpadRight, 'right');
}

// Set up zoom controls
function setupZoom() {
    const canvas = gameState.canvas;
    
    // Mouse wheel zoom
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        
        const zoomSpeed = 0.1;
        const oldZoom = gameState.camera.zoom;
        
        // Determine zoom direction
        let zoomDelta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed;
        
        // Apply zoom
        gameState.camera.zoom += zoomDelta;
        
        // Clamp zoom to min/max
        gameState.camera.zoom = Math.max(
            gameState.camera.minZoom,
            Math.min(gameState.camera.maxZoom, gameState.camera.zoom)
        );
        
        // When zooming, keep player centered
        // The zoom should change scale but player stays in center
        if (gameState.camera.zoom !== oldZoom) {
            // Recalculate camera to keep player centered
            updateCamera();
        }
    });
    
    // Keyboard zoom shortcuts (optional)
    document.addEventListener('keydown', (e) => {
        if (e.key === '=' || e.key === '+') {
            e.preventDefault();
            zoomIn();
        }
        if (e.key === '-' || e.key === '_') {
            e.preventDefault();
            zoomOut();
        }
        if (e.key === '0') {
            e.preventDefault();
            resetZoom();
        }
    });
}

// Zoom in function
function zoomIn() {
    const oldZoom = gameState.camera.zoom;
    gameState.camera.zoom = Math.min(gameState.camera.maxZoom, gameState.camera.zoom + 0.2);
    if (gameState.camera.zoom !== oldZoom) {
        updateCamera();
    }
}

// Zoom out function
function zoomOut() {
    const oldZoom = gameState.camera.zoom;
    gameState.camera.zoom = Math.max(gameState.camera.minZoom, gameState.camera.zoom - 0.2);
    if (gameState.camera.zoom !== oldZoom) {
        updateCamera();
    }
}

// Reset zoom function
function resetZoom() {
    gameState.camera.zoom = 1.0;
    updateCamera();
}

// Update player position based on keys
function updatePlayer() {
    let dx = 0;
    let dy = 0;
    
    if (gameState.keys.up) dy -= gameState.player.speed;
    if (gameState.keys.down) dy += gameState.player.speed;
    if (gameState.keys.left) dx -= gameState.player.speed;
    if (gameState.keys.right) dx += gameState.player.speed;
    
    // Check if player is moving
    gameState.player.isMoving = dx !== 0 || dy !== 0;
    
    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
        dx *= 0.707; // 1/√2 for smooth diagonal movement
        dy *= 0.707;
    }
    
    // Update player position (free movement, no boundaries for now)
    gameState.player.x += dx;
    gameState.player.y += dy;
    
    // Update camera to follow player
    updateCamera();
}

// Update camera position to follow player
function updateCamera() {
    // Camera follows player - player is always centered on screen
    // Camera position represents the top-left of the visible world
    const zoom = gameState.camera.zoom;
    gameState.camera.x = gameState.player.x - gameState.canvas.width / (2 * zoom);
    gameState.camera.y = gameState.player.y - gameState.canvas.height / (2 * zoom);
}

// Clear canvas
function clearCanvas() {
    gameState.ctx.fillStyle = '#ffffff';
    gameState.ctx.fillRect(0, 0, gameState.canvas.width, gameState.canvas.height);
}

// Draw grid background
function drawGrid() {
    const { cellSize, color } = gameState.grid;
    const { camera, player } = gameState;
    const zoom = camera.zoom;
    
    gameState.ctx.strokeStyle = color;
    gameState.ctx.lineWidth = 1 / zoom; // Scale line width with zoom
    
    // Grid cells in world coordinates
    const scaledCellSize = cellSize / zoom;
    
    // Calculate which grid lines to draw based on camera view
    const startX = camera.x - (camera.x % scaledCellSize);
    const startY = camera.y - (camera.y % scaledCellSize);
    const endX = camera.x + gameState.canvas.width / zoom;
    const endY = camera.y + gameState.canvas.height / zoom;
    
    // Draw vertical lines
    for (let worldX = startX; worldX <= endX; worldX += scaledCellSize) {
        const screenX = (worldX - camera.x) * zoom;
        gameState.ctx.beginPath();
        gameState.ctx.moveTo(screenX, 0);
        gameState.ctx.lineTo(screenX, gameState.canvas.height);
        gameState.ctx.stroke();
    }
    
    // Draw horizontal lines
    for (let worldY = startY; worldY <= endY; worldY += scaledCellSize) {
        const screenY = (worldY - camera.y) * zoom;
        gameState.ctx.beginPath();
        gameState.ctx.moveTo(0, screenY);
        gameState.ctx.lineTo(gameState.canvas.width, screenY);
        gameState.ctx.stroke();
    }
}

// Draw player dot
function drawPlayer() {
    const { x, y, radius, color, avatar, avatarImage, name, nameOffsetY, isMoving } = gameState.player;
    const zoom = gameState.camera.zoom;
    
    // Screen coordinates - player is always centered
    const screenX = gameState.canvas.width / 2;
    const screenY = gameState.canvas.height / 2;
    const scaledRadius = radius * zoom;
    
    // Draw movement indicator trail (when moving)
    if (isMoving) {
        gameState.ctx.save();
        gameState.ctx.globalAlpha = 0.3;
        gameState.ctx.fillStyle = color;
        gameState.ctx.beginPath();
        gameState.ctx.arc(screenX, screenY, scaledRadius * 1.2, 0, Math.PI * 2);
        gameState.ctx.fill();
        gameState.ctx.restore();
    }
    
    // Draw player circle/avatar with pulse effect when moving
    gameState.ctx.save();
    
    // Add subtle scale animation when moving
    let scale = isMoving ? 1.05 : 1.0;
    gameState.ctx.translate(screenX, screenY);
    gameState.ctx.scale(scale, scale);
    gameState.ctx.translate(-screenX, -screenY);
    
    if (avatar && avatarImage) {
        // Draw avatar image
        gameState.ctx.beginPath();
        gameState.ctx.arc(screenX, screenY, scaledRadius, 0, Math.PI * 2);
        gameState.ctx.clip();
        
        // Draw image
        gameState.ctx.drawImage(
            avatarImage,
            screenX - scaledRadius,
            screenY - scaledRadius,
            scaledRadius * 2,
            scaledRadius * 2
        );
    } else {
        // Draw colored circle
        gameState.ctx.fillStyle = color;
        gameState.ctx.beginPath();
        gameState.ctx.arc(screenX, screenY, scaledRadius, 0, Math.PI * 2);
        gameState.ctx.fill();
        
        // Add border highlight when moving
        if (isMoving) {
            gameState.ctx.strokeStyle = color;
            gameState.ctx.lineWidth = 3 * zoom;
            gameState.ctx.globalAlpha = 0.6;
            gameState.ctx.stroke();
            gameState.ctx.globalAlpha = 1.0;
        }
    }
    
    gameState.ctx.restore();
    
    // Draw name above player (scale with zoom)
    const nameOffset = nameOffsetY * zoom;
    drawPlayerName(screenX, screenY + nameOffset, name, zoom);
}

// Draw player name
function drawPlayerName(x, y, name, zoom = 1.0) {
    gameState.ctx.save();
    
    // Scale font size with zoom
    const fontSize = 14 * zoom;
    gameState.ctx.font = `${fontSize}px Inter, sans-serif`;
    gameState.ctx.textAlign = 'center';
    gameState.ctx.textBaseline = 'middle';
    
    const textMetrics = gameState.ctx.measureText(name);
    const textWidth = textMetrics.width;
    const textHeight = 20 * zoom;
    const padding = 8 * zoom;
    const borderRadius = 8 * zoom;
    
    // Draw background
    gameState.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    gameState.ctx.beginPath();
    gameState.ctx.roundRect(
        x - textWidth / 2 - padding,
        y - textHeight / 2 - padding,
        textWidth + padding * 2,
        textHeight + padding * 2,
        borderRadius
    );
    gameState.ctx.fill();
    
    // Draw text
    gameState.ctx.fillStyle = '#ffffff';
    gameState.ctx.fillText(name, x, y);
    
    gameState.ctx.restore();
}

// Draw position indicator
function drawPositionIndicator() {
    const { x, y } = gameState.player;
    const zoom = gameState.camera.zoom;
    
    // Draw coordinates in corner
    gameState.ctx.save();
    gameState.ctx.font = '12px monospace';
    gameState.ctx.textAlign = 'left';
    gameState.ctx.textBaseline = 'top';
    
    const text = `X: ${Math.round(x)} Y: ${Math.round(y)} | Zoom: ${zoom.toFixed(2)}x`;
    const metrics = gameState.ctx.measureText(text);
    
    // Background
    gameState.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    gameState.ctx.fillRect(10, gameState.canvas.height - 35, metrics.width + 20, 25);
    
    // Text
    gameState.ctx.fillStyle = '#1f2937';
    gameState.ctx.fillText(text, 20, gameState.canvas.height - 28);
    
    gameState.ctx.restore();
}

// Main game loop
function gameLoop() {
    // Clear canvas
    clearCanvas();
    
    // Draw grid background (shows movement)
    drawGrid();
    
    // Update game state
    updatePlayer();
    
    // Update other players positions (interpolation)
    updateOtherPlayers();
    
    // Draw game objects
    drawPlayer();
    
    // Draw other players
    drawOtherPlayers();
    
    // Draw chat bubbles
    drawChatBubbles();
    
    // Draw position indicator
    drawPositionIndicator();
    
    // Update minimap
    updateMinimap();
    
    // Send position update to server
    sendPositionUpdate();
    
    // Request next frame
    requestAnimationFrame(gameLoop);
}

// Set up minimap
function setupMinimap() {
    const minimapContainer = document.getElementById('minimapContainer');
    const minimapCanvas = document.getElementById('minimapCanvas');
    const minimapToggle = document.getElementById('minimapToggle');
    
    if (!minimapCanvas || !minimapContainer) return;
    
    gameState.minimap.canvas = minimapCanvas;
    gameState.minimap.ctx = minimapCanvas.getContext('2d');
    
    // Set canvas size
    updateMinimapSize();
    window.addEventListener('resize', updateMinimapSize);
    
    // Toggle minimap
    if (minimapToggle) {
        minimapToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMinimap();
        });
    }
    
    // Make minimap draggable
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    
    const header = minimapContainer.querySelector('.minimap-header');
    if (header) {
        header.addEventListener('mousedown', (e) => {
            if (e.target === minimapToggle) return;
            isDragging = true;
            const rect = minimapContainer.getBoundingClientRect();
            dragOffset.x = e.clientX - rect.left;
            dragOffset.y = e.clientY - rect.top;
        });
    }
    
    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const newX = e.clientX - dragOffset.x;
            const newY = e.clientY - dragOffset.y;
            minimapContainer.style.left = `${newX}px`;
            minimapContainer.style.right = 'auto';
            minimapContainer.style.top = `${newY}px`;
            minimapContainer.style.bottom = 'auto';
        }
    });
    
    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
}

function updateMinimapSize() {
    if (!gameState.minimap.canvas || !gameState.minimap.canvas.parentElement) return;
    
    const container = gameState.minimap.canvas.parentElement;
    const headerHeight = 36;
    const canvasSize = container.clientWidth;
    
    gameState.minimap.canvas.width = canvasSize;
    gameState.minimap.canvas.height = container.clientHeight - headerHeight;
    gameState.minimap.size = canvasSize;
}

function toggleMinimap() {
    const container = document.getElementById('minimapContainer');
    const toggle = document.getElementById('minimapToggle');
    
    if (!container || !toggle) return;
    
    gameState.minimap.visible = !gameState.minimap.visible;
    container.classList.toggle('collapsed');
    toggle.textContent = gameState.minimap.visible ? '−' : '+';
}

// Update and draw minimap
function updateMinimap() {
    if (!gameState.minimap.ctx || !gameState.minimap.visible) return;
    
    const { ctx, canvas, scale } = gameState.minimap;
    const { player } = gameState;
    
    // Clear minimap
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Calculate view bounds
    const viewSize = canvas.width / scale;
    const centerX = player.x;
    const centerY = player.y;
    
    const startX = centerX - viewSize / 2;
    const startY = centerY - viewSize / 2;
    const endX = centerX + viewSize / 2;
    const endY = centerY + viewSize / 2;
    
    // Draw grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;
    const gridCellSize = gameState.grid.cellSize;
    
    for (let x = Math.floor(startX / gridCellSize) * gridCellSize; x <= endX; x += gridCellSize) {
        const screenX = ((x - centerX) * scale + canvas.width / 2);
        if (screenX >= 0 && screenX <= canvas.width) {
            ctx.beginPath();
            ctx.moveTo(screenX, 0);
            ctx.lineTo(screenX, canvas.height);
            ctx.stroke();
        }
    }
    
    for (let y = Math.floor(startY / gridCellSize) * gridCellSize; y <= endY; y += gridCellSize) {
        const screenY = ((y - centerY) * scale + canvas.height / 2);
        if (screenY >= 0 && screenY <= canvas.height) {
            ctx.beginPath();
            ctx.moveTo(0, screenY);
            ctx.lineTo(canvas.width, screenY);
            ctx.stroke();
        }
    }
    
    // Draw viewport indicator (what you're currently seeing on main canvas)
    const zoom = gameState.camera.zoom;
    const viewWidth = (gameState.canvas.width / zoom) * scale;
    const viewHeight = (gameState.canvas.height / zoom) * scale;
    
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(
        canvas.width / 2 - viewWidth / 2,
        canvas.height / 2 - viewHeight / 2,
        viewWidth,
        viewHeight
    );
    ctx.setLineDash([]);
    
    // Draw other players (will be populated when multiplayer is added)
    gameState.otherPlayers.forEach(otherPlayer => {
        if (!otherPlayer.x || !otherPlayer.y) return;
        
        const relativeX = otherPlayer.x - centerX;
        const relativeY = otherPlayer.y - centerY;
        const screenX = (relativeX * scale) + canvas.width / 2;
        const screenY = (relativeY * scale) + canvas.height / 2;
        
        // Only draw if visible on minimap
        if (screenX >= 0 && screenX <= canvas.width && screenY >= 0 && screenY <= canvas.height) {
            ctx.fillStyle = otherPlayer.color || otherPlayer.avatarColor || '#6366f1';
            ctx.beginPath();
            ctx.arc(screenX, screenY, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    });
    
    // Draw current player (always in center of minimap)
    ctx.fillStyle = player.color || '#6366f1';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw player indicator (arrow pointing up)
    ctx.fillStyle = player.color || '#6366f1';
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(-4, 0);
    ctx.lineTo(4, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

// Set up multiplayer connection
function setupMultiplayer() {
    const username = localStorage.getItem('username');
    const userId = localStorage.getItem('userId');
    const avatarColor = localStorage.getItem('avatarColor') || '#6366f1';
    const avatarUrl = localStorage.getItem('avatarUrl');
    
    if (!username) {
        console.error('No username found for multiplayer connection');
        return;
    }
    
    // Connect to Socket.io server
    gameState.socket = io();
    
    gameState.socket.on('connect', () => {
        console.log('Connected to game server');
        gameState.playerId = gameState.socket.id;
        
        // Wait a tiny bit to ensure player is at spawn point
        setTimeout(() => {
            // Send join game event with current player data
            gameState.socket.emit('joinGame', {
                id: userId,
                username: username,
                x: gameState.player.x,
                y: gameState.player.y,
                color: avatarColor,
                avatar: avatarUrl || null,
                radius: gameState.player.radius
            });
        }, 100);
    });
    
    // Receive updated list of all players
    gameState.socket.on('playersUpdate', (players) => {
        // Update other players (exclude self)
        const existingPlayerIds = new Set(gameState.otherPlayers.map(p => p.id));
        
        players.forEach(playerData => {
            if (playerData.id === gameState.socket.id) return; // Skip self
            
            if (existingPlayerIds.has(playerData.id)) {
                // Update existing player with exact server position
                const index = gameState.otherPlayers.findIndex(p => p.id === playerData.id);
                if (index >= 0) {
                    gameState.otherPlayers[index].x = playerData.x; // Exact position
                    gameState.otherPlayers[index].y = playerData.y;
                    gameState.otherPlayers[index].targetX = playerData.x;
                    gameState.otherPlayers[index].targetY = playerData.y;
                    gameState.otherPlayers[index].lastUpdateTime = Date.now();
                    // Update other properties
                    if (playerData.color) gameState.otherPlayers[index].color = playerData.color;
                    if (playerData.username) gameState.otherPlayers[index].username = playerData.username;
                    if (playerData.avatar !== undefined) gameState.otherPlayers[index].avatar = playerData.avatar;
                }
            } else {
                // New player - set exact server position
                gameState.otherPlayers.push({
                    ...playerData,
                    x: playerData.x,
                    y: playerData.y,
                    targetX: playerData.x,
                    targetY: playerData.y,
                    lastUpdateTime: Date.now()
                });
                if (playerData.avatar) {
                    loadOtherPlayerAvatar(playerData.id, playerData.avatar);
                }
            }
        });
    });
    
    // Receive a single player update
    gameState.socket.on('playerUpdate', (playerData) => {
        if (playerData.id === gameState.socket.id) return; // Ignore self
        
        // Update or add player with exact server position
        const index = gameState.otherPlayers.findIndex(p => p.id === playerData.id);
        if (index >= 0) {
            // Update position directly from server for accuracy
            gameState.otherPlayers[index].targetX = playerData.x;
            gameState.otherPlayers[index].targetY = playerData.y;
            gameState.otherPlayers[index].x = playerData.x; // Set immediately for accuracy
            gameState.otherPlayers[index].y = playerData.y;
            gameState.otherPlayers[index].lastUpdateTime = Date.now();
            // Update other properties
            if (playerData.color) gameState.otherPlayers[index].color = playerData.color;
            if (playerData.username) gameState.otherPlayers[index].username = playerData.username;
        } else {
            // New player - add them directly at server position
            const newPlayer = {
                ...playerData,
                x: playerData.x, // Exact server position
                y: playerData.y,
                targetX: playerData.x,
                targetY: playerData.y,
                lastUpdateTime: Date.now()
            };
            gameState.otherPlayers.push(newPlayer);
            // Preload avatar if available
            if (playerData.avatar) {
                loadOtherPlayerAvatar(playerData.id, playerData.avatar);
            }
        }
    });
    
    // Handle player disconnect
    gameState.socket.on('playerDisconnect', (playerId) => {
        gameState.otherPlayers = gameState.otherPlayers.filter(p => p.id !== playerId);
        // Clean up avatar cache
        gameState.playerAvatars.delete(playerId);
    });
    
    // Handle connection errors
    gameState.socket.on('disconnect', () => {
        console.log('Disconnected from game server');
    });
    
    gameState.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
    });
    
    // Receive chat messages (remove any existing listener first to prevent duplicates)
    gameState.socket.off('chatMessage');
    gameState.socket.on('chatMessage', (data) => {
        addChatMessage(data.username, data.message, data.x, data.y, data.playerId);
    });
}

// Send position update to server
let lastUpdateTime = 0;
let lastSentX = null;
let lastSentY = null;
const UPDATE_INTERVAL = 33; // Send updates every 33ms (~30 updates per second) for better sync
const MIN_MOVEMENT = 0.5; // Send if moved at least 0.5 pixels

function sendPositionUpdate() {
    if (!gameState.socket || !gameState.socket.connected) return;
    
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTime;
    
    // Calculate movement distance
    const movedDistance = Math.abs(gameState.player.x - (lastSentX ?? gameState.player.x)) + 
                          Math.abs(gameState.player.y - (lastSentY ?? gameState.player.y));
    
    // Send update if enough time passed OR player moved
    if (timeSinceLastUpdate >= UPDATE_INTERVAL || movedDistance >= MIN_MOVEMENT) {
        lastUpdateTime = now;
        lastSentX = gameState.player.x;
        lastSentY = gameState.player.y;
        
        gameState.socket.emit('playerMove', {
            id: gameState.socket.id,
            x: gameState.player.x,
            y: gameState.player.y
        });
    }
}

// Update other players positions (use exact server positions for accuracy)
function updateOtherPlayers() {
    gameState.otherPlayers.forEach(otherPlayer => {
        // Directly use server position for accuracy - no interpolation
        if (otherPlayer.targetX !== undefined) {
            otherPlayer.x = otherPlayer.targetX;
        }
        if (otherPlayer.targetY !== undefined) {
            otherPlayer.y = otherPlayer.targetY;
        }
    });
}

// Draw other players
function drawOtherPlayers() {
    gameState.otherPlayers.forEach(otherPlayer => {
        drawOtherPlayer(otherPlayer);
    });
}

// Load other player avatar
function loadOtherPlayerAvatar(playerId, avatarUrl) {
    if (gameState.playerAvatars.has(playerId)) return; // Already loaded
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        gameState.playerAvatars.set(playerId, img);
    };
    img.onerror = () => {
        console.error('Failed to load avatar for player:', playerId);
    };
    img.src = avatarUrl;
}

// Draw a single other player
function drawOtherPlayer(otherPlayer) {
    if (otherPlayer.x === undefined || otherPlayer.y === undefined || 
        otherPlayer.x === null || otherPlayer.y === null) return; // Skip if no position
    
    const zoom = gameState.camera.zoom;
    const playerX = gameState.player.x;
    const playerY = gameState.player.y;
    
    // Calculate relative position from our player
    const relativeX = otherPlayer.x - playerX;
    const relativeY = otherPlayer.y - playerY;
    
    // Convert to screen coordinates (same calculation as our player, but offset)
    const screenX = gameState.canvas.width / 2 + (relativeX * zoom);
    const screenY = gameState.canvas.height / 2 + (relativeY * zoom);
    
    // Only draw if on screen
    const margin = 50;
    if (screenX < -margin || screenX > gameState.canvas.width + margin ||
        screenY < -margin || screenY > gameState.canvas.height + margin) {
        return;
    }
    
    const scaledRadius = (otherPlayer.radius || gameState.player.radius) * zoom;
    
    gameState.ctx.save();
    
    // Draw player circle/avatar
    const avatarImg = gameState.playerAvatars.get(otherPlayer.id);
    if (otherPlayer.avatar && avatarImg) {
        // Draw cached avatar image
        gameState.ctx.beginPath();
        gameState.ctx.arc(screenX, screenY, scaledRadius, 0, Math.PI * 2);
        gameState.ctx.clip();
        gameState.ctx.drawImage(
            avatarImg,
            screenX - scaledRadius,
            screenY - scaledRadius,
            scaledRadius * 2,
            scaledRadius * 2
        );
        gameState.ctx.restore();
    } else {
        // Draw colored circle
        gameState.ctx.fillStyle = otherPlayer.color || '#6366f1';
        gameState.ctx.beginPath();
        gameState.ctx.arc(screenX, screenY, scaledRadius, 0, Math.PI * 2);
        gameState.ctx.fill();
        gameState.ctx.restore();
    }
    
    // Draw name above player
    const nameOffset = gameState.player.nameOffsetY * zoom;
    if (otherPlayer.username) {
        drawPlayerName(screenX, screenY + nameOffset, otherPlayer.username, zoom);
    }
}

// Set up chat functionality
function setupChat() {
    const chatInput = document.getElementById('chatInput');
    const chatSendBtn = document.getElementById('chatSendBtn');
    const chatMessages = document.getElementById('chatMessages');
    
    if (!chatInput || !chatSendBtn) return;
    
    // Send message on Enter key
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });
    
    // Send button click
    chatSendBtn.addEventListener('click', () => {
        sendChatMessage();
    });
    
    // Keep chat input focused when clicking chat area
    const chatContainer = document.getElementById('chatContainer');
    if (chatContainer) {
        chatContainer.addEventListener('click', () => {
            chatInput.focus();
        });
    }
    
    function sendChatMessage() {
        const message = chatInput.value.trim();
        if (!message || !gameState.socket || !gameState.socket.connected) return;
        
        // Send to server (don't add locally - wait for server broadcast)
        gameState.socket.emit('chatMessage', {
            message: message,
            username: gameState.player.name,
            x: gameState.player.x,
            y: gameState.player.y
        });
        
        // Clear input
        chatInput.value = '';
        chatInput.focus();
    }
    
    // Note: Chat message listener is set up in setupMultiplayer() to avoid duplicates
}

// Add chat message to chat log and create bubble
function addChatMessage(username, message, x, y, playerId) {
    // Add to chat log
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message';
        if (playerId === gameState.socket?.id || username === gameState.player.name) {
            messageDiv.classList.add('own-message');
        }
        
        messageDiv.innerHTML = `
            <span class="chat-message-username">${escapeHtml(username)}:</span>
            <span class="chat-message-text">${escapeHtml(message)}</span>
        `;
        
        chatMessages.appendChild(messageDiv);
        
        // Auto-scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Remove old messages if too many
        while (chatMessages.children.length > 50) {
            chatMessages.removeChild(chatMessages.firstChild);
        }
    }
    
    // Create chat bubble above player
    if (playerId && (playerId !== gameState.socket?.id)) {
        // Other player's chat bubble
        gameState.chatBubbles.set(playerId, {
            message: message,
            username: username,
            x: x,
            y: y,
            timestamp: Date.now()
        });
    } else if (username === gameState.player.name) {
        // Own chat bubble
        gameState.chatBubbles.set('self', {
            message: message,
            username: username,
            x: gameState.player.x,
            y: gameState.player.y,
            timestamp: Date.now()
        });
    }
    
    // Auto-remove bubble after 5 seconds
    setTimeout(() => {
        if (playerId) {
            gameState.chatBubbles.delete(playerId);
        } else if (username === gameState.player.name) {
            gameState.chatBubbles.delete('self');
        }
    }, 5000);
}

// Draw chat bubbles above players
function drawChatBubbles() {
    const zoom = gameState.camera.zoom;
    const now = Date.now();
    const bubbleLifetime = 5000; // 5 seconds
    
    gameState.chatBubbles.forEach((bubble, key) => {
        // Skip if bubble is too old
        if (now - bubble.timestamp > bubbleLifetime) {
            gameState.chatBubbles.delete(key);
            return;
        }
        
        let bubbleX, bubbleY;
        
        if (key === 'self') {
            // Draw own chat bubble
            bubbleX = gameState.canvas.width / 2;
            bubbleY = gameState.canvas.height / 2 + (gameState.player.nameOffsetY - 60) * zoom;
        } else {
            // Find other player
            const otherPlayer = gameState.otherPlayers.find(p => p.id === key);
            if (!otherPlayer || !otherPlayer.x || !otherPlayer.y) {
                gameState.chatBubbles.delete(key);
                return;
            }
            
            // Calculate relative position
            const relativeX = otherPlayer.x - gameState.player.x;
            const relativeY = otherPlayer.y - gameState.player.y;
            
            // Convert to screen coordinates
            bubbleX = gameState.canvas.width / 2 + (relativeX * zoom);
            bubbleY = gameState.canvas.height / 2 + (relativeY * zoom) + (gameState.player.nameOffsetY - 60) * zoom;
        }
        
        // Fade out effect
        const age = now - bubble.timestamp;
        const fadeStart = bubbleLifetime - 1000; // Start fading 1 second before expiry
        let alpha = 1;
        if (age > fadeStart) {
            alpha = 1 - ((age - fadeStart) / 1000);
        }
        
        // Draw bubble background
        gameState.ctx.save();
        gameState.ctx.globalAlpha = alpha;
        gameState.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        
        // Calculate text dimensions
        gameState.ctx.font = `${12 * zoom}px Inter, sans-serif`;
        const textMetrics = gameState.ctx.measureText(bubble.message);
        const textWidth = textMetrics.width;
        const textHeight = 16 * zoom;
        const padding = 8 * zoom;
        
        const bubbleWidth = Math.min(textWidth + padding * 2, 200 * zoom);
        const bubbleHeight = textHeight + padding * 2;
        
        // Draw rounded rectangle
        const x = bubbleX - bubbleWidth / 2;
        const y = bubbleY - bubbleHeight;
        const radius = 8 * zoom;
        
        gameState.ctx.beginPath();
        gameState.ctx.roundRect(x, y, bubbleWidth, bubbleHeight, radius);
        gameState.ctx.fill();
        
        // Draw triangle pointer
        gameState.ctx.beginPath();
        gameState.ctx.moveTo(bubbleX, y + bubbleHeight);
        gameState.ctx.lineTo(bubbleX - 8 * zoom, y + bubbleHeight + 8 * zoom);
        gameState.ctx.lineTo(bubbleX + 8 * zoom, y + bubbleHeight + 8 * zoom);
        gameState.ctx.closePath();
        gameState.ctx.fill();
        
        // Draw text
        gameState.ctx.fillStyle = 'white';
        gameState.ctx.textAlign = 'center';
        gameState.ctx.textBaseline = 'middle';
        gameState.ctx.fillText(
            bubble.message,
            bubbleX,
            y + bubbleHeight / 2,
            bubbleWidth - padding * 2
        );
        
        gameState.ctx.restore();
    });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Set up UI interactions
function setupUI() {
    // Settings button
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const customizeBtn = document.getElementById('customizeBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            if (settingsModal) {
                settingsModal.style.display = 'flex';
            }
        });
    }
    
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            if (settingsModal) {
                settingsModal.style.display = 'none';
            }
        });
    }
    
    // Click outside modal to close
    if (settingsModal) {
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                settingsModal.style.display = 'none';
            }
        });
    }
    
    // Customize button
    if (customizeBtn) {
        customizeBtn.addEventListener('click', () => {
            window.location.href = '/dashboard.html';
        });
    }
    
    // Logout button
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.clear();
            window.location.href = '/index.html';
        });
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in (has username)
    const username = localStorage.getItem('username');
    if (!username) {
        // Redirect to login if not authenticated
        window.location.href = '/index.html';
        return;
    }
    
    // Start game
    initGame();
});

// Add roundRect polyfill for older browsers
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, radius) {
        this.beginPath();
        this.moveTo(x + radius, y);
        this.lineTo(x + w - radius, y);
        this.quadraticCurveTo(x + w, y, x + w, y + radius);
        this.lineTo(x + w, y + h - radius);
        this.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
        this.lineTo(x + radius, y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - radius);
        this.lineTo(x, y + radius);
        this.quadraticCurveTo(x, y, x + radius, y);
        this.closePath();
    };
}

