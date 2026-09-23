import React, { useMemo } from 'react';

interface AdsterraFrameProps {
  adKey: string;
  width: number;
  height: number;
  className?: string;
}

export const AdsterraFrame: React.FC<AdsterraFrameProps> = ({
  adKey,
  width,
  height,
  className = '',
}) => {
  const srcDoc = useMemo(() => {
    if (!adKey) return '';
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
    }
  </style>
</head>
<body>
  <script type="text/javascript">
    atOptions = {
      'key' : '${adKey}',
      'format' : 'iframe',
      'height' : ${height},
      'width' : ${width},
      'params' : {}
    };
  </script>
  <script type="text/javascript" src="//www.highperformanceformat.com/${adKey}/invoke.js"></script>
</body>
</html>`;
  }, [adKey, width, height]);

  if (!adKey) return null;

  return (
    <div
      className={`flex items-center justify-center overflow-hidden mx-auto ${className}`}
      style={{ minHeight: `${height}px`, maxWidth: '100%' }}
    >
      <iframe
        title={`Adsterra Ad ${width}x${height}`}
        srcDoc={srcDoc}
        width={width}
        height={height}
        className="border-0 overflow-hidden shrink-0 rounded-lg"
        scrolling="no"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      />
    </div>
  );
};
