# HDC Live Chat

A sophisticated live chat widget for Shopify stores with OpenAI integration and human agent takeover capabilities.

## Features

### Frontend Widget
- 🎯 Floating chat icon in bottom-right corner
- 📋 Initial customer survey (name & email collection)
- 🤖 AI-powered responses with typing indicators
- 💬 Human-like response timing based on message length
- 💾 Local storage for user identification

### Backend Dashboard
- 📊 View all conversations in organized interface
- 🔴 Monitor live conversations in real-time
- 👤 Human agent takeover functionality
- 🛠️ Product information management for AI context
- 📈 Conversation analytics

## Tech Stack
- **Backend**: Node.js, Express, Socket.IO, MongoDB
- **AI**: OpenAI GPT API
- **Frontend**: Vanilla JavaScript (embeddable widget)
- **Real-time**: WebSocket connections

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Environment variables** - Create `.env` file:
   ```
   OPENAI_API_KEY=your_openai_api_key
   MONGODB_URI=your_mongodb_connection_string
   PORT=3000
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Build widget for production**:
   ```bash
   npm run build
   ```

## Integration

Add this script to your Shopify theme:

```html
<script src="https://your-domain.com/widget/chat-widget.js"></script>
<script>
  HDCLiveChat.init({
    apiUrl: 'https://your-domain.com',
    storeId: 'your-store-id'
  });
</script>
```

## Admin Dashboard

Access the admin dashboard at: `https://your-domain.com/admin`

## License

MIT License
