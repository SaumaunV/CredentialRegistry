pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract CredentialRegistry is Ownable {
    
    uint256 private _credentialIdCounter;
    
    // --- Structs ---
    struct Credential {
        string metadataURI; // Link to off-chain credential details (e.g., on IPFS)
        string credentialType;
        address issuedTo;
        address issuedBy;
        uint256 issuedAt;
        bool isValid;
    }

    // --- Mappings ---
    // Mapping from a unique credential ID to the Credential struct. [1, 4]
    mapping(uint256 => Credential) public credentials;

    // Mapping to track all credential IDs issued to a specific wallet address.
    mapping(address => uint256[]) public credentialsOfOwner;

    // Mapping of authorized issuer addresses.
    mapping(address => bool) public authorizedIssuers;

    // --- Events ---
    event CredentialIssued(
        uint256 indexed credentialId,
        address indexed issuer,
        address indexed recipient,
        string credentialType
    );

    event CredentialRevoked(uint256 indexed credentialId, address indexed revoker);

    event IssuerAdded(address indexed issuer);
    event IssuerRemoved(address indexed issuer);

    // --- Modifiers ---
    modifier onlyIssuer() {
        require(authorizedIssuers[msg.sender], "Caller is not an authorized issuer");
        _;
    }

    // --- Constructor ---
    constructor(address initialOwner) Ownable(initialOwner) {
        _credentialIdCounter = 1; // Start IDs from 1
    }

    // --- Issuer Management Functions ---
    function addIssuer(address issuer) external onlyOwner {
        authorizedIssuers[issuer] = true;
	emit IssuerAdded(issuer);
    }

    function removeIssuer(address issuer) external onlyOwner {
        authorizedIssuers[issuer] = false;
	emit IssuerRemoved(issuer);
    }

    // --- Core Functions ---
    function issueCredential(
        address recipient,
        string memory credentialType,
        string memory metadataURI
    ) external onlyIssuer returns (uint256) {
        uint256 newCredentialId = _credentialIdCounter;

        credentials[newCredentialId] = Credential({
            metadataURI: metadataURI,
            credentialType: credentialType,
            issuedTo: recipient,
            issuedBy: msg.sender,
            issuedAt: block.timestamp,
            isValid: true
        });

        // Associate the new credential ID with the recipient's wallet address
        credentialsOfOwner[recipient].push(newCredentialId);

        _credentialIdCounter++;

        emit CredentialIssued(
            newCredentialId,
            msg.sender,
            recipient,
            credentialType
        );

        return newCredentialId;
    }

    function revokeCredential(uint256 credentialId) external onlyIssuer {
        require(credentials[credentialId].issuedAt != 0, "Credential does not exist.");
        credentials[credentialId].isValid = false;
        emit CredentialRevoked(credentialId, msg.sender);
    }

    // --- View Functions ---
    function getCredentialById(uint256 credentialId)
        external
        view
        returns (Credential memory)
    {
        require(credentials[credentialId].issuedAt != 0, "Credential does not exist.");
        return credentials[credentialId];
    }

    function getCredentialsOf(address owner)
        external
        view
        returns (uint256[] memory)
    {
        return credentialsOfOwner[owner];
    }
}
