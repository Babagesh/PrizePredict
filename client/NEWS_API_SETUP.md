# NewsAPI Integration Setup

This application now includes NewsAPI integration to fetch relevant sports headlines for each player card. When you flip a card to the back side, it will display recent news articles related to that player.

## Setup Instructions

1. **Get a NewsAPI Key:**
   - Visit [NewsAPI.org](https://newsapi.org/)
   - Sign up for a free account
   - Get your API key from the dashboard

2. **Configure the API Key:**
   - Open `client/src/App.jsx`
   - Find the line: `const NEWS_API_KEY = 'YOUR_NEWS_API_KEY_HERE'`
   - Replace `'YOUR_NEWS_API_KEY_HERE'` with your actual API key

3. **How it Works:**
   - When you click on a player card to flip it, the app searches for news articles
   - It first tries to find articles from preferred sports analysts
   - If no analyst articles are found, it falls back to general sports news
   - The search includes the player name, sport, and selected stat

## Preferred Sports Analysts

The app prioritizes news from these analysts:
- Adam Schefter, Ian Rapoport, Jay Glazer, Tom Pelissero
- Field Yates, Chris Mortensen, Adrian Wojnarowski
- Shams Charania, Marc Stein, Brian Windhorst
- Zach Lowe, Ken Rosenthal, Jeff Passan
- Jon Heyman, Buster Olney, Elliotte Friedman
- And many more...

## Features

- **Lazy Loading:** News is only fetched when you flip a card
- **Caching:** Once loaded, news is cached for the session
- **Fallback:** If no analyst articles are found, general sports news is used
- **Error Handling:** Graceful fallback if the API is unavailable

## API Limits

- Free tier: 1000 requests per day
- Paid tiers available for higher limits
- See [NewsAPI pricing](https://newsapi.org/pricing) for details
