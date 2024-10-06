import React, { useEffect, useRef, useState, useContext, useCallback, useMemo } from 'react';
import InfoFight from './infofight/infofight';
import './Waitbox.css';
import { tokenManager, ExpectedWinsData } from '../../../api';
import { useMatch } from '../../MatchContext';
import { usePhase } from '../../PhaseContext';
import { UserContext } from '../../../App';
import vs from './vs_logo.png';

const MAX_FIGHTER_NAME_LENGTH = 12;

interface ExpectedWins {
    redExpectedWin: number | null;
    blueExpectedWin: number | null;
}

const Waitbox: React.FC = () => {
    const redRef = useRef<HTMLDivElement>(null);
    const blueRef = useRef<HTMLDivElement>(null);
    const [expectedWinsData, setExpectedWinsData] = useState<ExpectedWinsData | null>(null);
    const [calculatedExpectedWins, setCalculatedExpectedWins] = useState<ExpectedWins>({ redExpectedWin: null, blueExpectedWin: null });
    const { latestMatch }  = useMatch();
    const { phase, redFighter, blueFighter } = usePhase();
    const { user } = useContext(UserContext);
    const fetchExpectedWinsData = useCallback(async () => {
        if (phase !== 'wait' || !latestMatch || !user) {
            setExpectedWinsData(null);
            return;
        }
        const volRed = parseFloat(latestMatch.vol_red);
        const volBlue = parseFloat(latestMatch.vol_blue);
        if (volRed === 0 || volBlue === 0) {
            setExpectedWinsData(null);
            return;
        }
        try {
            const data = await tokenManager.getData<ExpectedWinsData>('/users/expected_wins_data/', {
                m_id: latestMatch.m_id,
                wallet: user.wallet
            });
            
            setExpectedWinsData(data);
        } catch (error) {
            console.error('Error while fetching expected wins data:', error);
            setExpectedWinsData(null);
        }
    }, [phase, latestMatch, user]);
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchExpectedWinsData();
        }, 5000);
        return () => clearTimeout(timeoutId);
    }, [fetchExpectedWinsData]);
    useEffect(() => {
        if (!expectedWinsData || !latestMatch || !user) {
           
            setCalculatedExpectedWins({ redExpectedWin: null, blueExpectedWin: null });
            return;
        }
        const totalVolume = parseFloat(latestMatch.total_red) + parseFloat(latestMatch.total_blue);
        const redOdd = totalVolume / parseFloat(latestMatch.total_red);
        const blueOdd = totalVolume / parseFloat(latestMatch.total_blue);
        let redExpectedWin = expectedWinsData.userRedVolume * redOdd;
        let blueExpectedWin = expectedWinsData.userBlueVolume * blueOdd;
        const reductionFactor = user.ref_id ? 0.97 : 0.96;
        redExpectedWin *= reductionFactor;
        blueExpectedWin *= reductionFactor;
        setCalculatedExpectedWins({
            redExpectedWin: isNaN(redExpectedWin) ? null : redExpectedWin,
            blueExpectedWin: isNaN(blueExpectedWin) ? null : blueExpectedWin
        });
    }, [expectedWinsData, latestMatch, user]);
    const formatFighterName = useCallback((name: string | null): string => {
        if (!name) return '';
        const formattedName = name.replace(/_/g, ' ').toUpperCase();
        if (formattedName.length <= MAX_FIGHTER_NAME_LENGTH) {
            return formattedName;
        }
        return `${formattedName.substring(0, MAX_FIGHTER_NAME_LENGTH)}...`;
    }, []);
    const showExpectedWins = useMemo(() => {
        
        if (!latestMatch) {
           
            return false;
        }
        const totalRed = parseFloat(latestMatch.total_red);
        const totalBlue = parseFloat(latestMatch.total_blue);
        const result = !isNaN(totalRed) && !isNaN(totalBlue) && totalRed > 0 && totalBlue > 0;
        return result;
    }, [latestMatch]);
    return (
        <div className="waitbox">
            <div className="info-container">
                <InfoFight />
            </div>
            <div className='wait'>
                <div className='versus'>
                    <div className='fighter-container'>
                        <div className='Red' ref={redRef}>{formatFighterName(redFighter)}</div>
                        {showExpectedWins && calculatedExpectedWins.redExpectedWin !== null && calculatedExpectedWins.redExpectedWin > 0 && (
                            <div className='red-expected'>
                                Expected : <strong>{calculatedExpectedWins.redExpectedWin.toFixed(3)} SOL</strong>
                            </div>
                        )}
                    </div>
                    <div className='fighter-container'>
                        <div className='Blue' ref={blueRef}>{formatFighterName(blueFighter)}</div>
                        {showExpectedWins && calculatedExpectedWins.blueExpectedWin !== null && calculatedExpectedWins.blueExpectedWin > 0 && (
                            <div className='blue-expected'>
                                Expected : <strong>{calculatedExpectedWins.blueExpectedWin.toFixed(3)} SOL</strong>
                            </div>
                        )}
                    </div>
                </div>
                <div className='cote'> 
                    <img src={vs} alt="Cote" className='cote-image' />
                </div>
            </div>
        </div>
    );
};

export default React.memo(Waitbox);