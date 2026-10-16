function endpoint(raw) {
  if (typeof raw !== 'string' || raw.length > 2000) throw new Error('Invalid endpoint.');
  let url; try { url = new URL(raw); } catch { throw new Error('Enter a complete endpoint URL.'); }
  if (url.username || url.password || url.search || url.hash) throw new Error('Use an endpoint without embedded credentials, query or fragment.');
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) throw new Error('Use HTTPS, or HTTP on this computer.');
  return url.href.replace(/\/$/, '');
}

async function readTextStream(response, anthropic, onText) {
  if (!response.body) throw new Error('The provider returned an empty response.');
  let total = 0;
  function emit(text) {
    if (typeof text !== 'string' || !text) return;
    total += text.length;
    if (total > 250000) throw new Error('Response reached Lu’s length limit.');
    onText(text);
  }
  if ((response.headers.get('content-type') || '').includes('application/json')) {
    const value = await response.json();
    if (value.error) throw new Error(value.error.message || 'Provider request failed.');
    emit(anthropic ? value.content?.filter(part => part.type === 'text').map(part => part.text).join('') : value.choices?.[0]?.message?.content);
  } else {
    const decoder = new TextDecoder(); let buffer = '';
    const parse = line => {
      if (!line.startsWith('data:')) return;
      const data = line.slice(5).trim(); if (!data || data === '[DONE]') return;
      let event; try { event = JSON.parse(data); } catch { throw new Error('The provider returned an unreadable stream.'); }
      if (event.error) throw new Error(event.error.message || 'Provider stream failed.');
      emit(anthropic ? event.delta?.text : event.choices?.[0]?.delta?.content);
    };
    for await (const chunk of response.body) {
      buffer += decoder.decode(chunk, { stream: true });
      if (buffer.length > 1_000_000) throw new Error('The provider returned an oversized stream event.');
      let end;
      while ((end = buffer.indexOf('\n')) >= 0) { parse(buffer.slice(0, end).trim()); buffer = buffer.slice(end + 1); }
    }
    buffer += decoder.decode(); if (buffer.trim()) parse(buffer.trim());
  }
  if (!total) throw new Error('The provider returned no text. Choose a chat model and try again.');
  return total;
}
module.exports = { endpoint, readTextStream };
