// X sets its font on its own elements, not on <body>, so ours must name it too.
const X_FONT = `TwitterChirp, -apple-system, "system-ui", "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;

export const STYLES = `
.xrb-badge, .xrb-actions, .xrb-blocked-line, .xrb-toast, .xrb-tip { font-family: ${X_FONT}; }
.xrb-badge { margin-left: 4px; padding: 0 8px; border-radius: 10px; font-size: 15px; line-height: 20px;
  white-space: nowrap; background: rgba(127,127,127,.15); color: inherit; }
.xrb-badge:empty { display: none; }
.xrb-loading, .xrb-unknown { opacity: .55; }
.xrb-match { background: #f4212e; color: #fff; opacity: 1; }
.xrb-actions { margin-left: 4px; display: inline-flex; gap: 2px; }
.xrb-actions button, .xrb-blocked-line button, .xrb-toast button { border: 0; background: none; cursor: pointer;
  font: inherit; padding: 0 3px; border-radius: 6px; }
.xrb-actions button { opacity: .35; font-size: 13px; }
.xrb-actions button:hover, .xrb-spare.xrb-on { opacity: 1; }
.xrb-tip { position: fixed; z-index: 2147483647; pointer-events: none; white-space: nowrap;
  padding: 4px 8px; border-radius: 4px; background: #536471; color: #fff; font-size: 13px; font-weight: 700;
  line-height: 16px; box-shadow: 0 2px 8px rgba(0,0,0,.45); }
.xrb-collapsed > :not(.xrb-blocked-line) { display: none !important; }
.xrb-blocked-line { padding: 12px 16px; font-size: 15px; line-height: 20px; opacity: .7; }
.xrb-blocked-line button, .xrb-toast button { color: #1d9bf0; font-weight: 600; }
.xrb-toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 99999;
  background: #1d9bf0; color: #fff; padding: 10px 16px; border-radius: 8px; font-size: 14px; }
.xrb-toast button { color: #fff; text-decoration: underline; }
`;
