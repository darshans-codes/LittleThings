import { useEffect, useState } from "react";

export default function ExportPreview({ blob }: { blob: Blob }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);
  if (!url) return null;
  return (
    <section
      className="export-file-preview"
      aria-label="Review your finished file"
    >
      <strong>
        Your finished {blob.type.startsWith("video/") ? "film" : "collage"}
      </strong>
      {blob.type.startsWith("video/") ? (
        <video key={url} src={url} controls playsInline preload="metadata" />
      ) : (
        <img src={url} alt="Your finished birthday collage" />
      )}
      <p className="fine-print">
        This is the actual file you’ll save or share. Check the memories, words,
        and sound before sending.
      </p>
    </section>
  );
}
