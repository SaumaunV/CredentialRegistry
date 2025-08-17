import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

//    artifacts/contracts/CredentialRegistry.sol/CredentialRegistry.json
import CredentialRegistryABI from './contractsData/CredentialRegistry.json';
import CredentialRegistryAddress from './contractsData/CredentialRegistry-address.json';

export default function CredentialRegistryUI() {
  // State for web3 connection
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [network, setNetwork] = useState(null);
  const [notification, setNotification] = useState('');

  // State for UI
  const [activeTab, setActiveTab] = useState('issue');
  const [formData, setFormData] = useState({
    recipient: '',
    credentialType: '',
    metadataURI: '',
    credentialId: '',
    issuerAddress: '',
    ownerAddress: ''
  });

  // State for displaying data from the contract
  const [credentialDetails, setCredentialDetails] = useState(null);
  const [credentialsList, setCredentialsList] = useState([]);
  const [issuerStatus, setIssuerStatus] = useState('');

  // Set up a notification timeout
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(''), 5000); // Clear after 5 seconds
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
      
      setNotification(`Wallet connected: ${accounts[0].substring(0, 6)}... on Network ID: ${currentNetwork.chainId}`);

    } catch (error) {
      console.error("Wallet connection error:", error);
      setNotification(`Error: ${error.message}`);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  // --- Smart Contract Interaction Functions ---

  const handleIssueCredential = async () => {
    if (!contract) return setNotification('Please connect your wallet first.');
    setNotification('Issuing credential... Please wait for transaction confirmation.');
    try {
      const tx = await contract.issueCredential(formData.recipient, formData.credentialType, formData.metadataURI);
      await tx.wait(); // Wait for the transaction to be mined
      setNotification(`Success! Credential issued. Transaction hash: ${tx.hash}`);
      setFormData({ ...formData,  recipient: '', credentialType: '', metadataURI: '' }); // Clear form
    } catch (error) {
      console.error(error);
      setNotification(`Error: ${error?.reason || error.message}`);
    }
  };

  const handleRevokeCredential = async () => {
    if (!contract) return setNotification('Please connect your wallet first.');
    setNotification('Revoking credential... Please wait.');
    try {
      const tx = await contract.revokeCredential(formData.credentialId);
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
      // Convert BigInts from contract to strings for safe display
      const formattedCred = {
        metadataURI: cred.metadataURI,
        credentialType: cred.credentialType,
        issuedTo: cred.issuedTo,
        issuedBy: cred.issuedBy,
        issuedAt: new Date(Number(cred.issuedAt) * 1000).toLocaleString(), // Convert timestamp to readable date
        isValid: cred.isValid.toString(),
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
      // Convert BigInt array to string array
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
  
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: 'auto' }}>
      <h1 style={{ color: '#333', borderBottom: '2px solid #007bff', paddingBottom: '10px' }}>Credential Registry System</h1>
      
      {/* Navigation and Connection Status moved up for visibility */}
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e9ecef', borderRadius: '8px' }}>
        <h3 style={{ marginTop: '0' }}>Connection Status</h3>
        {account ? (
          <div>
            <p><strong>Status:</strong> <span style={{color: '#28a745'}}>Connected</span></p>
            <p><strong>Wallet:</strong> {account}</p>
            <p><strong>Network:</strong> {network ? `${network.name} (Chain ID: ${network.chainId})` : 'N/A'}</p>
          </div>
        ) : (
          <div>
            <p><strong>Status:</strong> <span style={{color: '#dc3545'}}>Disconnected</span></p>
            <button onClick={connectWallet} style={primaryButtonStyle}>Connect Wallet</button>
          </div>
        )}
      </div>

      {/* Notification Area */}
      {notification && (
        <div style={{ padding: '15px', marginBottom: '20px', borderRadius: '5px', backgroundColor: notification.startsWith('Error') ? '#f8d7da' : '#d4edda', color: notification.startsWith('Error') ? '#721c24' : '#155724', border: `1px solid ${notification.startsWith('Error') ? '#f5c6cb' : '#c3e6cb'}` }}>
          {notification}
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{ marginBottom: '20px' }}>
        {/* ... Tab buttons remain the same ... */}
        <button onClick={() => setActiveTab('issue')} style={{...primaryButtonStyle, marginRight: '5px', backgroundColor: activeTab === 'issue' ? '#007bff' : 'white', color: activeTab === 'issue' ? 'white' : '#007bff'}}>Issue</button>
        <button onClick={() => setActiveTab('revoke')} style={{...primaryButtonStyle, marginRight: '5px', backgroundColor: activeTab === 'revoke' ? '#007bff' : 'white', color: activeTab === 'revoke' ? 'white' : '#007bff'}}>Revoke</button>
        <button onClick={() => setActiveTab('view')} style={{...primaryButtonStyle, marginRight: '5px', backgroundColor: activeTab === 'view' ? '#007bff' : 'white', color: activeTab === 'view' ? 'white' : '#007bff'}}>View</button>
        <button onClick={() => setActiveTab('manage')} style={{...primaryButtonStyle, backgroundColor: activeTab === 'manage' ? '#007bff' : 'white', color: activeTab === 'manage' ? 'white' : '#007bff'}}>Manage Issuers</button>
      </div>

      <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '20px', backgroundColor: '#f9f9f9' }}>
        {/* Issue Credential Tab */}
        {activeTab === 'issue' && (
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

        {/* Revoke Credential Tab */}
        {activeTab === 'revoke' && (
		<div>
            <h2 style={{ color: '#dc3545', marginBottom: '20px' }}>Revoke Credential</h2>
            <div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>Credential ID:</label>
                <input type="number" name="credentialId" value={formData.credentialId} onChange={handleInputChange} placeholder="Enter credential ID to revoke" style={{ ...inputStyle, width: '200px' }} />
              </div>
              <button onClick={handleRevokeCredential} style={dangerButtonStyle}>Confirm Revoke</button>
            </div>
          </div>
	)}

        {/* View Credentials Tab */}
        {activeTab === 'view' && (
          <div>
            <h2 style={{ color: '#007bff', marginBottom: '20px' }}>View Credentials</h2>
            {/* Get by ID */}
            <div>
              <input name="credentialId" onChange={handleInputChange} placeholder="Enter ID" style={inputStyle} />
              <button onClick={handleGetCredentialById} style={primaryButtonStyle}>Get by ID</button>
            </div>
            {credentialDetails && (
              <div style={{ border: '2px solid #007bff', borderRadius: '8px', padding: '15px', marginTop: '15px' }}>
                  <p><strong>Metadata URI:</strong> {credentialDetails.metadataURI}</p>
                  <p><strong>Credential Type:</strong> {credentialDetails.credentialType}</p>
                  <p><strong>Issued To:</strong> {credentialDetails.issuedTo}</p>
                  <p><strong>Issued By:</strong> {credentialDetails.issuedBy}</p>
                  <p><strong>Issued At:</strong> {credentialDetails.issuedAt}</p>
                  <p><strong>Is Valid:</strong> {credentialDetails.isValid}</p>
              </div>
            )}
            <hr style={{ margin: '20px 0' }} />
            {/* Get by Owner */}
            <div>
              <input name="ownerAddress" onChange={handleInputChange} placeholder="Enter Owner Address" style={inputStyle} />
              <button onClick={handleGetCredentialsOf} style={primaryButtonStyle}>Get by Owner</button>
            </div>
            {credentialsList.length > 0 && (
              <ul style={{ listStyle: 'none', padding: '0', marginTop: '15px' }}>
                {credentialsList.map(id => <li key={id} style={{ padding: '8px', backgroundColor: '#f8f9fa', border: '1px solid #e9ecef' }}>Credential ID: {id}</li>)}
              </ul>
            )}
          </div>
        )}
        
        {/* Manage Issuers Tab */}
        {activeTab === 'manage' && (
          <div>
            <h2 style={{ marginBottom: '20px' }}>Manage Authorized Issuers</h2>
            {/* Add Issuer */}
            <div>
              <input name="issuerAddress" onChange={handleInputChange} placeholder="Enter Issuer Address" style={inputStyle} />
              <button onClick={handleAddIssuer} style={successButtonStyle}>Add Issuer</button>
            </div>
            <hr style={{ margin: '20px 0' }} />
            {/* Remove Issuer */}
            <div>
              <input name="issuerAddress" onChange={handleInputChange} placeholder="Enter Issuer Address" style={inputStyle} />
              <button onClick={handleRemoveIssuer} style={dangerButtonStyle}>Remove Issuer</button>
            </div>
            <hr style={{ margin: '20px 0' }} />
             {/* Check Issuer */}
            <div>
              <input name="issuerAddress" onChange={handleInputChange} placeholder="Enter Issuer Address" style={inputStyle} />
              <button onClick={handleCheckIssuer} style={primaryButtonStyle}>Check Status</button>
              {issuerStatus && <p style={{marginTop: '10px'}}><strong>Status:</strong> {issuerStatus}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
