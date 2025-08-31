const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CredentialRegistry Tests", function () {
    let registry, owner, issuer, anotherIssuer, nonIssuer, recipient, anotherUser;

    beforeEach(async function () {
        [owner, issuer, anotherIssuer, nonIssuer, recipient, anotherUser] = await ethers.getSigners();
        const CredentialRegistryFactory = await ethers.getContractFactory("CredentialRegistry");
        registry = await CredentialRegistryFactory.deploy(owner.address);
        await registry.waitForDeployment();
    });

    describe("Issuer Management", function () {
        it("should allow the owner to add a new issuer", async function () {
            await registry.connect(owner).addIssuer(issuer.address);
            const isAuthorized = await registry.authorizedIssuers(issuer.address);
            expect(isAuthorized).to.be.true;
        });

        it("should prevent a non-owner from adding an issuer", async function () {
            await expect(registry.connect(nonIssuer).addIssuer(anotherUser.address))
                .to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount")
                .withArgs(nonIssuer.address);
        });

        it("should allow the owner to remove an issuer", async function () {
            await registry.connect(owner).addIssuer(issuer.address);
            await registry.connect(owner).removeIssuer(issuer.address);
            const isAuthorized = await registry.authorizedIssuers(issuer.address);
            expect(isAuthorized).to.be.false;
        });

        it("should prevent a non-owner from removing an issuer", async function () {
            await registry.connect(owner).addIssuer(issuer.address);
            await expect(registry.connect(nonIssuer).removeIssuer(issuer.address))
                .to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount")
                .withArgs(nonIssuer.address);
        });
    });

    describe("Credentials", function () {
        const credentialType = "UniversityDegree";
        const metadataURI = "ipfs://bafybeihg";
        const revocationReason = "Credential Expired";

        beforeEach(async function () {
            await registry.connect(owner).addIssuer(issuer.address);
            await registry.connect(owner).addIssuer(anotherIssuer.address);
        });

        it("should allow an authorized issuer to issue a credential", async function () {
            const issueTx = await registry.connect(issuer).issueCredential(recipient.address, credentialType, metadataURI);
            await expect(issueTx)
                .to.emit(registry, "CredentialIssued")
                .withArgs(1, issuer.address, recipient.address, credentialType);
        });

        it("should correctly store credential data upon issuance", async function () {
            await registry.connect(issuer).issueCredential(recipient.address, credentialType, metadataURI);
            const cred = await registry.getCredentialById(1);

            expect(cred.metadataURI).to.equal(metadataURI);
            expect(cred.credentialType).to.equal(credentialType);
            expect(cred.issuedTo).to.equal(recipient.address);
            expect(cred.issuedBy).to.equal(issuer.address);
            expect(cred.status).to.equal(0);
            expect(cred.revocationReason).to.equal("");
        });

        it("should prevent an unauthorized user from issuing a credential", async function () {
            await expect(registry.connect(nonIssuer).issueCredential(recipient.address, "FakeCert", "ipfs://fake"))
                .to.be.revertedWith("Caller is not an authorized issuer");
        });

        it("should allow the original issuer to revoke their own credential", async function () {
            await registry.connect(issuer).issueCredential(recipient.address, "Temp", "ipfs://temp");
            
            await expect(registry.connect(issuer).revokeCredential(1, revocationReason))
                .to.emit(registry, "CredentialRevoked")
                .withArgs(1, issuer.address, revocationReason);
            
            const cred = await registry.getCredentialById(1);
            expect(cred.status).to.equal(1);
            expect(cred.revocationReason).to.equal(revocationReason);
        });

        it("should PREVENT a different issuer from revoking a credential", async function () {
            await registry.connect(issuer).issueCredential(recipient.address, "Temp", "ipfs://temp");

            await expect(registry.connect(anotherIssuer).revokeCredential(1, "Attempting hostile takeover"))
                .to.be.revertedWith("Only the original issuer can revoke this credential.");
        });



        it("should prevent revoking a credential that does not exist", async function () {
            await expect(registry.connect(issuer).revokeCredential(999, "Does not exist"))
                .to.be.revertedWith("Credential does not exist.");
        });

        it("should prevent revoking a credential that is already revoked", async function() {
            await registry.connect(issuer).issueCredential(recipient.address, "Temp", "ipfs://temp");
            await registry.connect(issuer).revokeCredential(1, "First revocation");

            await expect(registry.connect(issuer).revokeCredential(1, "Second attempt"))
                .to.be.revertedWith("Credential already revoked.");
        });
    });
});
