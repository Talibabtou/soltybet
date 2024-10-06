import React, { useState, useEffect, useContext, useCallback } from 'react';
import './Sidebar.css';
import { tokenManager } from '../../api';
import { UserContext } from '../../App';
import { PhaseContext } from '../PhaseContext';

interface DataItem {
  wallet: string;
  volume?: number;
  gain?: number;
}

interface UserStats {
  volume: number;
	total_volume: number;
  gain: number;
  nbBets: number;
  winningBets: number;
  winPercentage: number;
  referral_gain?: number; 
}

const Sidebar: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'volume' | 'gain' | 'user'>('volume');
  const [data, setData] = useState<{ volume: DataItem[]; gain: DataItem[] }>({ volume: [], gain: [] });
  const [userStats, setUserStats] = useState<UserStats>({ volume: 0, gain: 0, nbBets: 0 });
  const { user } = useContext(UserContext);
  const { payoutId, shouldFetchData, setShouldFetchData, shouldFetchRefund, setShouldFetchRefund } = useContext(PhaseContext);


  const fetchTopData = useCallback(async () => {
    try {
      const [volumeData, gainData] = await Promise.all([
        tokenManager.getData<DataItem[]>('/users/top_volume/'),
        tokenManager.getData<DataItem[]>('/users/top_gain/')
      ]);
      setData({ volume: volumeData, gain: gainData });
    } catch (error) {
      console.error("Error while fetching top data:", error);
    }
  }, []);

  const fetchUserStats = useCallback(async () => {
    if (user) {
      try {
        const stats = await tokenManager.getData<UserStats>(`/users/${user.u_id}/stats/`);
        setUserStats(stats);
      } catch (error) {
        console.error("Error while fetching user stats:", error);
      }
    }
  }, [user]);

  useEffect(() => {
    fetchTopData();
  }, [fetchTopData]);

  useEffect(() => {
    if (user) {
      fetchUserStats();
      setActiveTab('user');
    } else {
      setActiveTab('volume');
    }
  }, [user, fetchUserStats]);

  useEffect(() => {
    if (shouldFetchData || shouldFetchRefund) {
      
      
      const fetchData = async () => {
        
        
        await fetchTopData();
        if (user) {
          await fetchUserStats();
        }
        
      };
  
      fetchData();
    }
  }, [shouldFetchData, shouldFetchRefund, fetchTopData, fetchUserStats, user, setShouldFetchData, setShouldFetchRefund]);


  const renderUserStats = () => {
    const profit = (userStats.gain || 0) - (userStats.total_volume || 0);
    const profitColor = profit >= 0 ? 'green' : 'red';
  
    return (
      <table>
        <tbody>
          <tr>
            <td>Total Volume :</td>
            <td>{userStats.volume?.toFixed(2) ?? '0.00'} SOL</td>
          </tr>
          <tr>
            <td>Total Gain :</td>
            <td>{userStats.gain?.toFixed(2) ?? '0.00'} SOL</td>
          </tr>
          <tr>
            <td>PnL :</td>
            <td style={{ color: profitColor }}>{profit.toFixed(2)} SOL</td>
          </tr>
          <tr>
            <td>Bets :</td>
            <td>{userStats.nbBets ?? 0}</td>
          </tr>
          <tr>
            <td>Winning Bets :</td>
            <td>{userStats.winningBets ?? 0}</td>
          </tr>
          <tr>
            <td>Win % :</td>
            <td>{userStats.winPercentage?.toFixed(2) ?? '0.00'}%</td>
          </tr>
          {user && user.ref_code && userStats.referral_gain !== undefined && (
            <tr>
              <td>Referral Gain :</td>
              <td>{userStats.referral_gain.toFixed(2)} SOL</td>
            </tr>
          )}
        </tbody>
      </table>
    );
  };

  return (
    <div className='sidebar'>
      <div className='tabs'>
        <button onClick={() => setActiveTab('volume')}>Volume</button>
        <button onClick={() => setActiveTab('gain')}>Gain</button>
        {user && <button onClick={() => setActiveTab('user')}>My Stats</button>}
      </div>
      <div className='contentside'>
        {activeTab === 'volume' && (
          <table>
            <thead>
              <tr>
                <th className='wallet-column'>Wallet</th>
                <th className='amount-column'>Volume (SOL)</th>
              </tr>
            </thead>
            <tbody>
              {data.volume.slice(0, 12).map((item, index) => (
                <tr key={index}>
                  <td className='wallet-column'>{item.wallet.slice(0, 7)}...</td>
                  <td className='amount-column'>{item.volume?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {activeTab === 'gain' && (
          <table>
            <thead>
              <tr>
                <th className='wallet-column'>Wallet</th>
                <th className='amount-column'>Gain (SOL)</th>
              </tr>
            </thead>
            <tbody>
              {data.gain.slice(0, 12).map((item, index) => (
                <tr key={index}>
                  <td className='wallet-column'>{item.wallet.slice(0, 7)}...</td>
                  <td className='amount-column'>{item.gain?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {activeTab === 'user' && user && renderUserStats()}
      </div>
    </div>
  );
};

export default React.memo(Sidebar);