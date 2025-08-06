import React, { useContext } from 'react';
import { PhaseContext } from '../../../PhaseContext';
import { MatchContext } from '../../../MatchContext';
import './InfoReward.css';

const InfoReward = () => {
    const { winningTeam } = useContext(PhaseContext);
    const { latestMatch } = useContext(MatchContext);
    const teamClass = winningTeam === 'Red' ? 'red' : winningTeam === 'Blue' ? 'blue' : '';
    const isMatchCancelled = latestMatch && (parseFloat(latestMatch.vol_red) === 0 || parseFloat(latestMatch.vol_blue) === 0);
    return (
        <div className={`infobet ${teamClass}`}>
            {isMatchCancelled ? (
                'Match was cancelled'
            ) : (
                winningTeam && `Payout to team ${winningTeam}`
            )}
        </div>
    );
};

export default InfoReward;