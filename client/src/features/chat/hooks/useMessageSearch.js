import { useState, useCallback } from 'react';

export const useMessageSearch = (roomId, code) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [highlightedMessageId, setHighlightedMessageId] = useState('');

  const API_BASE = import.meta.env.VITE_SOCKET_URL || 'http://localhost:1000';

  const searchMessages = useCallback(async (query) => {
    const trimmedQuery = query.trim();
    setSearchQuery(trimmedQuery);
    setSearchError('');

    if (!trimmedQuery) {
      setSearchResults([]);
      setActiveSearchTerm('');
      return;
    }

    setSearchLoading(true);

    try {
      const url = new URL(`${API_BASE}/api/search`);
      url.searchParams.set('code', code);
      url.searchParams.set('roomId', roomId);
      url.searchParams.set('q', trimmedQuery);

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Search failed.');
      }

      setSearchResults(data.results || []);
      setActiveSearchTerm(trimmedQuery);
    } catch (error) {
      setSearchError(error.message || 'Search failed.');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [roomId, code, API_BASE]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchError('');
    setActiveSearchTerm('');
    setHighlightedMessageId('');
  }, []);

  const highlightMessage = useCallback((messageId) => {
    setHighlightedMessageId(messageId);
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    searchLoading,
    searchError,
    activeSearchTerm,
    highlightedMessageId,
    setHighlightedMessageId,
    searchMessages,
    clearSearch,
    highlightMessage,
  };
};

export default useMessageSearch;
