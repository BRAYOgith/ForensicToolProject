import os
from dotenv import load_dotenv
from web3 import Web3

load_dotenv()
w3 = Web3(Web3.HTTPProvider('https://sepolia.infura.io/v3/' + os.getenv('INFURA_PROJECT_ID')))
addr = os.getenv('CONTRACT_ADDRESS')
print('Address:', addr)
code = w3.eth.get_code(Web3.to_checksum_address(addr))
print('Bytecode length:', len(code))
print('Bytecode:', code.hex()[:50])
