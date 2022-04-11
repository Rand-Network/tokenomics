// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IEcosystemReserve{
  function DEFAULT_ADMIN_ROLE (  ) external view returns ( bytes32 );
  function PAUSER_ROLE (  ) external view returns ( bytes32 );
  function REGISTRY (  ) external view returns ( address );
  function approve ( address token, address recipient, uint256 amount ) external;
  function getRoleAdmin ( bytes32 role ) external view returns ( bytes32 );
  function grantRole ( bytes32 role, address account ) external;
  function hasRole ( bytes32 role, address account ) external view returns ( bool );
  function initialize ( address _registry ) external;
  function paused (  ) external view returns ( bool );
  function renounceRole ( bytes32 role, address account ) external;
  function revokeRole ( bytes32 role, address account ) external;
  function supportsInterface ( bytes4 interfaceId ) external view returns ( bool );
  function transfer ( address token, address recipient, uint256 amount ) external;
  function upgradeTo ( address newImplementation ) external;
  function upgradeToAndCall ( address newImplementation, bytes memory data ) external;
}
