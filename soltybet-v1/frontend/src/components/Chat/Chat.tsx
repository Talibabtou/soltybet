import React from 'react';
import './Chat.css';

const Chat = () => {
  return (
    <div className="chat">
      <iframe
      title='stream'
  id="chat_embed"
  src="https://www.twitch.tv/embed/saltybet/chat?darkpopout&parent=solty.bet"
  height="99.5%"
  width="100%"
  style={{ 
    background: 'transparent',
    backgroundColor: 'transparent',
    borderRadius: '10px' 
  }}
  >
</iframe>
      </div>
  );
};

export default Chat;
