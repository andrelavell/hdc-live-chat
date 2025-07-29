(function() {
  'use strict';

  // Configuration
  let config = {
    apiUrl: window.location.origin,
    storeId: 'default'
  };

  // Widget state
  let state = {
    isOpen: false,
    isConnected: false,
    conversationId: null,
    customerId: null,
    socket: null,
    surveyStep: 0,
    surveyCompleted: false,
    customerInfo: {}
  };

  // Initialize the widget
  function init(userConfig) {
    config = { ...config, ...userConfig };
    
    // Generate or retrieve customer ID
    state.customerId = getOrCreateCustomerId();
    
    // Create widget elements
    createWidgetElements();
    
    // Load existing conversation if any
    loadExistingConversation();
  }

  function getOrCreateCustomerId() {
    let customerId = localStorage.getItem('hdc_customer_id');
    if (!customerId) {
      customerId = 'customer_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('hdc_customer_id', customerId);
    }
    return customerId;
  }

  function createWidgetElements() {
    // Create chat icon
    const chatIcon = document.createElement('div');
    chatIcon.id = 'hdc-chat-icon';
    chatIcon.innerHTML = `
      <div class="hdc-chat-bubble">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H5.17L4 17.17V4H20V16Z" fill="white"/>
          <circle cx="12" cy="10" r="1.5" fill="white"/>
          <circle cx="8" cy="10" r="1.5" fill="white"/>
          <circle cx="16" cy="10" r="1.5" fill="white"/>
        </svg>
      </div>
    `;

    // Create chat widget
    const chatWidget = document.createElement('div');
    chatWidget.id = 'hdc-chat-widget';
    chatWidget.innerHTML = `
      <div class="hdc-chat-header">
        <div class="hdc-chat-title">
          <h3>HDC Support</h3>
          <span class="hdc-status-indicator">Online</span>
        </div>
        <button class="hdc-close-btn" onclick="HDCLiveChat.toggleWidget()">×</button>
      </div>
      <div class="hdc-chat-messages" id="hdc-messages"></div>
      <div class="hdc-typing-indicator" id="hdc-typing" style="display: none;">
        <div class="hdc-typing-dots">
          <span></span><span></span><span></span>
        </div>
        <span>Support is typing...</span>
      </div>
      <div class="hdc-chat-input-container">
        <input type="text" id="hdc-message-input" placeholder="Type your message..." />
        <button id="hdc-send-btn">Send</button>
      </div>
    `;

    // Add styles
    const styles = document.createElement('style');
    styles.textContent = getCSSStyles();
    document.head.appendChild(styles);

    // Add elements to page
    document.body.appendChild(chatIcon);
    document.body.appendChild(chatWidget);

    // Add event listeners
    chatIcon.addEventListener('click', toggleWidget);
    document.getElementById('hdc-send-btn').addEventListener('click', sendMessage);
    document.getElementById('hdc-message-input').addEventListener('keypress', function(e) {
      if (e.key === 'Enter') sendMessage();
    });
  }

  function getCSSStyles() {
    return `
      #hdc-chat-icon {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 1000;
        cursor: pointer;
        transition: transform 0.3s ease;
      }

      #hdc-chat-icon:hover {
        transform: scale(1.1);
      }

      .hdc-chat-bubble {
        width: 60px;
        height: 60px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        animation: hdc-pulse 2s infinite;
      }

      @keyframes hdc-pulse {
        0% { box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
        50% { box-shadow: 0 4px 25px rgba(102, 126, 234, 0.4); }
        100% { box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
      }

      #hdc-chat-widget {
        position: fixed;
        bottom: 100px;
        right: 20px;
        width: 350px;
        height: 500px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.2);
        z-index: 1001;
        display: none;
        flex-direction: column;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .hdc-chat-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 16px;
        border-radius: 12px 12px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .hdc-chat-title h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }

      .hdc-status-indicator {
        font-size: 12px;
        opacity: 0.9;
      }

      .hdc-close-btn {
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .hdc-chat-messages {
        flex: 1;
        padding: 16px;
        overflow-y: auto;
        background: #f8f9fa;
      }

      .hdc-message {
        margin-bottom: 12px;
        display: flex;
        flex-direction: column;
      }

      .hdc-message.customer {
        align-items: flex-end;
      }

      .hdc-message.support {
        align-items: flex-start;
      }

      .hdc-message-bubble {
        max-width: 80%;
        padding: 10px 14px;
        border-radius: 18px;
        word-wrap: break-word;
        font-size: 14px;
        line-height: 1.4;
      }

      .hdc-message.customer .hdc-message-bubble {
        background: #667eea;
        color: white;
      }

      .hdc-message.support .hdc-message-bubble {
        background: white;
        color: #333;
        border: 1px solid #e1e5e9;
      }

      .hdc-message-time {
        font-size: 11px;
        color: #666;
        margin-top: 4px;
      }

      .hdc-typing-indicator {
        padding: 16px;
        display: flex;
        align-items: center;
        gap: 8px;
        background: #f8f9fa;
        font-size: 12px;
        color: #666;
      }

      .hdc-typing-dots {
        display: flex;
        gap: 2px;
      }

      .hdc-typing-dots span {
        width: 6px;
        height: 6px;
        background: #667eea;
        border-radius: 50%;
        animation: hdc-typing 1.4s infinite;
      }

      .hdc-typing-dots span:nth-child(2) { animation-delay: 0.2s; }
      .hdc-typing-dots span:nth-child(3) { animation-delay: 0.4s; }

      @keyframes hdc-typing {
        0%, 60%, 100% { transform: translateY(0); }
        30% { transform: translateY(-10px); }
      }

      .hdc-chat-input-container {
        padding: 16px;
        border-top: 1px solid #e1e5e9;
        display: flex;
        gap: 8px;
      }

      #hdc-message-input {
        flex: 1;
        padding: 10px 12px;
        border: 1px solid #e1e5e9;
        border-radius: 20px;
        outline: none;
        font-size: 14px;
      }

      #hdc-message-input:focus {
        border-color: #667eea;
      }

      #hdc-send-btn {
        background: #667eea;
        color: white;
        border: none;
        padding: 10px 16px;
        border-radius: 20px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: background 0.2s;
      }

      #hdc-send-btn:hover {
        background: #5a6fd8;
      }

      .hdc-survey-message {
        background: #e3f2fd;
        border: 1px solid #bbdefb;
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 12px;
      }

      .hdc-survey-input {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        margin-top: 8px;
        font-size: 14px;
      }

      @media (max-width: 480px) {
        #hdc-chat-widget {
          width: calc(100vw - 40px);
          height: calc(100vh - 140px);
          bottom: 20px;
          right: 20px;
        }
      }
    `;
  }

  function toggleWidget() {
    const widget = document.getElementById('hdc-chat-widget');
    state.isOpen = !state.isOpen;
    
    if (state.isOpen) {
      widget.style.display = 'flex';
      if (!state.isConnected) {
        connectToServer();
      }
    } else {
      widget.style.display = 'none';
    }
  }

  function connectToServer() {
    // Load Socket.IO from CDN
    if (!window.io) {
      const script = document.createElement('script');
      script.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
      script.onload = initializeSocket;
      document.head.appendChild(script);
    } else {
      initializeSocket();
    }
  }

  function initializeSocket() {
    state.socket = io(config.apiUrl);
    
    state.socket.on('connect', () => {
      console.log('Connected to HDC Live Chat');
      state.isConnected = true;
      
      // Join chat
      state.socket.emit('join_chat', {
        customerId: state.customerId,
        customerInfo: getCustomerInfo()
      });
    });

    state.socket.on('conversation_joined', (data) => {
      state.conversationId = data.conversationId;
      state.surveyCompleted = data.surveyCompleted;
      
      // Display existing messages
      displayMessages(data.messages);
      
      // Show survey if not completed
      if (!data.surveyCompleted) {
        showSurvey();
      }
    });

    state.socket.on('message_received', (message) => {
      displayMessage(message);
    });

    state.socket.on('typing_indicator', (data) => {
      showTypingIndicator(data.isTyping);
    });

    state.socket.on('survey_updated', (data) => {
      state.surveyCompleted = data.surveyCompleted;
      if (data.surveyCompleted) {
        clearSurvey();
      }
    });

    state.socket.on('agent_joined', () => {
      showSystemMessage('A support agent has joined the conversation');
    });

    state.socket.on('conversation_closed', () => {
      showSystemMessage('This conversation has been closed');
    });
  }

  function getCustomerInfo() {
    return {
      ipAddress: 'unknown',
      userAgent: navigator.userAgent,
      ...state.customerInfo
    };
  }

  function showSurvey() {
    const messagesContainer = document.getElementById('hdc-messages');
    
    if (state.surveyStep === 0) {
      // Ask for name
      const surveyMessage = document.createElement('div');
      surveyMessage.className = 'hdc-survey-message';
      surveyMessage.innerHTML = `
        <p><strong>Hi there!</strong> Before we get started, can I have your first name?</p>
        <input type="text" class="hdc-survey-input" id="hdc-name-input" placeholder="Enter your first name" />
        <button onclick="HDCLiveChat.submitSurveyResponse('name')" style="margin-top: 8px; padding: 6px 12px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;">Submit</button>
      `;
      messagesContainer.appendChild(surveyMessage);
    } else if (state.surveyStep === 1) {
      // Ask for email
      const surveyMessage = document.createElement('div');
      surveyMessage.className = 'hdc-survey-message';
      surveyMessage.innerHTML = `
        <p>Nice to meet you, <strong>${state.customerInfo.name}</strong>! What's a good email address to reach you in case we get disconnected?</p>
        <input type="email" class="hdc-survey-input" id="hdc-email-input" placeholder="Enter your email address" />
        <button onclick="HDCLiveChat.submitSurveyResponse('email')" style="margin-top: 8px; padding: 6px 12px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;">Submit</button>
      `;
      messagesContainer.appendChild(surveyMessage);
    }
    
    scrollToBottom();
  }

  function submitSurveyResponse(field) {
    const input = document.getElementById(`hdc-${field}-input`);
    const value = input.value.trim();
    
    if (!value) return;
    
    state.customerInfo[field] = value;
    
    // Send to server
    state.socket.emit('survey_response', { field, value });
    
    // Move to next step
    state.surveyStep++;
    
    // Remove current survey message
    const surveyMessages = document.querySelectorAll('.hdc-survey-message');
    if (surveyMessages.length > 0) {
      surveyMessages[surveyMessages.length - 1].remove();
    }
    
    // Show next survey step or complete
    if (state.surveyStep < 2) {
      showSurvey();
    }
  }

  function clearSurvey() {
    const surveyMessages = document.querySelectorAll('.hdc-survey-message');
    surveyMessages.forEach(msg => msg.remove());
  }

  function sendMessage() {
    const input = document.getElementById('hdc-message-input');
    const message = input.value.trim();
    
    if (!message || !state.socket) return;
    
    // Display message immediately
    displayMessage({
      id: 'temp_' + Date.now(),
      sender: 'customer',
      content: message,
      timestamp: new Date()
    });
    
    // Send to server
    state.socket.emit('send_message', {
      content: message,
      messageId: 'msg_' + Date.now()
    });
    
    input.value = '';
  }

  function displayMessages(messages) {
    const container = document.getElementById('hdc-messages');
    container.innerHTML = '';
    
    messages.forEach(message => {
      displayMessage(message, false);
    });
    
    scrollToBottom();
  }

  function displayMessage(message, scroll = true) {
    const container = document.getElementById('hdc-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `hdc-message ${message.sender === 'customer' ? 'customer' : 'support'}`;
    
    const time = new Date(message.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    messageDiv.innerHTML = `
      <div class="hdc-message-bubble">${escapeHtml(message.content)}</div>
      <div class="hdc-message-time">${time}</div>
    `;
    
    container.appendChild(messageDiv);
    
    if (scroll) {
      scrollToBottom();
    }
  }

  function showSystemMessage(content) {
    displayMessage({
      sender: 'system',
      content,
      timestamp: new Date()
    });
  }

  function showTypingIndicator(isTyping) {
    const indicator = document.getElementById('hdc-typing');
    indicator.style.display = isTyping ? 'flex' : 'none';
    
    if (isTyping) {
      scrollToBottom();
    }
  }

  function scrollToBottom() {
    const container = document.getElementById('hdc-messages');
    container.scrollTop = container.scrollHeight;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function loadExistingConversation() {
    // Check if there's an existing conversation in localStorage
    const existingConversationId = localStorage.getItem('hdc_conversation_id');
    if (existingConversationId) {
      state.conversationId = existingConversationId;
    }
  }

  // Public API
  window.HDCLiveChat = {
    init: init,
    toggleWidget: toggleWidget,
    submitSurveyResponse: submitSurveyResponse
  };

})();
