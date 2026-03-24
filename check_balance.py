import store_blockchain
import os
from dotenv import load_dotenv

def check():
    load_dotenv()
    if not store_blockchain.init_blockchain():
        print("Init failed")
        return
    
    web3 = store_blockchain.web3
    addr = os.getenv("WALLET_ADDRESS")
    balance = web3.eth.get_balance(addr)
    print(f"Wallet: {addr}")
    print(f"Balance: {web3.from_wei(balance, 'ether')} ETH")

if __name__ == "__main__":
    check()
