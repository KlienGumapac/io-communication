// Tab switching
const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const messageDiv = document.getElementById('message');

loginTab.addEventListener('click', () => {
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    loginForm.classList.add('active');
    registerForm.classList.remove('active');
    clearMessage();
});

registerTab.addEventListener('click', () => {
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    registerForm.classList.add('active');
    loginForm.classList.remove('active');
    clearMessage();
});

// Show message helper
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

// Form validation and submission
const loginFormElement = document.getElementById('loginForm');
const registerFormElement = document.getElementById('registerForm');

loginFormElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessage();
    
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!username || !password) {
        showMessage('Please fill in all fields', 'error');
        return;
    }
    
    const submitBtn = loginFormElement.querySelector('.submit-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Logging in...</span><div class="btn-dot"></div>';
    
    try {
        // TODO: Replace with actual API call
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Login successful! Redirecting...', 'success');
            // Store authentication data
            localStorage.setItem('token', data.token);
            localStorage.setItem('username', data.user.username);
            localStorage.setItem('userId', data.user.id);
            
            // Store avatar preferences if they exist
            if (data.user.avatarColor) {
                localStorage.setItem('avatarColor', data.user.avatarColor);
            }
            if (data.user.avatar) {
                // If avatar is a URL, we'll fetch it on dashboard
                localStorage.setItem('avatarUrl', data.user.avatar);
            }
            
            // Redirect to dashboard for customization
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1000);
        } else {
            showMessage(data.error || 'Invalid username or password', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Play Now</span><div class="btn-dot"></div>';
        }
    } catch (error) {
        showMessage('Connection error. Please try again.', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Play Now</span><div class="btn-dot"></div>';
    }
});

registerFormElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessage();
    
    const username = document.getElementById('registerUsername').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    
    // Validation
    if (!username || !password || !confirmPassword) {
        showMessage('Please fill in all fields', 'error');
        return;
    }
    
    if (username.length < 3 || username.length > 20) {
        showMessage('Username must be between 3 and 20 characters', 'error');
        return;
    }
    
    if (password.length < 6) {
        showMessage('Password must be at least 6 characters', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showMessage('Passwords do not match', 'error');
        return;
    }
    
    const submitBtn = registerFormElement.querySelector('.submit-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Creating account...</span><div class="btn-dot"></div>';
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Account created successfully! You can now login.', 'success');
            // Clear form
            registerFormElement.reset();
            // Switch to login tab after success
            setTimeout(() => {
                loginTab.click();
                document.getElementById('loginUsername').value = username;
            }, 2000);
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Create Account</span><div class="btn-dot"></div>';
        } else {
            showMessage(data.error || 'Registration failed', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Create Account</span><div class="btn-dot"></div>';
        }
    } catch (error) {
        console.error('Registration error:', error);
        showMessage('Connection error. Make sure the server is running.', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Create Account</span><div class="btn-dot"></div>';
    }
});

// Add floating animation to input groups on focus
document.querySelectorAll('.input-group input').forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.style.transform = 'scale(1.02)';
    });
    
    input.addEventListener('blur', function() {
        this.parentElement.style.transform = 'scale(1)';
    });
});

