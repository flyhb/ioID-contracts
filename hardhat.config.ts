import "./tasks/register-project";
import * as dotenv from 'dotenv';
import { HardhatUserConfig } from 'hardhat/config';
import "./tasks/register-project";
import '@nomicfoundation/hardhat-toolbox';
import '@openzeppelin/hardhat-upgrades';
import '@nomiclabs/hardhat-truffle5';

dotenv.config();

const PRIVATE_KEY = process.env.BERA_PRIVATE_KEY;
const accounts = PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [];

const config: HardhatUserConfig = {
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    },
    dev: {
      url: 'http://127.0.0.1:8545',
    },
    mainnet: {
      url: 'https://babel-api.mainnet.iotex.io/',
      accounts: accounts,
    },
    berachain: {
      url: 'https://bepolia.rpc.berachain.com',
      accounts: accounts,
    },
  },
  solidity: {
    compilers: [
      {
        version: '0.8.19',
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 10000,
          },
          metadata: {
            bytecodeHash: 'none',
          },
        },
      },
    ],
  },
  etherscan: {
    apiKey: 'YOUR_ETHER',
    customChains: [
      {
        network: 'mainnet',
        chainId: 4689,
        urls: {
          apiURL: 'https://IoTeXscout.io/api',
          browserURL: 'https://IoTeXscan.io',
        },
      },
      {
        network: 'testnet',
        chainId: 4690,
        urls: {
          apiURL: 'https://testnet.IoTeXscout.io/api',
          browserURL: 'https://testnet.IoTeXscan.io',
        },
      },
    ],
  },
};

export default config;
