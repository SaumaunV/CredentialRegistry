pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/Credentials.sol";

contract CredentialRegistrySolTest is Test {
    
    CredentialRegistry public registry;
    address public owner = address(0x1);
    address public issuer = address(0x2);
    address public anotherIssuer = address(0x4);
    address public recipient = address(0x3);

    function setUp() public {
        registry = new CredentialRegistry(owner);
        vm.prank(owner);
        registry.addIssuer(issuer);
        vm.prank(owner);
        registry.addIssuer(anotherIssuer);
    }

    function test_SuccessfulCredentialIssuanceAndState() public {
        vm.prank(issuer);
        uint256 newCredentialId = registry.issueCredential(
            recipient, 
            "UniversityDegree", 
            "ipfs://uri"
        );

        assertEq(newCredentialId, 1);
        
        CredentialRegistry.Credential memory cred = registry.getCredentialById(newCredentialId);
        assertEq(uint(cred.status), uint(CredentialRegistry.Status.Valid));
        assertEq(cred.revocationReason, "");
    }

    function test_SuccessfulCredentialRevocation() public {
        vm.prank(issuer);
        uint256 credentialId = registry.issueCredential(recipient, "TestCert", "ipfs://test");

        string memory reason = "Credential Expired";
        vm.prank(issuer);
        registry.revokeCredential(credentialId, reason);

        CredentialRegistry.Credential memory cred = registry.getCredentialById(credentialId);
        assertEq(uint(cred.status), uint(CredentialRegistry.Status.Revoked));
        assertEq(cred.revocationReason, reason);
    }

    function test_Fail_RevokeByWrongIssuer() public {
        vm.prank(issuer);
        uint256 credentialId = registry.issueCredential(recipient, "TestCert", "ipfs://test");

        vm.prank(anotherIssuer);
        vm.expectRevert("Only the original issuer can revoke this credential.");
        registry.revokeCredential(credentialId, "Wrong issuer attempt");
    }
}
