import React from 'react';

// Render a deliberately small Markdown subset as React text, never raw HTML.
function inline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={index}>{part.slice(1, -1)}</em>;
    return part;
  });
}

export default function ReportText({ text }: { text: string }) {
  return <>{text.split('\n').map((raw, index) => {
    const line = raw.trim();
    if (!line) return null;
    if (/^[-*_]{3,}$/.test(line)) return <hr key={index} className="border-white/10" />;
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) return <h3 key={index} className="text-sm font-bold text-orange-400 pt-2">{inline(heading[2])}</h3>;
    const bullet = line.match(/^(?:[-*+]\s+|\d+\.\s+)(.+)$/);
    if (bullet) return <ul key={index} className="list-disc pl-5"><li>{inline(bullet[1])}</li></ul>;
    return <p key={index}>{inline(line)}</p>;
  })}</>;
}
