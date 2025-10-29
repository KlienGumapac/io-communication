// Get elements
const colorGrid = document.getElementById('colorGrid');
const colorOptions = document.querySelectorAll('.color-option');
const previewDot = document.getElementById('previewDot');
const previewAvatar = document.getElementById('previewAvatar');
const previewName = document.getElementById('previewName');
const avatarInput = document.getElementById('avatarInput');
const uploadArea = document.getElementById('uploadArea');
const uploadContent = document.getElementById('uploadContent');
const uploadPreview = document.getElementById('uploadPreview');
const previewImage = document.getElementById('previewImage');
const removeImageBtn = document.getElementById('removeImageBtn');
const clearAvatarBtn = document.getElementById('clearAvatarBtn');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');
const messageDiv = document.getElementById('message');
const usernameDisplay = document.getElementById('usernameDisplay');

// State
let selectedColor = '#6366f1';
let selectedAvatar = null;
let avatarImageData = null;
let avatarWasCleared = false; // Track if user explicitly cleared avatar

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Load saved preferences if available
    const savedColor = localStorage.getItem('avatarColor');
    const savedAvatar = localStorage.getItem('avatarImage'); // Local base64 image
    const avatarUrl = localStorage.getItem('avatarUrl'); // Server URL
    
    if (savedColor) {
        selectedColor = savedColor;
        updateColorSelection(savedColor);
    }
    
    // Load avatar from URL if available (from database), otherwise use local
    if (avatarUrl) {
        try {
            // Load image from server
            const response = await fetch(avatarUrl);
            if (response.ok) {
                const blob = await response.blob();
                const reader = new FileReader();
                reader.onloadend = () => {
                    avatarImageData = reader.result;
                    selectedAvatar = reader.result;
                    showAvatarPreview(reader.result);
                    updatePreview();
                };
                reader.readAsDataURL(blob);
            }
        } catch (error) {
            console.error('Failed to load avatar from server:', error);
            // Fall back to local avatar if URL fails
            if (savedAvatar) {
                avatarImageData = savedAvatar;
                selectedAvatar = savedAvatar;
                showAvatarPreview(savedAvatar);
            }
        }
    } else if (savedAvatar) {
        avatarImageData = savedAvatar;
        selectedAvatar = savedAvatar;
        showAvatarPreview(savedAvatar);
    }
    
    // Reset cleared flag on load
    avatarWasCleared = false;
    
    // Get username from localStorage
    const username = localStorage.getItem('username') || 'Player';
    usernameDisplay.textContent = username;
    previewName.textContent = username;
    
    // Set default selected color and update preview
    updatePreview();
});

// Color selection
colorOptions.forEach(option => {
    option.addEventListener('click', () => {
        const color = option.getAttribute('data-color');
        selectedColor = color;
        updateColorSelection(color);
        updatePreview();
    });
});

function updateColorSelection(color) {
    colorOptions.forEach(opt => {
        if (opt.getAttribute('data-color') === color) {
            opt.classList.add('selected');
        } else {
            opt.classList.remove('selected');
        }
    });
}

function updatePreview() {
    if (!selectedAvatar) {
        // Show color circle
        previewDot.style.background = selectedColor;
        previewAvatar.style.display = 'none';
    } else {
        // Show avatar image
        previewDot.style.background = 'transparent';
        previewAvatar.style.display = 'block';
        previewAvatar.style.backgroundImage = `url(${selectedAvatar})`;
        previewAvatar.style.backgroundSize = 'cover';
        previewAvatar.style.backgroundPosition = 'center';
    }
}

// File upload handling
uploadArea.addEventListener('click', () => {
    avatarInput.click();
});

// Drag and drop
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileSelect(files[0]);
    }
});

avatarInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
    }
});

function handleFileSelect(file) {
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showMessage('Please select a valid image file', 'error');
        return;
    }
    
    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
        showMessage('Image size must be less than 2MB', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        avatarImageData = e.target.result;
        selectedAvatar = e.target.result;
        showAvatarPreview(e.target.result);
        updatePreview();
    };
    reader.readAsDataURL(file);
}

function showAvatarPreview(imageSrc) {
    previewImage.src = imageSrc;
    uploadContent.style.display = 'none';
    uploadPreview.style.display = 'block';
    clearAvatarBtn.style.display = 'block';
}

removeImageBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    clearAvatar();
});

clearAvatarBtn.addEventListener('click', () => {
    clearAvatar();
});

function clearAvatar() {
    selectedAvatar = null;
    avatarImageData = null;
    avatarInput.value = '';
    uploadContent.style.display = 'flex';
    uploadPreview.style.display = 'none';
    clearAvatarBtn.style.display = 'none';
    avatarWasCleared = true; // Mark that user explicitly cleared avatar
    updatePreview();
}

// Save preferences
saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span>Saving...</span><div class="btn-dot"></div>';
    clearMessage();
    
    try {
        // Prepare form data
        const formData = new FormData();
        const username = localStorage.getItem('username');
        
        formData.append('avatarColor', selectedColor);
        formData.append('username', username || 'test');
        
        if (avatarImageData) {
            // Convert base64 data URL to blob
            const imgResponse = await fetch(avatarImageData);
            const blob = await imgResponse.blob();
            formData.append('avatar', blob, 'avatar.png');
            avatarWasCleared = false; // Reset flag when new avatar is selected
        } else if (avatarWasCleared) {
            // Explicitly remove avatar if user cleared it
            formData.append('removeAvatar', 'true');
        }
        
        // Save to backend
        const response = await fetch(`/api/user/customize?username=${encodeURIComponent(username || 'test')}`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Save to localStorage as backup
            localStorage.setItem('avatarColor', selectedColor);
            
            // Save avatar URL from server (for other players to see)
            // Important: This is the URL that other players will use to load the avatar
            if (data.user && data.user.avatar) {
                localStorage.setItem('avatarUrl', data.user.avatar);
            } else if (avatarWasCleared || !avatarImageData) {
                // Avatar was removed or not set
                localStorage.removeItem('avatarUrl');
            }
            
            if (avatarImageData) {
                localStorage.setItem('avatarImage', avatarImageData);
            } else {
                localStorage.removeItem('avatarImage');
                localStorage.removeItem('avatarUrl');
            }
            
            showMessage('Preferences saved! Redirecting to game...', 'success');
            
            // Reset cleared flag after successful save
            avatarWasCleared = false;
            
            // Redirect to game
            setTimeout(() => {
                window.location.href = '/game.html';
            }, 1500);
        } else {
            // If backend fails, still save locally for testing
            localStorage.setItem('avatarColor', selectedColor);
            if (avatarImageData) {
                localStorage.setItem('avatarImage', avatarImageData);
            }
            
            showMessage(data.error || 'Saved locally (user may not exist yet)', 'success');
            setTimeout(() => {
                window.location.href = '/game.html';
            }, 1500);
        }
    } catch (error) {
        console.error('Save error:', error);
        // Save locally as fallback
        localStorage.setItem('avatarColor', selectedColor);
        if (avatarImageData) {
            localStorage.setItem('avatarImage', avatarImageData);
        }
        
        showMessage('Saved locally. Ready to play!', 'success');
        setTimeout(() => {
            window.location.href = '/game.html';
        }, 1500);
    }
});

cancelBtn.addEventListener('click', () => {
    window.location.href = '/index.html';
});

// Message helpers
function showMessage(text, type = 'error') {
    messageDiv.textContent = text;
    messageDiv.className = `message show ${type}`;
    
    if (type === 'success') {
        setTimeout(() => {
            clearMessage();
        }, 3000);
    }
}

function clearMessage() {
    messageDiv.classList.remove('show');
    messageDiv.textContent = '';
    messageDiv.className = 'message';
}

