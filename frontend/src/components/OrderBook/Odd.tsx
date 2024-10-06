import React, { useMemo, useEffect, useState, useCallback, useContext } from 'react';
import './Odd.css';
import landscape from './gif/landscape.gif';
import landscape2 from './gif/landscape2.gif';
import landscape3 from './gif/landscape3.gif';
import landscape4 from './gif/landscape4.gif';
import landscape6 from './gif/landscape6.gif';
import landscape7 from './gif/landscape7.gif';
import { useUserBet } from '../UserBetContext';
import { UserContext } from '../../App';

const landscapes = [landscape, landscape2, landscape3, landscape4, landscape6, landscape7];

const cancelMessages = [
  "Match nullified due to one-sided betting. All participants will receive a full refund.",
  "Match cancelled due to uneven betting. All bets will be refunded faster than you can say 'Solana'.",
  "Match nullified: One team's fans must be busy HOLDING. All bets are being airdropped back to your wallet.!",
];

const storeGifUrlsInLocalStorage = () => {
  landscapes.forEach((gif, index) => {
    localStorage.setItem(`landscape_gif_${index}`, gif);
  });
};

const cacheGifs = async () => {
  const cache = await caches.open('landscape-gif-cache');
  const promises = landscapes.map(gif => cache.add(gif));
  await Promise.all(promises);
};

interface MatchData {
  m_id: string;
  total_red: string;
  total_blue: string;
  redFighter: string;
  blueFighter: string;
}

interface OddProps {
  matchData: MatchData | null;
  phase: string | null;
  showOdds: boolean;
}

const Odd: React.FC<OddProps> = ({ matchData, phase, showOdds }) => {
  const [storedLandscapes, setStoredLandscapes] = useState<string[]>([]);
  const [cancelMessage, setCancelMessage] = useState<string>('');
  const [hasRefreshedUser, setHasRefreshedUser] = useState(false);
  const { userHasBet } = useUserBet();
  const { refreshUser } = useContext(UserContext);

  useEffect(() => {
    const loadLandscapes = async () => {
      const loadedLandscapes = [];
      for (let i = 0; i < landscapes.length; i++) {
        const storedLandscape = localStorage.getItem(`landscape_gif_${i}`);
        if (storedLandscape) {
          loadedLandscapes.push(storedLandscape);
        }
      }

      if (loadedLandscapes.length === landscapes.length) {
        setStoredLandscapes(loadedLandscapes);
      } else {
        storeGifUrlsInLocalStorage();
        await cacheGifs();
        setStoredLandscapes(landscapes);
      }
    };
		loadLandscapes();
    
    if (userHasBet) {
      setCancelMessage(cancelMessages[Math.floor(Math.random() * cancelMessages.length)]);
      if (!hasRefreshedUser) {
        refreshUser();
        setHasRefreshedUser(true);
      }
    } else {
      setCancelMessage('');
      setHasRefreshedUser(false);
    }
  }, [userHasBet, phase, hasRefreshedUser, refreshUser]);

  const randomLandscape = useMemo(() => {
    if (storedLandscapes.length > 0) {
      return storedLandscapes[Math.floor(Math.random() * storedLandscapes.length)];
    }
    return '';
  }, [storedLandscapes]);

  const calculateOdds = useCallback((volumeRed: number, volumeBlue: number) => {
    const totalVolume = volumeRed + volumeBlue;
    if (totalVolume === 0) return { redOdd: 1, blueOdd: 1 };

    const redOdd = totalVolume / volumeRed;
    const blueOdd = totalVolume / volumeBlue;
    const minOdd = Math.min(redOdd, blueOdd); 

    return {
      redOdd: parseFloat((redOdd / minOdd).toFixed(2)),
      blueOdd: parseFloat((blueOdd / minOdd).toFixed(2))
    };
  }, []);

  if (phase !== 'wait' || !matchData) {
    console.error('Odd - Returning empty container');
    return <div className="odd"></div>;
  }

  const volumeRed = parseFloat(matchData.total_red);
  const volumeBlue = parseFloat(matchData.total_blue);

  const betsAreValid = volumeRed > 0 && volumeBlue > 0;

  if (!betsAreValid) {
    return (
      <div className="odd cancelled-container">
        <img src={randomLandscape} alt="Cancelled" className="cancelled-gif" />
        <div className="cancelled-overlay">
					{userHasBet && <span className="bet-canceled">{cancelMessage}</span>}
        </div>
      </div>
    );
  }

  const { redOdd, blueOdd } = calculateOdds(volumeRed, volumeBlue);

  return (
    <div className="odd">
      {showOdds ? (
        <div className={`odd-container fade-in ${showOdds ? 'visible' : ''}`}>
          <div className="odd-values">
            <span className="red-odd">{redOdd.toFixed(1)}</span>
            <span className="separator">:</span>
            <span className="blue-odd">{blueOdd.toFixed(1)}</span>
          </div>
        </div>
      ) : (
        <div className="loading-odds">Loading...</div>
      )}
    </div>
  );
};

export default React.memo(Odd);
