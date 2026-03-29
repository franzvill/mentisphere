export interface TextChunk {
  index: number;
  text: string;
}

export function chunkText(text: string, maxChunkSize: number = 1000, overlap: number = 200): TextChunk[] {
  const chunks: TextChunk[] = [];
  const paragraphs = text.split(/\n\n+/);
  let current = '';
  let index = 0;

  for (const paragraph of paragraphs) {
    if (current.length + paragraph.length > maxChunkSize && current.length > 0) {
      chunks.push({ index, text: current.trim() });
      index++;
      const words = current.split(' ');
      const overlapWords = [];
      let overlapLen = 0;
      for (let i = words.length - 1; i >= 0 && overlapLen < overlap; i--) {
        overlapWords.unshift(words[i]);
        overlapLen += words[i].length + 1;
      }
      current = overlapWords.join(' ') + '\n\n' + paragraph;
    } else {
      current += (current ? '\n\n' : '') + paragraph;
    }
  }

  if (current.trim()) {
    chunks.push({ index, text: current.trim() });
  }

  return chunks;
}
