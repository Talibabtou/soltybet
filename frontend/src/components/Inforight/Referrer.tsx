import React, { useState, useEffect, useContext } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { tokenManager, User } from '../../api';
import axios from 'axios';
import { UserContext } from '../../App';
import './Referrer.css';

interface ReferrerProps {
  user: User | null;
}

const Referrer: React.FC<ReferrerProps> = ({ user }: ReferrerProps) => {
  const { connected, publicKey } = useWallet();
	const { refreshUser } = useContext(UserContext);
  const [errorMessage, setErrorMessage] = useState('');
  const [referrerCode, setReferrerCode] = useState('');
  const [referrerMessage, setReferrerMessage] = useState<'idle' | 'success' | 'failure'>('idle');
  const [referrerSubmitted, setReferrerSubmitted] = useState(false);
  const hasReferrer = user?.ref_id != null;

  useEffect(() => {
    
    if (connected && publicKey && user) {
      setReferrerCode('');
      setReferrerMessage('idle');
      setReferrerSubmitted(false);
      setErrorMessage('');
    }
  }, [connected, publicKey, user?.ref_id]);

  const handleReferrerSubmit = async () => {
    if (!referrerCode.trim()) {
      setErrorMessage('Please enter a referrer code');
      setReferrerMessage('failure');
      setTimeout(() => setReferrerMessage('idle'), 5000);
      return;
    }
    if (!connected || !publicKey || !user) {
      console.error("Invalid state: not connected, no public key, or no user data");
      return;
    }

    try {
      const response = await tokenManager.putData<User>('/users/update_referrer/', {
        wallet: user.wallet,
        ref_code: referrerCode
      });

      if (response && response.ref_id) {
        setReferrerSubmitted(true);
        setReferrerMessage('success');
				await refreshUser();
      } else {
        throw new Error("Unexpected response from server");
      }

      setTimeout(() => setReferrerMessage('idle'), 5000);

    } catch (error: unknown) {
      console.error("Referrer submission failed:", error);
      if (axios.isAxiosError(error) && error.response) {
        console.error("Error response:", error.response.data);
        if (error.response.data.error === 'No User matches the given query.') {
          setErrorMessage('This referrer does not exist');
        } else {
          setErrorMessage(error.response.data.error || 'An unexpected error occurred');
        }
      } else if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('An unexpected error occurred');
      }
      setReferrerMessage('failure');
      setTimeout(() => setReferrerMessage('idle'), 5000);
    }
  };

  return (
    <div className="divRef">
      {connected && !hasReferrer && (
        <>
          {referrerSubmitted ? (
            <div className='AddReferrer'>
              <p>Referrer Added successfully, please refresh the page.</p>
            </div>
          ) : (
            <div className='AddReferrer'>
              <input
                className='InputRef'
                type="text"
                value={referrerCode}
                onChange={(e) => setReferrerCode(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                placeholder="Add Referrer"
                pattern="[a-zA-Z0-9]{1,20}"
                maxLength={20}
                title="Add a referrer, and enjoy less fees"
              />
              <button className='refbutton' onClick={handleReferrerSubmit}>Add Referrer</button>
            </div>
          )}
        </>
      )}

      {connected && hasReferrer && (
        <div className='AddedReferrer'>
          <p>You already have a referrer.</p>
        </div>
      )}

      {referrerMessage !== 'idle' && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          color: 'black',
          background: referrerMessage === 'success' ? '#6eff69' : '#ff6969',
          padding: '10px',
          borderRadius: '5px',
          zIndex: 1000,
          transition: 'opacity 0.3s ease-in-out',
          width: '250px',
        }}>
          {referrerMessage === 'success' ? "Referrer successfully added to your wallet" : errorMessage}
        </div>
      )}
    </div>
  );
};

export default Referrer;
