// src/components/services/VideoEmbed.jsx
import React from "react";

const isYouTube = (url) => /youtu\.?be/.test(url);
const youTubeId = (url) => {
  const m = url.match(/(?:v=|\.be\/)([^&?/]+)/);
  return m ? m[1] : null;
};

export default function VideoEmbed({ video }) {
  if (!video) return null;
  const url = typeof video === "string" ? video : video.url;

  let src = url;
  if (isYouTube(url)) {
    const id = youTubeId(url);
    if (id) src = `https://www.youtube.com/embed/${id}`;
  }

  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl border bg-black">
      <iframe
        src={src}
        title="Video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
        className="w-full h-full"
      />
    </div>
  );
}
