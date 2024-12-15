import React, { useState, useEffect, useContext } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, Transaction, SystemProgram, clusterApiUrl, ComputeBudgetProgram } from '@solana/web3.js';
import { tokenManager } from '../../api';
import { UserContext } from '../../App';
import './Referral.css';

const RPC_URL = import.meta.env.VITE_REACT_APP_RPC_URL;

//LOG DE TEST A ENLEVER
console.log('RPC URL:', import.meta.env.VITE_REACT_APP_RPC_URL);

const Referral: React.FC = () => {
  const { user, refreshUser } = useContext(UserContext);
  const { connected, publicKey, signTransaction } = useWallet();
  const [amountInLamports, setAmountInLamports] = useState<number>(0);
  const [referralName, setReferralName] = useState('');
  const [transactionStatus, setTransactionStatus] = useState<'idle' | 'success' | 'failure'>('idle');
  const [hasReferral, setHasReferral] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showTick, setShowTick] = useState(false);
  const [referralSubmitted, setReferralSubmitted] = useState(false);

  useEffect(() => {
    if (connected && publicKey) {
      setAmountInLamports(0.1 * 1e9);
    }
  }, [connected, publicKey, refreshUser]);

  useEffect(() => {
    if (user && user.ref_code) {
      setHasReferral(true);
    } else {
      setHasReferral(false);
    }
    setReferralSubmitted(false);
  }, [user]);

  const copyToClipboard = (text: string | null | undefined) => {
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        setShowTick(true);
        setTimeout(() => setShowTick(false), 2000);
      }, (err) => {
        console.error("Error copying to clipboard.");
      });
    } else {
      console.error("Cannot copy empty text to clipboard");
    }
  };

  const getPriorityFeeEstimate = async (connection: Connection) => {
    try {
      const recentPriorityFees = await connection.getRecentPrioritizationFees();
      if (!recentPriorityFees.length) {
        
        return 10000;
      }
      
      const medianPriorityFee = recentPriorityFees.reduce(
        (a, b) => a + b.prioritizationFee, 
        0
      ) / recentPriorityFees.length;
      
      const priorityFee = Math.ceil(medianPriorityFee * 1.05);
      
      return priorityFee;
    } catch (error) {
      console.error('Erreur lors de l\'estimation des frais:', error);
      return 10000;
    }
  };

  const handleSubmit = async () => {
    if (!referralName.trim()) {
      setErrorMessage('Please enter a referral code');
      setTransactionStatus('failure');
      setTimeout(() => setTransactionStatus('idle'), 5000);
      return;
    }
    if (!connected || !signTransaction || !publicKey || !user) {
      console.error("Invalid state: not connected, no signTransaction function, no public key, or no user data");
      setErrorMessage('Please connect your wallet and try again');
      setTransactionStatus('failure');
      setTimeout(() => setTransactionStatus('idle'), 5000);
      return;
    }

    try {
      const checkData = await tokenManager.getData<{ exists: boolean }>('/users/check_ref_code/', { ref_code: referralName });
      if (checkData.exists) {
        setErrorMessage('This referral code has already been created, please try another one');
        setTransactionStatus('failure');
        setTimeout(() => setTransactionStatus('idle'), 5000);
        return;
      }

      const connection = new Connection(RPC_URL!, {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000
      });
      const balance = await connection.getBalance(publicKey);

      if (balance < amountInLamports) {
        setErrorMessage('Insufficient balance to complete the transaction');
        setTransactionStatus('failure');
        setTimeout(() => setTransactionStatus('idle'), 5000);
        return;
      }

      const recipientPublicKey = new PublicKey("BNqToVas8sJDyHXY7ehyMQNK9pPpdbFq7yrzAj58BEPc");
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();


      const transaction = new Transaction({
        feePayer: publicKey,
        blockhash: blockhash,
        lastValidBlockHeight: lastValidBlockHeight,
      }).add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipientPublicKey,
          lamports: amountInLamports,
        })
      );
  
      // Ajoutez les priority fees
      const priorityFee = await getPriorityFeeEstimate(connection);
      const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: priorityFee
      });
      transaction.instructions.unshift(priorityFeeIx);
  
      const signedTransaction = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());
  
      const confirmation = await connection.confirmTransaction({
        blockhash: blockhash,
        lastValidBlockHeight: lastValidBlockHeight,
        signature: signature
      });

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }
      setTransactionStatus('success');

      const response = await tokenManager.putData<{ ref_code: string }>(`users/${user.u_id}/update_ref_code/`, {
        ref_code: referralName
      });

      if (response.ref_code) {
        setHasReferral(true);
        setReferralSubmitted(true);
        setTransactionStatus('success');
        await refreshUser();
      } else {
        throw new Error("Unexpected response from server");
      }

      setTimeout(() => setTransactionStatus('idle'), 5000);

    } catch (error: unknown) {
      console.error("Transaction or referral submission failed.");
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else if (typeof error === 'object' && error !== null && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: string } } };
        setErrorMessage(axiosError.response?.data?.error || 'An unexpected error occurred');
      } else {
        setErrorMessage('An unexpected error occurred');
      }
      setTransactionStatus('failure');
      setTimeout(() => setTransactionStatus('idle'), 5000);
    }
  };

  return (
    <div className="divRef">
      {connected && !hasReferral && (
        <>
          {referralSubmitted ? (
            <div className='createReferral'>
              <p>Referral data submitted successfully</p>
            </div>
          ) : (
            <div className='createReferral'>
              <input
                className='InputRef'
                type="text"
                value={referralName}
                onChange={(e) => setReferralName(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                placeholder="Create Referral"
                pattern="[a-zA-Z0-9]{1,20}"
                maxLength={20}
                title="Create Referral code cost 0.1 SOL, Referral code should only contain letters and numbers, up to 20 characters."
              />
              <button className='refbutton' onClick={handleSubmit}>Create Referral</button>
            </div>
          )}
        </>
      )}

      {connected && hasReferral && (
        <>
          {referralSubmitted ? (
            <div className='createReferral'>
              <p>Referral Created successfully.</p>
            </div>
          ) : (user && user.ref_code && (
            <div className='addedReferral'>
              <p>Your referral to share : <strong>{user.ref_code}</strong></p>
              <div className='copyButtonContainer'>
                <button className='copyButton' onClick={() => copyToClipboard(user.ref_code)}>
                  <i className="fas fa-copy"></i>
                </button>
                {showTick && <span className="tick">✔</span>}
              </div>
            </div>
          ))}
        </>
      )}

      {transactionStatus !== 'idle' && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          color: 'black',
          background: transactionStatus === 'success' ? '#6eff69' : '#ff6969',
          padding: '10px',
          borderRadius: '5px',
          zIndex: 1000,
          transition: 'opacity 0.3s ease-in-out',
          width: '250px',
        }}>
          {transactionStatus === 'success' ? `You can now share your referral code` : errorMessage}
        </div>
      )}

      <div className='Revbox'>
        {/* additional content can be added here */}
      </div>
    </div>
  );
};

export default Referral;