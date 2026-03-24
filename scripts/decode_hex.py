import binascii

hex_data = "404354505f4b656e796120404e50534f6666696369616c5f4b4520404443495f4b656e796120407468655f73616d6275204043534d656368616e69736d20404150534b656e7961204164656e204475616c65206a696e7865642068697320626f73732e200a0a416c2d5368616261616220697320706c616e6e696e6720746f206b696c6c204b656e79616e732e200a0a466577206d6f6e746873206c617465722c2068657265207765206172652e200a0a234d6170696e64757a694b45"
content = binascii.unhexlify(hex_data).decode('utf-8', errors='ignore')
print(f"Content: {content}")

hash_hex = "32626531323435623435623031343135623762336137343037336631643033386239303736333335316433333838373935333933303830383464303039653336"
sha_hash = binascii.unhexlify(hash_hex).decode('utf-8', errors='ignore')
print(f"Hash: {sha_hash}")

ts_hex = "323032362d30322d31385431343a33373a32342e3030305a"
ts = binascii.unhexlify(ts_hex).decode('utf-8', errors='ignore')
print(f"Timestamp: {ts}")

inv_hex = "32"
inv = binascii.unhexlify(inv_hex).decode('utf-8', errors='ignore')
print(f"Investigator: {inv}")

author_hex = "4d6170696e64757a694b45"
author = binascii.unhexlify(author_hex).decode('utf-8', errors='ignore')
print(f"Author: {author}")
