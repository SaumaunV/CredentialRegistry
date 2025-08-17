pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/Credentials.sol";

contract CredentialRegistrySolTest is Test {
    
    CredentialRegistry public registry;
    address public owner = address(0x1);
    address public issuer = address(0x2);
    address public recipient = address(0x3);

    function setUp() public {
        registry = new CredentialRegistry(owner);
        // Use vm.prank to act as the owner to add an issuer
        vm.prank(owner);
        registry.addIssuer(issuer);
    }

    function test_SuccessfulCredentialIssuance() public {
        // Impersonate the issuer for this one transaction
        vm.prank(issuer);
        uint256 newCredentialId = registry.issueCredential(
            recipient, 
            "UniversityDegree", 
            "ipfs://uri"
        );

        assertEq(newCredentialId, 1, "Credential ID should be 1");
    }

    function test_SuccessfulCredentialRevocation() public {
        // Issue a credential
        vm.prank(issuer);
        uint256 credentialId = registry.issueCredential(recipient, "TestCert", "ipfs://test");

        // Revoke it
        vm.prank(issuer);
        registry.revokeCredential(credentialId);

        CredentialRegistry.Credential memory cred = registry.getCredentialById(credentialId);
        assertFalse(cred.isValid, "Credential should be invalid after revocation");
    }
}
