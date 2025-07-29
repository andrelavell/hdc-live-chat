// Settings Management Functions
window.saveAIPrompt = async function() {
    const prompt = document.getElementById('ai-system-prompt').value;
    
    if (!prompt.trim()) {
        showSettingsMessage('AI prompt cannot be empty', 'error');
        return;
    }

    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                key: 'ai_system_prompt',
                value: prompt,
                description: 'System prompt used by the AI for customer service responses',
                category: 'ai',
                type: 'textarea'
            })
        });

        if (response.ok) {
            showSettingsMessage('AI prompt saved successfully!', 'success');
        } else {
            throw new Error('Failed to save AI prompt');
        }
    } catch (error) {
        console.error('Error saving AI prompt:', error);
        showSettingsMessage('Error saving AI prompt', 'error');
    }
};

window.saveAllSettings = async function() {
    const settings = [
        { key: 'ai_system_prompt', element: 'ai-system-prompt', category: 'ai', type: 'textarea' },
        { key: 'ai_model', element: 'ai-model', category: 'ai', type: 'text' },
        { key: 'ai_max_tokens', element: 'ai-max-tokens', category: 'ai', type: 'number' },
        { key: 'ai_temperature', element: 'ai-temperature', category: 'ai', type: 'number' },
        { key: 'store_name', element: 'store-name', category: 'general', type: 'text' },
        { key: 'support_email', element: 'support-email', category: 'general', type: 'text' }
    ];

    try {
        for (const setting of settings) {
            const element = document.getElementById(setting.element);
            if (element && element.value) {
                await fetch('/api/settings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        key: setting.key,
                        value: element.value,
                        category: setting.category,
                        type: setting.type
                    })
                });
            }
        }
        
        showSettingsMessage('All settings saved successfully!', 'success');
    } catch (error) {
        console.error('Error saving settings:', error);
        showSettingsMessage('Error saving settings', 'error');
    }
};

window.resetToDefaults = async function() {
    if (!confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
        return;
    }

    try {
        // Reset to default values
        const defaults = {
            'ai-system-prompt': `You are a helpful customer service representative for HDC store. You should:

1. Be friendly, professional, and helpful
2. Answer questions about products based on the product information provided
3. If you don't know something specific, politely say so and offer to connect them with a human agent
4. Keep responses concise but informative
5. Use a conversational tone that feels natural
6. If asked about shipping, returns, or policies, provide general helpful guidance but suggest contacting support for specifics

Product Information will be provided in the context when available.`,
            'ai-model': 'gpt-4',
            'ai-max-tokens': '300',
            'ai-temperature': '0.7',
            'store-name': 'HDC Store',
            'support-email': 'support@hdcstore.com'
        };

        Object.entries(defaults).forEach(([elementId, value]) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.value = value;
                if (elementId === 'ai-temperature') {
                    document.getElementById('temperature-value').textContent = value;
                }
            }
        });

        showSettingsMessage('Settings reset to defaults. Click "Save All Settings" to apply.', 'success');
    } catch (error) {
        console.error('Error resetting settings:', error);
        showSettingsMessage('Error resetting settings', 'error');
    }
};

function showSettingsMessage(message, type) {
    let messageDiv = document.querySelector('.settings-message');
    if (!messageDiv) {
        messageDiv = document.createElement('div');
        messageDiv.className = 'settings-message';
        const settingsContent = document.querySelector('.settings-content');
        settingsContent.insertBefore(messageDiv, settingsContent.firstChild);
    }
    
    messageDiv.textContent = message;
    messageDiv.className = `settings-message ${type}`;
    messageDiv.style.display = 'block';
    
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

// Load settings when settings view is shown
async function loadSettings() {
    try {
        const response = await fetch('/api/settings');
        const settings = await response.json();
        
        // Populate form fields with current settings
        settings.forEach(setting => {
            const element = document.getElementById(setting.key.replace('_', '-'));
            if (element) {
                if (element.type === 'range') {
                    element.value = setting.value;
                    if (setting.key === 'ai_temperature') {
                        document.getElementById('temperature-value').textContent = setting.value;
                    }
                } else {
                    element.value = setting.value;
                }
            }
        });
    } catch (error) {
        console.error('Error loading settings:', error);
        showSettingsMessage('Error loading settings', 'error');
    }
}

// Setup settings functionality when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Setup tab switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            
            // Update tab buttons
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update tab content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${tabName}-tab`).classList.add('active');
        });
    });
    
    // Temperature slider handler
    const tempSlider = document.getElementById('ai-temperature');
    if (tempSlider) {
        tempSlider.addEventListener('input', (e) => {
            document.getElementById('temperature-value').textContent = e.target.value;
        });
    }
    
    // Load settings when settings view is opened
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                const settingsView = document.getElementById('settings-view');
                if (settingsView && settingsView.style.display !== 'none') {
                    loadSettings();
                }
            }
        });
    });
    
    const settingsView = document.getElementById('settings-view');
    if (settingsView) {
        observer.observe(settingsView, { attributes: true });
    }
});
