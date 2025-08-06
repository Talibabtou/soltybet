import React from 'react';
import InfoReward from './InfoReward/InfoReward';
import './RewardBox.css';

const RewardBox = () => {
    return (
        <div className="rewardbox">
            <div className="info-container">
                <InfoReward />
            </div>
            <div className='reward'>
                Next game very soon!
            </div>
            
        </div>
    );
};

export default React.memo(RewardBox);