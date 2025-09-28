-- Supabase database schema for PrizePredict news caching

-- Table for caching news articles
CREATE TABLE IF NOT EXISTS news_articles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_name TEXT NOT NULL,
    sport TEXT NOT NULL,
    stat TEXT NOT NULL,
    search_query TEXT NOT NULL,
    original_headline TEXT NOT NULL,
    original_content TEXT,
    original_source TEXT NOT NULL,
    original_url TEXT,
    ai_rephrased_headline TEXT,
    ai_rephrased_content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_news_articles_lookup 
ON news_articles(player_name, sport, stat);

-- Index for search query lookups
CREATE INDEX IF NOT EXISTS idx_news_articles_query 
ON news_articles(search_query);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_news_articles_updated_at 
    BEFORE UPDATE ON news_articles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
