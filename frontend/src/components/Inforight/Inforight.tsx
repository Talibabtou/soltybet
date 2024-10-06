import React, { useContext } from 'react';
import { UserContext } from '../../App';
import './Inforight.css';
import Referral from './Referral';
import Referrer from './Referrer';

const Inforight: React.FC = () => {
  const { user } = useContext(UserContext);
  return (
    <div className="Inforight">
      <Referral user={user} />
      <Referrer user={user} />
      
    </div>
  )
};

export default Inforight;