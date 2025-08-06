import React, { useState } from 'react';
import './popup.css';

const Popup: React.FC = () => {
    const [isVisible, setIsVisible] = useState(() => {
      localStorage.removeItem('popupClosed');
      return true;
    });

  const handleClosePopup = () => {
    setIsVisible(false);
    localStorage.setItem('popupClosed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="popup">
      <div className="popup-content">
        <h2>Disclaimer</h2>
        <p>This app is still in Beta so use it at your own risk.
          If you live in the following restricted territories, you are not allowed to play on Soltybet. <br></br></p>
        <p className="forbidden-countries">
          USA, Turkey, Aruba, Bonaire, Curacao, France, Netherlands, Sweden, Israel, Lithuania, Slovakia, Belgium, Switzerland, Saba, St Eustatius, St Martin, China, United Kingdoms.
        </p>
        <p className="disclaimer-text">
          I confirm gambling isn't forbidden by my local authorities, I'm at least 18 years old and I use this App knowing the risk.
        </p>
        <button className="popup-button" onClick={handleClosePopup}>Confirm</button>
      </div>
    </div>
  );
};

export default Popup;