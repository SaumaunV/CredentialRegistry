require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-foundry");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
paths: {
    artifacts: "./src/artifacts",
  },
        networks: {
                localhost: {
                        url: "http://ec2-3-15-204-115.us-east-2.compute.amazonaws.com:8545"
            ,           chainID: 1337

                }
,
                hardhat: {
                        chainID: 1337
           }
   },

        solidity: "0.8.20",
};
