
document.addEventListener('DOMContentLoaded', () => {
    const signinForm = document.getElementById('signin-form');
    const signupForm = document.getElementById('signup-form');
    const userProfileContainer = document.getElementById('user-profile-container');
    
    const signinBtn = document.getElementById('signin-btn');
    const signupBtn = document.getElementById('signup-btn');
    const logoutBtn = document.getElementById('logout-btn');
    
    const messageBox = document.getElementById('message-box');
    const messageIcon = messageBox.querySelector('i');
    const messageText = messageBox.querySelector('span');
    
    const headerTitle = document.getElementById('header-title');
    const headerSubtitle = document.getElementById('header-subtitle');

    // Profile Elements
    const profileUsername = document.getElementById('profile-username');
    const profileEmail = document.getElementById('profile-email');

    // Navigation links
    const switchToSignupLink = document.getElementById('switch-to-signup');
    const switchToSigninLink = document.getElementById('switch-to-signin');

    // Function to display messages (success or error)
    function showMessage(message, type = 'error') {
        messageText.textContent = message;
        messageBox.classList.remove('hidden', 'bg-red-900', 'border-red-500', 'text-red-300', 'bg-green-900', 'border-green-500', 'text-green-300');
        messageIcon.className = ''; 

        if (type === 'error') {
            messageBox.classList.add('bg-red-900', 'bg-opacity-30', 'backdrop-blur-sm', 'border', 'border-red-500', 'border-opacity-30', 'text-red-300');
            messageIcon.classList.add('fas', 'fa-exclamation-triangle');
        } else if (type === 'success') {
            messageBox.classList.add('bg-green-900', 'bg-opacity-30', 'backdrop-blur-sm', 'border', 'border-green-500', 'border-opacity-30', 'text-green-300');
            messageIcon.classList.add('fas', 'fa-check-circle');
        }

        messageBox.classList.remove('hidden');

        // Hide message after 5 seconds
        setTimeout(() => {
            messageBox.classList.add('hidden');
        }, 5000);
    }

    // Helper: Show Logged In State
    function showLoggedInState(user) {
        signinForm.classList.add('hidden');
        signupForm.classList.add('hidden');
        messageBox.classList.add('hidden');
        
        userProfileContainer.classList.remove('hidden');
        
        headerTitle.textContent = 'Welcome, ' + (user.display_name || 'User');
        headerSubtitle.textContent = 'You are currently logged in';
        
        profileUsername.textContent = user.display_name || 'Anonymous User';
        profileEmail.textContent = user.email || 'No Email';
    }

    // Navigation link logic
    if (switchToSignupLink) {
        switchToSignupLink.onclick = (e) => {
            e.preventDefault();
            signinForm.classList.add('hidden');
            signupForm.classList.remove('hidden');
            userProfileContainer.classList.add('hidden');
            messageBox.classList.add('hidden');
            headerTitle.textContent = 'Create Your Account';
            headerSubtitle.textContent = 'Join us and get started!';
        };
    }

    if (switchToSigninLink) {
        switchToSigninLink.onclick = (e) => {
            e.preventDefault();
            signupForm.classList.add('hidden');
            signinForm.classList.remove('hidden');
            userProfileContainer.classList.add('hidden');
            messageBox.classList.add('hidden');
            headerTitle.textContent = 'Welcome Back';
            headerSubtitle.textContent = 'Access your account to continue';
        };
    }

    // Sign In button click handler
    if (signinBtn) {
        signinBtn.onclick = async () => {
            const email = document.getElementById('signin-email').value;
            const password = document.getElementById('signin-password').value;

            if (!email || !password) {
                showMessage('Please enter both email and password.', 'error');
                return;
            }
            
            signinBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Signing In...';
            signinBtn.disabled = true;

            try {
                const result = await parqraAuth.login(email, password);
                
                if (result.error) {
                    showMessage(result.error, 'error');
                } else {
                    showMessage('Sign In successful!', 'success');
                    // Instead of redirecting, show profile immediately
                    setTimeout(() => showLoggedInState(result.user), 500);
                }
            } catch (err) {
                showMessage('An unexpected error occurred.', 'error');
            } finally {
                signinBtn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>Sign In';
                signinBtn.disabled = false;
            }
        };
    }

    // Sign Up button click handler
    if (signupBtn) {
        signupBtn.onclick = async () => {
            const username = document.getElementById('signup-username').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;

            if (!username || !email || !password) {
                showMessage('Please fill in all fields.', 'error');
                return;
            }

            if (password.length < 6) {
                showMessage('Password must be at least 6 characters long.', 'error');
                return;
            }

            signupBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Creating Account...';
            signupBtn.disabled = true;

            try {
                const result = await parqraAuth.signup(email, password, username);
                
                if (result.error) {
                    showMessage(result.error, 'error');
                } else {
                    showMessage(`Account created! You are now logged in.`, 'success');
                    setTimeout(() => showLoggedInState(result.user), 500);
                }
            } catch (err) {
                showMessage('An unexpected error occurred.', 'error');
            } finally {
                signupBtn.innerHTML = '<i class="fas fa-user-plus mr-2"></i>Create New Account';
                signupBtn.disabled = false;
            }
        };
    }

    // Logout Button Handler
    if (logoutBtn) {
        logoutBtn.onclick = async () => {
            logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Logging Out...';
            
            await parqraAuth.logout();
            
            // Reset UI
            window.location.reload(); 
        };
    }

    // Check if already logged in on Load
    if (typeof parqraAuth !== 'undefined' && parqraAuth.isLoggedIn()) {
        const user = parqraAuth.getUser();
        showLoggedInState(user);
    }

    // Dynamic Orb Generation (Visuals)
    const generateOrbs = () => {
        const body = document.body;
        // Clear existing orbs if any
        document.querySelectorAll('.floating-orb-container').forEach(orb => orb.remove());

        let orbConfigs = [];
        const width = window.innerWidth;
        const height = window.innerHeight;

        const baseSize = Math.min(width, height) * 0.15; 

        if (width < 640) { // Mobile
            orbConfigs = [
                { size: baseSize * 1.2, top: '10%', left: '5%', delay: '0s' },
                { size: baseSize * 0.9, bottom: '15%', right: '10%', delay: '2s' },
                { size: baseSize * 0.7, top: '55%', left: '20%', delay: '1s' }
            ];
        } else if (width >= 640 && width < 1024) { // Tablet
            orbConfigs = [
                { size: baseSize * 1.4, top: '10%', left: '8%', delay: '0s' },
                { size: baseSize * 1.1, bottom: '10%', right: '12%', delay: '2s' },
                { size: baseSize * 0.8, top: '60%', left: '15%', delay: '1s' },
                { size: baseSize * 1.2, top: '25%', right: '20%', delay: '3s' },
                { size: baseSize * 0.7, bottom: '5%', left: '50%', delay: '4s' }
            ];
        } else { // Desktop
            orbConfigs = [
                { size: baseSize * 1.6, top: '10%', left: '5%', delay: '0s' },
                { size: baseSize * 1.3, bottom: '5%', right: '10%', delay: '2s' },
                { size: baseSize * 1.0, top: '50%', left: '15%', delay: '1s' },
                { size: baseSize * 1.4, top: '20%', right: '10%', delay: '3s' },
                { size: baseSize * 1.1, bottom: '25%', left: '40%', delay: '4s' },
                { size: baseSize * 0.8, top: '5%', right: '30%', delay: '0.5s' },
                { size: baseSize * 0.7, bottom: '15%', left: '70%', delay: '2.5s' },
                { size: baseSize * 0.6, top: '70%', right: '5%', delay: '1.5s' }
            ];
        }

        orbConfigs.forEach((config) => {
            const orb = document.createElement('div');
            orb.classList.add('floating-orb-container');
            orb.style.width = `${config.size}px`;
            orb.style.height = `${config.size}px`;
            if (config.top) orb.style.top = config.top;
            if (config.left) orb.style.left = config.left;
            if (config.right) orb.style.right = config.right;
            if (config.bottom) orb.style.bottom = config.bottom;
            orb.style.animationDelay = config.delay;
            body.appendChild(orb);
        });
    };

    generateOrbs();
    window.addEventListener('resize', generateOrbs);
});
