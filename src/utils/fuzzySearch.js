/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching
 */
export function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = [];

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity score between 0 and 1
 * 1 = exact match, 0 = completely different
 */
export function similarityScore(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) {
    return 1.0;
  }

  const distance = levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
  return (longer.length - distance) / longer.length;
}

/**
 * Fuzzy search in an array of items
 * @param {Array} items - Array of items to search
 * @param {string} query - Search query
 * @param {string|Function} key - Key to search in (string) or function to extract searchable text
 * @param {number} threshold - Minimum similarity threshold (0-1)
 * @returns {Array} Sorted array of matches with scores
 */
export function fuzzySearch(items, query, key = 'name', threshold = 0.3) {
  if (!query || !query.trim()) {
    return items;
  }

  const normalizedQuery = query.toLowerCase().trim();
  
  const matches = items.map(item => {
    const searchText = typeof key === 'function' 
      ? key(item).toLowerCase() 
      : (item[key] || '').toLowerCase();

    // Exact match bonus
    if (searchText === normalizedQuery) {
      return { item, score: 1.0, exactMatch: true };
    }

    // Starts with bonus
    if (searchText.startsWith(normalizedQuery)) {
      return { item, score: 0.95, startsWithMatch: true };
    }

    // Contains bonus
    if (searchText.includes(normalizedQuery)) {
      return { item, score: 0.85, containsMatch: true };
    }

    // Fuzzy match
    const score = similarityScore(searchText, normalizedQuery);
    return { item, score };
  })
  .filter(match => match.score >= threshold)
  .sort((a, b) => {
    // Prioritize exact matches, then starts with, then contains, then fuzzy
    if (a.exactMatch && !b.exactMatch) return -1;
    if (!a.exactMatch && b.exactMatch) return 1;
    if (a.startsWithMatch && !b.startsWithMatch) return -1;
    if (!a.startsWithMatch && b.startsWithMatch) return 1;
    if (a.containsMatch && !b.containsMatch) return -1;
    if (!a.containsMatch && b.containsMatch) return 1;
    return b.score - a.score;
  });

  return matches.map(match => match.item);
}

/**
 * Highlight matching parts of text
 * @param {string} text - Text to highlight
 * @param {string} query - Search query
 * @returns {Array} Array of text segments with highlight flag
 */
export function highlightMatches(text, query) {
  if (!query || !query.trim()) {
    return [{ text, highlight: false }];
  }

  const normalizedText = text.toLowerCase();
  const normalizedQuery = query.toLowerCase();
  const index = normalizedText.indexOf(normalizedQuery);

  if (index === -1) {
    return [{ text, highlight: false }];
  }

  const segments = [];
  
  if (index > 0) {
    segments.push({ text: text.substring(0, index), highlight: false });
  }
  
  segments.push({
    text: text.substring(index, index + query.length),
    highlight: true
  });
  
  if (index + query.length < text.length) {
    segments.push({
      text: text.substring(index + query.length),
      highlight: false
    });
  }

  return segments;
}

/**
 * Tokenize search query and match against multiple fields
 */
export function multiFieldSearch(items, query, fields = ['name']) {
  if (!query || !query.trim()) {
    return items;
  }

  const tokens = query.toLowerCase().split(/\s+/);
  
  return items.filter(item => {
    return tokens.every(token => {
      return fields.some(field => {
        const value = item[field];
        if (!value) return false;
        return value.toLowerCase().includes(token);
      });
    });
  });
}

export default {
  levenshteinDistance,
  similarityScore,
  fuzzySearch,
  highlightMatches,
  multiFieldSearch
};
