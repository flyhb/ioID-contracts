import { expect } from 'chai';
import { ethers } from 'hardhat';
import { keccak256 } from 'ethers';

import {
  IoID,
  IoIDStore,
  IoIDRegistry,
  DeviceNFT,
} from '../typechain-types';

import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';

// Fully decentralized: owner registers directly with device-signed Permit.
// No proxy is used to call ioIDRegistry.register.
// We prepare a valid Project via ProjectRegistry and link DeviceNFT to the project in ioIDStore.
describe('ioID direct register (decentralized flow)', function () {
  let deployer: HardhatEthersSigner, owner: HardhatEthersSigner;
  let ioID: IoID;
  let ioIDStore: IoIDStore;
  let ioIDRegistry: IoIDRegistry;
  let deviceImpl: DeviceNFT;
  let chainId: number;
  let projectId: bigint;

  before(async () => {
    [deployer, owner] = await ethers.getSigners();
    const net = await ethers.provider.getNetwork();
    chainId = Number(net.chainId);

    // --- Project setup ---
    const project = await ethers.deployContract('Project');
    await project.initialize('ioID Project', 'IPN');

    const projectRegistry = await ethers.deployContract('ProjectRegistry');
    await projectRegistry.initialize(project.target);
    await project.setMinter(projectRegistry.target);

    // Mint a hardware project (type = 0) to the OWNER
    const beforeCount = await project.count();
    await projectRegistry.connect(owner)["register(string,uint8)"]('MyDeviceName', 0);
    projectId = beforeCount + 1n;

    // --- Store ---
    ioIDStore = await ethers.deployContract('ioIDStore');
    await ioIDStore.initialize(project.target, ethers.parseEther('1.0')); // price = 1 ETH

    // --- 6551 mocks ---
    const registry = await ethers.deployContract('ERC6551RegistryMock');

    // Device NFT implementation
    deviceImpl = await ethers.deployContract('DeviceNFT');
    await deviceImpl.initialize('My Device NFT', 'DNFT');

    // Allow the OWNER to mint one DNFT
    await deviceImpl.connect(deployer).configureMinter(owner.address, 1);

    // Account implementation for 6551 (constructor needs non-zero ERC721 + tokenId)
    const accountImpl = await ethers.deployContract('HBAccount', [chainId, deviceImpl.target, 1n]);

    // --- ioID core ---
    ioID = await ethers.deployContract('ioID');
    await ioID.initialize(
      deployer.address,     // minter (temp)
      registry.target,      // mock 6551 registry
      accountImpl.target,   // HBAccount implementation
      'ioID',
      'ioID'
    );

    ioIDRegistry = await ethers.deployContract('ioIDRegistry');
    await ioIDRegistry.initialize(ioIDStore.target, ioID.target);

    await ioIDStore.setIoIDRegistry(ioIDRegistry.target);
    await ioID.setMinter(ioIDRegistry.target);

    // Link the project's DeviceNFT in the store so deviceContractProject(contract) != 0
    await ioIDStore.connect(owner).setDeviceContract(projectId, deviceImpl.target);
  });

  it('device owner registers directly with device-signed permit', async () => {
    // Owner mints their device token
    const tokenId = await deviceImpl.connect(owner).mint.staticCall(owner.address);
    await deviceImpl.connect(owner).mint(owner.address);

    // Approve the registry to pull the device NFT into the token-bound wallet
    await deviceImpl.connect(owner).approve(await ioIDRegistry.getAddress(), tokenId);

    // Device key signs Permit(owner, nonce) for this registry
    const device = ethers.Wallet.createRandom();
    const domain = {
      name: 'ioIDRegistry',
      version: '1',
      chainId,
      verifyingContract: ioIDRegistry.target,
    };
    const types = {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'nonce', type: 'uint256' },
      ],
    };
    const nonce = await ioIDRegistry.nonces(device.address);
    // @ts-ignore
    const signature = await device.signTypedData(domain, types, { owner: owner.address, nonce });
    const r = signature.substring(0, 66);
    const s = '0x' + signature.substring(66, 130);
    const v = '0x' + signature.substring(130);

    const didHash = keccak256('0x');
    const didURI = 'ipfs://dummy-did';

    // Use the wrapper overload: register(address,uint256,address,bytes32,string,uint8,bytes32,bytes32)
    // (msg.sender is treated as `user`; we pass `device` explicitly.)
    const frag = 'register(address,uint256,address,bytes32,string,uint8,bytes32,bytes32)';
    const data = ioIDRegistry.interface.encodeFunctionData(frag, [
      await deviceImpl.getAddress(), // deviceContract
      tokenId,                       // tokenId
      device.address,                // device (key that signed the Permit)
      didHash,
      didURI,
      v,
      r,
      s,
    ]);

    // Send raw tx to avoid provider.resolveName path
    await owner.sendTransaction({
      to: ioIDRegistry as unknown as string,
      data,
      value: ethers.parseEther('1.0'),
    });

    // Assertions
    const did = await ioIDRegistry.documentID(device.address);

    const wallet = await ioID['wallet(string)'](did);
    expect((await ethers.provider.getCode(wallet))).to.not.equal('0x');

    // wallet should receive the DNFT and hold ETH, then owner executes a call
    expect(await ethers.provider.getBalance(wallet)).to.equal(0);
    await deployer.sendTransaction({ to: wallet, value: ethers.parseEther('1.0') });

    const hb = await ethers.getContractAt('HBAccount', wallet);
    await hb.connect(owner).executeCall(deployer.address, ethers.parseEther('0.75'), '0x');

    expect(await ethers.provider.getBalance(wallet)).to.equal(ethers.parseEther('0.25'));
  });
});
