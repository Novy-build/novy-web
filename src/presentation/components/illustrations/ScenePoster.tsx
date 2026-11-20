/**
 * Zero-WebGL poster for the login brand panel. It sits behind the 3D canvas
 * while the scene chunk loads and replaces it when WebGL is unavailable, so a
 * slow device or a failed context never leaves an empty panel.
 */
export function ScenePoster() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden rounded-panel"
      data-testid="scene-poster"
    >
      <div className="absolute inset-x-[6%] top-[14%] h-[70%] rounded-[50%] bg-brand-400/20 blur-3xl" />
      <div className="absolute inset-x-[16%] bottom-[12%] h-px bg-gradient-to-r from-transparent via-brand-200/60 to-transparent" />
      <div className="absolute left-[16%] top-1/2 h-12 w-20 -translate-y-1/2 -rotate-12 rounded-tile border border-brand-200/30 bg-brand-600/40" />
      <div className="absolute left-1/2 top-1/2 h-14 w-20 -translate-x-1/2 -translate-y-1/2 rotate-6 rounded-tile border border-brand-200/40 bg-brand-500/50" />
      <div className="absolute right-[16%] top-1/2 h-12 w-20 -translate-y-1/2 rotate-12 rounded-tile border border-brand-200/30 bg-brand-400/40" />
    </div>
  );
}
