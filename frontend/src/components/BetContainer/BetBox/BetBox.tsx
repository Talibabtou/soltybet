import React, { useContext } from 'react';
import BetInput from './BetInput/BetInput';
import BetButtons from './BetButtons/BetButtons';
import InfoBet from './Infobet/Infobet';
import './BetBox.css';
import './Infobet/Infobet.css';
import './BetInput/BetInput.css';
import './BetButtons/BetButtons.css';

const BetBox: React.FC = () => {
  return (
    <div className="betbox">
      <div className="info-container">
        <InfoBet />
      </div>
      <div className='bet'>
        <div className="input-container">
          <BetInput />
        </div>
        <div>
          <BetButtons />
        </div>
      </div>
    </div>
  );
};

export default BetBox;