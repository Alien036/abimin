import { SubtitleSegment, TranscriptMetadata } from './initialData';

export function secondsToTimeStr(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const mm = m < 10 ? `0${m}` : `${m}`;
  const ss = s < 10 ? `0${s}` : `${s}`;
  return `${mm}:${ss}`;
}

export function secondsToSrtTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const ms = Math.floor((totalSeconds % 1) * 1000);

  const hh = h < 10 ? `0${h}` : `${h}`;
  const mm = m < 10 ? `0${m}` : `${m}`;
  const ss = s < 10 ? `0${s}` : `${s}`;
  const mmm = ms < 10 ? `00${ms}` : ms < 100 ? `0${ms}` : `${ms}`;

  return `${hh}:${mm}:${ss},${mmm}`;
}

export function secondsToVttTime(totalSeconds: number): string {
  return secondsToSrtTime(totalSeconds).replace(',', '.');
}

export function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.trim().split(':').map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

export function parseMarkdownTranscript(content: string): TranscriptMetadata {
  const lines = content.split(/\r?\n/);
  const segments: SubtitleSegment[] = [];
  const timeRegex = /^\*\*\[([\d:]+)\s*-\s*([\d:]+)\]\*\*\s*(.*)$/;

  let title = 'Zaman Damgalı Alt Yazı (Transkript)';
  let fileName = 'video.mp4';
  let duration = 'Bilinmiyor';
  let speakers = 'Danışman ve Danışan';

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ')) {
      title = trimmed.replace('# ', '').trim();
    } else if (trimmed.includes('Dosya Adı:')) {
      const match = trimmed.match(/Dosya Adı:\*\*?\s*`?([^`\n*]+)`?/);
      if (match) fileName = match[1].trim();
    } else if (trimmed.includes('Süre:')) {
      const match = trimmed.match(/Süre:\*\*?\s*([^\n*]+)/);
      if (match) duration = match[1].trim();
    } else if (trimmed.includes('Konuşmacılar:')) {
      const match = trimmed.match(/Konuşmacılar:\*\*?\s*([^\n]+)/);
      if (match) speakers = match[1].replace(/\*\*/g, '').trim();
    }

    const match = trimmed.match(timeRegex);
    if (match) {
      const startStr = match[1];
      const endStr = match[2];
      let rest = match[3].trim();
      let speaker = 'Not / Efekt';
      let text = rest;

      const speakerMatch = rest.match(/^\*\*([^*]+):\*\*\s*(.*)$/);
      if (speakerMatch) {
        speaker = speakerMatch[1].trim();
        text = speakerMatch[2].trim();
      }

      segments.push({
        id: segments.length + 1,
        startTime: parseTimeToSeconds(startStr),
        endTime: parseTimeToSeconds(endStr),
        startStr,
        endStr,
        speaker,
        text,
        originalText: text,
        status: 'pending'
      });
    }
  });

  const maxEndTime = segments.length > 0 ? segments[segments.length - 1].endTime : 0;

  return {
    title,
    fileName,
    duration: duration !== 'Bilinmiyor' ? duration : secondsToTimeStr(maxEndTime),
    totalSeconds: maxEndTime,
    speakers,
    segments
  };
}

export function exportToMarkdown(metadata: TranscriptMetadata, segments: SubtitleSegment[]): string {
  let md = `# ${metadata.title}\n\n`;
  md += `- **Dosya Adı:** \`${metadata.fileName}\`\n`;
  md += `- **Süre:** ${metadata.duration}\n`;
  md += `- **Konuşmacılar:** **${metadata.speakers}**\n\n`;
  md += `## Zaman Damgalı Alt Yazı Akışı\n\n`;

  segments.forEach((seg) => {
    if (seg.speaker === 'Not / Efekt' || seg.speaker === 'Not') {
      md += `**[${seg.startStr} - ${seg.endStr}]** ${seg.text}\n\n`;
    } else {
      md += `**[${seg.startStr} - ${seg.endStr}]** **${seg.speaker}:** ${seg.text}\n\n`;
    }
  });

  return md;
}

export function exportToSrt(segments: SubtitleSegment[]): string {
  return segments
    .map((seg, idx) => {
      const startTime = secondsToSrtTime(seg.startTime);
      const endTime = secondsToSrtTime(seg.endTime);
      const prefix = seg.speaker && seg.speaker !== 'Not / Efekt' ? `${seg.speaker}: ` : '';
      return `${idx + 1}\n${startTime} --> ${endTime}\n${prefix}${seg.text}\n`;
    })
    .join('\n');
}

export function exportToVtt(segments: SubtitleSegment[]): string {
  const body = segments
    .map((seg, idx) => {
      const startTime = secondsToVttTime(seg.startTime);
      const endTime = secondsToVttTime(seg.endTime);
      const prefix = seg.speaker && seg.speaker !== 'Not / Efekt' ? `<v ${seg.speaker}>` : '';
      return `${idx + 1}\n${startTime} --> ${endTime}\n${prefix}${seg.text}`;
    })
    .join('\n\n');

  return `WEBVTT\n\n${body}\n`;
}
