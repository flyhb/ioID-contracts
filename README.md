# ioID contracts

## Deployment

### 🐻 Berachain Deployment (Bepolia)

#### Wallet Contracts
- Wallet Implementation: `0x484D9cFb1A7dE51c9EfE1B1f8b454b3a0152dAaB`
- Wallet Registry: `0xb3E05803904fD63a4c581B967354ef19580C6E93`

#### ioID Contracts
- Project: `0x57d0aB462deb7Ac3D7542D433c8FCA2dc753a6A2`
- ProjectRegistry: `0x48fFfD2805fb1CC3B14c41E9EB827863d252d15f`
- ioIDStore: `0x7Ab4682703D442415272CEEc2fc13f391a5D9041`
- ioID: `0x04DCCaA87fef0DB7dbc86f074Ba6b4051A1837CF`
- ioIDRegistry (logic): `0xf29EFbA688b77Ea29C8152488De557A2efff5c7d`

#### Factory
- UniversalFactoryV2: `0x540E16dB0818b74103Def2Cf29fB61eE26e851F3`

#### Notes
- Project IDs are assigned incrementally by `ProjectRegistry`.
- Registered projects can be queried by calling `tokenURI(id)` or via events.
- Wallet contracts are minimal and proxy-compatible.

---