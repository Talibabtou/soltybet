import React, { useContext, useEffect, useState, useMemo } from 'react';
import './Orderbook.css';
import { Doughnut } from 'react-chartjs-2';
import 'chart.js/auto';
import Odd from './Odd';
import { PhaseContext } from '../PhaseContext';
import { useMatch } from '../MatchContext';
import { useUserBet } from '../UserBetContext';

import pepehat from './gif/pepe-hat.gif';
import pepesaber from './gif/pepe-saber.gif';
import pepebox from './gif/pepe-box.gif';
import pepegun from './gif/pepe-gun.gif';
import pepedance from './gif/pepe-dance.gif';
import pepedancing from './gif/pepe-dancing.gif';
import pepemoney from './gif/pepe-money.gif';
import pepenom from './gif/pepe-nom.gif';
import pepenoodles from './gif/pepe-noodles.gif';
import pepeparty from './gif/pepe-party.gif';
import peperobber from './gif/pepe-robber.gif';
import pepescam from './gif/pepe-scam.gif';
import pepeshake from './gif/pepe-shake.gif';
import pepeskill from './gif/pepe-skill.gif';
import pepetorche from './gif/pepe-torche.gif';
import pepewizard from './gif/pepe-wizard.gif';
import akumaGif from './gif/akuma.gif';
import blankaGif from './gif/blanka.gif';
import dhalsimGif from './gif/dhalsim.gif';
import hondaGif from './gif/honda.gif';
import RyuGif from './gif/ryu.gif';
import chunli from './gif/chunli.gif';
import gigarun from './gif/giga-run.gif';
import haggar from './gif/haggar.gif';
import peepohat from './gif/peepohat.gif';
import peepohigh from './gif/peepo-high.gif';
import pepebox2 from './gif/pepe-box2.gif';
import pepechonky from './gif/pepe-chunky.gif';
import pepecostume from './gif/pepe-costume.gif';
import pepedancehallo from './gif/pepe-dance-hallo.gif';
import pepeeee from './gif/pepeeee.gif';
import pepegaming from './gif/pepe-gaming.gif';
import pepeguitard from './gif/pepe-guitard.gif';
import pepejam from './gif/pepe-jam.gif';
import pepekiss from './gif/pepe-kiss.gif';
import pepemaracas from './gif/pepe-maracas.gif';
import rickasley from './gif/rickasley.gif';
import pepepeepo from './gif/pepe-peepo.gif';
import pepedancingfull from './gif/pepe-dancing-full.gif';
import peepoparty from './gif/peepoparty.gif';
import steermonka from './gif/steer-monka.gif';
import terry from './gif/terry.gif';
import zangief from './gif/zangief.gif';

const gifs = [RyuGif, rickasley, terry, zangief, pepemaracas, pepepeepo, pepedancingfull, peepoparty, steermonka, pepedancehallo, pepeeee, pepeguitard, pepegaming, pepejam, pepekiss, chunli, gigarun, haggar, peepohat, peepohigh, pepebox2, pepechonky, pepecostume, akumaGif, blankaGif, dhalsimGif, hondaGif, pepehat, pepemoney, pepenom, pepenoodles, pepeparty, peperobber, pepescam, pepeshake, pepeskill, pepetorche, pepewizard, pepebox, pepesaber, pepedance, pepedancing, pepegun];

interface MatchData {
  m_id: string;
  total_red: string;
  total_blue: string;
  redFighter: string;
  blueFighter: string;
}

const storeGifUrlsInLocalStorage = () => {
  gifs.forEach((gif, index) => {
    localStorage.setItem(`gif_${index}`, gif);
  });
};

const cacheGifs = async () => {
  const cache = await caches.open('gif-cache');
  const promises = gifs.map(gif => cache.add(gif));
  await Promise.all(promises);
};

const Orderbook: React.FC = () => {
  const { phase } = useContext(PhaseContext);
  const { latestMatch } = useMatch();
  const { userHasBet, resetUserHasBet } = useUserBet();
  const [storedGifs, setStoredGifs] = useState<string[]>([]);
  const [currentGif, setCurrentGif] = useState<string>('');
  const [showDonut, setShowDonut] = useState(false);

  useEffect(() => {
    const loadGifs = async () => {
      const loadedGifs = [];
      for (let i = 0; i < gifs.length; i++) {
        const storedGif = localStorage.getItem(`gif_${i}`);
        if (storedGif) {
          loadedGifs.push(storedGif);
        }
      }

      if (loadedGifs.length === gifs.length) {
        setStoredGifs(loadedGifs);
      } else {
        storeGifUrlsInLocalStorage();
        await cacheGifs();
        setStoredGifs(gifs);
      }
    };

    loadGifs();
  }, []);

  const selectRandomGif = useMemo(() => () => {
    if (storedGifs.length > 0) {
      const randomIndex = Math.floor(Math.random() * storedGifs.length);
      return storedGifs[randomIndex];
    }
    return '';
  }, [storedGifs]);

  useEffect(() => {
    setCurrentGif(selectRandomGif());
  }, [selectRandomGif]);

  useEffect(() => {
    if (phase === 'reward') {
      setCurrentGif(selectRandomGif());
    }
  }, [phase, selectRandomGif]);

  useEffect(() => {
    if (phase === 'wait') {
      setShowDonut(false);
      const timer = setTimeout(() => {
        setShowDonut(true);
      }, 7000);

      return () => clearTimeout(timer);
    }
  }, [phase]);

  const matchData: MatchData | null = latestMatch ? {
    m_id: latestMatch.m_id,
    total_red: latestMatch.total_red,
    total_blue: latestMatch.total_blue,
    redFighter: latestMatch.redFighter,
    blueFighter: latestMatch.blueFighter
  } : null;

  const betsAreValid = matchData && parseFloat(matchData.total_red) > 0 && parseFloat(matchData.total_blue) > 0;

  const data = matchData && phase === 'wait' && betsAreValid ? {
    labels: ['Blue', 'Red'],
    datasets: [
      {
        label: 'Volume',
        data: [parseFloat(matchData.total_blue), parseFloat(matchData.total_red)],
        backgroundColor: ['#3a3adb', '#f54b4b'],
        borderColor: ['#ffffff', '#ffffff'],
        borderWidth: 1,
      },
    ],
  } : null;

  const options = {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed !== null) {
              label = `${context.parsed.toFixed(2)} SOL`;
            }
            return label;
          }
        }
      }
    },
    cutout: '70%',
  };

  const showGif = phase !== 'wait';

  useEffect(() => {
    if (phase === 'bet') {
      
      resetUserHasBet();
    }
  }, [phase, resetUserHasBet]);

  return (
    <div className={`orderbook ${showGif ? 'show-gif' : ''}`}>
      <div className="orderbook-inner-container">
        {!showGif ? (
          <>
            <div className="orderbook-left">
              <Odd matchData={matchData} phase={phase} showOdds={showDonut} userHasBet={userHasBet} />
            </div>
            {betsAreValid ? (
              <div className={`orderbook-right ${showDonut ? 'fade-in visible' : 'fade-in'}`}>
                {showDonut ? (
                  <Doughnut data={data} options={options} />
                ) : (
                  <div className="loading-donut">Loading Odds...</div>
                )}
              </div>
            ) : null}
          </>
        ) : (
          <div className="waiting-gif-container">
            <img src={currentGif} alt="Waiting GIF" className="waiting-gif" />
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(Orderbook);