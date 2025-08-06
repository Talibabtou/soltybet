import React, { useRef, useEffect } from 'react';
import './Content.css';

const Content = () => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const adjustIframeSize = () => {
      if (iframeRef.current) {
        const container = iframeRef.current.parentElement;
        if (container) {
          const containerWidth = container.clientWidth;
          const containerHeight = container.clientHeight;
          const aspectRatio = 4 / 3;

          let width, height;
          if (containerWidth / containerHeight > aspectRatio) {
            width = containerHeight * aspectRatio;
            height = containerHeight;
          } else {
            width = containerWidth;
            height = containerWidth / aspectRatio;
          }

          iframeRef.current.style.width = `${width}px`;
          iframeRef.current.style.height = `${height}px`;
        }
      }
    };

    adjustIframeSize();
    window.addEventListener('resize', adjustIframeSize);

    return () => {
      window.removeEventListener('resize', adjustIframeSize);
    };
  }, []);

  return (
    <div className='content'>
      <div className={`twitch-embed-container`}>
        <iframe 
          ref={iframeRef}
          src="https://player.twitch.tv/?channel=saltybet&parent=solty.bet"
          title="Saltybet"
          frameBorder="0"
          allowFullScreen={true}
          scrolling="no"
        ></iframe>
      </div>
    </div>
  );
};

export default Content;