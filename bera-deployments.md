| Contract / Link         | Address                                     | Purpose / Role                                                             |
|-------------------------|---------------------------------------------|-----------------------------------------------------------------------------|
| `ioID`                  | `0x04DCCaA87fef0DB7dbc86f074Ba6b4051A1837CF` | ERC-721 NFT contract for decentralized identities                          |
| `ioIDStore`             | `0x7Ab4682703D442415272CEEc2fc13f391a5D9041` | Attribute storage for identities (metadata, KYC, public keys, etc.)        |
| `ioIDRegistry` (logic)  | `0xf29EFbA688b77Ea29C8152488De557A2efff5c7d` | Identity registry logic contract                                           |
| `ProjectRegistry` (logic)| `0x48fFfD2805fb1CC3B14c41E9EB827863d252d15f`| Project registry logic for managing user-linked projects                   |
| `Project`               | `0x57d0aB462deb7Ac3D7542D433c8FCA2dc753a6A2` | Minimal project template contract (used by ProjectRegistry)                |
| `UniversalFactoryV2`    | `0x540E16dB0818b74103Def2Cf29fB61eE26e851F3` | Beacon-based factory to deploy user-linked identity/project registries     |
| `WALLET_IMPLEMENTATION` | `0x484D9cFb1A7dE51c9EfE1B1f8b454b3a0152dAaB` | Dummy smart wallet logic (minimal Ownable wallet with `execute(...)`)     |
| `WALLET_REGISTRY`       | `0xb3E05803904fD63a4c581B967354ef19580C6E93` | Registry + deployer for smart wallets per user/identity                    |

| ➕ Linking Action        | Target                                       | Description                                                                |
|-------------------------|----------------------------------------------|----------------------------------------------------------------------------|
| `Set ioIDStore`         | → `ioIDRegistry`                             | Allows identity registry to store metadata in `ioIDStore`                  |
| `Set ioID`              | → `ioIDRegistry` as minter                   | Lets registry mint identity NFTs via `ioID` contract                       |
| `Set Project`           | → `ProjectRegistry` as minter                | Enables registry to deploy `Project` contracts for identities              |