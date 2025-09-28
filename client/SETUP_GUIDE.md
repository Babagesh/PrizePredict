# PrizePredict News Integration Setup

This application now includes comprehensive news integration with Supabase caching, player-specific filtering, and OpenAI enhancement to provide highly relevant betting context for each player card.

## 🚀 Quick Setup

### 1. Environment Variables
Create a `.env` file in the `client` directory:

```bash
# Supabase Configuration (already provided)
VITE_SUPABASE_URL=https://pkqbhbmmmfogutrwvmp.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrcWJoYm1tbWZvZ3V0cnd2bXBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDkwMjYsImV4cCI6MjA3NDU4NTAyNn0.p5EpjQgvgaljP7tRn0wqwW2oqyb_80EIJWkZFlHmJOk

# NewsAPI Configuration (get from newsapi.org)
VITE_NEWS_API_KEY=your_news_api_key_here

# OpenAI Configuration (get from platform.openai.com)
VITE_OPEN_API_KEY=your_openai_api_key_here
```

### 2. Database Setup
Run the SQL from `client/database_schema.sql` in your Supabase SQL editor to create the `news_articles` table.

## 🎯 How It Works

### Smart Caching System
1. **First Request**: Fetches from NewsAPI, stores in Supabase
2. **Subsequent Requests**: Uses cached data (no API calls)
3. **API Failures**: Falls back to any cached data for the player
4. **Player-Specific**: Only uses headlines that mention the actual player

### AI Enhancement
- OpenAI rephrases headlines to relate to the specific betting situation
- Content is tailored to the player, sport, and stat (points, rebounds, etc.)
- Original source is preserved for attribution

### Fallback Strategy
- No API key → Uses any cached data for the player
- API error → Falls back to cached data
- No player-specific news → Uses general news but notes it
- No news at all → Shows appropriate message

## 🔧 Features

- **Cost Efficient**: Dramatically reduces API usage through intelligent caching
- **Player-Specific**: Only shows news that mentions the actual player
- **AI-Enhanced**: Content tailored to specific betting plays
- **Reliable**: Works even when APIs are down
- **Fast**: Cached responses load instantly
- **Smart Filtering**: Prioritizes preferred sports analysts

## 📊 Database Schema

The `news_articles` table stores:
- `player_name`, `sport`, `stat` - Search parameters
- `original_headline`, `original_content`, `original_source` - Raw news data
- `ai_rephrased_headline`, `ai_rephrased_content` - AI-enhanced content
- `created_at`, `updated_at` - Timestamps

## 🚨 Troubleshooting

- **"API Key Required"**: Check your `.env` file
- **No news loading**: Check browser console for errors
- **Generic headlines**: Player name might not be in headlines (system will note this)
- **API errors**: System will use cached data as fallback

## 💡 Benefits

- **Reduced API Costs**: Caching minimizes NewsAPI usage
- **Better Context**: AI makes content relevant to betting
- **Reliability**: Works offline with cached data
- **Player Focus**: Only shows relevant player news
- **Analyst Priority**: Prefers top sports analysts when available
