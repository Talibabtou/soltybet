import React, { useContext } from 'react';
import './BetContainer.css';
import BetBox from './BetBox/BetBox';
import Waitbox from './WaitBox/Waitbox';
import RewardBox from './RewardBox/RewardBox';
import { PhaseContext } from '../PhaseContext';
import { BetProvider } from '../BetProvider';

const BetContainer = () => {
    const { phase, redFighter, blueFighter } = useContext(PhaseContext);
    return (
        <BetProvider>
            <div className="betcontainer">
                {phase === 'bet' && <BetBox />}
                {phase === 'wait' && (
                    <Waitbox 
                        redFighter={redFighter} 
                        blueFighter={blueFighter} 
                    />
                )}
                {phase === 'reward' && <RewardBox />}
            </div>
        </BetProvider>
    );
};

export default BetContainer;