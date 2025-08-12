# Integrate your devices in ioID
 
## Register your project in ioID

```sh
npx hardhat register-project --name "MyProjectName" --network ethereum-sepolia
```

Note your project ID.

## Link your device NFT
You need a device NFT contract to represent your collection of devices, it must be an ERC721, even just a basic one. If not available, you can deploy one with:

```sh
npx hardhat run scripts/deploy-deviceNFT.ts --network ethereum-sepolia
```

Note your Device NFT contract address.

Link it to your project:
```sh
npx hardhat set-device-contract --projectid $PROJECT_ID --device $DEVICE_NFT_CONTRACT --network ethereum-sepolia
```

Ensure $PROJECT_ID is set with your project ID registered above and $DEVICE_NFT_CONTRACT is set with your Device NFT contract address.