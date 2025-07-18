import React, { useContext, useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PhaseContext } from '../../../PhaseContext';
import { useTransaction } from '../../../TxContext';
import { Connection, PublicKey, Transaction, SystemProgram, TransactionInstruction, clusterApiUrl, ComputeBudgetProgram } from '@solana/web3.js';
import { useBet } from '../../../BetProvider';
import { UserContext } from '../../../../App';
import { tokenManager, Bet } from '../../../../api';
import { snakeCase } from "snake-case";
import { sha256 } from "@noble/hashes/sha256";
import { Buffer } from 'buffer';
import { useMatch } from '../../../MatchContext';
import axios from 'axios';
import { useUserBet } from '../../../UserBetContext';

const MAX_FIGHTER_NAME_LENGTH = 15;

const RPC_URL = import.meta.env.VITE_REACT_APP_RPC_URL;



function sighash(nameSpace: string, ixName: string): Buffer {
  const name = snakeCase(ixName);
  const preimage = `${nameSpace}:${name}`;
  return Buffer.from(sha256(preimage)).slice(0, 8);
}

const formatFighterName = (name: string | null): string => {
    if (!name) return '';
    const formattedName = name.replace(/_/g, ' ').toUpperCase();
    if (formattedName.length <= MAX_FIGHTER_NAME_LENGTH) {
        return formattedName;
    }
    return `${formattedName.substring(0, MAX_FIGHTER_NAME_LENGTH)}...`;
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
    
    const priorityFee = Math.ceil(medianPriorityFee * 1.05); // 5% de plus pour être sûr
    
    return priorityFee;
  } catch (error) {
    
    return 10000; 
  }
};


const BetButtons = () => {
  const { 
    setTransactionStatus, 
    setErrorMessage, 
    setPendingBetId 
  } = useTransaction();
  const { publicKey, signTransaction, connected } = useWallet();
  const { redFighter, blueFighter, phase } = useContext(PhaseContext);
  const { betData } = useBet();
  const { user, refreshUser } = useContext(UserContext);
  const { latestMatch } = useMatch();
  const buttonClassBlue = connected ? 'ButtonBlue' : 'ButtonBlue-disabled';
  const buttonClassRed = connected ? 'ButtonRed' : 'ButtonRed-disabled';
  const [clickedButton, setClickedButton] = useState<string | null>(null);
  const { userHasBet, setUserHasBet } = useUserBet();

  useEffect(() => {
  }, [userHasBet]);

  const placeBetOnBackend = async (betData: Partial<Bet>): Promise<Bet> => {
    try {
      const { u_id, m_id, team } = betData;
      const response = await tokenManager.postData<Bet>('/bets/place_bet/', { u_id, m_id, team });
      return response;
    } catch (error) {
      console.error('Error processing bet.');
      throw error;
    }
  };

  const confirmBetOnBackend = async (b_id: string, tx_in: string, volume: number): Promise<boolean> => {
    
    try {
      const response = await tokenManager.putData<Bet>('/bets/confirm_bet/', { b_id, tx_in, volume });
      console.log('Bet confirmation response:', response);
      return true;
    } catch (error) {
      console.error('Error confirming bet');
      return false;
    }
  };

  const cancelBetOnBackend = async (b_id: string) => {
    
    try {
      const response = await tokenManager.deleteData(`/bets/cancel_bet/?b_id=${b_id}`);
      
      return response;
    } catch (error) {
      console.error('Error canceling bet.');
      throw error;
    }
  };

  const handleBet = async (color: 'red' | 'blue') => {
    if (!connected || !signTransaction || !publicKey || !latestMatch) {
      setErrorMessage('Disconnect wallet and try again');
      setTransactionStatus('failure');
      return;
    }
    let betResponse: Bet | null = null;
    try {
      const connection = new Connection(RPC_URL!, {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000
      });
      const betAmount = parseFloat(betData.inputValue.replace(',', '.'));
      const amountInLamports = Math.floor(betAmount * 1e9);
      if (isNaN(amountInLamports) || amountInLamports <= 0) {
        setErrorMessage('Invalid amount');
        setTransactionStatus('failure');
        return;
      }
      const fighterName = color === 'blue' ? blueFighter : redFighter;
      let referrerWallet = null;
      if (user?.ref_id) {
        try {
          const referrerData = await tokenManager.getData<{ wallet: string }>(`/users/get_referrer_wallet/?ref_id=${user.ref_id}`);
          referrerWallet = referrerData.wallet;
        } catch (error) {
          console.error("Error trying to get referrer wallet.");
        }
      }
      
      betResponse = await placeBetOnBackend({
        u_id: user?.u_id,
        m_id: latestMatch.m_id,
        team: color,
        volume: betAmount
      });
      
      if (!betResponse || !betResponse.b_id) {
        throw new Error('Failed to create bet: Invalid response from server');
      }
      setPendingBetId(betResponse.b_id);
      setTransactionStatus('pending');
      const messageData = {
        color: color,
        fighterName: fighterName,
        referrerWallet: referrerWallet,
        b_id: betResponse.b_id
      };
      const message = JSON.stringify(messageData);
      const memoProgram = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
      const memoInstruction = new TransactionInstruction({
        keys: [{ pubkey: publicKey, isSigner: true, isWritable: true }],
        programId: memoProgram,
        data: Buffer.from(message, 'utf-8'),
      });
      const recipientPublicKey = new PublicKey("CUGCP8gmfmY9wk99JHVyY8HBusub5EhDFxib8G6qxku");
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      const programId = new PublicKey("5awMTFDmJv3EXEPstpJKD6fJ6FrLfcBw5Ek5CeutvKcM");
      const [gatePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("deposit_gate")],
        programId
      );
      const ixDiscriminator = sighash('global', 'check_gate');
      const checkGateIx = new TransactionInstruction({
        programId: programId,
        keys: [
          { pubkey: gatePDA, isSigner: false, isWritable: false },
        ],
        data: Buffer.concat([ixDiscriminator, Buffer.alloc(0)])
      });
      const transaction = new Transaction({
        feePayer: publicKey,
        blockhash: blockhash,
        lastValidBlockHeight: lastValidBlockHeight,
      })
      .add(checkGateIx)
      .add(memoInstruction)
      .add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipientPublicKey,
          lamports: amountInLamports,
        })
      );
      
      // Priority fee
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
        throw new Error(`the transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }
  
    
      let confirmationSuccess = false;
      let retries = 3;
  
      while (!confirmationSuccess && retries > 0) {
        
        confirmationSuccess = await confirmBetOnBackend(betResponse.b_id, signature, betAmount);
        if (!confirmationSuccess) {
          
          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
  
      if (confirmationSuccess) {
        console.log('Bet successfully confirmed on backend');
        setTransactionStatus('success');
        setPendingBetId(null);
        setUserHasBet(true);
      } else {
        throw new Error('Failed to confirm bet on backend after multiple attempts');
      }
  
    } catch (error) {
      console.error("Transaction failed.");
      let errorMessage = "Unknown error occurred";
      if (error instanceof Error) {
        const errorString = error.toString();
        if (errorString.includes("0x1") && errorString.includes("insufficient lamports")) {
          errorMessage = "Not enough SOL";
        } else if (errorString.includes("0x1770") && errorString.includes("GateClosed")) {
          errorMessage = "Betting is currently closed. Please try again, once the bets are open.";
        } else if (errorString.includes("User rejected")) {
          errorMessage = "Transaction was rejected by the user.";
        } else if (errorString.includes("Failed to confirm bet on backend")) {
          errorMessage = "Bet was placed on-chain but failed to register in our system. Please contact support.";
        } else {
          errorMessage = "Transaction failed. Please try again.";
        }
      } else if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error("Server error occurred.");
          errorMessage = "Server error: Please try again later.";
        } else if (error.request) {
          console.error("No response from server.");
          errorMessage = "No response from server. Please check your internet connection.";
        } else {
          console.error("Network error occurred.");
          errorMessage = "Network error: Please try again.";
        }
      }
      console.error("Detailed error:", errorMessage);
      setErrorMessage(errorMessage);
      setTransactionStatus('failure');
      if (betResponse && betResponse.b_id) {
        try {
          await cancelBetOnBackend(betResponse.b_id);
        } catch (cancelError) {
          console.error("Failed to cancel bet on backend.");
        }
      }
      setPendingBetId(null);
    }
    setClickedButton(color);
    setTimeout(() => setClickedButton(null), 300);
    await refreshUser();
  };
  return (
    <div className="buttons-container">
      <div className='redbox'>
        <button 
          className={`${buttonClassRed} ${clickedButton === 'ButtonRed' ? 'clicked' : ''}`} 
          disabled={!connected} 
          onClick={() => handleBet('red')}
        >
          RED
        </button>
        <div className="dynred">{formatFighterName(redFighter)}</div>
      </div>
      
      <div className='bluebox'>
        <button 
          className={`${buttonClassBlue} ${clickedButton === 'ButtonBlue' ? 'clicked' : ''}`} 
          disabled={!connected} 
          onClick={() => handleBet('blue')}
        >
          BLUE
        </button>
        <div className="dynblue">{formatFighterName(blueFighter)}</div>
      </div>
    </div>
  );
};

export default React.memo(BetButtons);
