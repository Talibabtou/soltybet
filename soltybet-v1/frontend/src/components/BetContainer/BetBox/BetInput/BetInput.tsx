import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useBet } from '../../../BetProvider';

const BetInput = () => {
 const { betData, setBetData } = useBet();

 const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
 };
 
 const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;
    if (inputValue === '') {
        setBetData(prevData => ({ ...prevData, inputValue }));
        return;
    }
    if (inputValue.startsWith(',') || inputValue.startsWith('.')) {
        if (!inputValue.startsWith('0.')) {
          inputValue = '0' + inputValue;
        }
    }
    const regex = /^\d*[.,]?\d{0,2}$/;
    if (!regex.test(inputValue)) {
        return;
    }
    const floatValue = parseFloat(inputValue.replace(',', '.'));
    if (floatValue >= 0 && floatValue <= 100) {
      setBetData(prevData => {
          const updatedData = { ...prevData, inputValue };
          
          return updatedData;
      });
      
    }
 };

 const { connected } = useWallet();
 const placeholderClass = connected ? 'placeholder-connected' : 'placeholder-disconnected';

 return (
    <div className='inputbet'>
      <input 
        type="text"
        disabled={!connected}
        placeholder={connected ? "Enter Amount" : " "}
        value={betData.inputValue}
        onPaste={handlePaste}
        onChange={handleInputChange}
        min={0.05}
        max={100}
        step={0.01}
        className={placeholderClass}
        title="You can bet Between 0.01 to 100 SOL"
      />
    </div>
 );
};

export default BetInput;