import { supabase } from '../lib/supabaseClient'

const NEWS_API_BASE = 'https://newsapi.org/v2/everything'
const OPENAI_API_BASE = 'https://api.openai.com/v1/chat/completions'

// Preferred sports analysts
const PREFERRED_ANALYSTS = [
  'Adam Schefter', 'Ian Rapoport', 'Jay Glazer', 'Tom Pelissero', 'Field Yates', 'Chris Mortensen',
  'Adrian Wojnarowski', 'Shams Charania', 'Marc Stein', 'Brian Windhorst', 'Zach Lowe', 'Ken Rosenthal',
  'Jeff Passan', 'Jon Heyman', 'Buster Olney', 'Elliotte Friedman', 'Pierre LeBrun', 'Darren Dreger',
  'Pete Thamel', 'Bruce Feldman', 'Jay Bilas', 'Stephen A. Smith', 'Colin Cowherd', 'Skip Bayless',
  'Michael Wilbon', 'Tony Kornheiser'
]

/**
 * Check if a headline mentions the specific player name
 */
function headlineMentionsPlayer(headline, playerName) {
  const headlineLower = headline.toLowerCase()
  const playerLower = playerName.toLowerCase()
  
  // Check for exact player name match
  if (headlineLower.includes(playerLower)) {
    return true
  }
  
  // Check for common variations (first name only, last name only, etc.)
  const nameParts = playerName.split(' ')
  if (nameParts.length > 1) {
    const firstName = nameParts[0].toLowerCase()
    const lastName = nameParts[nameParts.length - 1].toLowerCase()
    
    return headlineLower.includes(firstName) || headlineLower.includes(lastName)
  }
  
  return false
}

/**
 * Create stat-specific keywords for better news relevance
 */
function getStatKeywords(stat, sport) {
  const statMap = {
    // Basketball
    'points': ['points', 'scoring', 'scored', 'basket', 'field goal', 'free throw'],
    'rebounds': ['rebounds', 'rebounding', 'boards', 'offensive rebound', 'defensive rebound'],
    'assists': ['assists', 'assisting', 'passing', 'dime', 'playmaking'],
    'steals': ['steals', 'stealing', 'defense', 'turnover'],
    'blocks': ['blocks', 'blocking', 'defense', 'rejection'],
    'three_pointers_made': ['three pointer', '3-pointer', '3pt', 'from beyond the arc'],
    
    // Football
    'passing_yards': ['passing yards', 'pass yards', 'throwing', 'quarterback'],
    'rushing_yards': ['rushing yards', 'run yards', 'rushing', 'ground game'],
    'receiving_yards': ['receiving yards', 'catch yards', 'receiving', 'targets'],
    'passing_touchdowns': ['passing touchdown', 'pass TD', 'throwing touchdown'],
    'rushing_touchdowns': ['rushing touchdown', 'run TD', 'rushing score'],
    'receptions': ['receptions', 'catches', 'targets', 'receiving'],
    
    // Soccer
    'goals': ['goals', 'scoring', 'scored', 'net', 'finish'],
    'assists': ['assists', 'assisting', 'passing', 'playmaking'],
    'shots_on_target': ['shots on target', 'shots', 'attempts', 'chances'],
    'chances_created': ['chances created', 'key passes', 'opportunities']
  }
  
  return statMap[stat] || [stat.replace(/_/g, ' ')]
}

/**
 * Check if article content mentions the specific stat
 */
function articleMentionsStat(article, stat, sport) {
  const keywords = getStatKeywords(stat, sport)
  const content = `${article.title} ${article.description || ''} ${article.content || ''}`.toLowerCase()
  
  return keywords.some(keyword => content.includes(keyword.toLowerCase()))
}

/**
 * Check if article is opinionated/analytical rather than just statistics
 */
function isOpinionatedContent(article) {
  const content = `${article.title} ${article.description || ''}`.toLowerCase()
  
  // Look for opinion/analysis keywords
  const opinionKeywords = [
    'analysis', 'opinion', 'outlook', 'prediction', 'forecast', 'expectation',
    'should', 'could', 'might', 'likely', 'unlikely', 'trend', 'pattern',
    'struggling', 'thriving', 'improving', 'declining', 'breakout', 'slump',
    'hot streak', 'cold streak', 'momentum', 'confidence', 'form', 'shape',
    'expert', 'analyst', 'insider', 'report', 'rumor', 'speculation',
    'breakthrough', 'breakout', 'comeback', 'resurgence', 'regression',
    'ceiling', 'floor', 'potential', 'upside', 'downside', 'risk'
  ]
  
  return opinionKeywords.some(keyword => content.includes(keyword))
}

/**
 * Fetch news from NewsAPI with stat-specific filtering, fallback to any opinionated content
 */
async function fetchFromNewsAPI(query, apiKey, stat, sport) {
  try {
    // First try: stat-specific search with opinionated content
    const statKeywords = getStatKeywords(stat, sport)
    const opinionKeywords = ['analysis', 'opinion', 'outlook', 'prediction', 'forecast', 'expectation']
    const enhancedQuery = `${query} (${statKeywords.join(' OR ')}) (${opinionKeywords.join(' OR ')})`
    
    // Try preferred analysts first
    const analystQuery = PREFERRED_ANALYSTS.map(analyst => `"${analyst}"`).join(' OR ')
    const preferredUrl = `${NEWS_API_BASE}?q=${encodeURIComponent(enhancedQuery)}&sources=${analystQuery}&apiKey=${apiKey}&pageSize=30&sortBy=relevancy&language=en&from=${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`
    
    let response = await fetch(preferredUrl)
    let data = await response.json()
    
    // If no results from preferred analysts, try general search
    if (!data.articles || data.articles.length === 0) {
      const generalUrl = `${NEWS_API_BASE}?q=${encodeURIComponent(enhancedQuery)}&apiKey=${apiKey}&pageSize=30&sortBy=relevancy&language=en&from=${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`
      response = await fetch(generalUrl)
      data = await response.json()
    }
    
    if (data.status === 'error') {
      throw new Error(data.message)
    }
    
    // Filter for stat-relevant AND opinionated articles
    let relevantArticles = (data.articles || []).filter(article => 
      articleMentionsStat(article, stat, sport) && isOpinionatedContent(article)
    )
    
    console.log(`Found ${relevantArticles.length} stat-relevant opinionated articles out of ${(data.articles || []).length} total`)
    
    // If no stat-specific opinionated content, fall back to any opinionated content about the player
    if (relevantArticles.length === 0) {
      console.log('No stat-specific opinionated content found, searching for any opinionated content about player')
      
      const fallbackQuery = `${query} (${opinionKeywords.join(' OR ')})`
      const fallbackUrl = `${NEWS_API_BASE}?q=${encodeURIComponent(fallbackQuery)}&apiKey=${apiKey}&pageSize=20&sortBy=relevancy&language=en&from=${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`
      
      const fallbackResponse = await fetch(fallbackUrl)
      const fallbackData = await fallbackResponse.json()
      
      if (fallbackData.articles && fallbackData.articles.length > 0) {
        relevantArticles = fallbackData.articles.filter(article => 
          headlineMentionsPlayer(article.title, query.split(' ')[0]) && isOpinionatedContent(article)
        )
        console.log(`Found ${relevantArticles.length} opinionated articles about player as fallback`)
      }
    }
    
    // If still no opinionated content, use any recent news about the player
    if (relevantArticles.length === 0) {
      console.log('No opinionated content found, using any recent news about player')
      const basicQuery = query.split(' ')[0] // Just the player name
      const basicUrl = `${NEWS_API_BASE}?q=${encodeURIComponent(basicQuery)}&apiKey=${apiKey}&pageSize=10&sortBy=relevancy&language=en&from=${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`
      
      const basicResponse = await fetch(basicUrl)
      const basicData = await basicResponse.json()
      
      if (basicData.articles && basicData.articles.length > 0) {
        relevantArticles = basicData.articles.filter(article => 
          headlineMentionsPlayer(article.title, basicQuery)
        )
        console.log(`Found ${relevantArticles.length} general articles about player as final fallback`)
      }
    }
    
    return relevantArticles
  } catch (error) {
    console.error('Error fetching from NewsAPI:', error)
    throw error
  }
}

/**
 * Use OpenAI to rephrase headline and content to relate to the betting situation
 */
async function rephraseWithOpenAI(headline, content, playerName, sport, stat, openAIKey, bettingLine = null) {
  if (!openAIKey) {
    return { rephrasedHeadline: headline, rephrasedContent: content }
  }

  try {
    const statDisplay = stat.replace(/_/g, ' ')
    const lineContext = bettingLine ? ` with a betting line of ${bettingLine}` : ''
    
    const prompt = `You are a sports betting analyst. Transform this news about ${playerName} into betting analysis focused on ${statDisplay}${lineContext}.

CONTEXT:
- Player: ${playerName}
- Sport: ${sport}
- Statistic: ${statDisplay}
- Betting Context: ${bettingLine ? `Line: ${bettingLine}` : 'General betting on this statistic'}

Original headline: "${headline}"
Original content: "${content || 'No content available'}"

YOUR TASK:
Create betting-focused analysis that connects this news to ${playerName}'s ${statDisplay} performance. Even if the original news isn't directly about ${statDisplay}, find ways to relate it to betting implications.

REQUIREMENTS:
1. Make the headline betting-focused and opinionated about ${statDisplay}
2. Create 2-3 sentences that analyze how this news affects ${playerName}'s ${statDisplay} betting outlook
3. Be analytical and opinionated - avoid just stating facts
4. If the news isn't directly about ${statDisplay}, explain why it's still relevant for ${statDisplay} betting
5. Use betting terminology and make predictions/analysis
6. Keep it concise but insightful

EXAMPLES OF GOOD BETTING ANALYSIS:
- "LeBron's recent form suggests he'll exceed his points total"
- "Injury concerns could limit his rebounding upside"
- "Matchup advantages favor over on his assist numbers"

Format your response as JSON:
{
  "rephrasedHeadline": "your betting-focused headline here",
  "rephrasedContent": "your analytical betting content here"
}`

    const response = await fetch(OPENAI_API_BASE, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content
    
    if (content) {
      try {
        const parsed = JSON.parse(content)
        return {
          rephrasedHeadline: parsed.rephrasedHeadline || headline,
          rephrasedContent: parsed.rephrasedContent || content
        }
      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError)
        return { rephrasedHeadline: headline, rephrasedContent: content }
      }
    }

    return { rephrasedHeadline: headline, rephrasedContent: content }
  } catch (error) {
    console.error('Error with OpenAI rephrasing:', error)
    return { rephrasedHeadline: headline, rephrasedContent: content }
  }
}

/**
 * Store news article in Supabase
 */
async function storeNewsArticle(articleData) {
  try {
    const { data, error } = await supabase
      .from('news_articles')
      .insert([articleData])
      .select()
      .single()

    if (error) {
      console.error('Error storing news article:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error storing news article:', error)
    return null
  }
}

/**
 * Retrieve news article from Supabase
 */
async function getNewsArticle(playerName, sport, stat) {
  try {
    const { data, error } = await supabase
      .from('news_articles')
      .select('*')
      .eq('player_name', playerName)
      .eq('sport', sport)
      .eq('stat', stat)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error retrieving news article:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error retrieving news article:', error)
    return null
  }
}

/**
 * Get any cached news for a player (fallback when API fails)
 */
async function getAnyCachedNews(playerName, sport) {
  try {
    const { data, error } = await supabase
      .from('news_articles')
      .select('*')
      .eq('player_name', playerName)
      .eq('sport', sport)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error retrieving cached news:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error retrieving cached news:', error)
    return null
  }
}

/**
 * Main function to fetch player news with caching and AI rephrasing
 */
export async function fetchPlayerNews(playerName, sport, stat, newsAPIKey, openAIKey, bettingLine = null) {
  // First, try to get from cache
  const cachedArticle = await getNewsArticle(playerName, sport, stat)
  if (cachedArticle) {
    console.log('Using cached news article for', playerName)
    return {
      headline: cachedArticle.ai_rephrased_headline || cachedArticle.original_headline,
      content: cachedArticle.ai_rephrased_content || cachedArticle.original_content,
      source: cachedArticle.original_source,
      url: cachedArticle.original_url
    }
  }

  // If no cache and no API key, try to get any cached news for this player
  if (!newsAPIKey || newsAPIKey === 'YOUR_NEWS_API_KEY_HERE') {
    console.log('No API key, trying to get any cached news for', playerName)
    const anyCachedNews = await getAnyCachedNews(playerName, sport)
    if (anyCachedNews) {
      return {
        headline: anyCachedNews.ai_rephrased_headline || anyCachedNews.original_headline,
        content: anyCachedNews.ai_rephrased_content || anyCachedNews.original_content,
        source: anyCachedNews.original_source,
        url: anyCachedNews.original_url
      }
    }
    
    return { 
      headline: 'API Key Required - Check .env file', 
      content: 'Please configure your NewsAPI key to fetch news articles.',
      source: 'NewsAPI' 
    }
  }

  try {
    // Create search query
    const query = `${playerName} ${sport} ${stat}`.replace(/_/g, ' ')
    console.log('Fetching news for query:', query)

    // Fetch from NewsAPI with stat-specific filtering
    const articles = await fetchFromNewsAPI(query, newsAPIKey, stat, sport)
    
    if (articles.length === 0) {
      // Try to get any cached news for this player as fallback
      const anyCachedNews = await getAnyCachedNews(playerName, sport)
      if (anyCachedNews) {
        return {
          headline: anyCachedNews.ai_rephrased_headline || anyCachedNews.original_headline,
          content: anyCachedNews.ai_rephrased_content || anyCachedNews.original_content,
          source: anyCachedNews.original_source,
          url: anyCachedNews.original_url
        }
      }
      
      return { 
        headline: 'No recent news found', 
        content: `No recent news found for ${playerName} regarding ${stat.replace(/_/g, ' ')}.`,
        source: 'NewsAPI' 
      }
    }

    // Find an article that mentions the player in the headline
    let selectedArticle = articles.find(article => 
      headlineMentionsPlayer(article.title, playerName)
    )

    // If no article mentions the player, use the first one
    if (!selectedArticle) {
      selectedArticle = articles[0]
      console.log('No article found mentioning player specifically, using first available')
    }

    // Log what type of content we found
    const isStatSpecific = articleMentionsStat(selectedArticle, stat, sport)
    const isOpinionated = isOpinionatedContent(selectedArticle)
    console.log(`Selected article - Stat-specific: ${isStatSpecific}, Opinionated: ${isOpinionated}`)

    // Use OpenAI to rephrase the content
    const { rephrasedHeadline, rephrasedContent } = await rephraseWithOpenAI(
      selectedArticle.title,
      selectedArticle.description || selectedArticle.content,
      playerName,
      sport,
      stat,
      openAIKey,
      bettingLine
    )

    // Store in database
    const articleData = {
      player_name: playerName,
      sport: sport,
      stat: stat,
      search_query: query,
      original_headline: selectedArticle.title,
      original_content: selectedArticle.description || selectedArticle.content,
      original_source: selectedArticle.source.name,
      original_url: selectedArticle.url,
      ai_rephrased_headline: rephrasedHeadline,
      ai_rephrased_content: rephrasedContent
    }

    await storeNewsArticle(articleData)

    return {
      headline: rephrasedHeadline,
      content: rephrasedContent,
      source: selectedArticle.source.name,
      url: selectedArticle.url
    }

  } catch (error) {
    console.error('Error fetching player news:', error)
    
    // Try to return any cached data as fallback
    const anyCachedNews = await getAnyCachedNews(playerName, sport)
    if (anyCachedNews) {
      return {
        headline: anyCachedNews.ai_rephrased_headline || anyCachedNews.original_headline,
        content: anyCachedNews.ai_rephrased_content || anyCachedNews.original_content,
        source: anyCachedNews.original_source,
        url: anyCachedNews.original_url
      }
    }

    return { 
      headline: `Error loading news: ${error.message}`, 
      content: 'There was an error fetching news articles. Please try again later.',
      source: 'NewsAPI' 
    }
  }
}
