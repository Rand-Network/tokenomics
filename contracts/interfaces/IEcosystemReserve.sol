// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IEcosystemReserve{
  function BPT_TOKEN (  ) external view returns ( string memory );
  function DEFAULT_ADMIN_ROLE (  ) external view returns ( bytes32 );
  function ECOSYSTEM_RESERVE (  ) external view returns ( string memory );
  function GOVERNANCE (  ) external view returns ( string memory );
  function INVESTOR_NFT (  ) external view returns ( string memory );
  function MINTER_ROLE (  ) external view returns ( bytes32 );
  function MULTISIG (  ) external view returns ( string memory );
  function OPENZEPPELIN_DEFENDER (  ) external view returns ( string memory );
  function PAUSER_ROLE (  ) external view returns ( bytes32 );
  function RAND_TOKEN (  ) external view returns ( string memory );
  function READER_ROLE (  ) external view returns ( bytes32 );
  function REGISTRY (  ) external view returns ( address );
  function SAFETY_MODULE (  ) external view returns ( string memory );
  function VESTING_CONTROLLER (  ) external view returns ( string memory );
  function approve ( address token, address recipient, uint256 amount ) external;
  function getRoleAdmin ( bytes32 role ) external view returns ( bytes32 );
  function grantRole ( bytes32 role, address account ) external;
  function hasRole ( bytes32 role, address account ) external view returns ( bool );
  function initialize ( address _registry ) external;
  function paused (  ) external view returns ( bool );
  function proxiableUUID (  ) external view returns ( bytes32 );
  function renounceRole ( bytes32 role, address account ) external;
  function revokeRole ( bytes32 role, address account ) external;
  function supportsInterface ( bytes4 interfaceId ) external view returns ( bool );
  function transfer ( address token, address recipient, uint256 amount ) external;
  function updateRegistryAddress ( address newAddress ) external;
  function upgradeTo ( address newImplementation ) external;
  function upgradeToAndCall ( address newImplementation, bytes memory data ) external;
}
