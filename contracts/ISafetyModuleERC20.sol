// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ISafetyModuleERC20{
  function BACKEND_ROLE (  ) external view returns ( bytes32 );
  function BURNER_ROLE (  ) external view returns ( bytes32 );
  function COOLDOWN_SECONDS (  ) external view returns ( uint256 );
  function DEFAULT_ADMIN_ROLE (  ) external view returns ( bytes32 );
  function MINTER_ROLE (  ) external view returns ( bytes32 );
  function PAUSER_ROLE (  ) external view returns ( bytes32 );
  function RND_TOKEN (  ) external view returns ( address );
  function UNSTAKE_WINDOW (  ) external view returns ( uint256 );
  function VC_TOKEN (  ) external view returns ( address );
  function allowance ( address owner, address spender ) external view returns ( uint256 );
  function approve ( address spender, uint256 amount ) external returns ( bool );
  function balanceOf ( address account ) external view returns ( uint256 );
  function burn ( uint256 amount ) external;
  function burn ( address from, uint256 amount ) external;
  function burnFrom ( address account, uint256 amount ) external;
  function cooldown (  ) external;
  function decimals (  ) external view returns ( uint8 );
  function decreaseAllowance ( address spender, uint256 subtractedValue ) external returns ( bool );
  function getRoleAdmin ( bytes32 role ) external view returns ( bytes32 );
  function grantRole ( bytes32 role, address account ) external;
  function hasRole ( bytes32 role, address account ) external view returns ( bool );
  function increaseAllowance ( address spender, uint256 addedValue ) external returns ( bool );
  function initialize ( string memory _name, string memory _symbol, address _multisigVault, address _backendAddress, address _rndTokenContract, address _vcTokenContract, uint256 _cooldown_seconds, uint256 _unstake_window ) external;
  function mint ( address to, uint256 amount ) external;
  function name (  ) external view returns ( string memory );
  function pause (  ) external;
  function paused (  ) external view returns ( bool );
  function redeem ( address recipient, uint256 amount ) external;
  function renounceRole ( bytes32 role, address account ) external;
  function revokeRole ( bytes32 role, address account ) external;
  function stake ( uint256 amount ) external;
  function stakeNew ( bool vested, uint256 tokenId, uint256 amount ) external;
  function supportsInterface ( bytes4 interfaceId ) external view returns ( bool );
  function symbol (  ) external view returns ( string memory );
  function totalSupply (  ) external view returns ( uint256 );
  function transfer ( address recipient, uint256 amount ) external returns ( bool );
  function transferFrom ( address sender, address recipient, uint256 amount ) external returns ( bool );
  function unpause (  ) external;
  function updateRNDAddress ( address newAddress ) external;
  function updateVCAddress ( address newAddress ) external;
  function upgradeTo ( address newImplementation ) external;
  function upgradeToAndCall ( address newImplementation, bytes memory data ) external;
}
