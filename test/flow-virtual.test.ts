import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  IoID,
  IoIDStore,
  IoIDRegistry,
  VerifyingProxy,
  VerifyingProxy__factory,
  UniversalFactory,
} from '../typechain-types';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { Signer, getBytes, keccak256, solidityPacked } from 'ethers';
// We use a local ERC‑6551 registry mock and HBAccount implementation for testing

describe('ioID My Device Tests', function () {
  let deployer, owner: HardhatEthersSigner;
  let verifier: Signer;
  let proxy: VerifyingProxy;
  let ioIDStore: IoIDStore;
  let ioID: IoID;
  let ioIDRegistry: IoIDRegistry;
  let chainId: number;

  before(async () => {
    [deployer, owner] = await ethers.getSigners();
    verifier = ethers.Wallet.createRandom();

    const project = await ethers.deployContract('Project');
    await project.initialize('ioID Project', 'IPN');
    const projectRegistry = await ethers.deployContract('ProjectRegistry');
    await projectRegistry.initialize(project.target);
    await project.setMinter(projectRegistry.target);

    ioIDStore = await ethers.deployContract('ioIDStore');
    await ioIDStore.initialize(project.target, ethers.parseEther('1.0'));

    // Determine the local chain ID for EIP‑712 signatures and HBAccount construction
    const net = await ethers.provider.getNetwork();
    chainId = Number(net.chainId);

    // Deploy a mock ERC‑6551 registry and a HBAccount implementation for the local network
    const registry = await ethers.deployContract('ERC6551RegistryMock');
    // Deploy a dummy ERC721 and initialize it so the HBAccount constructor receives a non‑zero token contract
    const dummyErc721 = await ethers.deployContract('DeviceNFT');
    await dummyErc721.initialize('Dummy NFT', 'DNFT');
    // Deploy a HBAccount implementation bound to a dummy NFT (chainId, tokenContract, tokenId)
    const accountImpl = await ethers.deployContract('HBAccount', [chainId, dummyErc721.target, 1n]);

    ioID = await ethers.deployContract('ioID');
    await ioID.initialize(
      deployer.address, // minter
      registry.target, // wallet registry
      accountImpl.target, // wallet implementation (unused by mock registry)
      'ioID',
      'ioID',
    );

    ioIDRegistry = await ethers.deployContract('ioIDRegistry');
    await ioIDRegistry.initialize(ioIDStore.target, ioID.target);

    await ioIDStore.setIoIDRegistry(ioIDRegistry.target);
    await ioID.setMinter(ioIDRegistry.target);

    // Deploy the VerifyingProxy implementation. This proxy requires the ioIDStore,
    // projectRegistry and a DeviceNFT implementation in its constructor. The
    // resulting implementation address is passed into UniversalFactory so that
    // each new proxy uses the correct implementation.
    const deviceNFTImplementation = await ethers.deployContract('DeviceNFT');
    const proxyImplementation = await ethers.deployContract('VerifyingProxy', [
      ioIDStore.target,
      projectRegistry.target,
      deviceNFTImplementation.target,
    ]);

    // The UniversalFactory only takes a single parameter: the proxy implementation
    // address. Passing extra parameters will cause a constructor argument mismatch.
    const verifyingProxyFactory = await ethers.getContractFactory('VerifyingProxy');
    const factory = await ethers.deployContract('UniversalFactory', [proxyImplementation.target]);

    // Create a new verifying proxy via the factory. We provide the type, verifier
    // address, project name, device name/symbol and amount. A payment equal to
    // 10 ether (1.0 per device) must be sent to mint 10 devices.
    const createTx = await factory.create(
      1,
      verifier.getAddress(),
      'DeNet',
      'DeNet Device NFT',
      'DNFT',
      10,
      { value: ethers.parseEther('1.0') * 10n }
    );
    const receipt = await createTx.wait();
    // Extract the created proxy address from the event logs. The event
    // signature is deterministic and matches the VerifyingProxy's CreateProxy event.
    for (const log of receipt!.logs) {
      if (log.topics[0] === '0x944661ed150e69c33316bf899f80879602cc18929538a726d96c30bd7c9a7fc8') {
        proxy = verifyingProxyFactory.attach(log.args[0]) as VerifyingProxy;
        break;
      }
    }
  });

  it('regsiter', async () => {
    const device = ethers.Wallet.createRandom();
    const domain = {
      name: 'ioIDRegistry',
      version: '1',
      chainId: chainId,
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
    const signature = await device.signTypedData(domain, types, { owner: proxy.target, nonce: nonce });
    const r = signature.substring(0, 66);
    const s = '0x' + signature.substring(66, 130);
    const v = '0x' + signature.substring(130);

    const projectId = await proxy.projectId();

    // request verify service with: chainid, owner, device
    const verifyMessage = solidityPacked(['uint256', 'address', 'address'], [chainId, owner.address, device.address]);
    const verifySignature = await verifier.signMessage(getBytes(verifyMessage));

    expect(await ioID.projectDeviceCount(projectId)).to.equal(0);
    await proxy.register(
      verifySignature,
      keccak256('0x'), // did hash
      'http://resolver.did', // did document uri
      owner.address, // owner
      device.address, // device
      v,
      r,
      s,
      {
        value: ethers.parseEther('1.0'),
      },
    );

    const did = await ioIDRegistry.documentID(device.address);

    expect(await ioID.deviceProject(device.address)).to.equal(projectId);
    expect(await ioID.projectDeviceCount(projectId)).to.equal(1);

    const ids = await ioID.projectIDs(projectId, '0x0000000000000000000000000000000000000001', 10);
    expect(ids.array.length).to.equal(1);
    expect(ids.array[0]).to.equal(device.address);
    expect(ids.next).to.equal('0x0000000000000000000000000000000000000000');

    const wallet = await ioID['wallet(string)'](did);
    expect((await ethers.provider.getCode(wallet)).length).to.gt(0);

    expect(await ethers.provider.getBalance(wallet)).to.equal(0);
    // @ts-ignore
    await deployer.sendTransaction({
      to: wallet,
      value: ethers.parseEther('1.0'),
    });
    expect(await ethers.provider.getBalance(wallet)).to.equal(ethers.parseEther('1.0'));

    // Instead of using the external Tokenbound SDK, directly call our HBAccount
    // implementation to transfer ETH from the account to the recipient. The
    // account owner must sign the call.
    const hb = await ethers.getContractAt('HBAccount', wallet);
    await hb.connect(owner).executeCall(
      deployer.address,
      ethers.parseEther('0.8'),
      '0x'
    );
    // After the call, the wallet should hold 0.2 ETH (1.0 – 0.8)
    expect(await ethers.provider.getBalance(wallet)).to.equal(ethers.parseEther('0.2'));
  });
});
