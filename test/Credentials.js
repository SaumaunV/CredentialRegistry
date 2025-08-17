const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CredentialRegistry Tests", function () {
    let registry, owner, issuer, nonIssuer, recipient, anotherUser;

    beforeEach(async function () {
        [owner, issuer, nonIssuer, recipient, anotherUser] = await ethers.getSigners();
        const CredentialRegistryFactory = await ethers.getContractFactory("CredentialRegistry");
        registry = await CredentialRegistryFactory.deploy(owner.address);
        await registry.waitForDeployment();
    });

    describe("Issuer Management", function () {
        it("should allow the owner to add a new issuer", async function () {
            await expect(registry.connect(owner).addIssuer(issuer.address))
                .to.emit(registry, "IssuerAdded")
                .withArgs(issuer.address);
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
            await expect(registry.connect(owner).removeIssuer(issuer.address))
                .to.emit(registry, "IssuerRemoved")
                .withArgs(issuer.address);
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

        beforeEach(async function () {
            await registry.connect(owner).addIssuer(issuer.address);
        });

        it("should allow an authorized issuer to issue a credential", async function () {
            const issueTx = await registry.connect(issuer).issueCredential(recipient.address, credentialType, metadataURI);
            await expect(issueTx)
                .to.emit(registry, "CredentialIssued")
                .withArgs(1, issuer.address, recipient.address, credentialType);
        });

        it("should prevent an unauthorized user from issuing a credential", async function () {
            await expect(registry.connect(nonIssuer).issueCredential(recipient.address, "FakeCert", "ipfs://fake"))
                .to.be.revertedWith("Caller is not an authorized issuer");
        });

        it("should allow an authorized issuer to revoke a credential", async function () {
            await registry.connect(issuer).issueCredential(recipient.address, "Temp", "ipfs://temp");
            await expect(registry.connect(issuer).revokeCredential(1))
                .to.emit(registry, "CredentialRevoked")
                .withArgs(1, issuer.address);
            const cred = await registry.getCredentialById(1);
            expect(cred.isValid).to.be.false;
        });

        it("should prevent revoking a credential that does not exist", async function () {
            await expect(registry.connect(issuer).revokeCredential(999))
                .to.be.revertedWith("Credential does not exist.");
        });
    });
});
