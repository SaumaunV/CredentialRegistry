import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

import CredentialRegistryABI from './contractsData/CredentialRegistry.json';
import CredentialRegistryAddress from './contractsData/CredentialRegistry-address.json';

export default function CredentialRegistryUI() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [network, setNetwork] = useState(null);
  const [notification, setNotification] = useState('');

  const [isOwner, setIsOwner] = useState(false);
  const [isIssuer, setIsIssuer] = useState(false);

  const [activeTab, setActiveTab] = useState('view');
  const [formData, setFormData] = useState({
    recipient: '',
    credentialType: '',
    metadataURI: '',
    credentialId: '',
    revocationReason: '',
    issuerAddress: '',
    ownerAddress: ''
  });

  const [credentialDetails, setCredentialDetails] = useState(null);
  const [credentialsList, setCredentialsList] = useState([]);
  const [issuerStatus, setIssuerStatus] = useState('');
  
  useEffect(() => {
    if (activeTab === 'manage' && !isOwner) {
      setActiveTab('view');
    }
    if ((activeTab === 'issue' || activeTab === 'revoke') && !isIssuer) {
      setActiveTab('view');
    }
  }, [isOwner, isIssuer, activeTab]);


  // useEffect hook to handle account and network changes from MetaMask
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) {
          connectWallet(); 
          setNotification('Wallet account switched.');
        } else {
          setAccount(null);
          setSigner(null);
          setContract(null);
          setIsOwner(false);
          setIsIssuer(false);
          setNotification('Wallet disconnected.');
        }
      };
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', () => window.location.reload());
    }
    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);

  // Set up a notification timeout
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      setNotification('Error: MetaMask is not installed.');
      return;
    }

    try {
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      setProvider(web3Provider);
      const accounts = await web3Provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]);
      const web3Signer = await web3Provider.getSigner();
      setSigner(web3Signer);
      const currentNetwork = await web3Provider.getNetwork();
      setNetwork(currentNetwork);
      const registryContract = new ethers.Contract(CredentialRegistryAddress.address, CredentialRegistryABI.abi, web3Signer);
      setContract(registryContract);
      
      const contractOwner = await registryContract.owner();
      const issuerStatus = await registryContract.authorizedIssuers(accounts[0]);
      
      const connectedAccount = accounts[0].toLowerCase();
      setIsOwner(connectedAccount === contractOwner.toLowerCase());
      setIsIssuer(issuerStatus);
      
      setNotification(`Wallet connected: ${accounts[0].substring(0, 6)}...`);

    } catch (error) {
      console.error("Wallet connection error:", error);
      setNotification(`Error: ${error.message}`);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  //Smart Contract Interaction Functions
  const handleIssueCredential = async () => {
    if (!contract) return setNotification('Please connect your wallet first.');
    setNotification('Issuing credential... Please wait for transaction confirmation.');
    try {
      const tx = await contract.issueCredential(formData.recipient, formData.credentialType, formData.metadataURI);
      await tx.wait();
      setNotification(`Success! Credential issued. Transaction hash: ${tx.hash}`);
      setFormData({ ...formData,  recipient: '', credentialType: '', metadataURI: '' });
    } catch (error) {
      console.error(error);
      setNotification(`Error: ${error?.reason || error.message}`);
    }
  };

  const handleRevokeCredential = async () => {
    if (!contract || !formData.credentialId || !formData.revocationReason ) return setNotification('Error: Please provide a Credential ID and a reason.');
    setNotification('Revoking credential... Please wait.');
    try {
      const tx = await contract.revokeCredential(formData.credentialId, formData.revocationReason);
      await tx.wait();
      setNotification(`Success! Credential ${formData.credentialId} revoked.`);
    } catch (error) {
      console.error(error);
      setNotification(`Error: ${error?.reason || error.message}`);
    }
  };
  
  const handleGetCredentialById = async () => {
    if (!contract) return setNotification('Please connect your wallet first.');
    setNotification('');
    setCredentialDetails(null);
    try {
      const cred = await contract.getCredentialById(formData.credentialId);
      
      const statusMap = ['Valid', 'Revoked'];

      const formattedCred = {
        metadataURI: cred.metadataURI,
        credentialType: cred.credentialType,
        issuedTo: cred.issuedTo,
        issuedBy: cred.issuedBy,
        issuedAt: new Date(Number(cred.issuedAt) * 1000).toLocaleString(),
	status: statusMap[Number(cred.status)],
        revocationReason: cred.revocationReason,
      };
      setCredentialDetails(formattedCred);
    } catch (error) {
      console.error(error);
      setNotification(`Error: ${error?.reason || error.message}`);
    }
  };

  const handleGetCredentialsOf = async () => {
    if (!contract) return setNotification('Please connect your wallet first.');
    setNotification('');
    setCredentialsList([]);
    try {
      const ids = await contract.getCredentialsOf(formData.ownerAddress);
      const idStrings = ids.map(id => id.toString());
      setCredentialsList(idStrings);
    } catch (error) {
      console.error(error);
      setNotification(`Error: ${error?.reason || error.message}`);
    }
  };

  const handleAddIssuer = async () => {
    if (!contract) return setNotification('Please connect your wallet first.');
    setNotification('Adding issuer... Please wait.');
    try {
      const tx = await contract.addIssuer(formData.issuerAddress);
      await tx.wait();
      setNotification(`Success! Issuer ${formData.issuerAddress} added.`);
    } catch (error) {
      console.error(error);
      setNotification(`Error: ${error?.reason || error.message}`);
    }
  };

  const handleRemoveIssuer = async () => {
    if (!contract) return setNotification('Please connect your wallet first.');
    setNotification('Removing issuer... Please wait.');
    try {
      const tx = await contract.removeIssuer(formData.issuerAddress);
      await tx.wait();
      setNotification(`Success! Issuer ${formData.issuerAddress} removed.`);
    } catch (error) {
      console.error(error);
      setNotification(`Error: ${error?.reason || error.message}`);
    }
  };

  const handleCheckIssuer = async () => {
    if (!contract) return setNotification('Please connect your wallet first.');
    setNotification('');
    try {
      const isAuthorized = await contract.authorizedIssuers(formData.issuerAddress);
      setIssuerStatus(isAuthorized ? 'Authorized' : 'Not Authorized');
    } catch (error) {
      console.error(error);
      setNotification(`Error: ${error?.reason || error.message}`);
    }
  };

  const inputStyle = { padding: '10px', border: '2px solid #ddd', borderRadius: '5px', fontSize: '14px' };
  const buttonStyle = { padding: '12px 24px', border: 'none', borderRadius: '5px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' };
  const primaryButtonStyle = { ...buttonStyle, backgroundColor: '#007bff', color: 'white' };
  const successButtonStyle = { ...buttonStyle, backgroundColor: '#28a745', color: 'white' };
  const dangerButtonStyle = { ...buttonStyle, backgroundColor: '#dc3545', color: 'white' };
  const tabButtonStyle = (tabName) => ({
    marginRight: '5px', padding: '10px 15px', border: '2px solid #007bff',
    backgroundColor: activeTab === tabName ? '#007bff' : 'white',
    color: activeTab === tabName ? 'white' : '#007bff',
    borderRadius: '5px', cursor: 'pointer'
  });
  
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: 'auto' }}>
      <h1 style={{ color: '#333', borderBottom: '2px solid #007bff', paddingBottom: '10px' }}>Credential Registry System</h1>
      
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e9ecef', borderRadius: '8px' }}>
        <h3 style={{ marginTop: '0' }}>Connection Status</h3>
        {account ? (
          <div>
            <p><strong>Status:</strong> <span style={{color: '#28a745'}}>Connected</span></p>
            <p><strong>Wallet:</strong> {account}</p>
            <p><strong>Your Role:</strong> 
              {isOwner ? ' Contract Owner' : ''}
              {isIssuer ? (isOwner ? ', Issuer' : ' Issuer') : ''}
              {!isOwner && !isIssuer ? 'User' : ''}
            </p>
          </div>
        ) : (
          <div>
            <p><strong>Status:</strong> <span style={{color: '#dc3545'}}>Disconnected</span></p>
            <button onClick={connectWallet} style={primaryButtonStyle}>Connect Wallet</button>
          </div>
        )}
      </div>

      {notification && (
        <div style={{ padding: '15px', marginBottom: '20px', borderRadius: '5px', backgroundColor: notification.startsWith('Error') ? '#f8d7da' : '#d4edda', color: notification.startsWith('Error') ? '#721c24' : '#155724', border: `1px solid ${notification.startsWith('Error') ? '#f5c6cb' : '#c3e6cb'}` }}>
          {notification}
        </div>
      )}

      {account && (
        <div style={{ marginBottom: '20px' }}>
          {isIssuer && (
            <>
              <button onClick={() => setActiveTab('issue')} style={tabButtonStyle('issue')}>Issue Credential</button>
              <button onClick={() => setActiveTab('revoke')} style={tabButtonStyle('revoke')}>Revoke Credential</button>
            </>
          )}

          <button onClick={() => setActiveTab('view')} style={tabButtonStyle('view')}>View Credentials</button>

          {isOwner && (
            <button onClick={() => setActiveTab('manage')} style={tabButtonStyle('manage')}>Manage Issuers</button>
          )}
        </div>
      )}

      <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '20px', backgroundColor: '#f9f9f9' }}>
        {activeTab === 'issue' && isIssuer && (
		      <div>
            <h2 style={{ color: '#28a745', marginBottom: '20px' }}>Issue New Credential</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>Recipient Address:</label>
                <input type="text" name="recipient" value={formData.recipient} onChange={handleInputChange} placeholder="0x..." style={{ ...inputStyle, width: '95%' }} />
              </div>
              <div>
                <label style={{ fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>Credential Type:</label>
                <input type="text" name="credentialType" value={formData.credentialType} onChange={handleInputChange} placeholder="e.g., University Degree" style={{ ...inputStyle, width: '95%' }} />
              </div>
              <div>
                <label style={{ fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>Metadata URI:</label>
                <input type="text" name="metadataURI" value={formData.metadataURI} onChange={handleInputChange} placeholder="ipfs://..." style={{ ...inputStyle, width: '95%' }} />
              </div>
              <div style={{marginTop: '10px'}}>
                <button onClick={handleIssueCredential} style={successButtonStyle}>Issue Credential</button>
              </div>
            </div>
          </div>
         )}
        {activeTab === 'revoke' && isIssuer && (
		      <div>
            <h2 style={{ color: '#dc3545', marginBottom: '20px' }}>Revoke Credential</h2>
            <div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>Credential ID:</label>
                <input type="number" name="credentialId" value={formData.credentialId} onChange={handleInputChange} placeholder="Enter credential ID to revoke" style={{ ...inputStyle, width: '200px' }} />
              </div>
		<div>
                <label style={{ fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>Reason for Revocation:</label>
                <input type="text" name="revocationReason" value={formData.revocationReason} onChange={handleInputChange} placeholder="e.g., Credential expired" style={{ ...inputStyle, width: '95%' }} />
              </div>
	      <div style={{ marginTop: '10px' }}>
                <button onClick={handleRevokeCredential} style={dangerButtonStyle}>Confirm Revoke</button>
              </div>
            </div>
          </div>
	      )}
        {activeTab === 'view' && (
          <div>
            <h2 style={{ color: '#007bff', marginBottom: '20px' }}>View Credentials</h2>
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ color: '#495057' }}>Get Credential by ID</h3>
              <div style={{ display: 'flex', alignItems: 'end', gap: '10px' }}>
                <div>
                  <label style={{ fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>Credential ID:</label>
                  <input type="number" name="credentialId" value={formData.credentialId} onChange={handleInputChange} placeholder="Enter ID" style={{ ...inputStyle, width: '200px' }} />
                </div>
                <button onClick={handleGetCredentialById} style={primaryButtonStyle}>Get Credential</button>
              </div>
            </div>
            {credentialDetails && (
              <div style={{ border: '2px solid #007bff', borderRadius: '8px', padding: '15px', backgroundColor: 'white', marginBottom: '30px' }}>
                  <p><strong>Metadata URI:</strong> {credentialDetails.metadataURI}</p>
                  <p><strong>Credential Type:</strong> {credentialDetails.credentialType}</p>
                  <p><strong>Issued To:</strong> {credentialDetails.issuedTo}</p>
                  <p><strong>Issued By:</strong> {credentialDetails.issuedBy}</p>
                  <p><strong>Issued At:</strong> {credentialDetails.issuedAt}</p>
                  <p><strong>Status:</strong> 
                    <span style={{ fontWeight: 'bold', color: credentialDetails.status === 'Valid' ? '#28a745' : '#dc3545' }}>
                      {' '}{credentialDetails.status}
                    </span>
                  </p>
		  {credentialDetails.status === 'Revoked' && (
                    <p><strong>Revocation Reason:</strong> {credentialDetails.revocationReason}</p>
                  )}
	       </div>
            )}
            <hr style={{ borderTop: '1px solid #ddd', margin: '20px 0' }} />
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ color: '#495057' }}>Get Credentials by Owner</h3>
              <div style={{ display: 'flex', alignItems: 'end', gap: '10px' }}>
                <div>
                  <label style={{ fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>Owner Address:</label>
                  <input type="text" name="ownerAddress" value={formData.ownerAddress} onChange={handleInputChange} placeholder="0x..." style={{ ...inputStyle, width: '400px' }} />
                </div>
                <button onClick={handleGetCredentialsOf} style={primaryButtonStyle}>Get Credentials</button>
              </div>
            </div>
            {credentialsList.length > 0 && (
              <div>
                <h3 style={{ color: '#495057' }}>Credentials List for Owner</h3>
                <div style={{ border: '2px solid #007bff', borderRadius: '8px', padding: '15px', backgroundColor: 'white' }}>
                  <ul style={{ listStyle: 'none', padding: '0', margin: '0' }}>
                    {credentialsList.map(id => <li key={id} style={{ padding: '8px', backgroundColor: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '3px', marginBottom: '5px' }}>{id}</li>)}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab === 'manage' && isOwner && (
          <div>
            <h2 style={{ marginBottom: '20px' }}>Manage Authorized Issuers</h2>
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ color: '#28a745' }}>Add Authorized Issuer</h3>
              <div style={{ display: 'flex', alignItems: 'end', gap: '10px' }}>
                <div>
                  <label style={{ fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>Issuer Address:</label>
                  <input type="text" name="issuerAddress" onChange={handleInputChange} placeholder="0x..." style={{ ...inputStyle, width: '400px' }}/>
                </div>
                <button onClick={handleAddIssuer} style={successButtonStyle}>Add Issuer</button>
              </div>
            </div>
            <hr style={{ borderTop: '1px solid #ddd', margin: '20px 0' }} />
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ color: '#dc3545' }}>Remove Authorized Issuer</h3>
              <div style={{ display: 'flex', alignItems: 'end', gap: '10px' }}>
                <div>
                  <label style={{ fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>Issuer Address:</label>
                  <input type="text" name="issuerAddress" onChange={handleInputChange} placeholder="0x..." style={{ ...inputStyle, width: '400px' }}/>
                </div>
                <button onClick={handleRemoveIssuer} style={dangerButtonStyle}>Remove Issuer</button>
              </div>
            </div>
            <hr style={{ borderTop: '1px solid #ddd', margin: '20px 0' }} />
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ color: '#495057' }}>Check Issuer Authorization</h3>
              <div style={{ display: 'flex', alignItems: 'end', gap: '10px', marginBottom: '15px' }}>
                <div>
                  <label style={{ fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>Issuer Address:</label>
                  <input type="text" name="issuerAddress"onChange={handleInputChange} placeholder="0x..." style={{ ...inputStyle, width: '400px' }}/>
                </div>
                <button onClick={handleCheckIssuer} style={primaryButtonStyle}>Check Status</button>
              </div>
              {issuerStatus && (
                <div style={{ padding: '15px', border: '2px solid #007bff', borderRadius: '8px', backgroundColor: 'white' }}>
                  <p style={{ margin: '0' }}><strong>Authorization Status:</strong> <span style={{ color: '#6c757d' }}>{issuerStatus}</span></p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
