'use client';

import { useState } from 'react';

export default function ScrapeEmailsComponent() {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  // Function to call the API
  const scrapeEmails = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/scrapeEmails');
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult('Error fetching data');
      console.error('Error calling scrapeEmails API:', error);
    }
    setLoading(false);
  };

  return (
    <div>
      <button onClick={scrapeEmails} disabled={loading}>
        {loading ? 'Scraping...' : 'Scrape Emails'}
      </button>
      <pre>{result}</pre>
    </div>
  );
}
